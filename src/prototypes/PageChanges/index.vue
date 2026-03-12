<template>
	<main class="page-changes">
		<form @submit.prevent="search">
			<CdxLabel input-id="page-name">Page name</CdxLabel>

			<span class="input-with-reset">
				<CdxTextInput
					autocomplete="off"
					v-model="searchQuery"
					input-type="search"
					id="page-name"
				/>
				<CdxButton type="button" @click="resetToDefault">Reset to default</CdxButton>
				<CdxButton>Load changes</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
			</span>
		</form>
		<section class="changes">
			<div v-if="error" class="error">{{ error }}</div>
			<div class="change" v-for="change in history.revisions" :key="change.timestamp">
				<div v-html="change.html"></div>
				<p>
					<a :href="wiki.getUserUrl(change.user.name)">
						<strong>{{ change.user.name }}</strong> </a
					>&nbsp;<span :class="wiki.getDeltaClass(change.delta ?? 0)">{{
						change.delta
					}}</span>
				</p>
				<p>
					<span>{{ formatTimestamp(change.timestamp) }}</span>
				</p>
				<footer>
					<a target="_blank" :href="wiki.getRevisionUrl(change.id, searchQuery)"
						>Open change</a
					>
					<span>|</span>
					<a target="_blank" :href="wiki.getThankUrl(change.id)">Give thanks</a>
				</footer>
			</div>
		</section>
	</main>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { FakeWiki } from "fakewiki"
import "fakewiki/style/delta.css"
import type { FWPageHistoryResponse, FWPageHistoryRevision } from "fakewiki/types"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "PageChanges"

const storageKey = wiki.getStorageKey(PROTOTYPE_NAME, "searchQuery")
const DEFAULT_QUERY = "Wet Leg"
const searchQuery = ref(localStorage.getItem(storageKey) || DEFAULT_QUERY)
const history = ref<{
	revisions?: Array<FWPageHistoryRevision & { html?: string }>
}>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

onMounted(search)

function saveSearchQuery(query: string): void {
	localStorage.setItem(storageKey, query)
}

function resetToDefault(): void {
	localStorage.removeItem(storageKey)
	searchQuery.value = DEFAULT_QUERY
	saveSearchQuery(DEFAULT_QUERY)
}

// If a comment begins with a /* comment block */
// replace it with a wikitext link to that heading
// eg
// from: "/* Singles */ blah blah"
// to: "[[pageName#Singles]] blah blah"
function linkUpComment(comment: string, pageName: string): string {
	return comment.replace(/^\/\* (.*) \*\//, `[[${pageName}#$1|→$1]]`)
}

async function search(): Promise<void> {
	isLoading.value = true
	const pageName = searchQuery.value
	let _history: FWPageHistoryResponse
	try {
		_history = await wiki.getPageHistory(pageName)
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
		const processedRevisions = await Promise.all(
			_history.revisions.map(async revision => {
				const linkedUpComment = linkUpComment(revision.comment, pageName)
				let html = await wiki.transformWikitextToHtml(linkedUpComment, searchQuery.value)
				html = html.replaceAll("<a ", "<a target='_blank' ")
				return {
					...revision,
					html,
				}
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
	const date = new Date(timestamp)
	const dateString = date.toLocaleDateString("en-GB", {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
	const timeString = date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	})
	return `${timeString}, ${dateString}`
}
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
