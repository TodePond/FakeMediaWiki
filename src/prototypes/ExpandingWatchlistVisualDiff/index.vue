<template>
	<main class="expanding-watchlist-visual-diff">
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
										class="history-action-button history-action-button-left"
										:class="{
											'history-action-button-active': expandedTalkIds.has(
												change.id
											),
										}"
										@click.stop="toggleTalk(change)"
									>
										(talk)
									</button>
									<div class="history-action-buttons-right">
										<button
											type="button"
											class="history-action-button"
											:class="{
												'history-action-button-active': expandedDiffIds.has(
													change.id
												),
											}"
											@click.stop="toggleDiff(change)"
										>
											(diff)
										</button>
										<button
											type="button"
											class="history-action-button"
											:class="{
												'history-action-button-active':
													expandedHistoryIds.has(change.id),
											}"
											@click.stop="toggleHistory(change)"
										>
											(hist)
										</button>
										<button
											type="button"
											class="history-action-button"
											:class="{
												'history-action-button-thanked':
													thankedRevisionIds.has(change.id),
											}"
											:disabled="thankedRevisionIds.has(change.id)"
											@click.stop="onThankClick(change, $event)"
										>
											{{
												thankedRevisionIds.has(change.id)
													? "(thanked)"
													: "(thanks)"
											}}
										</button>
									</div>
								</footer>
							</div>
						</template>
						<div v-if="expandedDiffIds.has(change.id)" class="history-inline-diff">
							<div
								v-if="loadedVisualDiffs.has(change.id)"
								class="change-diff-visual"
							>
								<VisualDiff
									:old-html="loadedVisualDiffs.get(change.id)!.oldHtml"
									:new-html="loadedVisualDiffs.get(change.id)!.newHtml"
								/>
							</div>
							<div
								v-else-if="firstRevisionIds.has(change.id)"
								class="history-diff-empty"
							>
								First revision (no diff)
							</div>
							<div
								v-else-if="loadingDiffIds.has(change.id)"
								class="history-diff-loading"
							>
								<CdxProgressBar inline />
							</div>
							<div v-else class="history-diff-empty">No diff</div>
						</div>
						<div v-if="expandedTalkIds.has(change.id)" class="history-inline-talk">
							<div class="talk-editor">
								<textarea
									class="talk-editor-textarea"
									placeholder="Write on the editor's talk page..."
									:value="talkPageText.get(change.id) || ''"
									@input="
										updateTalkText(
											change.id,
											($event.target as HTMLTextAreaElement).value
										)
									"
								></textarea>
								<div class="talk-editor-footer">
									<!-- <CdxButton
										weight="quiet"
										action="destructive"
										@click="collapseItem(change.id)"
									>
										Cancel
									</CdxButton> -->
									<CdxButton weight="primary" @click="handleAddTopic(change)">
										Add topic
									</CdxButton>
								</div>
							</div>
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
									@click="
										handleHistoryItemClick(
											change.id,
											rev,
											change.pageName!,
											$event
										)
									"
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
											v-if="loadedVisualDiffs.has(rev.id)"
											class="change-diff-visual"
										>
											<VisualDiff
												:old-html="loadedVisualDiffs.get(rev.id)!.oldHtml"
												:new-html="loadedVisualDiffs.get(rev.id)!.newHtml"
											/>
										</div>
										<div
											v-else-if="firstRevisionIds.has(rev.id)"
											class="history-diff-empty"
										>
											First revision (no diff)
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
				{{ heart.type === "unthank" ? "\</3" : "\<3" }}
			</div>
		</div>
	</main>
</template>

<script setup lang="ts">
import { CdxButton, CdxProgressBar } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import type {
	FWPageHistoryResponse,
	FWPageHistoryRevision,
	FWRevision,
} from "fakewiki/types"
import { whenVePlatformReady } from "@/lib/visualeditor/loadVe"
import { computed, onMounted, ref } from "vue"
import VisualDiff from "@/components/VisualDiff/VisualDiff.vue"

/** History revision with edit summary rendered as HTML */
interface HistoryRevisionWithHtml extends FWPageHistoryRevision {
	commentHtml: string
}

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "ExpandingWatchlistVisualDiff"

const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries")
const defaultPageSearchQueries = [
	"Gorillaz",
	"Little Mix",
	"Wet Leg",
	"Jade Thirlwall",
	"Water",
	"Confidence Man (band)",
	"Algorave",
]
const defaultUserSearchQueries = ["Todepond", "Samwalton9"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserSearchQueries))

