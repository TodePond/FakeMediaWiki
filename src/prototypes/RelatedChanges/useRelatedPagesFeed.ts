import type { FakeWiki } from "fakewiki"
import type { FWRevisionWithLinkType } from "fakewiki/types"
import type { Ref } from "vue"
import { ref } from "vue"

const INITIAL_LIMIT = 20
const LIMIT_INCREMENT = 20

interface UseRelatedPagesFeedArgs {
	wiki: FakeWiki
	pageName: Ref<string>
	onUserCategory: (
		userName: string,
		category: "unregistered" | "newcomer" | "learner" | "experienced"
	) => void
}

export function useRelatedPagesFeed({ wiki, pageName, onUserCategory }: UseRelatedPagesFeedArgs) {
	const allRevisionsData = ref<FWRevisionWithLinkType[]>([])
	const isLoading = ref(false)
	const isLoadingMore = ref(false)
	const errors = ref<string[]>([])
	const hasMore = ref(false)
	/** Limit to request next (20, then 40, 60, …); reset to INITIAL_LIMIT on new search. */
	const nextLimit = ref(INITIAL_LIMIT)

	async function loadFeed(append = false): Promise<void> {
		const name = pageName.value.trim()
		if (!name) {
			allRevisionsData.value = []
			errors.value = []
			hasMore.value = false
			return
		}

		if (!append) {
			nextLimit.value = INITIAL_LIMIT
		}
		const limit = nextLimit.value
		if (!append) {
			isLoading.value = true
			errors.value = []
		} else {
			isLoadingMore.value = true
		}

		try {
			const revisions = await wiki.getRelatedChanges(name, {
				showOutgoing: true,
				showIncoming: true,
				limit,
				days: 30,
			})

			console.log("revisions", revisions)

			// Enrich with user category; comment is already raw HTML from the API, render as-is
			const enriched = await Promise.all(
				revisions.map(async rev => {
					const userCategory = await wiki.getUserCategory(rev.user.name)
					onUserCategory(rev.user.name, userCategory)
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

			nextLimit.value = limit + LIMIT_INCREMENT

			if (append) {
				const existingIds = new Set(allRevisionsData.value.map(r => r.id))
				const newRevisions = enriched.filter(r => !existingIds.has(r.id))
				const merged = [...allRevisionsData.value, ...newRevisions].sort(
					(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
				allRevisionsData.value = merged
				hasMore.value = enriched.length >= limit
				if (newRevisions.length === 0 && enriched.length >= limit) {
					hasMore.value = false
				}
			} else {
				allRevisionsData.value = enriched
				hasMore.value = enriched.length >= limit
			}
		} catch (e) {
			const errorObj = e as Error
			if (!append) {
				errors.value = [errorObj.message]
				allRevisionsData.value = []
			}
			hasMore.value = false
		} finally {
			isLoading.value = false
			isLoadingMore.value = false
		}
	}

	async function loadMore(): Promise<void> {
		if (allRevisionsData.value.length === 0 || !hasMore.value) return
		await loadFeed(true)
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
