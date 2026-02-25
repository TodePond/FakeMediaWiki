import { FakeWiki } from "../FakeWiki"
import type { FWRevision } from "fakewiki/types"
import type { Ref } from "vue"
import { computed, ref } from "vue"

/** Revision with optional recommendation flag (recent change from a recommended page). */
export type FeedRevisionListBuilding = FWRevision & {
	isRecommendation?: true
	groupByTimestamp?: string
}

export interface UseListBuildingRecommendationsOptions {
	recommendationLang?: string
	recommendationMaxPages?: number
	recommendationHistoryConcurrency?: number
	recommendationProcessConcurrency?: number
}

const DEFAULT_RECOMMENDATION_LANG = "en"
const DEFAULT_RECOMMENDATION_MAX_PAGES = 12
const DEFAULT_RECOMMENDATION_HISTORY_CONCURRENCY = 2
const DEFAULT_RECOMMENDATION_PROCESS_CONCURRENCY = 3

export interface UseListBuildingRecommendationsArgs {
	wiki: FakeWiki
	pageSearchQueries: Ref<string[]>
	allRevisionsData: Ref<FWRevision[]>
	cacheUserCategory: (
		_userName: string,
		_category: "unregistered" | "newcomer" | "learner" | "experienced"
	) => void
	options?: UseListBuildingRecommendationsOptions
}

export interface ListBuildingRecommendationProgress {
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

export function useListBuildingRecommendations({
	wiki,
	pageSearchQueries,
	allRevisionsData,
	cacheUserCategory,
	options: opts,
}: UseListBuildingRecommendationsArgs) {
	const recommendationLang = opts?.recommendationLang ?? DEFAULT_RECOMMENDATION_LANG
	const recommendationMaxPages = opts?.recommendationMaxPages ?? DEFAULT_RECOMMENDATION_MAX_PAGES
	const recommendationHistoryConcurrency =
		opts?.recommendationHistoryConcurrency ?? DEFAULT_RECOMMENDATION_HISTORY_CONCURRENCY
	const recommendationProcessConcurrency =
		opts?.recommendationProcessConcurrency ?? DEFAULT_RECOMMENDATION_PROCESS_CONCURRENCY

	const recommendationRevisions = ref<FeedRevisionListBuilding[]>([])
	const recommendationSeedPagesByPage = ref<Map<string, string[]>>(new Map())
	const allCandidateTitles = ref<string[]>([])
	const loadedCandidateCount = ref(0)
	const recommendationProgress = ref<ListBuildingRecommendationProgress>({
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

	async function fetchAndProcessHistories(
		recommendedTitles: string[]
	): Promise<FeedRevisionListBuilding[]> {
		recommendationProgress.value = {
			...recommendationProgress.value,
			historiesTotal: recommendedTitles.length,
			historiesLoaded: 0,
		}
		let historiesLoaded = 0
		const revsByPage = await wiki.runWithConcurrency(
			recommendedTitles,
			recommendationHistoryConcurrency,
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
		const processed = await wiki.runWithConcurrency(
			flatRevs,
			recommendationProcessConcurrency,
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
				} as FeedRevisionListBuilding
			}
		)
		processed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		return processed
	}

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
		const { entries } = await wiki.getMultiPageListBuilding(recommendationLang, pageNames, {
			k: 10,
			onLoad: ({ entries: loadedEntries, completedCount }) => {
				recommendationProgress.value = {
					...recommendationProgress.value,
					found: loadedEntries.length,
					listBuildingCompleted: completedCount,
				}
			},
		})
		const seedByPage = new Map<string, string[]>()
		for (const e of entries) {
			const raw = e.item.page_title?.trim()
			if (!raw || !e.pageTitles?.length) continue
			seedByPage.set(raw, e.pageTitles)
			const withUnderscores = raw.replace(/\s+/g, "_")
			if (withUnderscores !== raw) seedByPage.set(withUnderscores, e.pageTitles)
			const withSpaces = raw.replace(/_/g, " ")
			if (withSpaces !== raw) seedByPage.set(withSpaces, e.pageTitles)
		}
		recommendationSeedPagesByPage.value = seedByPage
		const allTitles = entries.map(e => e.item.page_title.trim())
		allCandidateTitles.value = allTitles
		loadedCandidateCount.value = 0
		const recommendedTitles = allTitles.slice(0, recommendationMaxPages)
		if (recommendedTitles.length === 0) {
			recommendationRevisions.value = []
			loadedCandidateCount.value = 0
			return []
		}
		recommendationRevisions.value = await fetchAndProcessHistories(recommendedTitles)
		loadedCandidateCount.value = recommendedTitles.length
		return recommendedTitles
	}

	async function loadRecommendationsFromTitles(
		titles: string[],
		seedPagesByPage?: Record<string, string[]>
	): Promise<string[]> {
		if (titles.length === 0) {
			recommendationRevisions.value = []
			allCandidateTitles.value = []
			recommendationSeedPagesByPage.value = new Map()
			loadedCandidateCount.value = 0
			return []
		}
		if (seedPagesByPage && Object.keys(seedPagesByPage).length > 0) {
			const map = new Map<string, string[]>()
			for (const [page, seeds] of Object.entries(seedPagesByPage)) {
				if (seeds?.length) {
					map.set(page.trim(), seeds)
					const withUnderscores = page.trim().replace(/\s+/g, "_")
					if (withUnderscores !== page.trim()) map.set(withUnderscores, seeds)
					const withSpaces = page.trim().replace(/_/g, " ")
					if (withSpaces !== page.trim()) map.set(withSpaces, seeds)
				}
			}
			recommendationSeedPagesByPage.value = map
		} else {
			recommendationSeedPagesByPage.value = new Map()
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

	async function loadMoreRecommendations(): Promise<void> {
		const all = allCandidateTitles.value
		const loaded = loadedCandidateCount.value
		if (loaded >= all.length) return
		const nextBatch = all.slice(loaded, loaded + recommendationMaxPages)
		if (nextBatch.length === 0) return
		const existing = recommendationRevisions.value
		const newRevs = await fetchAndProcessHistories(nextBatch)
		recommendationRevisions.value = [...existing, ...newRevs].sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)
		loadedCandidateCount.value = loaded + nextBatch.length
	}

	const interleavedRevisions = computed((): FeedRevisionListBuilding[] => {
		const main = allRevisionsData.value as FeedRevisionListBuilding[]
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

	function getRecommendationSeedPagesMap(): Map<string, string[]> {
		return recommendationSeedPagesByPage.value
	}

	return {
		recommendationRevisions,
		recommendationProgress,
		loadRecommendations,
		loadRecommendationsFromTitles,
		loadMoreRecommendations,
		hasMoreRecommendations: computed(
			() => loadedCandidateCount.value < allCandidateTitles.value.length
		),
		interleavedRevisions,
		getRecommendationSeedPages,
		getRecommendationSeedPagesMap,
	}
}
