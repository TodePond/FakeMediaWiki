<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"

const wiki = new WikiApi()

const pageName = ref(localStorage.getItem("pageMobileHtmlQuery") || "Wet Leg")
const htmlContent = ref("")
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadPage = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const html = await wiki.getPageMobileHtml(pageName.value)
		htmlContent.value = html
		localStorage.setItem("pageMobileHtmlQuery", pageName.value)
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
	<form @submit.prevent="loadPage">
		<CdxLabel input-id="page-name">Page name</CdxLabel>
		<span>
			<CdxTextInput
				autocomplete="off"
				v-model="pageName"
				input-type="search"
				id="page-name"
			/>
			<CdxButton>Load mobile HTML</CdxButton>
			<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
		</span>
	</form>
	<div v-if="error" class="error">{{ error }}</div>
	<div v-if="htmlContent" class="mobile-preview">
		<iframe :srcdoc="htmlContent" class="mobile-frame" />
	</div>
</template>

<style scoped>
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

.mobile-preview {
	display: flex;
	justify-content: center;
	padding: 1rem;
	padding-top: 1.5rem;
}

.mobile-frame {
	height: 750px;
	width: 100%;
	max-width: calc(var(--max-width-breakpoint-mobile) * 0.66);
	border: 8px solid var(--border-color-base);
	border-radius: 20px;
	background-color: var(--background-color-base);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.error {
	color: var(--color-destructive);
	padding: 0.5rem;
	border: 1px solid var(--color-destructive);
	background-color: var(--background-color-destructive-subtle);
}

section {
	position: relative;
	display: flex;
	height: 100%;
	flex-direction: column;
}
</style>
