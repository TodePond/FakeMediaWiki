import type { FakeWiki } from "fakewiki"
import type { FWRevision } from "fakewiki/types"
import type { Ref } from "vue"
import { computed, ref } from "vue"
import {
	RECOMMENDATION_HISTORY_CONCURRENCY,
	RECOMMENDATION_MAX_PAGES,
	RECOMMENDATION_PROCESS_CONCURRENCY,
} from "./config"

/** Revision with optional recommendation flag (recent change from a recommended page). */
export type FeedRevision = FWRevision & {
	isRecommendation?: true
	groupByTimestamp?: string
}

interface UseRelatedRecommendationsArgs {
	wiki: FakeWiki
	pageSearchQueries: Ref<string[]>
	allRevisionsData: Ref<FWRevision[]>
	filterKeepPercent: Ref<number>
	cacheUserCategory: (
		userName: string,
		category: "unregistered" | "newcomer" | "learner" | "experienced"
	) => void
}

async function runWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const results: R[] = []
	let index = 0
	async function worker(): Promise<void> {
		while (index < items.length) {
			const i = index++
			const item = items[i]
			if (item === undefined) continue
			results[i] = await fn(item)
		}
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
	return results
}

export interface RelatedRecommendationProgress {
	loadedFromCache: boolean
	listBuildingTotal: number
	listBuildingCompleted: number
	found: number
	recommendationsTruncated: boolean
	historiesTotal: number
	historiesLoaded: number
	processingTotal: number
	processingLoaded: number
}

