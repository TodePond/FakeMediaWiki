<template>
	<main class="custom-thumbnail-feed">
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
import { FakeWiki } from "fakewiki"
import type { FWPageHistoryRevision, FWRevision } from "fakewiki/types"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "CustomThumbnailFeed"
const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries")
const defaultPageSearchQueries = ["Wikipedia", "Wet Leg", "Water"]
const defaultUserSearchQueries = ["Samwalton9", "Humbugtheman", "Todepond"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserSearchQueries))

// Store results separately for each page
const pageResults: Ref<FWRevision[]>[] = pageSearchQueries.value.map(() => ref([]))
const userResults: Ref<FWRevision[]>[] = userSearchQueries.value.map(() => ref([]))
const pageLoading: Ref<boolean>[] = pageSearchQueries.value.map(() => ref(false))
const userLoading: Ref<boolean>[] = userSearchQueries.value.map(() => ref(false))
const pageError: Ref<string | null>[] = pageSearchQueries.value.map(() => ref(null))
const userError: Ref<string | null>[] = userSearchQueries.value.map(() => ref(null))
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

function addPage(): void {
	pageSearchQueries.value.push("")
	pageResults.push(ref([]))
	pageLoading.push(ref(false))
	pageError.push(ref(null))
	saveSearchQueries()
}

function removePage(): void {
	if (pageSearchQueries.value.length === 0) {
		return
	}
	pageSearchQueries.value.pop()
	pageResults.pop()
	pageLoading.pop()
	pageError.pop()
	saveSearchQueries()
}

function addUser(): void {
	userSearchQueries.value.push("")
	userResults.push(ref([]))
	userLoading.push(ref(false))
	userError.push(ref(null))
	saveSearchQueries()
}

function removeUser(): void {
	if (userSearchQueries.value.length === 0) {
		return
	}
	userSearchQueries.value.pop()
	userResults.pop()
	userLoading.pop()
	userError.pop()
	saveSearchQueries()
}

function getPageInputId(index: number): string {
	return `page-name-${index + 1}`
}

function getUserInputId(index: number): string {
	return `user-${index + 1}`
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
