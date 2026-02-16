<template>
	<main>
		<form @submit.prevent="search">
			<CdxLabel input-id="page-name">Page name</CdxLabel>
			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="searchQuery"
					input-type="search"
					id="page-name"
				/>
				<CdxButton>Load changes</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
			</span>
		</form>

		<section class="changes">
			<div v-if="error" class="error">{{ error }}</div>
			<div class="change" v-for="change in history.revisions" :key="change.timestamp">
				<img
					v-if="change.avatarUrl"
					class="change-avatar"
					:src="change.avatarUrl || undefined"
				/>
				<div v-else class="change-avatar-placeholder"></div>
				<div class="change-body">
					<span class="change-header">
						<a target="_blank" :href="wiki.getUserUrl(change.user.name)">
							<strong>{{ change.user.name }}</strong>
						</a>
						<span class="change-timestamp"
							>&nbsp;{{ formatTimestamp(change.timestamp) }}</span
						>
						<br />
					</span>
					<span class="change-suggested-by" v-if="change.summary?.suggestedBy">
						Suggested by
						<a :href="wiki.getUserUrl(change.summary.suggestedBy)">{{
							change.summary.suggestedBy
						}}</a>
					</span>
					<span :class="wiki.getDeltaClass(change.delta ?? 0)"
						>{{ change.delta ?? 0 }}
					</span>
					<div v-html="change?.summary?.comment"></div>
				</div>
				<footer>
					<a
						v-if="change.summary?.useThisBot"
						target="_blank"
						:href="getBotUrl(change.summary.useThisBot)"
					>
						<CdxIcon :icon="cdxIconRobot" />
					</a>
					<a target="_blank" :href="wiki.getRevisionUrl(change.id, searchQuery)"
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
import { cdxIconHeart, cdxIconLinkExternal, cdxIconRobot } from "@wikimedia/codex-icons"
import { onMounted, ref } from "vue"
import { WikiApi, type PageHistoryResponse, type Revision } from "../../wiki-api/WikiApi"
import "../../wiki-api/style/delta.css"

const wiki = new WikiApi()
const PROTOTYPE_NAME = "PageFeed"

const storageKey = wiki.getStorageKey(PROTOTYPE_NAME, "searchQuery")
const searchQuery = ref(localStorage.getItem(storageKey) || "Wikipedia")
const history = ref<{ revisions?: Revision[] }>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

onMounted(search)

function saveSearchQuery(query: string): void {
	localStorage.setItem(storageKey, query)
}

async function search(): Promise<void> {
	isLoading.value = true
	const pageName = searchQuery.value
	let _history: PageHistoryResponse
	try {
		_history = await wiki.getPageHistory(pageName, { limit: 10 })
	} catch (e) {
		const errorObj = e as Error
		if (errorObj.message.includes("404")) {
			error.value = "Page not found"
		} else {
			error.value = errorObj.message
		}
		history.value = { revisions: [] }
		isLoading.value = false
		return
	}

	if (_history.revisions) {
		const processedRevisions: Revision[] = await Promise.all(
			_history.revisions.map(async revision => {
				const _summary = wiki.preprocessEditSummary(revision.comment, searchQuery.value)
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
					? await wiki.transformWikitextToHtml(summary.comment, searchQuery.value)
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
				} as Revision
			})
		)
		history.value = { revisions: processedRevisions }
	} else {
		history.value = { revisions: [] }
	}
	isLoading.value = false

	saveSearchQuery(pageName)
}

function formatTimestamp(timestamp: string): string {
	return (
		"• " +
		wiki.getRelativeTimestamp(timestamp, {
			seconds: "words",
			minutes: "minutes",
			hours: "hours",
			days: "days",
			weeks: "date",
			months: "date",
			years: "date",
		})
	)
}

function getBotUrl(useThisBot: string | null | undefined): string {
	if (!useThisBot) return "#"
	const parts = useThisBot.split("|")
	const head = parts[0]
	if (!head) return "#"
	let path = head.split("[[")[1]
	if (path) {
		;[path] = path.split("/use")
	}
	if (!path) {
		return "#"
	}
	return `https://en.wikipedia.org/wiki/${path}`
}
</script>

<style scoped>
.changes {
	margin: 0.5rem 0;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.changes p {
	margin: 0;
}

.change {
	border: 1px solid var(--border-color-base);
	padding: 0.25rem 0.6rem;
	display: flex;
}

.change-body {
	flex: 1;
}

.cdx-text-input {
	max-width: 100%;
	min-width: 0;
	width: 256px;
}

form > span {
	display: flex;
	gap: 0.25rem;
	width: 100%;
	flex-wrap: wrap;
}

.change-header {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
}

.change-suggested-by {
	color: var(--color-subtle);
	font-size: 0.8rem;
	display: block;
}

.change-timestamp {
	color: var(--color-subtle);
}

.change-avatar {
	width: 3rem;
	height: 3rem;
	border-radius: 50%;
	object-fit: cover;
	margin-right: 0.5rem;
}

.change-avatar-placeholder {
	width: 3rem;
	height: 3rem;
	border-radius: 50%;
	background-color: var(--background-color-interactive-subtle);
	margin-right: 0.5rem;
}

.change footer {
	display: flex;
	flex-wrap: wrap;
	row-gap: 0px;
	margin-right: -0.25rem;
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
	color: var(--color-progressive--hover);
}

.error {
	color: var(--color-destructive);
	padding: 0.5rem;
	border: 1px solid var(--color-destructive);
	background-color: var(--background-color-destructive-subtle);
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
