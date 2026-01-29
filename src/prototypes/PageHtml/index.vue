<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"

const wiki = new WikiApi()

const pageName = ref(localStorage.getItem("pageHtmlQuery") || "Wet Leg")
const htmlContent = ref("")
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadPage = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const html = await wiki.getPageHtml(pageName.value)
		htmlContent.value = html
		localStorage.setItem("pageHtmlQuery", pageName.value)
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		htmlContent.value = ""
	} finally {
		isLoading.value = false
	}
}

onMounted(loadPage)
</script>

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
				<CdxButton>Load HTML</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="htmlContent" class="html-content" v-html="htmlContent"></div>
	</section>
</template>

<style scoped>
section {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.cdx-text-input {
	max-width: 100%;
	min-width: 0;
	width: 256px;
}

form > span {
	display: flex;
	gap: 0.25rem;
	width: 100%;
	flex-wrap: wrap;
}

.html-content {
	border: 1px solid var(--border-color-base);
	padding: 1rem;
	max-height: 600px;
	overflow-y: auto;
}

.html-content :deep(img) {
	max-width: 100%;
	height: auto;
}

.error {
	color: var(--color-destructive);
	padding: 0.5rem;
	border: 1px solid var(--color-destructive);
	background-color: var(--background-color-destructive-subtle);
}
</style>
