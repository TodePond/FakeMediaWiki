<template>
	<section class="search-pages">
		<form @submit.prevent="search">
			<CdxLabel input-id="search-query">Full-text search</CdxLabel>
			<span class="input-with-reset">
				<CdxTextInput
					autocomplete="off"
					v-model="searchQuery"
					input-type="search"
					id="search-query"
					placeholder="Search titles and content..."
					@input="saveSearchQuery(searchQuery)"
				/>
				<CdxButton type="button" @click="resetToDefault">Reset to default</CdxButton>
				<CdxButton>Search</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Searching" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="results.length > 0" class="results">
			<p class="results-count">{{ results.length }} results</p>
			<div class="results-list">
				<CdxCard v-for="page in results" :key="page.key" :url="wiki.getPageUrl(page.title)">
					<template #title>{{ page.title }}</template>
					<template #description v-if="page.description">{{ page.description }}</template>
					<template #supporting-text v-if="page.excerpt">
						<div v-html="page.excerpt"></div>
					</template>
				</CdxCard>
			</div>
		</div>
		<div v-else-if="!isLoading && hasSearched" class="no-results">No results found</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { FakeWiki } from "fakewiki"
import type { FWPageSearchResult } from "fakewiki/types"

const wiki = new FakeWiki()

const searchQuery = ref(localStorage.getItem("searchPagesQuery") || "")
const results = ref<FWPageSearchResult[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasSearched = ref(false)

const search = async (): Promise<void> => {
	if (!searchQuery.value.trim()) return

	isLoading.value = true
	error.value = null
	try {
		const data = await wiki.searchPages(searchQuery.value, 20)
		results.value = data.pages || []
		hasSearched.value = true
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		results.value = []
	} finally {
		isLoading.value = false
	}
}

function saveSearchQuery(query: string): void {
	localStorage.setItem("searchPagesQuery", query)
}

function resetToDefault(): void {
	localStorage.removeItem("searchPagesQuery")
	searchQuery.value = ""
	saveSearchQuery("")
}

onMounted(() => {
	if (searchQuery.value) {
		search()
	}
})
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
