import type { FakeWiki } from "fakewiki"
import type {
	FWEditTypesDiffSummary,
	FWStructuredDeltaResult,
	FWStructuredDeltaSettings,
} from "fakewiki/types"
import type { Ref } from "vue"
import { computed, ref, watch } from "vue"

export interface UseStructuredDeltasArgs {
	wiki: FakeWiki
	revisionIds: Ref<number[]>
	initialSettings?: Partial<FWStructuredDeltaSettings>
	autoLoad?: boolean
}

export function useStructuredDeltas({
	wiki,
	revisionIds,
	initialSettings,
	autoLoad = true,
}: UseStructuredDeltasArgs) {
	const defaults = wiki.DEFAULT_STRUCTURED_DELTA_SETTINGS
	const maxHighlightCount = wiki.STRUCTURED_DELTA_MAX_HIGHLIGHT_COUNT

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

	const editTypesByRevId = ref<Map<number, FWEditTypesDiffSummary | null>>(new Map())
	const editTypesErrorByRevId = ref<Map<number, string>>(new Map())
	const loadingEditTypesIds = ref<Set<number>>(new Set())

	function loadEditTypesSummary(revId: number): void {
		if (editTypesByRevId.value.has(revId) || editTypesErrorByRevId.value.has(revId)) return
		loadingEditTypesIds.value = new Set(loadingEditTypesIds.value).add(revId)
		wiki.getEditTypesSummary(revId)
			.then(summary => {
				const normalized = wiki.normalizeStructuredDeltaSummary(summary as Record<string, unknown>)
				editTypesByRevId.value = new Map(editTypesByRevId.value).set(
					revId,
					normalized ?? (summary as FWEditTypesDiffSummary)
				)
				editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value)
				editTypesErrorByRevId.value.delete(revId)
				loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
				loadingEditTypesIds.value.delete(revId)
			})
			.catch(e => {
				const msg = e instanceof Error ? e.message : String(e)
				editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value).set(revId, msg)
				editTypesByRevId.value = new Map(editTypesByRevId.value).set(revId, null)
				loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
				loadingEditTypesIds.value.delete(revId)
			})
	}

	function loadEditTypesSummaries(revisionIdList: number[]): void {
		for (const revisionId of revisionIdList) {
			loadEditTypesSummary(revisionId)
		}
	}

	function resetStructuredDeltaState(): void {
		editTypesByRevId.value = new Map()
		editTypesErrorByRevId.value = new Map()
		loadingEditTypesIds.value = new Set()
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
				loadEditTypesSummaries(ids)
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
		getMostSignificantSegments,
		isMostSignificantLoading,
		getDeltaClassForRevision,
	}
}
