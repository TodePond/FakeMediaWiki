<template>
	<section>
		<form @submit.prevent="search">
			<CdxLabel input-id="page-name">Page name</CdxLabel>

			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="searchQuery"
					input-type="search"
					id="page-name"
				/>
				<CdxButton>Load</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
			</span>
		</form>
		<CdxCard
			:thumbnail="summary?.thumbnail?.source ? { url: summary.thumbnail.source } : null"
			:url="summary?.content_urls?.desktop?.page ?? ''"
		>
			<template #title>{{ summary?.title ?? '' }}</template>
			<template #description>{{ summary?.description ?? '' }}</template>
			<template #supporting-text>{{ summary?.extract ?? '' }}</template>
		</CdxCard>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import type { FWPageSummary } from "fakewiki/types"
import { onMounted, ref } from "vue"

const wiki = new FakeWiki()

const summary = ref<FWPageSummary | null>(null)
const searchQuery = ref(localStorage.getItem("pageSearchQuery") || "Wet Leg")
const isLoading = ref(false)

const search = async (): Promise<void> => {
	isLoading.value = true
	summary.value = await wiki.getPageSummary(searchQuery.value)
	isLoading.value = false

	saveSearchQuery(searchQuery.value)
}

function saveSearchQuery(query: string): void {
	localStorage.setItem("pageSearchQuery", query)
}

onMounted(search)
</script>

<style scoped>
@import "./style.css";
</style>
