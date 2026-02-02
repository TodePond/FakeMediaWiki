<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxTextInput } from "@wikimedia/codex"
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
import { computed, onMounted, ref, type Ref } from "vue"
import { WikiApi, type PageHistoryRevision, type Revision } from "../../wiki-api/WikiApi"

const wiki = new WikiApi()

const pageStorageKeys: [string, string, string] = [
	"searchQueryFeed1",
	"searchQueryFeed2",
	"searchQueryFeed3",
]
const userStorageKeys: [string, string, string] = [
	"searchQueryFeed4",
	"searchQueryFeed5",
	"searchQueryFeed6",
]
const pageSearchQueries = ref<string[]>([
	localStorage.getItem(pageStorageKeys[0]) ?? "Wikipedia",
	localStorage.getItem(pageStorageKeys[1]) ?? "Wet Leg",
	localStorage.getItem(pageStorageKeys[2]) ?? "Water",
])
const userSearchQueries = ref<string[]>([
	localStorage.getItem(userStorageKeys[0]) ?? "Samwalton9",
	localStorage.getItem(userStorageKeys[1]) ?? "GearsDatapack",
	localStorage.getItem(userStorageKeys[2]) ?? "TrademarkedTWOrantula",
])

// Store results separately for each page
const pageResults: [Ref<Revision[]>, Ref<Revision[]>, Ref<Revision[]>] = [ref([]), ref([]), ref([])]
const userResults: [Ref<Revision[]>, Ref<Revision[]>, Ref<Revision[]>] = [ref([]), ref([]), ref([])]
const pageLoading: [Ref<boolean>, Ref<boolean>, Ref<boolean>] = [ref(false), ref(false), ref(false)]
const userLoading: [Ref<boolean>, Ref<boolean>, Ref<boolean>] = [ref(false), ref(false), ref(false)]
const pageError: [Ref<string | null>, Ref<string | null>, Ref<string | null>] = [
	ref(null),
	ref(null),
	ref(null),
]
const userError: [Ref<string | null>, Ref<string | null>, Ref<string | null>] = [
	ref(null),
	ref(null),
	ref(null),
]
onMounted(search)

function saveSearchQueries(): void {
	pageSearchQueries.value.forEach((query, index) => {
		if (pageStorageKeys[index]) {
			localStorage.setItem(pageStorageKeys[index], query)
		}
	})
	userSearchQueries.value.forEach((query, index) => {
		if (userStorageKeys[index]) {
			localStorage.setItem(userStorageKeys[index], query)
		}
	})
}

async function search(): Promise<void> {
	// Load each page independently
	const loadPromises: Promise<void>[] = []
	for (let i = 0; i < pageSearchQueries.value.length; i++) {
		const query = pageSearchQueries.value[i]
		const results = pageResults[i]
		const loading = pageLoading[i]
		const error = pageError[i]
		if (
			query !== undefined &&
			results !== undefined &&
			loading !== undefined &&
			error !== undefined
		) {
			if (query.trim()) {
				loadPromises.push(loadPage(i + 1, query, results, loading, error))
			} else {
				results.value = []
				loading.value = false
				error.value = null
			}
		}
	}
	for (let i = 0; i < userSearchQueries.value.length; i++) {
		const query = userSearchQueries.value[i]
		const results = userResults[i]
		const loading = userLoading[i]
		const error = userError[i]
		if (
			query !== undefined &&
			results !== undefined &&
			loading !== undefined &&
			error !== undefined
		) {
			if (query.trim()) {
				loadPromises.push(loadUser(i + 1, query, results, loading, error))
			} else {
				results.value = []
				loading.value = false
				error.value = null
			}
		}
	}

	await Promise.all(loadPromises)
	saveSearchQueries()
}

