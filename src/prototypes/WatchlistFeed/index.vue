<template>
	<main class="watchlist-feed">
		<form @submit.prevent="search">
			<div class="inputs-group">
				<div class="inputs">
					<CdxLabel :input-id="getPageInputId(0)">Followed pages</CdxLabel>
					<div class="input-group" v-for="(_, index) in pageSearchQueries" :key="`page-${index}`">
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[index]"
							input-type="search"
							:id="getPageInputId(index)"
						/>
					</div>
					<div class="input-list-actions">
						<CdxButton type="button" @click="addPage">Add page</CdxButton>
						<CdxButton type="button" @click="removePage" :disabled="pageSearchQueries.length === 0">
							Remove page
						</CdxButton>
					</div>
				</div>
				<div class="inputs">
					<CdxLabel :input-id="getUserInputId(0)">Followed users</CdxLabel>
					<div class="input-group" v-for="(_, index) in userSearchQueries" :key="`user-${index}`">
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[index]"
							input-type="search"
							:id="getUserInputId(index)"
						/>
					</div>
					<div class="input-list-actions">
						<CdxButton type="button" @click="addUser">Add user</CdxButton>
						<CdxButton type="button" @click="removeUser" :disabled="userSearchQueries.length === 0">
							Remove user
						</CdxButton>
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
							<span class="watchlist-diff-hist">
								(<a
									target="_blank"
									:href="wiki.getRevisionUrl(change.id, change.pageName!)"
									>diff</a
								>
								|
								<a target="_blank" :href="wiki.getHistoryUrl(change.pageName!)"
									>hist</a
								>).
							</span>
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
							<template v-if="change?.summary?.comment"
								><span
									class="watchlist-comment"
									v-html="change.summary.comment ?? ''"
								></span
								>&nbsp;</template
							>
							<span v-if="change?.summary?.hashtags" class="watchlist-tags">
								(Tags:
								<span class="watchlist-tag-names">{{
									change.summary.hashtags
								}}</span
								>)
							</span>
							<span class="watchlist-sep"> </span>
							<span
								>(<a target="_blank" :href="wiki.getThankUrl(change.id)">thank</a
								>)</span
							>
						</div>
					</li>
				</ul>
			</template>
		</div>
	</main>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxTextInput } from "@wikimedia/codex"
import { computed, onMounted, ref, type Ref } from "vue"
import { FakeWiki } from "fakewiki"
import type { FWResult, FWRevision } from "fakewiki/types"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "WatchlistFeed"

const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries")
const defaultPageSearchQueries = ["Wikipedia", "Wet Leg", "Water"]
const defaultUserSearchQueries = ["Samwalton9", "Humbugtheman", "Todepond"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserSearchQueries))

const pageResults = wiki
	.createResults<FWRevision>(pageSearchQueries.value.length)
	.map(result => ref(result))
const userResults = wiki
	.createResults<FWRevision>(userSearchQueries.value.length)
	.map(result => ref(result))

onMounted(search)

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
				summary.comment = summary.comment
					? await wiki.transformWikitextToHtml("(" + summary.comment + ")", pageName)
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
				summary.comment = summary.comment
					? await wiki.transformWikitextToHtml("(" + summary.comment + ")", pageName)
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

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
