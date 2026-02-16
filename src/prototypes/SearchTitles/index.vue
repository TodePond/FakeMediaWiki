<template>
	<section>
		<form @submit.prevent="search">
			<CdxLabel input-id="search-query">Search titles</CdxLabel>
			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="searchQuery"
					input-type="search"
					id="search-query"
					placeholder="Type to search..."
					@input="search"
				/>
				<CdxProgressIndicator v-if="isLoading" aria-label="Searching" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="results.length > 0" class="results">
			<p class="results-count">{{ results.length }} results</p>
			<div class="results-list">
				<CdxCard
					v-for="page in results"
					:key="page.key"
					:url="wiki.getPageUrl(page.title)"
					:thumbnail="getThumbnail(page.thumbnail)"
				>
					<template #title>{{ page.title }}</template>
					<template #description v-if="page.description">{{ page.description }}</template>
				</CdxCard>
			</div>
		</div>
		<div v-else-if="!isLoading && searchQuery" class="no-results">No results found</div>
	</section>
</template>

<script setup lang="ts">
import { CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { FakeWiki } from "../../fake-wiki/FakeWiki"
import type { FWPageSearchResult } from "../../fake-wiki/types"

const wiki = new FakeWiki()

const searchQuery = ref(localStorage.getItem("searchTitlesQuery") || "")
const results = ref<FWPageSearchResult[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

let searchId = 0
const search = async (): Promise<void> => {
	searchId++
	const currentSearchId = searchId
	localStorage.setItem("searchTitlesQuery", searchQuery.value)
	if (!searchQuery.value.trim()) return

	isLoading.value = true
	error.value = null
	try {
		const data = await wiki.searchTitles(searchQuery.value, 20)
		if (currentSearchId === searchId) {
			results.value = data.pages || []
		}
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		results.value = []
	} finally {
		isLoading.value = false
	}
}

const getThumbnail = (thumbnail?: { url: string } | null): { url: string } | undefined => {
	return thumbnail ? { url: thumbnail.url } : undefined
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
