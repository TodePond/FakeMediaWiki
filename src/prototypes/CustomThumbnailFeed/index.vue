<template>
	<main class="custom-thumbnail-feed">
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
				<a v-if="change.pageName" target="_blank" :href="wiki.getPageUrl(change.pageName)"
					><img
						v-if="change.thumbnailUrl"
						class="change-thumbnail"
						:src="change.thumbnailUrl"
						:alt="`Thumbnail for ${change.pageName}`"
					/>
					<div v-else class="change-thumbnail-placeholder">
						<CdxIcon :icon="cdxIconArticle" />
					</div>
				</a>

				<div class="change-body">
					<span class="change-page-name-and-delta">
						<a
							v-if="change.pageName"
							target="_blank"
							:href="wiki.getPageUrl(change.pageName)"
							class="change-page-name"
						>
							{{ change.pageName }} </a
						>&nbsp;<span :class="getDeltaClass(change.delta ?? 0)">{{
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

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxTextInput } from "@wikimedia/codex"
import { cdxIconArticle, cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
import { computed, onMounted, ref, type Ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"
import type { FWPageHistoryRevision, FWRevision } from "../../wiki-api/types"

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
	localStorage.getItem(userStorageKeys[1]) ?? "Humbugtheman",
	localStorage.getItem(userStorageKeys[2]) ?? "Todepond",
])

// Store results separately for each page
const pageResults: [Ref<FWRevision[]>, Ref<FWRevision[]>, Ref<FWRevision[]>] = [
	ref([]),
	ref([]),
	ref([]),
]
const userResults: [Ref<FWRevision[]>, Ref<FWRevision[]>, Ref<FWRevision[]>] = [
	ref([]),
	ref([]),
	ref([]),
]
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
	userNum: number,
	userName: string,
	resultsRef: Ref<FWRevision[]>,
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

		// Process revisions - but don't await thumbnail loading
		const processedRevisions = await Promise.all(
			_history.revisions.map(async revision => {
				// getUserHistory may include pageName from Action API transformation
				const pageName =
					(
						revision as FWPageHistoryRevision & {
							pageName?: string
							title?: string
						}
					).pageName ||
					(
						revision as FWPageHistoryRevision & {
							pageName?: string
							title?: string
						}
					).title ||
					""
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
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const processedRevision: FWRevision = {
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
					thumbnailUrl: null, // Will be loaded separately
				}
				return processedRevision
			})
		)

		// Store revisions immediately
		resultsRef.value = processedRevisions
		loadingRef.value = false

		// Load thumbnails asynchronously - don't block UI
		processedRevisions.forEach(revision => {
			loadThumbnailForRevision(userNum, revision, resultsRef)
		})
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
	pageNum: number,
	pageName: string,
	resultsRef: Ref<FWRevision[]>,
	loadingRef: Ref<boolean>,
	errorRef: Ref<string | null>
): Promise<void> {
	loadingRef.value = true
	errorRef.value = null

	try {
		const _history = await wiki.getPageHistory(pageName)

		if (!_history.revisions) {
			resultsRef.value = []
			loadingRef.value = false
			return
		}

		// Process revisions - but don't await thumbnail loading
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
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const processedRevision: FWRevision = {
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
					thumbnailUrl: null, // Will be loaded separately
				}
				return processedRevision
			})
		)

		// Store revisions immediately
		resultsRef.value = processedRevisions
		loadingRef.value = false

		// Load thumbnails asynchronously - don't block UI
		processedRevisions.forEach(revision => {
			loadThumbnailForRevision(pageNum, revision, resultsRef)
		})
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

// Load thumbnail asynchronously and update the revision
async function loadThumbnailForRevision(
	_pageNum: number,
	revision: FWRevision,
	resultsRef: Ref<FWRevision[]>
): Promise<void> {
	try {
		if (!revision.pageName) return
		const thumbnailUrl = await wiki.getPageThumbnail(revision.pageName)
		// Update the revision in the results array
		const revIndex = resultsRef.value.findIndex(r => r.id === revision.id)
		if (revIndex !== -1 && resultsRef.value[revIndex]) {
			resultsRef.value[revIndex]!.thumbnailUrl = thumbnailUrl
			// Trigger reactivity by reassigning
			resultsRef.value = [...resultsRef.value]
		}
	} catch (e) {
		console.error("Failed to load thumbnail", e)
		// Thumbnail will remain null, placeholder will show
	}
}

// Combined view of all revisions from all pages and users, sorted by timestamp
const allRevisions = computed(() => {
	const revisions: FWRevision[] = []
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
	// Sort by timestamp (most recent first)
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

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
