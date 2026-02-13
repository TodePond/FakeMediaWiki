<script setup lang="ts">
import { CdxButton, CdxLabel, CdxTextInput } from "@wikimedia/codex"
import { computed, onMounted, ref, type Ref } from "vue"
import { WikiApi, type Result, type Revision } from "../../wiki-api/WikiApi"

defineProps<{
	indentCommentAndLinks?: boolean
}>()

const wiki = new WikiApi()
const PROTOTYPE_NAME = "SmoothWatchlist"

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
	localStorage.getItem(userStorageKeys[2]!) ?? "Satayboi",
])

const pageResults = wiki.createResults<Revision>(3).map(r => ref(r))
const userResults = wiki.createResults<Revision>(3).map(r => ref(r))

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

	// Convert to array and sort by date (most recent first)
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

/** Signed delta for watchlist, e.g. (+120) or (-412). Coerce to number to avoid double plus. */
function formatDelta(delta: number | null): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return "(0)"
	const sign = n >= 0 ? "+" : ""
	return `(${sign}${n})`
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

		<div
			class="watchlist-container"
			:class="{ 'watchlist-indented': $props.indentCommentAndLinks }"
		>
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
							><span class="watchlist-sep"> .. </span>
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
								(<a
									target="_blank"
									:href="wiki.getRevisionUrl(change.id, change.pageName!)"
									>diff</a
								>
								|
								<a target="_blank" :href="wiki.getHistoryUrl(change.pageName!)"
									>hist</a
								>
								| <a target="_blank" :href="wiki.getThankUrl(change.id)">thank</a>)
							</span>
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
