<script setup lang="ts">
import { CdxButton, CdxProgressBar } from "@wikimedia/codex"
import { computed, onMounted, ref } from "vue"
import {
	WikiApi,
	type CompareResponse,
	type DiffLine,
	type PageHistoryResponse,
	type PageHistoryRevision,
	type Revision,
} from "../../wiki-api/WikiApi"

/** History revision with edit summary rendered as HTML */
interface HistoryRevisionWithHtml extends PageHistoryRevision {
	commentHtml: string
}

const wiki = new WikiApi()
const PROTOTYPE_NAME = "SmoothWatchlistStyledVariant"

const pageStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "pageQuery", 3)
const userStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "userQuery", 3)

const pageSearchQueries = ref<string[]>([
	"Wikipedia", "Wet Leg", "Water",
	"Confidence Man (band)", "Algorave"
])
const userSearchQueries = ref<string[]>([
	"Samwalton9",
	"Satayboi",
	// "GearsDatapack",
	// localStorage.getItem(userStorageKeys[0]!) ?? "Samwalton9",
	// localStorage.getItem(userStorageKeys[1]!) ?? "GearsDatapack",
	// localStorage.getItem(userStorageKeys[2]!) ?? "Satayboi",
])

// Combined feed results
const allRevisionsData = ref<Revision[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const errors = ref<string[]>([])
const hasMore = ref(true) // Whether there are more revisions to load

/** Which revision ids have the inline diff expanded */
const expandedDiffIds = ref<Set<number>>(new Set())
/** Loaded diff data keyed by revision id */
const loadedDiffs = ref<Map<number, CompareResponse>>(new Map())
/** Revision ids currently loading their diff */
const loadingDiffIds = ref<Set<number>>(new Set())

/** Which revision ids have inline history expanded (we use change.id as key) */
const expandedHistoryIds = ref<Set<number>>(new Set())
/** Per change (change.id): set of revision ids with inline diff expanded in that history */
const expandedHistoryDiffIds = ref<Map<number, Set<number>>>(new Map())
/** Loaded history data keyed by page name (revisions include commentHtml) */
const loadedHistories = ref<
	Map<string, Omit<PageHistoryResponse, "revisions"> & { revisions?: HistoryRevisionWithHtml[] }>
>(new Map())
/** Page names currently loading history */
const loadingHistoryPageNames = ref<Set<string>>(new Set())

/** Which revision ids have the feed item body expanded */
const expandedItemIds = ref<Set<number>>(new Set())

/** Revision ids that have been "thanked" (mock) */
const thankedRevisionIds = ref<Set<number>>(new Set())
/** Rising heart particles: id, viewport position, and thank vs unthank */
const risingHearts = ref<Array<{ id: number; x: number; y: number; type: "thank" | "unthank" }>>([])
let nextHeartId = 0
const HEART_RISE_DURATION_MS = 2500

onMounted(search)

function saveSearchQueries(): void {
	pageSearchQueries.value.forEach((query, index) => {
		const key = pageStorageKeys[index]
		if (key) localStorage.setItem(key, query)
	})
	userSearchQueries.value.forEach((query, index) => {
		const key = userStorageKeys[index]
		if (key) localStorage.setItem(key, query)
	})
}

async function loadFeed(after?: string, append = false): Promise<void> {
	if (!append) {
		isLoading.value = true
		errors.value = []
	} else {
		isLoadingMore.value = true
	}

	// Collect non-empty page and user names
	const pageNames = pageSearchQueries.value.filter(name => name.trim() !== "")
	const userNames = userSearchQueries.value.filter(name => name.trim() !== "")

	try {
		// Fetch combined feed
		const revisions = await wiki.getCombinedFeed({
			pageNames,
			userNames,
			limit: 20,
			after,
		})

		// Process revisions (transform comments, etc.)
		const processedRevisions = await Promise.all(
			revisions.map(async revision => {
				const pageName =
					(revision as PageHistoryRevision & { pageName?: string }).pageName || ""
				const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName)
				const toolbar = wiki.parseToolbarComment(_summary)
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
				const processedRevision: Revision = {
					...revision,
					comment: revision.comment || "",
					summary,
					pageName,
					avatarUrl: null,
				}
				return processedRevision
			})
		)

		if (append) {
			// Append new revisions, deduplicating by ID
			const existingIds = new Set(allRevisionsData.value.map(r => r.id))
			const newRevisions = processedRevisions.filter(r => !existingIds.has(r.id))
			// Merge and sort by timestamp (newest first)
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

async function search(): Promise<void> {
	await loadFeed(undefined, false)
	saveSearchQueries()
	// Clear expanded/loaded diffs and history when feed is refreshed
	expandedDiffIds.value = new Set()
	loadedDiffs.value = new Map()
	loadingDiffIds.value = new Set()
	expandedHistoryIds.value = new Set()
	expandedHistoryDiffIds.value = new Map()
	loadedHistories.value = new Map()
	loadingHistoryPageNames.value = new Set()
	expandedItemIds.value = new Set()
	// Keep thanked state - don't clear it on refresh
}

async function loadMore(): Promise<void> {
	if (allRevisionsData.value.length === 0) return
	// Get the oldest revision from current results (they're sorted newest first)
	const oldestRevision = allRevisionsData.value[allRevisionsData.value.length - 1]
	if (!oldestRevision) return
	// Pass the revision ID instead of timestamp for better pagination
	await loadFeed(String(oldestRevision.id), true)
}

const allRevisions = computed(() => allRevisionsData.value)

const revisionsByDate = computed(() => {
	const grouped = new Map<string, { dateLabel: string; revisions: Revision[] }>()

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

const isAnyLoading = computed(() => isLoading.value)

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

/** Watchlist-style time only (e.g. 17:29) */
function formatTime(timestamp: string): string {
	const d = new Date(timestamp)
	const hours = d.getHours()
	const minutes = d.getMinutes()
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

/** Check if timestamp is from today */
function isToday(timestamp: string): boolean {
	const d = new Date(timestamp)
	const today = new Date()
	return (
		d.getDate() === today.getDate() &&
		d.getMonth() === today.getMonth() &&
		d.getFullYear() === today.getFullYear()
	)
}

/** Format date as DD.MM.YY (e.g. 04.02.26) */
function formatDateShort(timestamp: string): string {
	const d = new Date(timestamp)
	const day = d.getDate().toString().padStart(2, "0")
	const month = (d.getMonth() + 1).toString().padStart(2, "0")
	const year = d.getFullYear().toString().slice(-2)
	return `${day}.${month}.${year}`
}

/** Format relative date (e.g. "10 hours ago", "2 days ago") */
function formatRelativeDate(timestamp: string): string {
	const now = new Date()
	const then = new Date(timestamp)
	const diffMs = now.getTime() - then.getTime()
	const diffSeconds = Math.floor(diffMs / 1000)
	const diffMinutes = Math.floor(diffSeconds / 60)
	const diffHours = Math.floor(diffMinutes / 60)
	const diffDays = Math.floor(diffHours / 24)
	const diffWeeks = Math.floor(diffDays / 7)
	const diffMonths = Math.floor(diffDays / 30)
	const diffYears = Math.floor(diffDays / 365)

	if (diffSeconds < 60) {
		return "just now"
	} else if (diffMinutes < 60) {
		return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`
	} else if (diffHours < 24) {
		return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`
	} else if (diffDays < 7) {
		return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`
	} else if (diffWeeks < 4) {
		return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`
	} else if (diffMonths < 12) {
		return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`
	} else {
		return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`
	}
}

/** Signed delta for watchlist, e.g. (+120) or (-412). */
function formatDelta(delta: number | null): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return "(0)"
	const sign = n >= 0 ? "+" : ""
	return `(${sign}${n})`
}

function expandItem(change: Revision, event: MouseEvent): void {
	// Don't expand if clicking on links or buttons
	const target = event.target as HTMLElement
	if (
		target.tagName === "A" ||
		target.tagName === "BUTTON" ||
		target.closest("a") ||
		target.closest("button")
	) {
		return
	}
	const id = change.id
	// Add this item to the set of expanded items
	expandedItemIds.value = new Set(expandedItemIds.value).add(id)
	// Automatically expand diff view
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.add(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
	// Load diff if not already loaded
	if (!loadedDiffs.value.has(id)) {
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
}

function collapseItem(id: number): void {
	expandedItemIds.value.delete(id)	
	expandedDiffIds.value.delete(id)
	expandedHistoryIds.value.delete(id)
}

function handleItemClick(change: Revision, event: MouseEvent): void {
	// Only expand if not already expanded
	if (!expandedItemIds.value.has(change.id)) {
		expandItem(change, event)
	}
}

function toggleDiff(change: Revision): void {
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

function handleHistoryItemClick(
	changeId: number,
	rev: { id: number },
	pageName: string,
	event: MouseEvent
): void {
	// Don't toggle if clicking on links or buttons
	const target = event.target as HTMLElement
	if (
		target.tagName === "A" ||
		target.tagName === "BUTTON" ||
		target.closest("a") ||
		target.closest("button")
	) {
		return
	}
	// Toggle the diff for this history item
	toggleHistoryDiff(changeId, rev, pageName)
}

function toggleHistory(change: Revision): void {
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
	wiki.getPageHistory(pageName)
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

/** Segment of a diff line for character-level display (API highlightRanges: type 0 = add, 1 = remove) */
interface DiffSegment {
	text: string
	type: "add" | "remove" | null
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
function getDiffLineSegments(line: DiffLine): DiffSegment[] {
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

function onThankClick(change: Revision, e: MouseEvent): void {
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

function getItemZIndex(dateKey: string, changeIndex: number): number {
	// Calculate cumulative index across all date groups
	// Items lower down the page get higher z-index values
	let cumulativeIndex = 0
	for (const group of revisionsByDate.value) {
		if (group.dateKey === dateKey) {
			// Return a higher z-index for items further down
			// Start from 10 to ensure it's above other elements
			return 10 + cumulativeIndex + changeIndex
		}
		cumulativeIndex += group.revisions.length
	}
	return 10 + cumulativeIndex + changeIndex
}
</script>

<template>
	<main>
		<!-- <form @submit.prevent="search">
			<div class="inputs-group">
				<div class="inputs">
					<CdxLabel input-id="page-name-1">Followed pages</CdxLabel>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[0]"
							input-type="search"
							id="page-name-1"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[1]"
							input-type="search"
							id="page-name-2"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[2]"
							input-type="search"
							id="page-name-3"
						/>
					</div>
				</div>
				<div class="inputs">
					<CdxLabel input-id="user-1">Followed users</CdxLabel>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[0]"
							input-type="search"
							id="user-1"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[1]"
							input-type="search"
							id="user-2"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[2]"
							input-type="search"
							id="user-3"
						/>
					</div>
				</div>
			</div>
			<footer>
				<CdxButton :disabled="isAnyLoading">Refresh feed</CdxButton>
			</footer>
		</form> -->

		<div class="watchlist-container">
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<div v-if="isLoading" class="watchlist-loading">
				<CdxProgressBar inline />
			</div>
			<template v-else v-for="dateGroup in revisionsByDate" :key="dateGroup.dateKey">
				<h4 class="watchlist-date-header">{{ dateGroup.dateLabel }}</h4>
				<div class="watchlist-history-box">
					<div
						v-for="(change, changeIndex) in dateGroup.revisions"
						:key="`${change.pageName}-${change.timestamp}`"
						:class="[
							'history-item',
							{ 'history-item-expanded': expandedItemIds.has(change.id) },
						]"
						:style="{
							zIndex: String(getItemZIndex(dateGroup.dateKey, changeIndex)),
						}"
						@click="handleItemClick(change, $event)"
					>
						<template v-if="!expandedItemIds.has(change.id)">
							<div class="history-row">
								<a
									target="_blank"
									:href="wiki.getPageUrl(change.pageName!)"
									class="history-page"
									>{{ change.pageName }}</a
								><span
									:class="[
										'history-time',
										{
											'history-time-expanded': expandedHistoryIds.has(
												change.id
											),
										},
									]"
								>
									{{ formatTime(change.timestamp) }}</span
								><span
									:class="[
										'history-delta',
										wiki.getDeltaClass(change.delta ?? 0, false),
										{
											'history-delta-expanded': expandedDiffIds.has(
												change.id
											),
										},
									]"
								>
									{{ formatDelta(change.delta) }}</span
								><a
									target="_blank"
									:href="wiki.getUserUrl(change.user.name)"
									class="history-user"
									>{{ change.user.name }}</a
								><span
									class="history-comment"
									v-html="change?.summary?.comment ?? ''"
								></span>
							</div>
						</template>
						<template v-else>
							<div class="history-expanded">
								<div class="history-title-row">
									<a
										target="_blank"
										:href="wiki.getPageUrl(change.pageName!)"
										class="history-page-expanded"
										>{{ change.pageName }}</a
									><button
										type="button"
										:class="[
											'history-delta',
											wiki.getDeltaClass(change.delta ?? 0, false),
											{
												'history-delta-expanded': expandedDiffIds.has(
													change.id
												),
											},
										]"
										@click.stop="toggleDiff(change)"
									>
										{{ formatDelta(change.delta) }}
									</button>
									<button
										type="button"
										class="history-collapse-button"
										@click.stop="collapseItem(change.id)"
										aria-label="Collapse"
									>
										−
									</button>
								</div>
								<a
									target="_blank"
									:href="wiki.getUserUrl(change.user.name)"
									class="history-user-expanded"
									>{{ change.user.name }}</a
								>
								<button
									type="button"
									:class="[
										'history-date-expanded',
										{
											'history-time-expanded': expandedHistoryIds.has(
												change.id
											),
										},
									]"
									@click.stop="toggleHistory(change)"
								>
									{{ formatRelativeDate(change.timestamp) }}
								</button>
								<div
									v-if="change?.summary?.comment"
									class="history-comment-expanded"
									v-html="change?.summary?.comment ?? ''"
								></div>
								<footer class="history-expanded-footer">
									<button
										type="button"
										class="history-action-button"
										:class="{
											'history-action-button-active': expandedDiffIds.has(change.id),
										}"
										@click.stop="toggleDiff(change)"
									>
										(diff)
									</button>
									<button
										type="button"
										class="history-action-button"
										:class="{
											'history-action-button-active': expandedHistoryIds.has(change.id),
										}"
										@click.stop="toggleHistory(change)"
									>
										(hist)
									</button>
									<button
										type="button"
										class="history-action-button"
										:class="{
											'history-action-button-thanked': thankedRevisionIds.has(change.id),
										}"
										:disabled="thankedRevisionIds.has(change.id)"
										@click.stop="onThankClick(change, $event)"
									>
										{{ thankedRevisionIds.has(change.id) ? "(thanked)" : "(thanks)" }}
									</button>
								</footer>
							</div>
						</template>
						<div v-if="expandedDiffIds.has(change.id)" class="history-inline-diff">
							<div
								v-if="loadedDiffs.get(change.id)?.diff?.length"
								class="change-diff"
							>
								<div
									v-for="(line, lineIdx) in loadedDiffs.get(change.id)!.diff"
									:key="lineIdx"
									:class="['diff-line', getDiffLineClass(line.type)]"
								>
									<span class="diff-line-text">
										<template
											v-if="
												(line.type === 0 ||
													line.type === 1 ||
													line.type === 2 ||
													line.type === 3 ||
													line.type === 4 ||
													line.type === 5) &&
												line.highlightRanges?.length
											"
										>
											<template
												v-for="(seg, segIdx) in getDiffLineSegments(line)"
												:key="segIdx"
											>
												<span
													v-if="seg.type === 'add'"
													class="diff-char-add"
													>{{ seg.text }}</span
												>
												<span
													v-else-if="seg.type === 'remove'"
													class="diff-char-remove"
													>{{ seg.text }}</span
												>
												<span
													v-else-if="seg.type === 'change'"
													class="diff-char-change"
													>{{ seg.text }}</span
												>
												<template v-else>{{ seg.text }}</template>
											</template>
										</template>
										<template v-else>{{ line.text || " " }}</template>
									</span>
								</div>
							</div>
							<div
								v-else-if="loadingDiffIds.has(change.id)"
								class="history-diff-loading"
							>
								<CdxProgressBar inline />
							</div>
							<div v-else class="history-diff-empty">No diff</div>
						</div>
						<div
							v-if="expandedHistoryIds.has(change.id)"
							class="history-inline-history"
						>
							<div
								v-if="loadedHistories.get(change.pageName!)?.revisions?.length"
								class="history-inline-history-box"
							>
								<div
									v-for="rev in loadedHistories.get(change.pageName!)!.revisions"
									:key="rev.id"
									:class="[
										'history-item',
										{ 'history-item-current': rev.id === change.id },
									]"
									@click="handleHistoryItemClick(change.id, rev, change.pageName!, $event)"
								>
									<div class="history-row">
										<span class="history-time">{{
											isToday(rev.timestamp)
												? formatTime(rev.timestamp)
												: formatDateShort(rev.timestamp)
										}}</span
										><span
											:class="[
												'history-delta',
												wiki.getDeltaClass(
													(rev.id === change.id
														? (change.delta ?? rev.delta)
														: rev.delta) ?? 0,
													false
												),
												{
													'history-delta-expanded': expandedHistoryDiffIds
														.get(change.id)
														?.has(rev.id),
												},
											]"
										>
											{{
												formatDelta(
													rev.id === change.id
														? (change.delta ?? rev.delta)
														: rev.delta
												)
											}}</span
										><a
											target="_blank"
											:href="wiki.getUserUrl(rev.user.name)"
											class="history-user"
											>{{ rev.user.name }}</a
										><span
											class="history-comment"
											v-html="rev.commentHtml ?? rev.comment ?? ''"
										></span>
									</div>
									<div
										v-if="expandedHistoryDiffIds.get(change.id)?.has(rev.id)"
										class="history-inline-diff history-inline-diff-nested"
									>
										<div
											v-if="loadedDiffs.get(rev.id)?.diff?.length"
											class="change-diff"
										>
											<div
												v-for="(line, lineIdx) in loadedDiffs.get(rev.id)!
													.diff"
												:key="lineIdx"
												:class="['diff-line', getDiffLineClass(line.type)]"
											>
												<span class="diff-line-text">
													<template
														v-if="
															(line.type === 0 ||
																line.type === 1 ||
																line.type === 2 ||
																line.type === 3 ||
																line.type === 4 ||
																line.type === 5) &&
															line.highlightRanges?.length
														"
													>
														<template
															v-for="(
																seg, segIdx
															) in getDiffLineSegments(line)"
															:key="segIdx"
														>
															<span
																v-if="seg.type === 'add'"
																class="diff-char-add"
																>{{ seg.text }}</span
															>
															<span
																v-else-if="seg.type === 'remove'"
																class="diff-char-remove"
																>{{ seg.text }}</span
															>
															<span
																v-else-if="seg.type === 'change'"
																class="diff-char-change"
																>{{ seg.text }}</span
															>
															<template v-else>{{
																seg.text
															}}</template>
														</template>
													</template>
													<template v-else>{{
														line.text || " "
													}}</template>
												</span>
											</div>
										</div>
										<div
											v-else-if="loadingDiffIds.has(rev.id)"
											class="history-diff-loading"
										>
											<CdxProgressBar inline />
										</div>
										<div v-else class="history-diff-empty">No diff</div>
									</div>
								</div>
							</div>
							<div v-else class="history-diff-loading">
								<CdxProgressBar inline />
							</div>
						</div>
					</div>
				</div>
			</template>
			<div v-if="!isLoading && hasMore" class="load-more-container">
				<CdxButton :disabled="isLoadingMore" @click="loadMore">
					{{ isLoadingMore ? "Loading..." : "Load more" }}
				</CdxButton>
			</div>
		</div>

		<div class="thank-hearts-overlay" aria-hidden="true">
			<div
				v-for="heart in risingHearts"
				:key="heart.id"
				:class="['thank-heart', heart.type === 'unthank' ? 'thank-heart-broken' : '']"
				:style="{ left: heart.x + 'px', top: heart.y + 'px' }"
			>
				{{ heart.type === "unthank" ? "</3" : "<3" }}
			</div>
		</div>
	</main>
</template>

<style scoped>
@import "./style.css";
</style>

<style>
.history-comment p {
	display: inline;
	line-height: var(--line-height-content);
}

.history-comment section {
	display: inline;
	line-height: var(--line-height-content);
}

.history-comment table {
	display: inline-block;
	background-color: var(--background-color-base);
	border: 1px solid var(--border-color-base);
	border-radius: 2px;
}

.history-comment-expanded p {
	display: block;
	line-height: var(--line-height-content);
	margin: 0;
}

.history-comment-expanded section {
	display: block;
	line-height: var(--line-height-content);
}

.history-comment-expanded table {
	display: block;
	background-color: var(--background-color-base);
	border: 1px solid var(--border-color-base);
	border-radius: 2px;
	margin-top: 0.5rem;
}
</style>
