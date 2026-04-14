<template>
	<section class="morelike-search">
		<form @submit.prevent="runMoreLike">
			<CdxLabel input-id="morelike-seeds">Seed pages</CdxLabel>
			<span class="input-row">
				<CdxTextInput
					id="morelike-seeds"
					v-model="seedInput"
					placeholder="Wet Leg, Confidence Man (band), Douglas Adams"
					autocomplete="off"
				/>
			</span>
			<CdxLabel input-id="morelike-limit">Limit</CdxLabel>
			<span class="input-row input-row--small">
				<CdxTextInput id="morelike-limit" v-model="limitInput" input-type="number" />
				<CdxButton>Run</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading morelike results" />
			</span>
		</form>

		<div v-if="error" class="error">{{ error }}</div>
		<div v-else-if="results.length > 0" class="results">
			<p class="results-meta">
				Showing {{ results.length }} of {{ totalHits }} hits for <code>{{ query }}</code>
			</p>
			<div class="results-list">
				<CdxCard
					v-for="page in results"
					:key="page.pageid"
					:url="wiki.getPageUrl(page.title)"
				>
					<template #title>{{ page.title }}</template>
					<template #supporting-text v-if="page.snippet">
						<div v-html="`${page.snippet}...`"></div>
					</template>
				</CdxCard>
			</div>
		</div>
		<div v-else-if="!isLoading && hasSearched" class="no-results">No results found</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import type { FWMoreLikeSearchResult } from "fakewiki/types"
import { ref, watch } from "vue"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "MoreLikeSearch"
const queryStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "seedQuery")
const limitStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "limit")

const seedInput = ref(
	localStorage.getItem(queryStorageKey) || "Wet Leg, Rizzle Kicks, Confidence Man (band)"
)
const limitInput = ref(Number(localStorage.getItem(limitStorageKey) || "20") || 20)
const results = ref<FWMoreLikeSearchResult[]>([])
const totalHits = ref(0)
const query = ref("")
const isLoading = ref(false)
const hasSearched = ref(false)
const error = ref<string | null>(null)

async function runMoreLike(): Promise<void> {
	const seedTitles = [
		...new Set(
			seedInput.value
				.split(",")
				.map(title => title.trim())
				.filter(Boolean)
		),
	]
	if (seedTitles.length === 0) {
		error.value = "Enter at least one seed page title."
		results.value = []
		totalHits.value = 0
		query.value = ""
		hasSearched.value = true
		return
	}

	isLoading.value = true
	error.value = null
	hasSearched.value = true
	try {
		const limit = Math.max(1, Math.min(50, Number(limitInput.value) || 20))
		const data = await wiki.getMoreLikePages(seedTitles, { limit })
		results.value = data.pages
		totalHits.value = data.totalHits
		query.value = data.query
	} catch (err) {
		error.value = (err as Error).message
		results.value = []
		totalHits.value = 0
		query.value = ""
	} finally {
		isLoading.value = false
	}
}

watch(seedInput, value => {
	localStorage.setItem(queryStorageKey, value)
})

watch(limitInput, value => {
	localStorage.setItem(limitStorageKey, String(value))
})
</script>

<style scoped>
.morelike-search {
	display: grid;
	gap: 12px;
}

.input-row {
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
}

.results {
	display: grid;
	gap: 8px;
}

.results-list {
	display: grid;
	gap: 8px;
}

.results-meta {
	font-size: 14px;
	margin: 0;
}
</style>
