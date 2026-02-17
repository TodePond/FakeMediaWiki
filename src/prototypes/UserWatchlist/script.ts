import { computed, onMounted, ref, type Ref } from "vue"
import { FakeWiki } from "fakewiki"
import type {
	FWCompareResponse,
	FWDiffLine,
	FWPageHistoryResponse,
	FWPageHistoryRevision,
	FWResult,
	FWRevision,
} from "fakewiki/types"

/** History revision with edit summary rendered as HTML */
export interface HistoryRevisionWithHtml extends FWPageHistoryRevision {
	commentHtml: string
}

/** Segment of a diff line for character-level display (API highlightRanges: type 0 = add, 1 = remove) */
export interface DiffSegment {
	text: string
	type: "add" | "remove" | null
}

const PROTOTYPE_NAME = "UserWatchlist"

export function useActionWatchlist() {
	const wiki = new FakeWiki()

	const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
	const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries")
	const defaultPageSearchQueries = ["Wikipedia", "Wet Leg", "Water"]
	const defaultUserSearchQueries = ["Samwalton9", "Humbugtheman", "Todepond"]
	const pageSearchQueries = ref<string[]>(
		loadSearchQueries(pageStorageKey, defaultPageSearchQueries)
	)
	const userSearchQueries = ref<string[]>(
		loadSearchQueries(userStorageKey, defaultUserSearchQueries)
	)

	const pageResults = wiki
		.createResults<FWRevision>(pageSearchQueries.value.length)
		.map(result => ref(result))
	const userResults = wiki
		.createResults<FWRevision>(userSearchQueries.value.length)
		.map(result => ref(result))

	/** Which revision ids have the inline diff expanded */
	const expandedDiffIds = ref<Set<number>>(new Set())
	/** Loaded diff data keyed by revision id */
	const loadedDiffs = ref<Map<number, FWCompareResponse>>(new Map())
	/** Revision ids currently loading their diff */
	const loadingDiffIds = ref<Set<number>>(new Set())

	/** Which revision ids have inline history expanded (we use change.id as key) */
	const expandedHistoryIds = ref<Set<number>>(new Set())
	/** Per change (change.id): set of revision ids with inline diff expanded in that history */
	const expandedHistoryDiffIds = ref<Map<number, Set<number>>>(new Map())
	/** Loaded history data keyed by page name (revisions include commentHtml) */
	const loadedHistories = ref<
		Map<
			string,
			Omit<FWPageHistoryResponse, "revisions"> & { revisions?: HistoryRevisionWithHtml[] }
		>
	>(new Map())
	/** Page names currently loading history */
	const loadingHistoryPageNames = ref<Set<string>>(new Set())

	function saveSearchQueries(): void {
		localStorage.setItem(pageStorageKey, JSON.stringify(pageSearchQueries.value))
		localStorage.setItem(userStorageKey, JSON.stringify(userSearchQueries.value))
	}

	function loadSearchQueries(key: string, defaultValues: string[]): string[] {
		const savedSearchQueries = localStorage.getItem(key)
		if (!savedSearchQueries) {
			return defaultValues
		}
		try {
			const parsed = JSON.parse(savedSearchQueries)
			if (Array.isArray(parsed) && parsed.every(value => typeof value === "string")) {
				return parsed
			}
		} catch {
			// Ignore invalid stored values and fallback.
		}
		return defaultValues
	}

	function createEmptyResult(): FWResult<FWRevision> {
		return { data: [], loading: false, error: null }
	}

	function addPage(): void {
		pageSearchQueries.value.push("")
		pageResults.push(ref(createEmptyResult()))
		saveSearchQueries()
	}

	function removePage(): void {
		if (pageSearchQueries.value.length === 0) {
			return
		}
		pageSearchQueries.value.pop()
		pageResults.pop()
		saveSearchQueries()
	}

	function addUser(): void {
		userSearchQueries.value.push("")
		userResults.push(ref(createEmptyResult()))
		saveSearchQueries()
	}

	function removeUser(): void {
		if (userSearchQueries.value.length === 0) {
			return
		}
		userSearchQueries.value.pop()
		userResults.pop()
		saveSearchQueries()
	}

	function getPageInputId(index: number): string {
		return `page-name-${index + 1}`
	}

	function getUserInputId(index: number): string {
		return `user-${index + 1}`
	}

	async function loadUser(userName: string, resultRef: Ref<FWResult<FWRevision>>): Promise<void> {
		resultRef.value.loading = true
		resultRef.value.error = null

		try {
			const _history = (await wiki.getUserHistory(userName, { limit: 10 })) as {
				revisions?: Array<{
					comment?: string
					pageName?: string
					title?: string
					user: { name: string }
					id: number
					timestamp: string
					delta: number
				}>
			}

			if (!_history.revisions) {
				resultRef.value = { data: [], loading: false, error: null }
				return
			}

			const processedRevisions = await Promise.all(
				_history.revisions.map(async revision => {
					const pageName = revision.pageName || revision.title || ""
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
					return processedRevision
				})
			)

			resultRef.value = { data: processedRevisions, loading: false, error: null }
		} catch (e) {
			const errorObj = e as Error
			const errorMsg = errorObj.message.includes("404")
				? `${userName}: User not found`
				: `${userName}: ${errorObj.message}`
			resultRef.value = { data: [], loading: false, error: errorMsg }
		}
	}

	async function loadPage(pageName: string, resultRef: Ref<FWResult<FWRevision>>): Promise<void> {
		resultRef.value.loading = true
		resultRef.value.error = null

		try {
			const _history = (await wiki.getPageHistory(pageName, { limit: 10 })) as {
				revisions?: Array<{
					comment: string
					user: { name: string }
					id: number
					timestamp: string
					delta: number
				}>
			}

			if (!_history.revisions) {
				resultRef.value = { data: [], loading: false, error: null }
				return
			}

			const processedRevisions = await Promise.all(
				_history.revisions.map(async revision => {
					const _summary = wiki.preprocessEditSummary(revision.comment, pageName)
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
						summary,
						pageName,
						avatarUrl: null,
					}
					return processedRevision
				})
			)

			resultRef.value = { data: processedRevisions, loading: false, error: null }
		} catch (e) {
			const errorObj = e as Error
			const errorMsg = errorObj.message.includes("404")
				? `${pageName}: Page not found`
				: `${pageName}: ${errorObj.message}`
			resultRef.value = { data: [], loading: false, error: errorMsg }
		}
	}

	async function search(): Promise<void> {
		const loadPromises: Promise<void>[] = []

		for (let i = 0; i < pageSearchQueries.value.length; i++) {
			const query = pageSearchQueries.value[i]
			const result = pageResults[i]
			if (!result) continue
			if (query?.trim()) {
				loadPromises.push(loadPage(query, result))
			} else {
				result.value = { data: [], loading: false, error: null }
			}
		}

		for (let i = 0; i < userSearchQueries.value.length; i++) {
			const query = userSearchQueries.value[i]
			const result = userResults[i]
			if (!result) continue
			if (query?.trim()) {
				loadPromises.push(loadUser(query, result))
			} else {
				result.value = { data: [], loading: false, error: null }
			}
		}

		await Promise.all(loadPromises)
		saveSearchQueries()
		// Clear expanded/loaded diffs and history when feed is refreshed
		expandedDiffIds.value = new Set()
		loadedDiffs.value = new Map()
		loadingDiffIds.value = new Set()
		expandedHistoryIds.value = new Set()
		expandedHistoryDiffIds.value = new Map()
		loadedHistories.value = new Map()
		loadingHistoryPageNames.value = new Set()
	}

	onMounted(search)

	const allRevisions = computed(() => {
		const revisions: FWRevision[] = []
		const seenIds = new Set<number>()

		pageResults.forEach(result => {
			result.value.data.forEach(revision => {
				if (revision.id && !seenIds.has(revision.id)) {
					seenIds.add(revision.id)
					revisions.push(revision)
				}
			})
		})
		userResults.forEach(result => {
			result.value.data.forEach(revision => {
				if (revision.id && !seenIds.has(revision.id)) {
					seenIds.add(revision.id)
					revisions.push(revision)
				}
			})
		})
		return revisions.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)
	})

	/** Format date as "DD Month YYYY" (e.g. "28 January 2026") */
	function formatDate(timestamp: string): string {
		const d = new Date(timestamp)
		const day = d.getDate()
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		]
		const month = monthNames[d.getMonth()]
		const year = d.getFullYear()
		return `${day} ${month} ${year}`
	}

	/** Get date key for grouping (YYYY-MM-DD format) */
	function getDateKey(timestamp: string): string {
		const d = new Date(timestamp)
		const year = d.getFullYear()
		const month = (d.getMonth() + 1).toString().padStart(2, "0")
		const day = d.getDate().toString().padStart(2, "0")
		return `${year}-${month}-${day}`
	}

	const revisionsByDate = computed(() => {
		const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()

		allRevisions.value.forEach(revision => {
			const dateKey = getDateKey(revision.timestamp)
			const dateLabel = formatDate(revision.timestamp)

			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, { dateLabel, revisions: [] })
			}

			grouped.get(dateKey)!.revisions.push(revision)
		})

		return Array.from(grouped.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([dateKey, data]) => ({
				dateKey,
				dateLabel: data.dateLabel,
				revisions: data.revisions,
			}))
	})

	const isAnyLoading = computed(() => {
		return pageResults.some(r => r.value.loading) || userResults.some(r => r.value.loading)
	})

	const errors = computed(() => {
		const errs: string[] = []
		pageResults.forEach(result => {
			if (result.value.error) errs.push(result.value.error)
		})
		userResults.forEach(result => {
			if (result.value.error) errs.push(result.value.error)
		})
		return errs
	})

	function formatTime(timestamp: string): string {
		// return wiki.formatRelativeTime(timestamp, {
		// 	seconds: "words",
		// 	minutes: "minutes",
		// 	hours: "hours",
		// 	days: "days",
		// 	weeks: "date",
		// 	months: "date",
		// 	years: "date",
		// })
		const d = new Date(timestamp)
		const hours = d.getHours()
		const minutes = d.getMinutes()
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
	}

	/** Signed delta for watchlist, e.g. (+120) or (-412). */
	function formatDelta(delta: number | null): string {
		const n = delta != null ? Number(delta) : 0
		if (Number.isNaN(n)) return "(0)"
		const sign = n >= 0 ? "+" : ""
		return `(${sign}${n})`
	}

	function toggleDiff(change: FWRevision): void {
		const id = change.id
		const expanded = expandedDiffIds.value.has(id)
		if (expanded) {
			expandedDiffIds.value = new Set(expandedDiffIds.value)
			expandedDiffIds.value.delete(id)
			return
		}
		expandedDiffIds.value = new Set(expandedDiffIds.value)
		expandedDiffIds.value.add(id)
		expandedHistoryIds.value = new Set(expandedHistoryIds.value)
		expandedHistoryIds.value.delete(id)
		if (loadedDiffs.value.has(id)) return
		const pageName = change.pageName
		if (!pageName) return
		loadingDiffIds.value = new Set(loadingDiffIds.value)
		loadingDiffIds.value.add(id)
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

	function toggleHistoryDiff(changeId: number, rev: { id: number }, pageName: string): void {
		const id = rev.id
		const set = expandedHistoryDiffIds.value.get(changeId) ?? new Set<number>()
		const expanded = set.has(id)
		let newSet: Set<number>
		if (expanded) {
			newSet = new Set(set)
			newSet.delete(id)
		} else {
			newSet = new Set(set).add(id)
		}
		expandedHistoryDiffIds.value = new Map(expandedHistoryDiffIds.value).set(changeId, newSet)
		if (expanded) return
		if (loadedDiffs.value.has(id)) return
		loadingDiffIds.value = new Set(loadingDiffIds.value)
		loadingDiffIds.value.add(id)
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

	function toggleHistory(change: FWRevision): void {
		const id = change.id
		const pageName = change.pageName
		if (!pageName) return
		const expanded = expandedHistoryIds.value.has(id)
		if (expanded) {
			expandedHistoryIds.value = new Set(expandedHistoryIds.value)
			expandedHistoryIds.value.delete(id)
			return
		}
		expandedHistoryIds.value = new Set(expandedHistoryIds.value)
		expandedHistoryIds.value.add(id)
		expandedDiffIds.value = new Set(expandedDiffIds.value)
		expandedDiffIds.value.delete(id)
		if (loadedHistories.value.has(pageName)) return
		loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
		loadingHistoryPageNames.value.add(pageName)
		wiki.getPageHistory(pageName, { limit: 20 })
			.then(async response => {
				const revisions = await Promise.all(
					(response.revisions || []).map(async rev => ({
						...rev,
						commentHtml: await wiki.getEditSummaryHtml(rev.comment || "", pageName),
					}))
				)
				loadedHistories.value = new Map(loadedHistories.value).set(pageName, {
					...response,
					revisions,
				})
				loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
				loadingHistoryPageNames.value.delete(pageName)
			})
			.catch(e => {
				console.error("Failed to load history", e)
				loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
				loadingHistoryPageNames.value.delete(pageName)
			})
	}

	/** UTF-8 byte offset to character index in string */
	function byteOffsetToCharIndex(str: string, byteOffset: number): number {
		let bytes = 0
		let i = 0
		while (i < str.length) {
			const c = str.codePointAt(i) ?? 0
			if (c <= 0x7f) bytes += 1
			else if (c <= 0x7ff) bytes += 2
			else if (c <= 0xffff) bytes += 3
			else bytes += 4
			if (bytes > byteOffset) return i
			i += c > 0xffff ? 2 : 1
		}
		return str.length
	}

	/** Split a change line into segments for add/remove/change character-level styling */
	function getDiffLineSegments(line: FWDiffLine): DiffSegment[] {
		const text = line.text ?? ""
		const ranges = line.highlightRanges ?? []
		if (ranges.length === 0) {
			return [{ text, type: null }]
		}
		const sorted = [...ranges].sort((a, b) => a.start - b.start)
		const segments: DiffSegment[] = []
		let pos = 0
		for (const range of sorted) {
			const { start, length, type } = range
			const charStart = byteOffsetToCharIndex(text, start)
			const charEnd = byteOffsetToCharIndex(text, start + length)
			if (charStart > pos) {
				segments.push({ text: text.slice(pos, charStart), type: null })
			}
			segments.push({
				text: text.slice(charStart, charEnd),
				type: type === 0 ? "add" : type === 1 ? "remove" : null,
			})
			pos = charEnd
		}
		if (pos < text.length) {
			segments.push({ text: text.slice(pos), type: null })
		}
		return segments
	}

	function getDiffLineClass(type: number): string {
		switch (type) {
			case 0:
				return "diff-line-context"
			case 1:
				return "diff-line-add"
			case 2:
				return "diff-line-remove"
			case 3:
			case 4:
			case 5:
				return "diff-line-change"
			default:
				return "diff-line-context"
		}
	}

	return {
		wiki,
		pageSearchQueries,
		userSearchQueries,
		addPage,
		removePage,
		addUser,
		removeUser,
		getPageInputId,
		getUserInputId,
		search,
		isAnyLoading,
		errors,
		revisionsByDate,
		expandedHistoryIds,
		expandedDiffIds,
		toggleHistory,
		toggleDiff,
		formatTime,
		formatDelta,
		loadedDiffs,
		loadingDiffIds,
		getDiffLineClass,
		getDiffLineSegments,
		loadedHistories,
		expandedHistoryDiffIds,
		toggleHistoryDiff,
	}
}
