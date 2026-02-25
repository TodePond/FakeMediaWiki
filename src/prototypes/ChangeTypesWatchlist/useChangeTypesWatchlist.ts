import type { FakeWiki } from "fakewiki"
import type {
	FWCompareResponse,
	FWPageHistoryResponse,
	FWPageHistoryRevision,
	FWRevision,
} from "fakewiki/types"
import { computed, ref } from "vue"

export interface HistoryRevisionWithHtml extends FWPageHistoryRevision {
	commentHtml: string
}

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
]
const HEART_RISE_DURATION_MS = 2500

export interface UseChangeTypesWatchlistOptions {
	wiki: FakeWiki
	prototypeName: string
	defaultPageQueries: string[]
	defaultUserQueries: string[]
	/** Called when an item is expanded (load edit-types summary/details here). */
	onExpandItem: (change: FWRevision) => void
	/** Called from search() so the prototype can reset its edit-types state. */
	resetEditTypesState: () => void
}

function loadSearchQueries(key: string, defaultValues: string[]): string[] {
	const saved = localStorage.getItem(key)
	if (!saved) return defaultValues
	try {
		const parsed = JSON.parse(saved)
		if (Array.isArray(parsed) && parsed.every((v: unknown) => typeof v === "string")) {
			return parsed
		}
	} catch {
		// ignore
	}
	return defaultValues
}