// Combined feed results
const allRevisionsData = ref<FWRevision[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const errors = ref<string[]>([])
const hasMore = ref(true) // Whether there are more revisions to load

/** Which revision ids have the inline diff expanded */
const expandedDiffIds = ref<Set<number>>(new Set())
/** Loaded visual diff: old and new HTML per revision id so VisualDiff component can render */
const loadedVisualDiffs = ref<Map<number, { oldHtml: string; newHtml: string }>>(new Map())
/** Revision ids that are first revision (no parent, so no diff) */
const firstRevisionIds = ref<Set<number>>(new Set())
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

/** Which revision ids have the feed item body expanded */
const expandedItemIds = ref<Set<number>>(new Set())

/** Which revision ids have the talk page expanded */
const expandedTalkIds = ref<Set<number>>(new Set())
/** Talk page text content keyed by revision id */
const talkPageText = ref<Map<number, string>>(new Map())
/** Current editor mode: 'visual' or 'source' */
const editorMode = ref<Map<number, "visual" | "source">>(new Map())

/** Revision ids that have been "thanked" (mock) */
const thankedRevisionIds = ref<Set<number>>(new Set())
/** Rising heart particles: id, viewport position, and thank vs unthank */
const risingHearts = ref<Array<{ id: number; x: number; y: number; type: "thank" | "unthank" }>>([])
let nextHeartId = 0
const HEART_RISE_DURATION_MS = 2500

onMounted(async () => {
	await whenVePlatformReady()
	search()
})

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

async function loadFeed(after?: Record<string, string>, append = false): Promise<void> {
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
	loadedVisualDiffs.value = new Map()
	firstRevisionIds.value = new Set()
	loadingDiffIds.value = new Set()
	expandedHistoryIds.value = new Set()
	expandedHistoryDiffIds.value = new Map()
	loadedHistories.value = new Map()
	loadingHistoryPageNames.value = new Set()
	expandedItemIds.value = new Set()
	expandedTalkIds.value = new Set()
	// Keep thanked state - don't clear it on refresh
	// Keep talk page text cached
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

const allRevisions = computed(() => allRevisionsData.value)

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
	return wiki.formatRelativeTimestamp(timestamp, {
		seconds: "words",
		minutes: "minutes",
		hours: "hours",
		days: "days",
		weeks: "weeks",
		months: "months",
		years: "years",
	})
}

/** Signed delta for watchlist, e.g. (+120) or (-412). */
function formatDelta(delta: number | null): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return "(0)"
	const sign = n >= 0 ? "+" : ""
	return `(${sign}${n})`
}

function expandItem(change: FWRevision, event: MouseEvent): void {
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
	// Load full page HTML for both revisions so VisualDiff component can diff them
	if (!loadedVisualDiffs.value.has(id) && !firstRevisionIds.value.has(id)) {
		const pageName = change.pageName
		if (!pageName) return
		loadingDiffIds.value = new Set(loadingDiffIds.value)
		loadingDiffIds.value.add(id)
		wiki
			.getParentRevisionId(pageName, id)
			.then(parentId => {
				if (parentId == null) {
					firstRevisionIds.value = new Set(firstRevisionIds.value).add(id)
					loadingDiffIds.value = new Set(loadingDiffIds.value)
					loadingDiffIds.value.delete(id)
					return
				}
				return Promise.all([
					wiki.getRevisionHtml(pageName, parentId),
					wiki.getRevisionHtml(pageName, id),
				]).then(([oldHtml, newHtml]) => {
					loadedVisualDiffs.value = new Map(loadedVisualDiffs.value).set(id, {
						oldHtml,
						newHtml,
					})
				})
			})
			.finally(() => {
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
			})
			.catch(e => {
				console.error("Failed to load visual diff", e)
			})
	}
}

function collapseItem(id: number): void {
	expandedItemIds.value.delete(id)
	expandedDiffIds.value.delete(id)
	expandedHistoryIds.value.delete(id)
	expandedTalkIds.value.delete(id)
}

function handleItemClick(change: FWRevision, event: MouseEvent): void {
	// Only expand if not already expanded
	if (!expandedItemIds.value.has(change.id)) {
		expandItem(change, event)
	}
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
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(id)
	if (loadedVisualDiffs.value.has(id) || firstRevisionIds.value.has(id)) return
	const pageName = change.pageName
	if (!pageName) return
	loadingDiffIds.value = new Set(loadingDiffIds.value)
	loadingDiffIds.value.add(id)
	wiki
		.getParentRevisionId(pageName, id)
		.then(parentId => {
			if (parentId == null) {
				firstRevisionIds.value = new Set(firstRevisionIds.value).add(id)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
				return
			}
			return Promise.all([
				wiki.getRevisionHtml(pageName, parentId),
				wiki.getRevisionHtml(pageName, id),
			]).then(([oldHtml, newHtml]) => {
				loadedVisualDiffs.value = new Map(loadedVisualDiffs.value).set(id, {
					oldHtml,
					newHtml,
				})
			})
		})
		.finally(() => {
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
		.catch(e => {
			console.error("Failed to load visual diff", e)
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
	if (loadedVisualDiffs.value.has(id) || firstRevisionIds.value.has(id)) return
	loadingDiffIds.value = new Set(loadingDiffIds.value)
	loadingDiffIds.value.add(id)
	wiki
		.getParentRevisionId(pageName, id)
		.then(parentId => {
			if (parentId == null) {
				firstRevisionIds.value = new Set(firstRevisionIds.value).add(id)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
				return
			}
			return Promise.all([
				wiki.getRevisionHtml(pageName, parentId),
				wiki.getRevisionHtml(pageName, id),
			]).then(([oldHtml, newHtml]) => {
				loadedVisualDiffs.value = new Map(loadedVisualDiffs.value).set(id, {
					oldHtml,
					newHtml,
				})
			})
		})
		.finally(() => {
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
		.catch(e => {
			console.error("Failed to load visual diff", e)
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
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(id)
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

function toggleTalk(change: FWRevision): void {
	const id = change.id
	const expanded = expandedTalkIds.value.has(id)
	if (expanded) {
		expandedTalkIds.value = new Set(expandedTalkIds.value)
		expandedTalkIds.value.delete(id)
		return
	}
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.delete(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
	// Initialize text content and editor mode if not already set
	if (!talkPageText.value.has(id)) {
		talkPageText.value = new Map(talkPageText.value).set(id, "")
	}
	if (!editorMode.value.has(id)) {
		editorMode.value = new Map(editorMode.value).set(id, "source")
	}
}

function updateTalkText(id: number, text: string): void {
	talkPageText.value = new Map(talkPageText.value).set(id, text)
}

function handleAddTopic(change: FWRevision): void {
	// TODO: Implement add topic functionality
	const text = talkPageText.value.get(change.id) || ""
	console.log("Add topic:", text)
	// For now, just close the talk tab
	// Keep the item expanded though
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(change.id)
}
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
