<template>
	<section>
		<div class="controls">
			<CdxButton @click="loadRandomPage">Load random page</CdxButton>
			<CdxProgressIndicator v-if="isLoading" aria-label="Loading random page" />
		</div>
		<div v-if="error" class="error">{{ error }}</div>
		<CdxCard
			v-else-if="randomPage && typeof randomPage === 'object'"
			:thumbnail="randomPage.thumbnail?.source ? { url: randomPage.thumbnail.source } : null"
			:url="getPageUrl()"
		>
			<template #title>{{ randomPage.title }}</template>
			<template #description v-if="randomPage.description">{{
				randomPage.description
			}}</template>
			<template #supporting-text v-if="randomPage.extract">{{ randomPage.extract }}</template>
		</CdxCard>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxCard, CdxProgressIndicator } from "@wikimedia/codex"
import { ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"
import type { FWRandomPageResult } from "../../wiki-api/types"

const wiki = new WikiApi()

const randomPage = ref<FWRandomPageResult | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadRandomPage = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const data = await wiki.getRandomPage("summary")
		randomPage.value = data
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		randomPage.value = null
	} finally {
		isLoading.value = false
	}
}

const getPageUrl = (): string => {
	const pageTitle =
		typeof randomPage.value === "string" ? randomPage.value : randomPage.value?.title || ""
	return wiki.getPageUrl(pageTitle)
}
</script>

<style scoped>
@import "./style.css";
</style>
