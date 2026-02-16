<template>
	<section>
		<form @submit.prevent="loadPage">
			<CdxLabel input-id="page-name">Page name</CdxLabel>
			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="pageName"
					input-type="search"
					id="page-name"
				/>
				<CdxButton>Load metadata</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<pre v-if="metadata" class="metadata-content">{{ JSON.stringify(metadata, null, 2) }}</pre>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"
import type { PageMetadata } from "../../wiki-api/types"

const wiki = new WikiApi()

const pageName = ref(localStorage.getItem("pageMetadataQuery") || "Wet Leg")
const metadata = ref<PageMetadata | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadPage = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const data = await wiki.getPage(pageName.value)
		metadata.value = data
		localStorage.setItem("pageMetadataQuery", pageName.value)
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		metadata.value = null
	} finally {
		isLoading.value = false
	}
}

onMounted(loadPage)
</script>

<style scoped>
@import "./style.css";
</style>