export function useRelatedRecommendations({
	wiki,
	pageSearchQueries,
	allRevisionsData,
	filterKeepPercent,
	cacheUserCategory,
}: UseRelatedRecommendationsArgs) {
	const recommendationRevisions = ref<FeedRevision[]>([])
	/** For each recommended page, the seed page titles (same list for all: the query pages). */
	const recommendationSeedPagesByPage = ref<Map<string, string[]>>(new Map())

	const recommendationProgress = ref<RelatedRecommendationProgress>({
		loadedFromCache: false,
		listBuildingTotal: 0,
		listBuildingCompleted: 0,
		found: 0,
		recommendationsTruncated: false,
		historiesTotal: 0,
		historiesLoaded: 0,
		processingTotal: 0,
		processingLoaded: 0,
	})

	async function loadRecommendations(percent?: number): Promise<string[]> {
		const seedNames = pageSearchQueries.value
			.filter(name => name.trim() !== "")
			.map(name => name.trim())
		const percentage = percent ?? filterKeepPercent.value

		recommendationProgress.value = {
			loadedFromCache: false,
			listBuildingTotal: seedNames.length,
			listBuildingCompleted: 0,
			found: 0,
			recommendationsTruncated: false,
			historiesTotal: 0,
			historiesLoaded: 0,
			processingTotal: 0,
			processingLoaded: 0,
		}

		if (seedNames.length === 0) {
			recommendationRevisions.value = []
			recommendationSeedPagesByPage.value = new Map()
			return []
		}

		const recommendedTitles = await wiki.getTopRelatedPages(seedNames, {
			percentage,
			scoreMultipliers: { bidirectional: 3, outgoing: 2, backlink: 1 },
		})

		recommendationProgress.value = {
			...recommendationProgress.value,
			listBuildingCompleted: seedNames.length,
			found: recommendedTitles.length,
			recommendationsTruncated: true,
		}

		const titlesToLoad = recommendedTitles.slice(0, RECOMMENDATION_MAX_PAGES)
		const seedByPage = new Map<string, string[]>()
		for (const title of titlesToLoad) {
			seedByPage.set(title, seedNames)
			const withUnderscores = title.replace(/\s+/g, "_")
			if (withUnderscores !== title) seedByPage.set(withUnderscores, seedNames)
			const withSpaces = title.replace(/_/g, " ")
			if (withSpaces !== title) seedByPage.set(withSpaces, seedNames)
		}
		recommendationSeedPagesByPage.value = seedByPage

		if (titlesToLoad.length === 0) {
			recommendationRevisions.value = []
			return []
		}

		recommendationRevisions.value = await fetchAndProcessHistories(titlesToLoad)
		return titlesToLoad
	}

	async function fetchAndProcessHistories(recommendedTitles: string[]): Promise<FeedRevision[]> {
		recommendationProgress.value = {
			...recommendationProgress.value,
			historiesTotal: recommendedTitles.length,
			historiesLoaded: 0,
		}
		let historiesLoaded = 0
		const revsByPage = await runWithConcurrency(
			recommendedTitles,
			RECOMMENDATION_HISTORY_CONCURRENCY,
			async pageName => {
				const response = await wiki.getPageHistory(pageName, { limit: 2 })
				historiesLoaded++
				recommendationProgress.value = {
					...recommendationProgress.value,
					historiesLoaded,
				}
				return (response.revisions || []).map(rev => ({
					...rev,
					pageName,
				}))
			}
		)
		const flatRevs = revsByPage.flat()
		recommendationProgress.value = {
			...recommendationProgress.value,
			processingTotal: flatRevs.length,
			processingLoaded: 0,
		}
		let processingLoaded = 0
		const processed = await runWithConcurrency(
			flatRevs,
			RECOMMENDATION_PROCESS_CONCURRENCY,
			async revision => {
				const pageName = (revision as { pageName: string }).pageName
				const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName)
				const toolbar = wiki.parseToolbarEditSummary(_summary)
				const summary = toolbar
					? toolbar
					: {
							comment: _summary,
							hashtags: [],
							other: [],
							suggestedBy: null,
							useThisBot: null,
							reportBugs: null,
						}
				const commentText = summary.comment
					? summary.comment +
						(summary.suggestedBy
							? " Suggested by [[User:" +
								summary.suggestedBy +
								"|" +
								summary.suggestedBy +
								"]]"
							: "")
					: ""
				summary.comment = commentText
					? await wiki.transformWikitextToHtml(commentText, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const userCategory = await wiki.getUserCategory(revision.user.name)
				cacheUserCategory(revision.user.name, userCategory)
				processingLoaded++
				recommendationProgress.value = {
					...recommendationProgress.value,
					processingLoaded,
				}
				return {
					...revision,
					comment: revision.comment || "",
					summary,
					pageName,
					avatarUrl: null,
					isRecommendation: true as const,
				} as FeedRevision
			}
		)
		processed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		return processed
	}

	const interleavedRevisions = computed((): FeedRevision[] => {
		const main = allRevisionsData.value as FeedRevision[]
		const recs = recommendationRevisions.value
		if (recs.length === 0) return main
		if (main.length === 0) return recs
		const oldestMainTs = main.reduce(
			(acc, r) => (r.timestamp < acc ? r.timestamp : acc),
			main[0]!.timestamp
		)
		const recsFiltered = recs.filter(r => r.timestamp >= oldestMainTs)
		const mainIds = new Set(main.map(r => r.id))
		const recsDeduped = recsFiltered.filter(r => !mainIds.has(r.id))
		return [...main, ...recsDeduped]
	})

	function getRecommendationSeedPages(pageName: string): string[] {
		const map = recommendationSeedPagesByPage.value
		const trimmed = pageName?.trim()
		if (!trimmed) return []
		const exact = map.get(trimmed)
		if (exact?.length) return exact
		const withUnderscores = trimmed.replace(/\s+/g, "_")
		const withSpaces = trimmed.replace(/_/g, " ")
		return map.get(withUnderscores) ?? map.get(withSpaces) ?? []
	}

	return {
		recommendationRevisions,
		recommendationProgress,
		loadRecommendations,
		interleavedRevisions,
		getRecommendationSeedPages,
	}
}
