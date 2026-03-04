<template>
	<form @submit.prevent="loadPage">
		<CdxLabel input-id="page-name">Page name</CdxLabel>
		<span class="input-with-reset">
			<CdxTextInput
				autocomplete="off"
				v-model="pageName"
				input-type="search"
				id="page-name"
			/>
			<CdxButton type="button" @click="resetToDefault">Reset to default</CdxButton>
			<CdxButton>Load mobile HTML</CdxButton>
			<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
		</span>
	</form>
	<div v-if="error" class="error">{{ error }}</div>
	<div v-if="htmlContent" class="mobile-preview">
		<iframe :srcdoc="htmlContent" class="mobile-frame" />
	</div>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { FakeWiki } from "fakewiki"

const wiki = new FakeWiki()

const pageName = ref(localStorage.getItem("pageMobileHtmlQuery") || "Wet Leg")
const htmlContent = ref("")
const isLoading = ref(false)
const error = ref<string | null>(null)
const DEFAULT_QUERY = "Wet Leg"

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

function resetToDefault(): void {
	localStorage.removeItem("pageMobileHtmlQuery")
	pageName.value = DEFAULT_QUERY
	localStorage.setItem("pageMobileHtmlQuery", DEFAULT_QUERY)
}

onMounted(loadPage)
</script>

<style scoped>
@import "./style.css";
</style>
