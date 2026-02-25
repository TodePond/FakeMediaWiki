import type { FakeWiki } from "fakewiki"
import type { FWPageHistoryRevision, FWRevision } from "fakewiki/types"
import type { Ref } from "vue"
import { ref } from "vue"

interface UseFeedArgs {
	wiki: FakeWiki
	pageSearchQueries: Ref<string[]>
	userSearchQueries: Ref<string[]>
	onUserCategory: (
		userName: string,
		category: "unregistered" | "newcomer" | "learner" | "experienced"
	) => void
}

export function useFeed({
	wiki,
	pageSearchQueries,
	userSearchQueries,
	onUserCategory,
}: UseFeedArgs) {
	// Combined feed results
	const allRevisionsData = ref<FWRevision[]>([])
	const isLoading = ref(false)
	const isLoadingMore = ref(false)
	const errors = ref<string[]>([])
	const hasMore = ref(true) // Whether there are more revisions to load

	async function loadFeed(after?: Record<string, string>, append = false): Promise<void> {
		if (!append) {
			isLoading.value = true
			errors.value = []
		} else {
			isLoadingMore.value = true
		}

		const pageNames = pageSearchQueries.value.filter(name => name.trim() !== "")
		const userNames = userSearchQueries.value.filter(name => name.trim() !== "")

		try {
			const revisions = await wiki.getCombinedFeed({
				pageNames,
				userNames,
				limit: 20,
				after,
			})

			const processedRevisions = await Promise.all(
				revisions.map(async revision => {
					const pageName =
						(revision as FWPageHistoryRevision & { pageName?: string }).pageName || ""
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
					const processedRevision: FWRevision = {
						...revision,
						comment: revision.comment || "",
						summary,
						pageName,
						avatarUrl: null,
					}
					const userCategory = await wiki.getUserCategory(revision.user.name)
					onUserCategory(revision.user.name, userCategory)
					return processedRevision
				})
			)

			if (append) {
				const existingIds = new Set(allRevisionsData.value.map(r => r.id))
				const newRevisions = processedRevisions.filter(r => !existingIds.has(r.id))
				const merged = [...allRevisionsData.value, ...newRevisions].sort(
					(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
				allRevisionsData.value = merged
				hasMore.value = newRevisions.length > 0
			} else {
				allRevisionsData.value = processedRevisions
				hasMore.value = processedRevisions.length === 20
			}

			isLoading.value = false
			isLoadingMore.value = false
		} catch (e) {
			isLoading.value = false
			isLoadingMore.value = false
			const errorObj = e as Error
			if (!append) {
				errors.value = [errorObj.message]
				allRevisionsData.value = []
			}
			hasMore.value = false
		}
	}

	async function loadMore(): Promise<void> {
		if (allRevisionsData.value.length === 0) return
		const pageNames = pageSearchQueries.value.filter(name => name.trim() !== "")
		const userNames = userSearchQueries.value.filter(name => name.trim() !== "")
		const afterMap: Record<string, string> = {}
		for (const pageName of pageNames) {
			const revs = allRevisionsData.value.filter(r => r.pageName === pageName)
			if (revs.length > 0) {
				afterMap[pageName] = String(Math.min(...revs.map(r => r.id)))
			}
		}
		for (const userName of userNames) {
			const revs = allRevisionsData.value.filter(r => r.user?.name === userName)
			if (revs.length > 0) {
				afterMap[userName] = String(Math.min(...revs.map(r => r.id)))
			}
		}
		if (Object.keys(afterMap).length === 0) return
		await loadFeed(afterMap, true)
	}

	return {
		allRevisionsData,
		isLoading,
		isLoadingMore,
		errors,
		hasMore,
		loadFeed,
		loadMore,
	}
}