async function loadUser(
	_userNum: number,
	userName: string,
	resultsRef: Ref<Revision[]>,
	loadingRef: Ref<boolean>,
	errorRef: Ref<string | null>
): Promise<void> {
	loadingRef.value = true
	errorRef.value = null

	try {
		const _history = await wiki.getUserHistory(userName, { limit: 10 })

		if (!_history.revisions) {
			resultsRef.value = []
			loadingRef.value = false
			return
		}

		const processedRevisions = await Promise.all(
			_history.revisions.map(async revision => {
				const pageName =
					(
						revision as PageHistoryRevision & {
							pageName?: string
							title?: string
						}
					).pageName ||
					(
						revision as PageHistoryRevision & {
							pageName?: string
							title?: string
						}
					).title ||
					""
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
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const processedRevision: Revision = {
					...revision,
					delta: revision.delta ?? 0,
					comment: revision.comment || "",
					summary: {
						comment: summary.comment ?? null,
						suggestedBy: summary.suggestedBy ?? null,
						hashtags: summary.hashtags,
						useThisBot: summary.useThisBot ?? null,
						reportBugs: summary.reportBugs ?? null,
					},
					pageName,
					thumbnailUrl: null,
				}
				return processedRevision
			})
		)

		resultsRef.value = processedRevisions
		loadingRef.value = false
	} catch (e) {
		loadingRef.value = false
		const errorObj = e as Error
		if (errorObj.message.includes("404")) {
			errorRef.value = `${userName}: User not found`
		} else {
			errorRef.value = `${userName}: ${errorObj.message}`
		}
		resultsRef.value = []
	}
}

async function loadPage(
	_pageNum: number,
	pageName: string,
	resultsRef: Ref<Revision[]>,
	loadingRef: Ref<boolean>,
	errorRef: Ref<string | null>
): Promise<void> {
	loadingRef.value = true
	errorRef.value = null

	try {
		const _history = await wiki.getPageHistory(pageName, { limit: 10 })

		if (!_history.revisions) {
			resultsRef.value = []
			loadingRef.value = false
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
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const processedRevision: Revision = {
					...revision,
					delta: revision.delta ?? 0,
					summary: {
						comment: summary.comment ?? null,
						suggestedBy: summary.suggestedBy ?? null,
						hashtags: summary.hashtags,
						useThisBot: summary.useThisBot ?? null,
						reportBugs: summary.reportBugs ?? null,
					},
					pageName,
					thumbnailUrl: null,
				}
				return processedRevision
			})
		)

		resultsRef.value = processedRevisions
		loadingRef.value = false
	} catch (e) {
		loadingRef.value = false
		const errorObj = e as Error
		if (errorObj.message.includes("404")) {
			errorRef.value = `${pageName}: Page not found`
		} else {
			errorRef.value = `${pageName}: ${errorObj.message}`
		}
		resultsRef.value = []
	}
}