export function useChangeTypesWatchlist(options: UseChangeTypesWatchlistOptions) {
	const { wiki, prototypeName, defaultPageQueries, defaultUserQueries, onExpandItem, resetEditTypesState } = options
	const pageStorageKey = wiki.getStorageKey(prototypeName, "pageQueries")
	const userStorageKey = wiki.getStorageKey(prototypeName, "userQueries")

	const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageQueries))
	const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserQueries))
	const pageQueriesInput = ref(pageSearchQueries.value.join(", "))
	const userQueriesInput = ref(userSearchQueries.value.join(", "))

	function syncPageQueriesFromInput(): void {
		pageSearchQueries.value = pageQueriesInput.value.split(",").map(s => s.trim()).filter(Boolean)
	}
	function syncUserQueriesFromInput(): void {
		userSearchQueries.value = userQueriesInput.value.split(",").map(s => s.trim()).filter(Boolean)
	}

	function saveSearchQueries(): void {
		localStorage.setItem(pageStorageKey, JSON.stringify(pageSearchQueries.value))
		localStorage.setItem(userStorageKey, JSON.stringify(userSearchQueries.value))
	}

	const allRevisionsData = ref<FWRevision[]>([])
	const isLoading = ref(false)
	const isLoadingMore = ref(false)
	const errors = ref<string[]>([])
	const hasMore = ref(true)

	const expandedDiffIds = ref<Set<number>>(new Set())
	const loadedDiffs = ref<Map<number, FWCompareResponse>>(new Map())
	const loadingDiffIds = ref<Set<number>>(new Set())

	const expandedHistoryIds = ref<Set<number>>(new Set())
	const expandedHistoryDiffIds = ref<Map<number, Set<number>>>(new Map())
	const loadedHistories = ref<
		Map<string, Omit<FWPageHistoryResponse, "revisions"> & { revisions?: HistoryRevisionWithHtml[] }>
	>(new Map())
	const loadingHistoryPageNames = ref<Set<string>>(new Set())

	const expandedItemIds = ref<Set<number>>(new Set())
	const expandedTalkIds = ref<Set<number>>(new Set())
	const talkPageText = ref<Map<number, string>>(new Map())
	const editorMode = ref<Map<number, "visual" | "source">>(new Map())

	const thankedRevisionIds = ref<Set<number>>(new Set())
	const risingHearts = ref<Array<{ id: number; x: number; y: number; type: "thank" | "unthank" }>>([])
	let nextHeartId = 0

	function formatDate(timestamp: string): string {
		const d = new Date(timestamp)
		return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
	}
	function getDateKey(timestamp: string): string {
		const d = new Date(timestamp)
		return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
	}
	function formatTime(timestamp: string): string {
		const d = new Date(timestamp)
		return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
	}
	function isToday(timestamp: string): boolean {
		const d = new Date(timestamp)
		const today = new Date()
		return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
	}
	function formatDateShort(timestamp: string): string {
		const d = new Date(timestamp)
		return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear().toString().slice(-2)}`
	}
	function formatRelativeDate(timestamp: string): string {
		return wiki.formatRelativeTimestamp(timestamp, {
			seconds: "words", minutes: "minutes", hours: "hours", days: "days",
			weeks: "weeks", months: "months", years: "years",
		})
	}
	function formatDelta(delta: number | null): string {
		const n = delta != null ? Number(delta) : 0
		if (Number.isNaN(n)) return "(0)"
		return `(${n >= 0 ? "+" : ""}${n})`
	}

	const allRevisions = computed(() => allRevisionsData.value)
	const revisionsByDate = computed(() => {
		const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()
		allRevisions.value.forEach(revision => {
			const dateKey = getDateKey(revision.timestamp)
			const dateLabel = formatDate(revision.timestamp)
			if (!grouped.has(dateKey)) grouped.set(dateKey, { dateLabel, revisions: [] })
			grouped.get(dateKey)!.revisions.push(revision)
		})
		return Array.from(grouped.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([dateKey, data]) => ({ dateKey, dateLabel: data.dateLabel, revisions: data.revisions }))
	})

	function getItemZIndex(dateKey: string, changeIndex: number): number {
		let cumulativeIndex = 0
		for (const group of revisionsByDate.value) {
			if (group.dateKey === dateKey) return 10 + cumulativeIndex + changeIndex
			cumulativeIndex += group.revisions.length
		}
		return 10 + cumulativeIndex + changeIndex
	}

	async function loadFeed(after?: Record<string, string>, append = false): Promise<void> {
		if (!append) {
			isLoading.value = true
			errors.value = []
		} else {
			isLoadingMore.value = true
		}
		const pageNames = pageSearchQueries.value.filter(n => n.trim() !== "")
		const userNames = userSearchQueries.value.filter(n => n.trim() !== "")
		try {
			const revisions = await wiki.getCombinedFeed({ pageNames, userNames, limit: 20, after })
			const processedRevisions = await Promise.all(
				revisions.map(async revision => {
					const pageName = (revision as FWPageHistoryRevision & { pageName?: string }).pageName || ""
					const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName)
					const toolbar = wiki.parseToolbarEditSummary(_summary)
					const summary = toolbar ?? {
						comment: _summary,
						hashtags: [],
						other: [],
						suggestedBy: null,
						useThisBot: null,
						reportBugs: null,
					}
					const commentText = summary.comment
						? summary.comment + (summary.suggestedBy ? ` Suggested by [[User:${summary.suggestedBy}|${summary.suggestedBy}]]` : "")
						: ""
					summary.comment = commentText
						? await wiki.transformWikitextToHtml(commentText, pageName)
						: ""
					summary.hashtags = Array.isArray(summary.hashtags) ? summary.hashtags.join(" ") : summary.hashtags
					return {
						...revision,
						comment: revision.comment || "",
						summary,
						pageName,
						avatarUrl: null,
					} as FWRevision
				})
			)
			if (append) {
				const existingIds = new Set(allRevisionsData.value.map(r => r.id))
				const newRevisions = processedRevisions.filter(r => !existingIds.has(r.id))
				allRevisionsData.value = [...allRevisionsData.value, ...newRevisions].sort(
					(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
				hasMore.value = newRevisions.length > 0
			} else {
				allRevisionsData.value = processedRevisions
				hasMore.value = processedRevisions.length === 20
			}
		} catch (e) {
			const err = e as Error
			if (!append) {
				errors.value = [err.message]
				allRevisionsData.value = []
			}
			hasMore.value = false
		} finally {
			isLoading.value = false
			isLoadingMore.value = false
		}
	}

	function clearExpandState(): void {
		expandedDiffIds.value = new Set()
		loadedDiffs.value = new Map()
		loadingDiffIds.value = new Set()
		expandedHistoryIds.value = new Set()
		expandedHistoryDiffIds.value = new Map()
		loadedHistories.value = new Map()
		loadingHistoryPageNames.value = new Set()
		expandedItemIds.value = new Set()
		expandedTalkIds.value = new Set()
		resetEditTypesState()
	}

	async function search(): Promise<void> {
		await loadFeed(undefined, false)
		saveSearchQueries()
		clearExpandState()
	}

	async function loadMore(): Promise<void> {
		if (allRevisionsData.value.length === 0) return
		const pageNames = pageSearchQueries.value.filter(n => n.trim() !== "")
		const userNames = userSearchQueries.value.filter(n => n.trim() !== "")
		const afterMap: Record<string, string> = {}
		for (const pageName of pageNames) {
			const revs = allRevisionsData.value.filter(r => r.pageName === pageName)
			if (revs.length > 0) afterMap[pageName] = String(Math.min(...revs.map(r => r.id)))
		}
		for (const userName of userNames) {
			const revs = allRevisionsData.value.filter(r => r.user?.name === userName)
			if (revs.length > 0) afterMap[userName] = String(Math.min(...revs.map(r => r.id)))
		}
		if (Object.keys(afterMap).length === 0) return
		await loadFeed(afterMap, true)
	}

	function ensureDiffLoaded(change: FWRevision): void {
		const id = change.id
		if (loadedDiffs.value.has(id)) return
		const pageName = change.pageName
		if (!pageName) return
		loadingDiffIds.value = new Set(loadingDiffIds.value).add(id)
		wiki.getRevisionDiff(pageName, id)
			.then(response => {
				loadedDiffs.value = new Map(loadedDiffs.value).set(id, response)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
			})
			.catch(e => {
				console.error("Failed to load diff", e)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
			})
	}

	function expandItem(change: FWRevision, event: MouseEvent): void {
		const target = event.target as HTMLElement
		if (target.tagName === "A" || target.tagName === "BUTTON" || target.closest("a") || target.closest("button")) return
		const id = change.id
		expandedItemIds.value = new Set(expandedItemIds.value).add(id)
		expandedDiffIds.value = new Set(expandedDiffIds.value).add(id)
		expandedHistoryIds.value = new Set(expandedHistoryIds.value)
		expandedHistoryIds.value.delete(id)
		onExpandItem(change)
		ensureDiffLoaded(change)
	}

	function collapseItem(id: number): void {
		expandedItemIds.value.delete(id)
		expandedDiffIds.value.delete(id)
		expandedHistoryIds.value.delete(id)
		expandedTalkIds.value.delete(id)
	}

	function handleItemClick(change: FWRevision, event: MouseEvent): void {
		if (!expandedItemIds.value.has(change.id)) expandItem(change, event)
	}

	function toggleDiff(change: FWRevision): void {
		const id = change.id
		if (expandedDiffIds.value.has(id)) {
			expandedDiffIds.value = new Set(expandedDiffIds.value)
			expandedDiffIds.value.delete(id)
			return
		}
		expandedDiffIds.value = new Set(expandedDiffIds.value).add(id)
		expandedHistoryIds.value = new Set(expandedHistoryIds.value)
		expandedHistoryIds.value.delete(id)
		expandedTalkIds.value = new Set(expandedTalkIds.value)
		expandedTalkIds.value.delete(id)
		ensureDiffLoaded(change)
	}

	function toggleHistoryDiff(changeId: number, rev: { id: number }, pageName: string): void {
		const id = rev.id
		const set = expandedHistoryDiffIds.value.get(changeId) ?? new Set<number>()
		const expanded = set.has(id)
		const newSet = expanded ? (() => { const s = new Set(set); s.delete(id); return s })() : new Set(set).add(id)
		expandedHistoryDiffIds.value = new Map(expandedHistoryDiffIds.value).set(changeId, newSet)
		if (expanded) return
		if (loadedDiffs.value.has(id)) return
		loadingDiffIds.value = new Set(loadingDiffIds.value).add(id)
		wiki.getRevisionDiff(pageName, id)
			.then(response => {
				loadedDiffs.value = new Map(loadedDiffs.value).set(id, response)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
			})
			.catch(e => {
				console.error("Failed to load diff", e)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
			})
	}

	function handleHistoryItemClick(changeId: number, rev: { id: number }, pageName: string, event: MouseEvent): void {
		const target = event.target as HTMLElement
		if (target.tagName === "A" || target.tagName === "BUTTON" || target.closest("a") || target.closest("button")) return
		toggleHistoryDiff(changeId, rev, pageName)
	}

	function toggleHistory(change: FWRevision): void {
		const id = change.id
		const pageName = change.pageName
		if (!pageName) return
		if (expandedHistoryIds.value.has(id)) {
			expandedHistoryIds.value = new Set(expandedHistoryIds.value)
			expandedHistoryIds.value.delete(id)
			return
		}
		expandedHistoryIds.value = new Set(expandedHistoryIds.value).add(id)
		expandedDiffIds.value = new Set(expandedDiffIds.value)
		expandedDiffIds.value.delete(id)
		expandedTalkIds.value = new Set(expandedTalkIds.value)
		expandedTalkIds.value.delete(id)
		if (loadedHistories.value.has(pageName)) return
		loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value).add(pageName)
		wiki.getPageHistory(pageName)
			.then(async response => {
				const revisions = await Promise.all(
					(response.revisions || []).map(async rev => ({
						...rev,
						commentHtml: await wiki.getEditSummaryHtml(rev.comment || "", pageName),
					}))
				)
				loadedHistories.value = new Map(loadedHistories.value).set(pageName, { ...response, revisions })
				loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
				loadingHistoryPageNames.value.delete(pageName)
			})
			.catch(e => {
				console.error("Failed to load history", e)
				loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
				loadingHistoryPageNames.value.delete(pageName)
			})
	}

	function onThankClick(change: FWRevision, e: MouseEvent): void {
		e.preventDefault()
		const id = change.id
		const x = e.clientX
		const y = e.clientY
		const heartId = ++nextHeartId
		if (thankedRevisionIds.value.has(id)) {
			thankedRevisionIds.value = new Set(thankedRevisionIds.value)
			thankedRevisionIds.value.delete(id)
			risingHearts.value = [...risingHearts.value, { id: heartId, x, y: y - 15, type: "unthank" }]
		} else {
			thankedRevisionIds.value = new Set(thankedRevisionIds.value).add(id)
			risingHearts.value = [...risingHearts.value, { id: heartId, x, y: y - 15, type: "thank" }]
		}
		setTimeout(() => {
			risingHearts.value = risingHearts.value.filter(h => h.id !== heartId)
		}, HEART_RISE_DURATION_MS)
	}

	function toggleTalk(change: FWRevision): void {
		const id = change.id
		if (expandedTalkIds.value.has(id)) {
			expandedTalkIds.value = new Set(expandedTalkIds.value)
			expandedTalkIds.value.delete(id)
			return
		}
		expandedTalkIds.value = new Set(expandedTalkIds.value).add(id)
		expandedDiffIds.value = new Set(expandedDiffIds.value)
		expandedDiffIds.value.delete(id)
		expandedHistoryIds.value = new Set(expandedHistoryIds.value)
		expandedHistoryIds.value.delete(id)
		if (!talkPageText.value.has(id)) talkPageText.value = new Map(talkPageText.value).set(id, "")
		if (!editorMode.value.has(id)) editorMode.value = new Map(editorMode.value).set(id, "source")
	}

	function updateTalkText(id: number, text: string): void {
		talkPageText.value = new Map(talkPageText.value).set(id, text)
	}

	function handleAddTopic(change: FWRevision): void {
		const text = talkPageText.value.get(change.id) || ""
		console.log("Add topic:", text)
		expandedTalkIds.value = new Set(expandedTalkIds.value)
		expandedTalkIds.value.delete(change.id)
	}

	return {
		wiki,
		pageQueriesInput,
		userQueriesInput,
		syncPageQueriesFromInput,
		syncUserQueriesFromInput,
		allRevisionsData,
		isLoading,
		isLoadingMore,
		errors,
		hasMore,
		search,
		loadMore,
		revisionsByDate,
		formatDate,
		getDateKey,
		formatTime,
		isToday,
		formatDateShort,
		formatRelativeDate,
		formatDelta,
		expandedDiffIds,
		loadedDiffs,
		loadingDiffIds,
		expandedHistoryIds,
		expandedHistoryDiffIds,
		loadedHistories,
		loadingHistoryPageNames,
		expandedItemIds,
		expandedTalkIds,
		talkPageText,
		thankedRevisionIds,
		risingHearts,
		expandItem,
		collapseItem,
		handleItemClick,
		toggleDiff,
		toggleHistory,
		toggleHistoryDiff,
		handleHistoryItemClick,
		onThankClick,
		getItemZIndex,
		toggleTalk,
		updateTalkText,
		handleAddTopic,
	}
}
