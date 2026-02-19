<template>
	<section class="list-building-view">
		<h1 style="width: 100%">List building</h1>
		<form @submit.prevent="buildList">
			<div class="form-row">
				<CdxLabel input-id="list-building-lang">Language code</CdxLabel>
				<CdxTextInput
					id="list-building-lang"
					v-model="lang"
					placeholder="en"
					autocomplete="off"
				/>
			</div>
			<div class="form-row">
				<CdxLabel input-id="list-building-title">Page title</CdxLabel>
				<CdxTextInput
					id="list-building-title"
					v-model="pageTitle"
					placeholder="Douglas Adams"
					autocomplete="off"
				/>
			</div>
			<span class="form-actions">
				<CdxButton>Build list</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-else-if="results.length > 0" class="three-columns">
			<div class="column">
				<h3 class="column-title">Content</h3>
				<div
					v-if="resultsByLinks.length === 0 && !isLoading"
					class="no-results no-results-at-top"
				>
					No results.
				</div>
				<div class="results-list">
					<ResultRow
						v-for="(item, index) in resultsByLinks"
						:key="`links-${item.qid || item.page_title}-${index}`"
						:item="item"
						:lang="lang"
						:thumbnail="thumbnails[item.page_title]"
					/>
				</div>
			</div>
			<div class="column">
				<h3 class="column-title">Morelike</h3>
				<div
					v-if="resultsByMorelike.length === 0 && !isLoading"
					class="no-results no-results-at-top"
				>
					No results.
				</div>
				<div class="results-list">
					<ResultRow
						v-for="(item, index) in resultsByMorelike"
						:key="`morelike-${item.qid || item.page_title}-${index}`"
						:item="item"
						:lang="lang"
						:thumbnail="thumbnails[item.page_title]"
					/>
				</div>
			</div>
			<div class="column">
				<h3 class="column-title">Readers</h3>
				<div
					v-if="resultsByReader.length === 0 && !isLoading"
					class="no-results no-results-at-top"
				>
					No results.
				</div>
				<div class="results-list">
					<ResultRow
						v-for="(item, index) in resultsByReader"
						:key="`reader-${item.qid || item.page_title}-${index}`"
						:item="item"
						:lang="lang"
						:thumbnail="thumbnails[item.page_title]"
					/>
				</div>
			</div>
		</div>
		<div v-else-if="!isLoading && hasSearched" class="no-results">No results.</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import type { FWListBuildingResult } from "fakewiki/types"
import { computed, onMounted, ref } from "vue"
import ResultRow from "./ResultRow.vue"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "ListBuilding"

const langKey = wiki.getStorageKey(PROTOTYPE_NAME, "lang")
const titleKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageTitle")

const lang = ref(localStorage.getItem(langKey) || "en")
const pageTitle = ref(localStorage.getItem(titleKey) || "Wet Leg")
const results = ref<FWListBuildingResult[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasSearched = ref(false)

const resultsByReader = computed(() => results.value.filter(r => r.source === "reader"))
const resultsByLinks = computed(() => results.value.filter(r => r.source === "links"))
const resultsByMorelike = computed(() => results.value.filter(r => r.source === "morelike"))

async function buildList(): Promise<void> {
	isLoading.value = true
	error.value = null
	hasSearched.value = true

	try {
		localStorage.setItem(langKey, lang.value)
		localStorage.setItem(titleKey, pageTitle.value)

		const data = await wiki.getListBuilding(lang.value, {
			pageTitle: pageTitle.value.trim() || undefined,
			k: 10,
		})
		results.value = data.results ?? []
		const titles = [
			...new Set(
				(data.results ?? [])
					.filter(r => !r.redlink && r.page_title !== "-")
					.map(r => r.page_title.trim())
					.filter(Boolean)
			),
		]
		thumbnails.value = await wiki.getPageThumbnails(
			titles,
			`https://${lang.value}.wikipedia.org/`
		)
	} catch (err) {
		error.value = (err as Error).message
		results.value = []
	} finally {
		isLoading.value = false
	}
}

const thumbnails = ref<Record<string, string>>({})

onMounted(buildList)
</script>

<style scoped>
@import "./style.css";
</style>
