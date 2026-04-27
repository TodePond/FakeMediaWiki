import type { FakeWiki } from "fakewiki"
import type {
	FWRevisionWithLinkType,
	FWTopRelatedChange,
} from "fakewiki/types"
import type { Ref } from "vue"
import { ref } from "vue"

const DEFAULT_LIMIT_SINGLE = 50
const DEFAULT_DAYS_SINGLE = 30
const DEFAULT_LIMIT_MULTI = 20
const DEFAULT_DAYS_MULTI = 7

/** Summary shape used by both single- and multi-page related changes. */
export interface RelatedChangeSummary {
	comment: string
	hashtags: string[]
	other: string[]
	suggestedBy: string | null
	useThisBot: string | null
	reportBugs: string | null
}

/** Enriched revision from single-page getRelatedChanges. */
export type RelatedChangeRevisionSingle = FWRevisionWithLinkType & {
	summary: RelatedChangeSummary
}

/** Revision with feed counts (from getTopRelatedChanges). */
export type RelatedChangeRevisionMulti = FWTopRelatedChange & {
	feedCount: number
	summary: RelatedChangeSummary
}

export type RelatedChangeRevision = RelatedChangeRevisionSingle | RelatedChangeRevisionMulti

export interface UseRelatedChangesOptions {
	limitSingle?: number
	daysSingle?: number
	limitMulti?: number
	daysMulti?: number
}

export interface UseRelatedChangesArgs {
	wiki: FakeWiki
	pageName: Ref<string>
	options?: UseRelatedChangesOptions
}

/**
 * Loads related changes for a single page (getRelatedChanges) or multiple seeds (getTopRelatedChanges) and normalizes comment HTML.
 * @example
 * ```ts
 * import { ref } from "vue"
 * import { FakeWiki, useRelatedChanges } from "fakewiki"
 * const wiki = new FakeWiki()
 * const pageName = ref("Cat")
 * const { loadFeed } = useRelatedChanges({ wiki, pageName, options: {} })
 * await loadFeed()
 * ```
 */
export function useRelatedChanges({
	wiki,
	pageName,
	options: opts,
}: UseRelatedChangesArgs) {
	const limitSingle = opts?.limitSingle ?? DEFAULT_LIMIT_SINGLE
	const daysSingle = opts?.daysSingle ?? DEFAULT_DAYS_SINGLE
	const limitMulti = opts?.limitMulti ?? DEFAULT_LIMIT_MULTI
	const daysMulti = opts?.daysMulti ?? DEFAULT_DAYS_MULTI

	const allRevisionsData = ref<RelatedChangeRevision[]>([])
	const isLoading = ref(false)
	const errors = ref<string[]>([])

	async function loadFeed(): Promise<void> {
		const raw = pageName.value.trim()
		if (!raw) {
			allRevisionsData.value = []
			errors.value = []
			return
		}

		const hasComma = raw.includes(",")
		if (!hasComma) {
			// Single page: getRelatedChanges
			isLoading.value = true
			errors.value = []
			try {
				const d = new Date()
				d.setDate(d.getDate() - daysSingle)
				const from = d.toISOString()
				const revisions = await wiki.getRelatedChanges(raw, {
					showOutgoing: true,
					showIncoming: true,
					limit: limitSingle,
					days: daysSingle,
					from,
				})
				const enriched: RelatedChangeRevisionSingle[] = await Promise.all(
					revisions.map(async rev => {
						await wiki.getUserCategory(rev.user.name)
						const comment = rev.comment ?? ""
						return {
							...rev,
							comment,
							summary: {
								comment,
								hashtags: [],
								other: [],
								suggestedBy: null,
								useThisBot: null,
								reportBugs: null,
							},
						}
					})
				)
				allRevisionsData.value = enriched
			} catch (e) {
				const errorObj = e as Error
				errors.value = [errorObj.message]
				allRevisionsData.value = []
			} finally {
				isLoading.value = false
			}
			return
		}

		// Multi page: getTopRelatedChanges
		const pageNames = [
			...new Set(
				raw
					.split(",")
					.map(s => s.trim())
					.filter(Boolean)
			),
		]
		if (pageNames.length === 0) {
			allRevisionsData.value = []
			errors.value = []
			return
		}

		isLoading.value = true
		errors.value = []
		try {
			const d = new Date()
			d.setDate(d.getDate() - daysMulti)
			const from = d.toISOString()
			const topChanges = await wiki.getTopRelatedChanges(pageNames, {
				percentage: 100,
				limit: limitMulti,
				days: daysMulti,
				from,
			})
			const enriched: RelatedChangeRevisionMulti[] = await Promise.all(
				topChanges.map(async r => {
					await wiki.getUserCategory(r.user.name)
					const comment = r.comment ?? ""
					const sourcePageNames = r.sourcePageNames ?? []
					return {
						...r,
						comment,
						summary: {
							comment,
							hashtags: [],
							other: [],
							suggestedBy: null,
							useThisBot: null,
							reportBugs: null,
						},
						feedCount: sourcePageNames.length,
					}
				})
			)
			allRevisionsData.value = enriched
		} catch (e) {
			const errorObj = e as Error
			errors.value = [errorObj.message]
			allRevisionsData.value = []
		} finally {
			isLoading.value = false
		}
	}

	return {
		allRevisionsData,
		isLoading,
		errors,
		loadFeed,
	}
}