// Combined view of all revisions from all pages and users, sorted by timestamp
const allRevisions = computed(() => {
	const revisions: Revision[] = []
	const seenIds = new Set<number>()

	pageResults.forEach(result => {
		result.value.forEach(revision => {
			if (revision.id && !seenIds.has(revision.id)) {
				seenIds.add(revision.id)
				revisions.push(revision)
			}
		})
	})
	userResults.forEach(result => {
		result.value.forEach(revision => {
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

const isAnyLoading = computed(() => {
	return pageLoading.some(loading => loading.value) || userLoading.some(loading => loading.value)
})

const errors = computed(() => {
	const errs: string[] = []
	pageError.forEach(error => {
		if (error.value) errs.push(error.value)
	})
	userError.forEach(error => {
		if (error.value) errs.push(error.value)
	})
	return errs
})

function formatTimestamp(timestamp: string): string {
	return wiki.getRelativeTimestamp(timestamp, {
		seconds: "words",
		minutes: "minutes",
		hours: "hours",
		days: "days",
		weeks: "date",
		months: "date",
		years: "date",
	})
}

function getDeltaClass(delta: number): string {
	if (delta > 0) {
		return "positive"
	} else if (delta < 0) {
		return "negative"
	} else {
		return "neutral"
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

		<section class="changes">
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<div
				class="change"
				v-for="change in allRevisions"
				:key="`${change.pageName}-${change.timestamp}`"
			>
				<div class="change-body">
					<span class="change-page-name-and-delta">
						<a
							v-if="change.pageName"
							target="_blank"
							:href="wiki.getPageUrl(change.pageName)"
							class="change-page-name"
						>
							{{ change.pageName }}
						</a>
						&nbsp;<span :class="getDeltaClass(change.delta ?? 0)">{{
							change.delta ?? 0
						}}</span>
					</span>
					<span class="change-header">
						<a
							class="change-user-name"
							target="_blank"
							:href="wiki.getUserUrl(change.user.name)"
						>
							<strong>{{ change.user.name }}</strong>
						</a>
						<span class="change-suggested-by" v-if="change.summary?.suggestedBy">
							&nbsp;suggested by
							<a :href="wiki.getUserUrl(change.summary.suggestedBy)">{{
								change.summary.suggestedBy
							}}</a>
						</span>
					</span>
					<span class="change-timestamp">
						<a
							v-if="change.pageName"
							target="_blank"
							:href="wiki.getRevisionUrl(change.id, change.pageName)"
							>{{ formatTimestamp(change.timestamp) }}</a
						>
					</span>
					<div class="change-comment" v-html="change?.summary?.comment"></div>
				</div>

				<footer>
					<a
						v-if="change.pageName"
						target="_blank"
						:href="wiki.getRevisionUrl(change.id, change.pageName)"
					>
						<CdxIcon :icon="cdxIconLinkExternal" />
					</a>
					<a target="_blank" :href="wiki.getThankUrl(change.id)">
						<CdxIcon :icon="cdxIconHeart" />
					</a>
				</footer>
			</div>
		</section>
	</main>
</template>

<style scoped>
.change {
	padding: 1rem 0rem;
	display: flex;
	border-bottom: 0.5px solid var(--border-color-subtle);
	align-items: flex-start;
	gap: 0.5rem;
}

.change-comment {
	padding-top: 0.4rem;
}

main {
	display: flex;
	gap: 2rem;
	justify-content: space-between;
	width: 100%;
}

form {
	order: 2;
	flex-grow: 1;
	padding-bottom: 0.5rem;
}

.changes {
	display: flex;
	flex-direction: column;
	max-width: 800px;
	margin-top: -1rem;
}

.changes p {
	margin: 0;
}

.change-body {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.positive {
	color: var(--color-content-added);
}

.positive::before {
	content: "+";
}

.negative {
	color: var(--color-content-removed);
}

.neutral {
	color: var(--color-base);
}

.neutral::before {
	content: "±";
}

.cdx-text-input {
	max-width: 100%;
	min-width: 0;
	width: 256px;
}

.inputs-group {
	display: flex;
	gap: 0.8rem 2rem;
	flex-direction: column;
	justify-content: flex-end;
	align-items: flex-end;
}

.inputs {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	margin-bottom: 0.5rem;
}

.input-group {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

form footer {
	display: flex;
	gap: 0.25rem;
	flex-wrap: wrap;
	padding-top: 1rem;
	justify-content: flex-end;
}

.change-header {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	margin-top: -0.2rem;
}

.change-user-name {
	color: var(--color-progressive);
}

.change-user-name:hover {
	color: var(--color-progressive--hover);
}

.change-suggested-by {
	color: var(--color-subtle);
	display: block;
	margin-top: -0.1rem;
}

.change-comment {
	color: var(--color-subtle);
	overflow-x: break-word;
}

.change-timestamp {
	color: var(--color-subtle);
	font-size: 0.8rem;
	margin-top: -0.2rem;
}

.change-timestamp a {
	color: var(--color-subtle);
}

.change-page-name-and-delta {
	margin-top: -0.2rem;
}

.change footer {
	display: flex;
	flex-wrap: wrap;
	row-gap: 0px;
	margin-right: -0.1rem;
	margin-top: -0.2rem;
}

.change footer a {
	flex-shrink: 0;
}

.change footer .cdx-icon {
	width: 2rem;
	height: 2rem;
	padding: 0.5rem;
	color: var(--color-progressive);
}

.change footer .cdx-icon:hover {
	color: var(--color-progressive);
	text-decoration: underline var(--color-progressive);
}

.change-page-name {
	color: var(--color-base);
	font-weight: bold;
}

.change-page-name:hover {
	color: var(--color-base);
}

.error {
	color: var(--color-destructive);
	padding: 0.5rem;
	border: 1px solid var(--color-destructive);
	background-color: var(--background-color-destructive-subtle);
}

@media (max-width: 900px) {
	main {
		flex-direction: column;
	}

	form {
		order: 0;
	}

	.changes {
		max-width: 100%;
	}

	.inputs-group {
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: flex-start;
		align-items: center;
	}

	.change {
		border-top: 1px solid var(--border-color-subtle);
		border-bottom: none;
	}

	form footer {
		justify-content: flex-start;
	}
}
</style>
<style>
.change p {
	margin: 0;
}
.change .wikitable {
	margin: 0.5rem 0;
	font-size: 0.8rem;
}
</style>
