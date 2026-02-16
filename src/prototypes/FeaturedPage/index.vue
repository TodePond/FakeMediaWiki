<template>
	<section>
		<form @submit.prevent="loadFeatured">
			<CdxLabel input-id="date-input">Date</CdxLabel>
			<span>
				<CdxTextInput v-model="dateInput" input-type="date" id="date-input" />
				<CdxButton>Load featured page</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading featured article" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<CdxCard
			v-if="featuredPage && featuredPage.tfa"
			:thumbnail="getThumbnailUrl() ? { url: getThumbnailUrl()! } : null"
			:url="wiki.getPageUrl(featuredPage.tfa.title)"
		>
			<template #title>{{ featuredPage.tfa.title }}</template>
			<template #description v-if="featuredPage.tfa.description">
				{{ featuredPage.tfa.description }}
			</template>
			<template #supporting-text v-if="featuredPage.tfa.extract">
				{{ featuredPage.tfa.extract }}
			</template>
		</CdxCard>
		<div v-else-if="featuredPage && !featuredPage.tfa" class="no-article">
			No featured page for this date
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"
import type { FeaturedPage } from "../../wiki-api/types"

const wiki = new WikiApi()

const dateInput = ref("")
const featuredPage = ref<FeaturedPage | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadFeatured = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const date = dateInput.value ? new Date(dateInput.value) : new Date()
		const data = await wiki.getFeaturedPage(date)
		featuredPage.value = data
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		featuredPage.value = null
	} finally {
		isLoading.value = false
	}
}

const getThumbnailUrl = (): string | undefined => {
	return featuredPage.value?.tfa?.thumbnail?.source
}

const getTodayDate = (): string => {
	const today = new Date()
	const dateStr = today.toISOString().split("T")[0]
	return dateStr || ""
}

onMounted(() => {
	dateInput.value = getTodayDate()
	loadFeatured()
})
</script>

<style scoped>
@import "./style.css";
</style>
