<template>
	<main class="custom-page-feed">
		<form @submit.prevent="search">
			<div class="inputs-group">
				<div class="inputs">
					<CdxLabel :input-id="getPageInputId(0)">Followed pages</CdxLabel>
					<div
						class="input-group"
						v-for="(_, index) in pageSearchQueries"
						:key="`page-${index}`"
					>
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[index]"
							input-type="search"
							:id="getPageInputId(index)"
						/>
					</div>
					<div class="input-list-actions">
						<CdxButton type="button" @click="addPage">Add page</CdxButton>
						<CdxButton
							type="button"
							@click="removePage"
							:disabled="pageSearchQueries.length === 0"
						>
							Remove page
						</CdxButton>
					</div>
				</div>
				<div class="inputs">
					<CdxLabel :input-id="getUserInputId(0)">Followed users</CdxLabel>
					<div
						class="input-group"
						v-for="(_, index) in userSearchQueries"
						:key="`user-${index}`"
					>
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[index]"
							input-type="search"
							:id="getUserInputId(index)"
						/>
					</div>
					<div class="input-list-actions">
						<CdxButton type="button" @click="addUser">Add user</CdxButton>
						<CdxButton
							type="button"
							@click="removeUser"
							:disabled="userSearchQueries.length === 0"
						>
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
				<a target="_blank" :href="wiki.getUserUrl(change.user.name)">
					<img
						v-if="change.avatarUrl"
						class="change-avatar"
						:src="change.avatarUrl"
						:alt="`Avatar for ${change.user.name}`"
					/>
					<div v-else class="change-avatar-placeholder"></div>
				</a>
				<div class="change-body">
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
							<a :href="wiki.getUserUrl(change.summary?.suggestedBy)">{{
								change.summary?.suggestedBy
							}}</a>
						</span>
					</span>
					<span class="change-page-name-and-delta">
						<a
							target="_blank"
							:href="wiki.getPageUrl(change.pageName!)"
							class="change-page-name"
						>
							{{ change.pageName }} </a
						>&nbsp;<span :class="wiki.getDeltaClass(change.delta ?? 0)">{{
							change.delta ?? 0
						}}</span>
					</span>
					<span class="change-timestamp">
						<a
							target="_blank"
							:href="wiki.getRevisionUrl(change.id, change.pageName!)"
							>{{ formatTimestamp(change.timestamp) }}</a
						>
					</span>
					<div class="change-comment" v-html="change?.summary?.comment"></div>
				</div>
				<footer>
					<a target="_blank" :href="wiki.getRevisionUrl(change.id, change.pageName!)">
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
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWResult, FWRevision } from "fakewiki/types"
import { computed, onMounted, ref, type Ref } from "vue"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "CustomPageFeed"

const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries")
const defaultPageSearchQueries = ["Wikipedia", "Wet Leg", "Water"]
const defaultUserSearchQueries = ["Samwalton9", "SNUGGUMS", "Todepond"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserSearchQueries))

// Store results using Result type
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
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
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

		processedRevisions.forEach(revision => {
			loadAvatarForRevision(revision, resultRef)
		})
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
		const _history = (await wiki.getPageHistory(pageName)) as {
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
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
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

		processedRevisions.forEach(revision => {
			loadAvatarForRevision(revision, resultRef)
		})
	} catch (e) {
		const errorObj = e as Error
		const errorMsg = errorObj.message.includes("404")
			? `${pageName}: Page not found`
			: `${pageName}: ${errorObj.message}`
		resultRef.value = { data: [], loading: false, error: errorMsg }
	}
}

async function loadAvatarForRevision(
	revision: FWRevision,
	resultRef: Ref<FWResult<FWRevision>>
): Promise<void> {
	try {
		const avatarUrl = await wiki.getUserAvatar(revision.user.name)
		const revIndex = resultRef.value.data.findIndex(r => r.id === revision.id)
		if (revIndex !== -1 && resultRef.value.data[revIndex]) {
			resultRef.value.data[revIndex]!.avatarUrl = avatarUrl
			resultRef.value = { ...resultRef.value, data: [...resultRef.value.data] }
		}
	} catch (e) {
		console.error("Failed to load avatar", e)
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

function formatTimestamp(timestamp: string): string {
	return wiki.formatRelativeTimestamp(timestamp, {
		seconds: "words",
		minutes: "minutes",
		hours: "hours",
		days: "days",
		weeks: "date",
		months: "date",
		years: "date",
	})
}
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
