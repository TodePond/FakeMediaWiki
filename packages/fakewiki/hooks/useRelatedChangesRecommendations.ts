import type { FWRevision } from "fakewiki/types"
import type { Ref } from "vue"
import { computed, ref } from "vue"
import { FakeWiki } from "../FakeWiki"

/** Revision with optional recommendation flag (recent change from a recommended page). */
export type FeedRevisionRelatedChanges = FWRevision & {
	isRecommendation?: true
	groupByTimestamp?: string
	score?: number
	feedCountBidirectional?: number
	feedCountOutgoing?: number
	feedCountBacklink?: number
}

export interface UseRelatedChangesRecommendationsOptions {
	recommendationHistoryLimit?: number
	recommendationMaxPages?: number
	recommendationProcessConcurrency?: number
	defaultTopPercent?: number
}

const DEFAULT_RECOMMENDATION_HISTORY_LIMIT = 20
const DEFAULT_RECOMMENDATION_MAX_PAGES = 12
const DEFAULT_RECOMMENDATION_PROCESS_CONCURRENCY = 3

export interface UseRelatedChangesRecommendationsArgs {
	wiki: FakeWiki
	pageSearchQueries: Ref<string[]>
	allRevisionsData: Ref<FWRevision[]>
	filterKeepPercent: Ref<number>
	options?: UseRelatedChangesRecommendationsOptions
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

export function useRelatedChangesRecommendations({
	wiki,
	pageSearchQueries,
	allRevisionsData,
	filterKeepPercent,
	options: opts,
}: UseRelatedChangesRecommendationsArgs) {
	const recommendationHistoryLimit =
		opts?.recommendationHistoryLimit ?? DEFAULT_RECOMMENDATION_HISTORY_LIMIT
	const recommendationMaxPages = opts?.recommendationMaxPages ?? DEFAULT_RECOMMENDATION_MAX_PAGES
	const recommendationProcessConcurrency =
		opts?.recommendationProcessConcurrency ?? DEFAULT_RECOMMENDATION_PROCESS_CONCURRENCY

	const recommendationSeedPagesByPage = ref<Map<string, string[]>>(new Map())
	const recommendedPageNames = ref<string[]>([])
	const recommendationRevisions = ref<FeedRevisionRelatedChanges[]>([])
	const pageScoreByPage = ref<Map<string, number>>(new Map())

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

	async function processOneRevision(
		revision: FWRevision & { pageName: string },
		pageName: string,
		scoreByPage: Map<string, number>
	): Promise<FeedRevisionRelatedChanges> {
		const pageScore =
			scoreByPage.get(pageName) ??
			scoreByPage.get(pageName.replace(/\s+/g, "_")) ??
			scoreByPage.get(pageName.replace(/_/g, " "))
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
		await wiki.getUserCategory(revision.user.name)
		return {
			...revision,
			comment: revision.comment || "",
			summary,
			pageName,
			avatarUrl: null,
			isRecommendation: true as const,
			...(pageScore !== undefined && { score: pageScore }),
		} as FeedRevisionRelatedChanges
	}

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
			recommendationSeedPagesByPage.value = new Map()
			recommendedPageNames.value = []
			pageScoreByPage.value = new Map()
			return []
		}

		const { pages: pagesWithScores, changes } = await wiki.getTopRelatedPages(seedNames, {
			percentage,
			limit: recommendationHistoryLimit,
		})

		recommendationProgress.value = {
			...recommendationProgress.value,
			listBuildingCompleted: seedNames.length,
			found: pagesWithScores.length,
			recommendationsTruncated: true,
		}

		const recommendedTitles = pagesWithScores.map(p => p.title)
		const seedByPage = new Map<string, string[]>()
		const scoreByPage = new Map<string, number>()
		for (const c of changes) {
			const pageName = c.pageName?.trim()
			if (pageName && c.sourcePageNames?.length) {
				const existing = seedByPage.get(pageName) ?? []
				const combined = [...new Set([...existing, ...c.sourcePageNames])]
				seedByPage.set(pageName, combined)
				const withUnderscores = pageName.replace(/\s+/g, "_")
				if (withUnderscores !== pageName) seedByPage.set(withUnderscores, combined)
				const withSpaces = pageName.replace(/_/g, " ")
				if (withSpaces !== pageName) seedByPage.set(withSpaces, combined)
			}
		}
		for (const { title, score } of pagesWithScores) {
			if (!seedByPage.has(title)) seedByPage.set(title, seedNames)
			scoreByPage.set(title, score)
			const withUnderscores = title.replace(/\s+/g, "_")
			if (withUnderscores !== title) {
				if (!seedByPage.has(withUnderscores)) seedByPage.set(withUnderscores, seedNames)
				scoreByPage.set(withUnderscores, score)
			}
			const withSpaces = title.replace(/_/g, " ")
			if (withSpaces !== title) {
				if (!seedByPage.has(withSpaces)) seedByPage.set(withSpaces, seedNames)
				scoreByPage.set(withSpaces, score)
			}
		}
		recommendationSeedPagesByPage.value = seedByPage
		pageScoreByPage.value = scoreByPage

		const titlesToLoad = recommendedTitles.slice(0, recommendationMaxPages)
		recommendedPageNames.value = titlesToLoad

		if (titlesToLoad.length === 0) {
			recommendationRevisions.value = []
			return []
		}

		const main = allRevisionsData.value
		const oldestUserTs =
			main.length > 0 ? Math.min(...main.map(r => new Date(r.timestamp).getTime())) : 0

