import type { FakeWiki } from "fakewiki"
import type { FWRevisionWithLinkType } from "fakewiki/types"
import type { Ref } from "vue"
import { ref } from "vue"

/** API max for feedrecentchanges */
const LIMIT = 50
const DAYS = 30

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
	const errors = ref<string[]>([])

	async function loadFeed(): Promise<void> {
		const name = pageName.value.trim()
		if (!name) {
			allRevisionsData.value = []
			errors.value = []
			return
		}
		isLoading.value = true
		errors.value = []
		try {
			const d = new Date()
			d.setDate(d.getDate() - DAYS)
			const from = d.toISOString()
			const revisions = await wiki.getRelatedChanges(name, {
				showOutgoing: true,
				showIncoming: true,
				limit: LIMIT,
				days: DAYS,
				from,
			})
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
