<template>
	<main class="combined-feed-minimal">
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
				<CdxButton :disabled="isLoading" action="progressive">Refresh feed</CdxButton>
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

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxTextInput } from "@wikimedia/codex"
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWPageHistoryRevision, FWRevision } from "fakewiki/types"
import { onMounted, ref } from "vue"

const wiki = new FakeWiki()

const pageStorageKey = "searchQueryFeedPages"
const userStorageKey = "searchQueryFeedUsers"
const defaultPageSearchQueries = ["Wikipedia", "Wet Leg", "Water"]
const defaultUserSearchQueries = ["Samwalton9", "Humbugtheman", "Todepond"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserSearchQueries))

// Combined feed results
const allRevisions = ref<FWRevision[]>([])
const isLoading = ref(false)
const errors = ref<string[]>([])

onMounted(search)

function saveSearchQueries(): void {
	localStorage.setItem(pageStorageKey, JSON.stringify(pageSearchQueries.value))
	localStorage.setItem(userStorageKey, JSON.stringify(userSearchQueries.value))
}

function loadSearchQueries(key: string, defaultValues: string[]): string[] {
	const savedSearchQueries = localStorage.getItem(key)
	if (savedSearchQueries) {
		try {
			const parsed = JSON.parse(savedSearchQueries)
			if (Array.isArray(parsed) && parsed.every(value => typeof value === "string")) {
				return parsed
			}
		} catch {
			// Ignore invalid stored values and fallback.
		}
	}

	return defaultValues
}

function addPage(): void {
	pageSearchQueries.value.push("")
	saveSearchQueries()
}

function removePage(): void {
	if (pageSearchQueries.value.length === 0) {
		return
	}
	pageSearchQueries.value.pop()
	saveSearchQueries()
}

function addUser(): void {
	userSearchQueries.value.push("")
	saveSearchQueries()
}

function removeUser(): void {
	if (userSearchQueries.value.length === 0) {
		return
	}
	userSearchQueries.value.pop()
	saveSearchQueries()
}

function getPageInputId(index: number): string {
	return `page-name-${index + 1}`
}

function getUserInputId(index: number): string {
	return `user-${index + 1}`
}

async function search(): Promise<void> {
	isLoading.value = true
	errors.value = []

	// Collect non-empty page and user names
	const pageNames = pageSearchQueries.value.filter(name => name.trim() !== "")
	const userNames = userSearchQueries.value.filter(name => name.trim() !== "")

	try {
		// Fetch combined feed
		const revisions = await wiki.getCombinedFeed({
			pageNames,
			userNames,
			limit: 20,
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
					thumbnailUrl: null,
				}
				return processedRevision
			})
		)

		allRevisions.value = processedRevisions
		isLoading.value = false
	} catch (e) {
		isLoading.value = false
		const errorObj = e as Error
		errors.value = [errorObj.message]
		allRevisions.value = []
	}

	saveSearchQueries()
}

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
