<script setup lang="ts">
import { CdxButton, CdxLabel, CdxTextInput } from "@wikimedia/codex"
import { computed, onMounted, ref, type Ref } from "vue"
import {
	WikiApi,
	type CompareResponse,
	type DiffLine,
	type Result,
	type Revision,
} from "../../wiki-api/WikiApi"

const wiki = new WikiApi()
const PROTOTYPE_NAME = "SmoothWatchlistInlineDiff"

const pageStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "pageQuery", 3)
const userStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "userQuery", 3)

const pageSearchQueries = ref<string[]>([
	localStorage.getItem(pageStorageKeys[0]!) ?? "Wikipedia",
	localStorage.getItem(pageStorageKeys[1]!) ?? "Wet Leg",
	localStorage.getItem(pageStorageKeys[2]!) ?? "Water",
])
const userSearchQueries = ref<string[]>([
	localStorage.getItem(userStorageKeys[0]!) ?? "Samwalton9",
	localStorage.getItem(userStorageKeys[1]!) ?? "SNUGGUMS",
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

/** Revision ids that have been "thanked" (mock) */
const thankedRevisionIds = ref<Set<number>>(new Set())

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
	// Clear expanded/loaded diffs when feed is refreshed
	expandedDiffIds.value = new Set()
	loadedDiffs.value = new Map()
	loadingDiffIds.value = new Set()
	thankedRevisionIds.value = new Set()
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
				summary.comment = summary.comment
					? await wiki.transformWikitextToHtml("(" + summary.comment + ")", pageName)
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
				summary.comment = summary.comment
					? await wiki.transformWikitextToHtml("(" + summary.comment + ")", pageName)
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

/** Split a change line into segments for add (bold) and remove (strikethrough) styling */
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

function onThankClick(change: Revision, e: MouseEvent): void {
	e.preventDefault()
	const id = change.id
	if (thankedRevisionIds.value.has(id)) {
		thankedRevisionIds.value = new Set(thankedRevisionIds.value)
		thankedRevisionIds.value.delete(id)
	} else {
		thankedRevisionIds.value = new Set(thankedRevisionIds.value).add(id)
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
				<ul class="watchlist">
					<li
						class="watchlist-item"
						v-for="change in dateGroup.revisions"
						:key="`${change.pageName}-${change.timestamp}`"
					>
						<div class="watchlist-line1">
							<span class="watchlist-sep"> </span>
							<a
								target="_blank"
								:href="wiki.getPageUrl(change.pageName!)"
								class="watchlist-page"
							>
								{{ change.pageName }}</a
							><span class="watchlist-semi">;</span>
							<span class="watchlist-sep"> </span>
							<span class="watchlist-time"
								>&nbsp;{{ formatTime(change.timestamp) }}</span
							>
							<span class="watchlist-sep"> .. </span>
							<span
								:class="[
									'watchlist-delta',
									wiki.getDeltaClass(change.delta ?? 0, false),
								]"
							>
								{{ formatDelta(change.delta) }}</span
							><span class="watchlist-sep">.. </span>
							<a
								target="_blank"
								:href="wiki.getUserUrl(change.user.name)"
								class="watchlist-user"
							>
								{{ change.user.name }}</a
							>
							<span class="watchlist-talk-contribs">
								(<a target="_blank" :href="wiki.getUserTalkUrl(change.user.name)"
									>talk</a
								>
								|
								<a target="_blank" :href="wiki.getUserContribsUrl(change.user.name)"
									>contribs</a
								>)
							</span>
							<br />
							<template v-if="change?.summary?.comment"
								><span
									class="watchlist-comment"
									v-html="change.summary.comment ?? ''"
								></span
							></template>
							<span v-if="change?.summary?.hashtags" class="watchlist-tags">
								(Tags:
								<span class="watchlist-tag-names">{{
									change.summary.hashtags
								}}</span
								>)
							</span>
							<span class="watchlist-diff-hist">
								(<button
									type="button"
									class="watchlist-diff-link"
									:class="{
										'watchlist-diff-link-expanded': expandedDiffIds.has(
											change.id
										),
									}"
									@click="toggleDiff(change)"
								>
									diff
								</button>
								|
								<a target="_blank" :href="wiki.getHistoryUrl(change.pageName!)"
									>hist</a
								>
								|
								<button
									type="button"
									class="watchlist-thank-link"
									:class="{
										'watchlist-thank-link-thanked': thankedRevisionIds.has(
											change.id
										),
									}"
									@click="onThankClick(change, $event)"
								>
									{{
										thankedRevisionIds.has(change.id) ? "thanked" : "thank"
									}}</button
								>)
							</span>
						</div>
						<div v-if="expandedDiffIds.has(change.id)" class="watchlist-inline-diff">
							<div
								v-if="loadingDiffIds.has(change.id)"
								class="watchlist-diff-loading"
							>
								Loading diff…
							</div>
							<div
								v-else-if="loadedDiffs.get(change.id)?.diff?.length"
								class="change-diff"
							>
								<div
									v-for="(line, lineIdx) in loadedDiffs.get(change.id)!.diff"
									:key="lineIdx"
									:class="['diff-line', getDiffLineClass(line.type)]"
								>
									<span class="diff-line-prefix">{{
										line.type === 1 ? "+" : line.type === 2 ? "-" : " "
									}}</span>
									<span class="diff-line-text">
										<template
											v-if="
												(line.type === 3 ||
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
												<template v-else>{{ seg.text }}</template>
											</template>
										</template>
										<template v-else>{{ line.text || " " }}</template>
									</span>
								</div>
							</div>
							<div v-else class="watchlist-diff-loading">No diff available.</div>
						</div>
					</li>
				</ul>
			</template>
		</div>
	</main>
</template>

<style scoped>
@import "./style.css";
</style>

<style>
.watchlist-comment p {
	display: inline;
	line-height: var(--line-height-content);
}

.watchlist-comment section {
	display: inline;
	line-height: var(--line-height-content);
}

.watchlist-comment table {
	display: inline-block;
	background-color: var(--background-color-base);
	border: 1px solid var(--border-color-base);
	border-radius: 2px;
}
</style>
