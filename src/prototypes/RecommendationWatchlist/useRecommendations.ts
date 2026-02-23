import type { FakeWiki } from "fakewiki"
import type { FWRevision } from "fakewiki/types"
import type { Ref } from "vue"
import { computed, ref } from "vue"
import {
	RECOMMENDATION_HISTORY_CONCURRENCY,
	RECOMMENDATION_LANG,
	RECOMMENDATION_MAX_PAGES,
	RECOMMENDATION_PROCESS_CONCURRENCY,
} from "./config"

/** Revision with optional recommendation flag (recent change from a recommended page). */
export type FeedRevision = FWRevision & {
	isRecommendation?: true
	/** If set, use for date grouping so recs appear in the same date section as the main feed they're interleaved with. */
	groupByTimestamp?: string
}

interface UseRecommendationsArgs {
	wiki: FakeWiki
	pageSearchQueries: Ref<string[]>
	allRevisionsData: Ref<FWRevision[]>
	cacheUserCategory: (
		userName: string,
		category: "unregistered" | "newcomer" | "learner" | "experienced"
	) => void
}

/** Run async tasks with a concurrency limit; returns results in input order. */
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

export interface RecommendationProgress {
	/** True when current recommendations were restored from cache (no list-building run). */
	loadedFromCache: boolean
	/** Total seed pages to fetch in list-building phase. */
	listBuildingTotal: number
	/** Seed pages merged so far (from getMultiPageListBuilding onLoad). */
	listBuildingCompleted: number
	/** Number of recommended pages (candidates before truncation, or found after). */
	found: number
	/** True once we have truncated to the final N and set found to that count. */
	recommendationsTruncated: boolean
	/** Total number of page histories we will load. */
	historiesTotal: number
	/** Number of page histories loaded so far. */
	historiesLoaded: number
	/** Total revisions to process (summary HTML, user category). */
	processingTotal: number
	/** Revisions processed so far. */
	processingLoaded: number
}

export function useRecommendations({
	wiki,
	pageSearchQueries,
	allRevisionsData,
	cacheUserCategory,
}: UseRecommendationsArgs) {
	/** Revisions from recommended pages (from getMultiPageListBuilding). */
	const recommendationRevisions = ref<FeedRevision[]>([])
	/** Full list of candidate titles from last list-building (for load more). */
	const allCandidateTitles = ref<string[]>([])
	/** Number of candidate titles we have already loaded history for. */
	const loadedCandidateCount = ref(0)
	/** Progress during loadRecommendations: list-building and histories loaded. */
	const recommendationProgress = ref<RecommendationProgress>({
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

	async function loadRecommendations(): Promise<string[]> {
		const pageNames = pageSearchQueries.value
			.filter(name => name.trim() !== "")
			.map(name => name.trim())
		recommendationProgress.value = {
			loadedFromCache: false,
			listBuildingTotal: pageNames.length,
			listBuildingCompleted: 0,
			found: 0,
			recommendationsTruncated: false,
			historiesTotal: 0,
			historiesLoaded: 0,
			processingTotal: 0,
			processingLoaded: 0,
		}
		if (pageNames.length === 0) {
			recommendationRevisions.value = []
			return []
		}
		const { entries } = await wiki.getMultiPageListBuilding(RECOMMENDATION_LANG, pageNames, {
			k: 10,
			onLoad: ({ entries: loadedEntries, completedCount }) => {
				recommendationProgress.value = {
					...recommendationProgress.value,
					found: loadedEntries.length,
					listBuildingCompleted: completedCount,
				}
			},
		})
		// Entries are already deduped and sorted; keep full list for load more.
		const allTitles = entries.map(e => e.item.page_title.trim())
		allCandidateTitles.value = allTitles
		loadedCandidateCount.value = 0
		const recommendedTitles = allTitles.slice(0, RECOMMENDATION_MAX_PAGES)
		if (recommendedTitles.length === 0) {
			recommendationRevisions.value = []
			loadedCandidateCount.value = 0
			return []
		}
		recommendationRevisions.value = await fetchAndProcessHistories(recommendedTitles)
		loadedCandidateCount.value = recommendedTitles.length
		return recommendedTitles
	}

	/**
	 * Load recommendation revisions from a list of page titles only (skip list-building).
	 * Use when restoring from cache. Returns the same titles on success.
	 */
	async function loadRecommendationsFromTitles(titles: string[]): Promise<string[]> {
		if (titles.length === 0) {
			recommendationRevisions.value = []
			allCandidateTitles.value = []
			loadedCandidateCount.value = 0
			return []
		}
		recommendationProgress.value = {
			loadedFromCache: true,
			listBuildingTotal: titles.length,
			listBuildingCompleted: titles.length,
			found: titles.length,
			recommendationsTruncated: true,
			historiesTotal: titles.length,
			historiesLoaded: 0,
			processingTotal: 0,
			processingLoaded: 0,
		}
		allCandidateTitles.value = titles
		loadedCandidateCount.value = 0
		recommendationRevisions.value = await fetchAndProcessHistories(titles)
		loadedCandidateCount.value = titles.length
		return titles
	}

	/**
	 * Load the next batch of recommendation page histories and append to the list.
	 * No-op if no more candidates.
	 */
	async function loadMoreRecommendations(): Promise<void> {
		const all = allCandidateTitles.value
		const loaded = loadedCandidateCount.value
		if (loaded >= all.length) return
		const nextBatch = all.slice(loaded, loaded + RECOMMENDATION_MAX_PAGES)
		if (nextBatch.length === 0) return
		const existing = recommendationRevisions.value
		const newRevs = await fetchAndProcessHistories(nextBatch)
		recommendationRevisions.value = [...existing, ...newRevs].sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)
		loadedCandidateCount.value = loaded + nextBatch.length
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

	/** Combined list: main feed plus recommendation revisions not older than oldest main. */
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
		return [...main, ...recsFiltered]
	})

	return {
		recommendationRevisions,
		recommendationProgress,
		loadRecommendations,
		loadRecommendationsFromTitles,
		loadMoreRecommendations,
		hasMoreRecommendations: computed(() => loadedCandidateCount.value < allCandidateTitles.value.length),
		interleavedRevisions,
	}
}
