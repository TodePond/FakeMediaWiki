<template>
	<main class="multi-page-feed">
		<form @submit.prevent="search">
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
			<span>
				<CdxButton>Refresh feed</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading pages" />
			</span>
		</form>

		<section class="changes">
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<div
				class="change"
				v-for="change in history.revisions"
				:key="`${change.pageName}-${change.timestamp}`"
			>
				<img
					v-if="change.avatarUrl"
					class="change-avatar"
					:src="change.avatarUrl || undefined"
				/>
				<div v-else class="change-avatar-placeholder"></div>
				<div class="change-body">
					<span class="change-header">
						<a target="_blank" :href="wiki.getUserUrl(change.user.name)">
							<strong class="change-user-name">{{ change.user.name }}</strong>
						</a>
						<span class="change-suggested-by" v-if="change.summary?.suggestedBy">
							&nbsp;suggested by
							<a :href="wiki.getUserUrl(change.summary.suggestedBy)">{{
								change.summary.suggestedBy
							}}</a>
						</span>
						<!-- <span class="change-timestamp">&nbsp;{{ formatTimestamp(change.timestamp) }}</span> -->
						<!-- <br /> -->
					</span>
					<span class="change-page-name-and-delta" v-if="change.pageName">
						<a
							target="_blank"
							:href="wiki.getPageUrl(change.pageName)"
							class="change-page-name"
						>
							{{ change.pageName }} </a
						>&nbsp;<span :class="getDeltaClass(change.delta ?? 0)">{{
							change.delta ?? 0
						}}</span>
					</span>
					<!-- <br /> -->
					<span class="change-timestamp" v-if="change.pageName"
						><a
							target="_blank"
							:href="wiki.getRevisionUrl(change.id, change.pageName)"
							>{{ formatTimestamp(change.timestamp) }}</a
						></span
					>
					<div class="change-comment" v-html="change?.summary?.comment"></div>
				</div>
				<footer>
					<a
						v-if="change.pageName"
						target="_blank"
						:href="wiki.getRevisionUrl(change.id, change.pageName)"
						><CdxIcon :icon="cdxIconLinkExternal"
					/></a>
					<a target="_blank" :href="wiki.getThankUrl(change.id)"
						><CdxIcon :icon="cdxIconHeart"
					/></a>
				</footer>
			</div>
		</section>
	</main>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWRevision } from "fakewiki/types"
import { onMounted, ref } from "vue"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "MultiPageFeed"
const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
const defaultPageSearchQueries = ["Wikipedia", "Wet Leg", "Water"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const history = ref<{ revisions?: FWRevision[] }>({})
const isLoading = ref(false)
const errors = ref<string[]>([])

onMounted(search)

function saveSearchQueries(): void {
	localStorage.setItem(pageStorageKey, JSON.stringify(pageSearchQueries.value))
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
	saveSearchQueries()
}

function removePage(): void {
	if (pageSearchQueries.value.length === 0) {
		return
	}
	pageSearchQueries.value.pop()
	saveSearchQueries()
}

function getPageInputId(index: number): string {
	return `page-name-${index + 1}`
}

async function search(): Promise<void> {
	isLoading.value = true
	errors.value = []
	const pageNames = pageSearchQueries.value.filter(name => name.trim() !== "")

	if (pageNames.length === 0) {
		history.value = { revisions: [] }
		isLoading.value = false
		return
	}

	const allRevisions: FWRevision[] = []

	await Promise.all(
		pageNames.map(async pageName => {
			try {
				const _history = await wiki.getPageHistory(pageName, { limit: 10 })

				if (_history.revisions) {
					const processedRevisions: FWRevision[] = await Promise.all(
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
							const avatarUrl = (await wiki.getUserAvatar(revision.user.name)) ?? null
							return {
								...revision,
								delta: revision.delta ?? 0,
								summary: {
									comment: summary.comment ?? null,
									suggestedBy: summary.suggestedBy ?? null,
									hashtags: summary.hashtags,
									useThisBot: summary.useThisBot ?? null,
									reportBugs: summary.reportBugs ?? null,
								},
								avatarUrl,
								pageName, // Store page name for URL generation
							} as FWRevision
						})
					)
					allRevisions.push(...processedRevisions)
				}
			} catch (e) {
				const errorObj = e as Error
				if (errorObj.message.includes("404")) {
					errors.value.push(`${pageName}: Page not found`)
				} else {
					errors.value.push(`${pageName}: ${errorObj.message}`)
				}
			}
		})
	)

	// Sort revisions by timestamp (most recent first) to interleave them
	allRevisions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

	isLoading.value = false
	history.value = { revisions: allRevisions }

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
