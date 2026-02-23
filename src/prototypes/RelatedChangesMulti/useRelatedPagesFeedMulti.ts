import type { FakeWiki } from "fakewiki"
import type { FWTopRelatedChange } from "fakewiki/types"
import type { Ref } from "vue"
import { ref } from "vue"

/** API max for feedrecentchanges */
const LIMIT = 50
const DAYS = 30

/** Revision with feed counts per link type and score (from getTopRelatedChanges or single-page enrichment). */
export type RelatedChangeRevisionMulti = FWTopRelatedChange & {
	feedCount: number
	summary: {
		comment: string
		hashtags: string[]
		other: string[]
		suggestedBy: string | null
		useThisBot: string | null
		reportBugs: string | null
	}
}

interface UseRelatedPagesFeedMultiArgs {
	wiki: FakeWiki
	pageName: Ref<string>
	onUserCategory: (
		userName: string,
		category: "unregistered" | "newcomer" | "learner" | "experienced"
	) => void
}

export function useRelatedPagesFeedMulti({
	wiki,
	pageName,
	onUserCategory,
}: UseRelatedPagesFeedMultiArgs) {
	const allRevisionsData = ref<RelatedChangeRevisionMulti[]>([])
	const isLoading = ref(false)
	const errors = ref<string[]>([])

	async function loadFeed(): Promise<void> {
		const raw = pageName.value.trim()
		if (!raw) {
			allRevisionsData.value = []
			errors.value = []
			return
		}
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
			d.setDate(d.getDate() - DAYS)
			const from = d.toISOString()
			// Request full list (100%); UI applies top-N% filter client-side so slider doesn't refetch
			const topChanges = await wiki.getTopRelatedChanges(pageNames, {
				percentage: 100,
				scoreMultipliers: { bidirectional: 3, outgoing: 2, backlink: 1 },
				limit: LIMIT,
				days: DAYS,
				from,
			})
			const enriched = await Promise.all(
				topChanges.map(async r => {
					const userCategory = await wiki.getUserCategory(r.user.name)
					onUserCategory(r.user.name, userCategory)
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
					} as RelatedChangeRevisionMulti
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
