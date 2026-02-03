<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressBar, CdxTextInput } from "@wikimedia/codex"
import { computed, onMounted, ref, type Ref } from "vue"
import {
	WikiApi,
	type CompareResponse,
	type DiffLine,
	type PageHistoryResponse,
	type PageHistoryRevision,
	type Result,
	type Revision,
} from "../../wiki-api/WikiApi"

/** History revision with edit summary rendered as HTML */
interface HistoryRevisionWithHtml extends PageHistoryRevision {
	commentHtml: string
}

const wiki = new WikiApi()
const PROTOTYPE_NAME = "SmoothWatchlistHistoryStyle"

const pageStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "pageQuery", 3)
const userStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "userQuery", 3)

const pageSearchQueries = ref<string[]>([
	localStorage.getItem(pageStorageKeys[0]!) ?? "Wikipedia",
	localStorage.getItem(pageStorageKeys[1]!) ?? "Wet Leg",
	localStorage.getItem(pageStorageKeys[2]!) ?? "Water",
])
const userSearchQueries = ref<string[]>([
	localStorage.getItem(userStorageKeys[0]!) ?? "Samwalton9",
	localStorage.getItem(userStorageKeys[1]!) ?? "GearsDatapack",
	localStorage.getItem(userStorageKeys[2]!) ?? "TrademarkedTWOrantula",
])

const pageResults = wiki.createResults<Revision>(3).map(r => ref(r))
const userResults = wiki.createResults<Revision>(3).map(r => ref(r))

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

async function loadUser(userName: string, resultRef: Ref<Result<Revision>>): Promise<void> {
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
					? await wiki.transformWikitextToHtml("(" + commentText + ")", pageName)
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

		resultRef.value = { data: processedRevisions, loading: false, error: null }
	} catch (e) {
		const errorObj = e as Error
		const errorMsg = errorObj.message.includes("404")
			? `${userName}: User not found`
			: `${userName}: ${errorObj.message}`
		resultRef.value = { data: [], loading: false, error: errorMsg }
	}
}

async function loadPage(pageName: string, resultRef: Ref<Result<Revision>>): Promise<void> {
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
					? await wiki.transformWikitextToHtml("(" + commentText + ")", pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const processedRevision: Revision = {
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

const allRevisions = computed(() => {
	const revisions: Revision[] = []
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

/** Signed delta for watchlist, e.g. (+120) or (-412). */
function formatDelta(delta: number | null): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return "(0)"
	const sign = n >= 0 ? "+" : ""
	return `(${sign}${n})`
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
	wiki.getParentRevisionId(pageName, id)
		.then(parentId => {
			if (parentId != null) {
				return wiki.compareRevisions(parentId, id).then(response => {
					loadedDiffs.value = new Map(loadedDiffs.value).set(id, response)
					loadingDiffIds.value = new Set(loadingDiffIds.value)
					loadingDiffIds.value.delete(id)
				})
			}
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
	wiki.getParentRevisionId(pageName, id)
		.then(parentId => {
			if (parentId != null) {
				return wiki.compareRevisions(parentId, id).then(response => {
					loadedDiffs.value = new Map(loadedDiffs.value).set(id, response)
					loadingDiffIds.value = new Set(loadingDiffIds.value)
					loadingDiffIds.value.delete(id)
				})
			}
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
		.catch(e => {
			console.error("Failed to load diff", e)
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
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
</script>

<template>
	<main>
		<form @submit.prevent="search">
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
		</form>

		<div class="watchlist-container">
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<template v-for="dateGroup in revisionsByDate" :key="dateGroup.dateKey">
				<h4 class="watchlist-date-header">{{ dateGroup.dateLabel }}</h4>
				<div class="watchlist-history-box">
					<div
						v-for="change in dateGroup.revisions"
						:key="`${change.pageName}-${change.timestamp}`"
						class="history-item"
					>
						<div class="history-row">
							<a
								target="_blank"
								:href="wiki.getPageUrl(change.pageName!)"
								class="history-page"
								>{{ change.pageName }}</a
							><button
								type="button"
								:class="[
									'history-time',
									{ 'history-time-expanded': expandedHistoryIds.has(change.id) },
								]"
								@click="toggleHistory(change)"
							>
								{{ formatTime(change.timestamp) }}</button
							><a
								target="_blank"
								:href="wiki.getUserUrl(change.user.name)"
								class="history-user"
								>{{ change.user.name }}</a
							><button
								type="button"
								:class="[
									'history-delta',
									wiki.getDeltaClass(change.delta ?? 0, false),
									{ 'history-delta-expanded': expandedDiffIds.has(change.id) },
								]"
								@click="toggleDiff(change)"
							>
								{{ formatDelta(change.delta) }}</button
							><span
								class="history-comment"
								v-html="change?.summary?.comment ?? ''"
							></span>
						</div>
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
								>
									<div class="history-row">
										<a
											target="_blank"
											:href="wiki.getPageUrl(change.pageName!)"
											class="history-page"
											>{{ change.pageName }}</a
										><span class="history-time">{{
											formatTime(rev.timestamp)
										}}</span
										><a
											target="_blank"
											:href="wiki.getUserUrl(rev.user.name)"
											class="history-user"
											>{{ rev.user.name }}</a
										><button
											type="button"
											:class="[
												'history-delta',
												wiki.getDeltaClass(rev.delta ?? 0, false),
												{
													'history-delta-expanded': expandedHistoryDiffIds
														.get(change.id)
														?.has(rev.id),
												},
											]"
											@click="
												toggleHistoryDiff(change.id, rev, change.pageName!)
											"
										>
											{{ formatDelta(rev.delta) }}</button
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
</style>