		recommendationProgress.value = {
			...recommendationProgress.value,
			historiesTotal: 1,
			historiesLoaded: 0,
			processingTotal: 0,
			processingLoaded: 0,
		}
		const allProcessed: FeedRevisionRelatedChanges[] = []
		let afterMap: Record<string, string> | undefined
		let fetchRound = 0
		const processingLoadedCount = ref(0)
		const processingTotalCount = ref(0)

		while (true) {
			fetchRound++
			recommendationProgress.value = {
				...recommendationProgress.value,
				historiesLoaded: fetchRound,
			}
			const revisions = await wiki.getCombinedFeed({
				pageNames: titlesToLoad,
				limit: recommendationHistoryLimit,
				after: afterMap,
			})
			if (revisions.length === 0) break
			processingTotalCount.value += revisions.length
			recommendationProgress.value = {
				...recommendationProgress.value,
				processingTotal: processingTotalCount.value,
			}
			const processed = await Promise.all(
				revisions.map(async rev => {
					const pageName = (rev as FWRevision & { pageName?: string }).pageName ?? ""
					const processedRev = await processOneRevision(
						{ ...rev, pageName } as FWRevision & { pageName: string },
						pageName,
						scoreByPage
					)
					processingLoadedCount.value++
					recommendationProgress.value = {
						...recommendationProgress.value,
						processingLoaded: processingLoadedCount.value,
					}
					return processedRev
				})
			)
			const oldestInBatch = processed.reduce((a, b) =>
				new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? a : b
			)
			allProcessed.push(...processed)
			if (oldestUserTs > 0 && new Date(oldestInBatch.timestamp).getTime() <= oldestUserTs) {
				break
			}
			if (revisions.length < recommendationHistoryLimit) break
			afterMap = {}
			for (const pageName of titlesToLoad) {
				const revsForPage = allProcessed.filter(r => r.pageName === pageName)
				if (revsForPage.length > 0) {
					const oldestId = Math.min(...revsForPage.map(r => r.id))
					afterMap[pageName] = String(oldestId)
				}
			}
			if (Object.keys(afterMap).length === 0) break
		}

		allProcessed.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)
		recommendationRevisions.value = allProcessed
		return titlesToLoad
	}

	async function loadMoreRecommendations(): Promise<void> {
		const main = allRevisionsData.value
		let recs = recommendationRevisions.value
		const pages = recommendedPageNames.value
		if (recs.length === 0 || main.length === 0 || pages.length === 0) return
		const oldestUserTs = Math.min(...main.map(r => new Date(r.timestamp).getTime()))
		const scoreByPage = pageScoreByPage.value
		const existingIds = new Set(recs.map(r => r.id))

		while (true) {
			const oldestRec = recs.reduce((a, b) =>
				new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? a : b
			)
			const oldestRecTs = new Date(oldestRec.timestamp).getTime()
			if (oldestRecTs <= oldestUserTs) break
			const afterMap: Record<string, string> = {}
			for (const pageName of pages) {
				const revsForPage = recs.filter(r => r.pageName === pageName)
				if (revsForPage.length > 0) {
					afterMap[pageName] = String(Math.min(...revsForPage.map(r => r.id)))
				}
			}
			if (Object.keys(afterMap).length === 0) break
			const revisions = await wiki.getCombinedFeed({
				pageNames: pages,
				limit: recommendationHistoryLimit,
				after: afterMap,
			})
			if (revisions.length === 0) break
			const newRevs = revisions.filter(r => !existingIds.has(r.id))
			if (newRevs.length === 0) break
			for (const r of newRevs) existingIds.add(r.id)
			const processed = await wiki.runWithConcurrency(
				newRevs.map(rev => ({
					...rev,
					pageName: (rev as FWRevision & { pageName?: string }).pageName ?? "",
				})) as (FWRevision & { pageName: string })[],
				recommendationProcessConcurrency,
				async revision => processOneRevision(revision, revision.pageName, scoreByPage)
			)
			recs = [...recs, ...processed].sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			recommendationRevisions.value = recs
			if (revisions.length < recommendationHistoryLimit) break
			const oldestInBatch = processed.reduce((a, b) =>
				new Date(a.timestamp).getTime() < new Date(b.timestamp).getTime() ? a : b
			)
			if (new Date(oldestInBatch.timestamp).getTime() <= oldestUserTs) break
		}
	}

	/** Main feed (watchlist) plus recommendation revs not already in the feed (deduped by id). */
	const interleavedRevisions = computed((): FeedRevisionRelatedChanges[] => {
		const main = allRevisionsData.value
		const recs = recommendationRevisions.value
		const oldestUserTs =
			main.length > 0 ? Math.min(...main.map(r => new Date(r.timestamp).getTime())) : 0
		const mainIds = new Set(main.map(r => r.id))
		const recsOnly = recs.filter(r => !mainIds.has(r.id))
		const combined = [...main, ...recsOnly]
		const notOlderThanWatchlist =
			oldestUserTs > 0
				? combined.filter(r => new Date(r.timestamp).getTime() >= oldestUserTs)
				: combined
		return notOlderThanWatchlist.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)
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

	const isRecommendationsLoading = computed(() => {
		const p = recommendationProgress.value
		if (p.listBuildingTotal > 0 && p.listBuildingCompleted < p.listBuildingTotal) return true
		if (p.historiesTotal > 0 && p.historiesLoaded < p.historiesTotal) return true
		if (p.processingTotal > 0 && p.processingLoaded < p.processingTotal) return true
		return false
	})

	return {
		recommendationProgress,
		recommendedPageNames,
		loadRecommendations,
		loadMoreRecommendations,
		interleavedRevisions,
		getRecommendationSeedPages,
		isRecommendationsLoading,
	}
}
