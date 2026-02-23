import type { FakeWiki } from "fakewiki"
import type { FWRevisionWithLinkType } from "fakewiki/types"
import type { Ref } from "vue"
import { ref } from "vue"

/** API max for feedrecentchanges */
const LIMIT = 50
const DAYS = 30

const BIDIRECTIONAL_SCORE = 4
const OUTGOING_SCORE = 2
const BACKLINK_SCORE = 1

/** Counts of how many selected pages' feeds included this item per link type */
export type FeedCountByLinkType = {
	bidirectional: number
	outgoing: number
	backlink: number
}

/** Revision with feed counts per link type (bidirectional, outgoing, backlink) and score */
export type RelatedChangeRevisionMulti = FWRevisionWithLinkType & {
	feedCount: number
	feedCountBidirectional: number
	feedCountOutgoing: number
	feedCountBacklink: number
	/** Score: bidirectional×3 + outgoing×2 + backlink×1 */
	score: number
	sourcePageNames?: string[]
}

function computeScore(bidirectional: number, outgoing: number, backlink: number): number {
	return (
		bidirectional * BIDIRECTIONAL_SCORE + outgoing * OUTGOING_SCORE + backlink * BACKLINK_SCORE
	)
}

function revisionKey(r: {
	pageName?: string | null
	timestamp: string
	user: { name: string }
}): string {
	return `${(r.pageName ?? "").toLowerCase()}\t${r.timestamp}\t${r.user.name}`
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
			const options = {
				showOutgoing: true,
				showIncoming: true,
				limit: LIMIT,
				days: DAYS,
				from,
			}

			if (pageNames.length === 1) {
				const revisions = await wiki.getRelatedChanges(pageNames[0], options)
				const enriched = await Promise.all(
					revisions.map(async rev => {
						const userCategory = await wiki.getUserCategory(rev.user.name)
						onUserCategory(rev.user.name, userCategory)
						const comment = rev.comment ?? ""
						const t = rev.linkType ?? "to"
						const feedCountBidirectional = t === "both" ? 1 : 0
						const feedCountOutgoing = t === "to" ? 1 : 0
						const feedCountBacklink = t === "from" ? 1 : 0
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
							feedCount: 1,
							feedCountBidirectional,
							feedCountOutgoing,
							feedCountBacklink,
							score: computeScore(
								feedCountBidirectional,
								feedCountOutgoing,
								feedCountBacklink
							),
						} as RelatedChangeRevisionMulti
					})
				)
				allRevisionsData.value = enriched
				return
			}

			// Multiple pages: fetch all in parallel, then merge by revision key; count by link type
			const results = await Promise.all(
				pageNames.map(name => wiki.getRelatedChanges(name, options))
			)
			const byKey = new Map<
				string,
				{
					rev: FWRevisionWithLinkType
					sourcePageNames: Set<string>
					countBidirectional: number
					countOutgoing: number
					countBacklink: number
				}
			>()
			for (let i = 0; i < pageNames.length; i++) {
				const sourcePage = pageNames[i]
				const revisions = results[i] ?? []
				for (const r of revisions) {
					const key = revisionKey(r)
					const t = r.linkType ?? "to"
					const existing = byKey.get(key)
					if (existing) {
						existing.sourcePageNames.add(sourcePage)
						if (t === "both") existing.countBidirectional += 1
						else if (t === "to") existing.countOutgoing += 1
						else existing.countBacklink += 1
					} else {
						byKey.set(key, {
							rev: r,
							sourcePageNames: new Set([sourcePage]),
							countBidirectional: t === "both" ? 1 : 0,
							countOutgoing: t === "to" ? 1 : 0,
							countBacklink: t === "from" ? 1 : 0,
						})
					}
				}
			}

			const merged = [...byKey.values()].map(
				({ rev, sourcePageNames, countBidirectional, countOutgoing, countBacklink }) => ({
					...rev,
					feedCount: sourcePageNames.size,
					feedCountBidirectional: countBidirectional,
					feedCountOutgoing: countOutgoing,
					feedCountBacklink: countBacklink,
					score: computeScore(countBidirectional, countOutgoing, countBacklink),
					sourcePageNames: [...sourcePageNames],
				})
			)
			merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

			const enriched = await Promise.all(
				merged.map(async item => {
					const {
						feedCount,
						feedCountBidirectional,
						feedCountOutgoing,
						feedCountBacklink,
						score,
						sourcePageNames,
						...rev
					} = item
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
						feedCount,
						feedCountBidirectional,
						feedCountOutgoing,
						feedCountBacklink,
						score,
						sourcePageNames,
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
