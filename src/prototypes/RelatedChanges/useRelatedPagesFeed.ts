import type { FakeWiki } from "fakewiki"
import type { FWRevisionWithLinkType } from "fakewiki/types"
import type { Ref } from "vue"
import { ref } from "vue"

const RELATED_CHANGES_LIMIT = 50

interface UseRelatedPagesFeedArgs {
	wiki: FakeWiki
	pageName: Ref<string>
	onUserCategory: (
		userName: string,
		category: "unregistered" | "newcomer" | "learner" | "experienced"
	) => void
}

export function useRelatedPagesFeed({
	wiki,
	pageName,
	onUserCategory,
}: UseRelatedPagesFeedArgs) {
	const allRevisionsData = ref<FWRevisionWithLinkType[]>([])
	const isLoading = ref(false)
	const isLoadingMore = ref(false)
	const errors = ref<string[]>([])
	const hasMore = ref(false)

	async function loadFeed(from?: string): Promise<void> {
		const name = pageName.value.trim()
		if (!name) {
			allRevisionsData.value = []
			errors.value = []
			hasMore.value = false
			return
		}

		const append = from != null
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
				limit: RELATED_CHANGES_LIMIT,
				days: 30,
				from,
			})

			// Enrich with user category for icons (no comment/delta from feed)
			const enriched = await Promise.all(
				revisions.map(async rev => {
					const userCategory = await wiki.getUserCategory(rev.user.name)
					onUserCategory(rev.user.name, userCategory)
					return rev
				})
			)

			if (append) {
				const existingIds = new Set(allRevisionsData.value.map(r => r.id))
				const newRevisions = enriched.filter(r => !existingIds.has(r.id))
				const merged = [...allRevisionsData.value, ...newRevisions].sort(
					(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
				allRevisionsData.value = merged
				hasMore.value = newRevisions.length >= RELATED_CHANGES_LIMIT
			} else {
				allRevisionsData.value = enriched
				hasMore.value = enriched.length >= RELATED_CHANGES_LIMIT
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
		const oldest = allRevisionsData.value[allRevisionsData.value.length - 1]
		if (!oldest) return
		await loadFeed(oldest.timestamp)
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
