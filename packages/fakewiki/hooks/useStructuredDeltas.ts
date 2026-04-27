import type { FakeWiki } from "fakewiki"
import type {
	FWEditTypesDiffSummary,
	FWStructuredDeltaCandidate,
	FWStructuredDeltaResult,
	FWStructuredDeltaSettings,
} from "fakewiki/types"
import type { Ref } from "vue"
import { computed, ref, watch } from "vue"

export type EditTypesSummaryEntries = [number, FWEditTypesDiffSummary | null][]
export type EditTypesErrorEntries = [number, string][]

export interface UseStructuredDeltasArgs {
	wiki: FakeWiki
	revisionIds: Ref<number[]>
	initialSettings?: Partial<FWStructuredDeltaSettings>
	/** Max parallel edit-types requests; default 1 (sequential). */
	loadConcurrency?: number
	autoLoad?: boolean
	/** Hydrate cache on creation (e.g. from persisted feed bundle). */
	initialEditTypesSummaries?: EditTypesSummaryEntries
	initialEditTypesErrors?: EditTypesErrorEntries
}

/**
 * Fetches edit-types summaries and computes structured-delta candidates per revision, with user-tunable settings.
 * @example
 * ```ts
 * import { ref } from "vue"
 * import { FakeWiki, useStructuredDeltas } from "fakewiki"
 * const wiki = new FakeWiki()
 * const revisionIds = ref([12345, 12346])
 * const deltas = useStructuredDeltas({ wiki, revisionIds, autoLoad: false })
 * deltas.loadEditTypesSummaries([12345, 12346])
 * ```
 */
