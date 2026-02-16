<template>
	<section>
		<form @submit.prevent="search">
			<CdxLabel input-id="search-query">Search users</CdxLabel>
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
					v-for="user in results"
					:key="user.key"
					:url="wiki.getUserUrl(user.username)"
					:thumbnail="user.avatar"
				>
					<template #title>{{ user.username }}</template>
					<template #description v-if="user.description">{{ user.description }}</template>
				</CdxCard>
			</div>
		</div>
		<div v-else-if="!isLoading && hasSearched" class="no-results">No users found</div>
	</section>
</template>

<script setup lang="ts">
import { CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"
import type { FWUserSearchResult } from "../../wiki-api/types"

const wiki = new WikiApi()

const searchQuery = ref(localStorage.getItem("searchUsersQuery") || "samwalton")
const results = ref<FWUserSearchResult[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasSearched = ref(false)

let searchId = 0
const search = async (): Promise<void> => {
	searchId++
	const currentSearchId = searchId
	localStorage.setItem("searchUsersQuery", searchQuery.value)
	if (!searchQuery.value.trim()) return

	isLoading.value = true
	error.value = null
	try {
		const usersWithAvatars = await wiki.searchUsersWithAvatars(searchQuery.value, 20)

		if (currentSearchId === searchId) {
			results.value = usersWithAvatars
			hasSearched.value = true
		}
	} catch (err) {
		if (currentSearchId === searchId) {
			const errorObj = err as Error
			error.value = errorObj.message
			results.value = []
		}
	} finally {
		if (currentSearchId === searchId) {
			isLoading.value = false
		}
	}
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
