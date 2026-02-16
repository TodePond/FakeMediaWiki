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
				<CdxButton>Load Source</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<pre v-if="sourceContent" class="source-content">{{ sourceContent }}</pre>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { FakeWiki } from "../../fakewiki/FakeWiki"

const wiki = new FakeWiki()

const pageName = ref(localStorage.getItem("pageSourceQuery") || "Wet Leg")
const sourceContent = ref("")
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadPage = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const source = await wiki.getPageSource(pageName.value)
		sourceContent.value = source
		localStorage.setItem("pageSourceQuery", pageName.value)
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		sourceContent.value = ""
	} finally {
		isLoading.value = false
	}
}

onMounted(loadPage)
</script>

<style scoped>
@import "./style.css";
</style>