export function useStructuredDeltas({
	wiki,
	revisionIds,
	initialSettings,
	loadConcurrency: loadConcurrencyArg,
	autoLoad = true,
	initialEditTypesSummaries,
	initialEditTypesErrors,
}: UseStructuredDeltasArgs) {
	const defaults = wiki.DEFAULT_STRUCTURED_DELTA_SETTINGS
	const maxHighlightCount = wiki.STRUCTURED_DELTA_MAX_HIGHLIGHT_COUNT

	const effectiveConcurrency = Math.max(
		1,
		Math.floor(loadConcurrencyArg ?? 1)
	)

	const highlightCount = ref(
		Math.max(
			1,
			Math.min(maxHighlightCount, Math.round(initialSettings?.highlightCount ?? defaults.highlightCount))
		)
	)
	const improvedDeltaEnabled = ref(
		initialSettings?.improvedDeltaEnabled ?? defaults.improvedDeltaEnabled
	)
	const relativeDetailLevelEnabled = ref(
		initialSettings?.relativeDetailLevelEnabled ?? defaults.relativeDetailLevelEnabled
	)
	const smartFilteringEnabled = ref(
		initialSettings?.smartFilteringEnabled ?? defaults.smartFilteringEnabled
	)

	const editTypesByRevId = ref<Map<number, FWEditTypesDiffSummary | null>>(
		new Map(initialEditTypesSummaries ?? [])
	)
	const editTypesErrorByRevId = ref<Map<number, string>>(new Map(initialEditTypesErrors ?? []))
	const loadingEditTypesIds = ref<Set<number>>(new Set())

	/** Bumps when a newer fetch pass starts; stale passes must not mutate maps. */
	let fetchPassGeneration = 0

	function idsToFetchFromList(ids: number[]): number[] {
		const seen = new Set<number>()
		const out: number[] = []
		for (const id of ids) {
			if (seen.has(id)) continue
			seen.add(id)
			if (editTypesByRevId.value.has(id) || editTypesErrorByRevId.value.has(id)) continue
			if (loadingEditTypesIds.value.has(id)) continue
			out.push(id)
		}
		return out
	}

	async function runFetchPass(ids: number[]): Promise<void> {
		const idsToFetch = idsToFetchFromList(ids)
		if (idsToFetch.length === 0) return

		const gen = ++fetchPassGeneration
		loadingEditTypesIds.value = new Set([
			...loadingEditTypesIds.value,
			...idsToFetch,
		])

		await wiki.runWithConcurrency(idsToFetch, effectiveConcurrency, async revId => {
			try {
				const summary = await wiki.getEditTypesSummary(revId)
				if (gen !== fetchPassGeneration) {
					loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
					loadingEditTypesIds.value.delete(revId)
					return
				}
				const normalized = wiki.normalizeStructuredDeltaSummary(summary as Record<string, unknown>)
				editTypesByRevId.value = new Map(editTypesByRevId.value).set(
					revId,
					normalized ?? (summary as FWEditTypesDiffSummary)
				)
				editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value)
				editTypesErrorByRevId.value.delete(revId)
			} catch (e) {
				if (gen !== fetchPassGeneration) {
					loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
					loadingEditTypesIds.value.delete(revId)
					return
				}
				const msg = e instanceof Error ? e.message : String(e)
				editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value).set(revId, msg)
				editTypesByRevId.value = new Map(editTypesByRevId.value).set(revId, null)
			} finally {
				if (gen === fetchPassGeneration) {
					loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
					loadingEditTypesIds.value.delete(revId)
				}
			}
		})
	}

	function scheduleFetchForRevisionIds(candidateIds: number[]): void {
		const merged = [...new Set(candidateIds)]
		void runFetchPass(merged)
	}

	function loadEditTypesSummary(revId: number): void {
		scheduleFetchForRevisionIds([...revisionIds.value, revId])
	}

	function loadEditTypesSummaries(revisionIdList: number[]): void {
		scheduleFetchForRevisionIds([...revisionIds.value, ...revisionIdList])
	}

	function resetStructuredDeltaState(): void {
		fetchPassGeneration++
		editTypesByRevId.value = new Map()
		editTypesErrorByRevId.value = new Map()
		loadingEditTypesIds.value = new Set()
	}

	function hydrateFromEntries(
		summaries?: EditTypesSummaryEntries,
		errors?: EditTypesErrorEntries
	): void {
		if (summaries?.length) {
			const next = new Map(editTypesByRevId.value)
			for (const [revId, summary] of summaries) {
				next.set(revId, summary)
			}
			editTypesByRevId.value = next
		}
		if (errors?.length) {
			const nextErr = new Map(editTypesErrorByRevId.value)
			for (const [revId, msg] of errors) {
				nextErr.set(revId, msg)
			}
			editTypesErrorByRevId.value = nextErr
		}
	}

	const structuredDeltasByRevId = computed(() => {
		const map = new Map<number, FWStructuredDeltaResult | null>()
		for (const [revId, summary] of editTypesByRevId.value) {
			if (!summary) {
				map.set(revId, null)
				continue
			}
			map.set(
				revId,
				wiki.getStructuredDeltasFromSummary(summary, {
					highlightCount: highlightCount.value,
					improvedDeltaEnabled: improvedDeltaEnabled.value,
					relativeDetailLevelEnabled: relativeDetailLevelEnabled.value,
					smartFilteringEnabled: smartFilteringEnabled.value,
				})
			)
		}
		return map
	})

	function getMostSignificantSegments(
		revId: number
	): Array<{ text: string; deltaClass: string }> | null {
		return structuredDeltasByRevId.value.get(revId)?.segments ?? null
	}

	function getHighlightedCandidates(revId: number): FWStructuredDeltaCandidate[] | null {
		return structuredDeltasByRevId.value.get(revId)?.highlightedCandidates ?? null
	}

	function getCandidatesForSnippets(revId: number): FWStructuredDeltaCandidate[] | null {
		return structuredDeltasByRevId.value.get(revId)?.candidates ?? null
	}

	function isMostSignificantLoading(revId: number): boolean {
		return improvedDeltaEnabled.value && loadingEditTypesIds.value.has(revId)
	}

	function getDeltaClassForRevision(revisionId: number, delta: number | null | undefined): string {
		const segments = getMostSignificantSegments(revisionId)
		if (segments?.length) return segments[0]?.deltaClass ?? ""
		if (isMostSignificantLoading(revisionId)) return ""
		return wiki.getDeltaClass(delta ?? 0, false)
	}

	if (autoLoad) {
		watch(
			() => revisionIds.value,
			ids => {
				if (!ids || ids.length === 0) return
				scheduleFetchForRevisionIds(ids)
			},
			{ immediate: true }
		)
	}

	return {
		maxHighlightCount,
		highlightCount,
		improvedDeltaEnabled,
		relativeDetailLevelEnabled,
		smartFilteringEnabled,
		editTypesByRevId,
		editTypesErrorByRevId,
		loadingEditTypesIds,
		structuredDeltasByRevId,
		loadEditTypesSummary,
		loadEditTypesSummaries,
		resetStructuredDeltaState,
		hydrateFromEntries,
		getMostSignificantSegments,
		getHighlightedCandidates,
		getCandidatesForSnippets,
		isMostSignificantLoading,
		getDeltaClassForRevision,
	}
}
