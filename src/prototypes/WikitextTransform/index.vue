<template>
	<section>
		<form @submit.prevent="transform">
			<CdxLabel input-id="wikitext">Wikitext</CdxLabel>
			<CdxTextArea
				v-model="wikitext"
				id="wikitext"
				:rows="10"
				placeholder="Enter wikitext here..."
			/>
			<CdxButton>Transform to HTML</CdxButton>
			<CdxProgressIndicator v-if="isLoading" aria-label="Transforming" />
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="htmlResult" class="html-result">
			<div class="html-content" v-html="htmlResult"></div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextArea } from "@wikimedia/codex"
import { ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"

const wiki = new WikiApi()

const wikitext = ref("== Hello World ==\n\nThis is a '''test''' of [[Wikitext]] transformation.")
const htmlResult = ref("")
const isLoading = ref(false)
const error = ref<string | null>(null)

const transform = async (): Promise<void> => {
	if (!wikitext.value.trim()) return

	isLoading.value = true
	error.value = null
	try {
		const html = await wiki.transformWikitextToHtml(wikitext.value)
		htmlResult.value = html
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		htmlResult.value = ""
	} finally {
		isLoading.value = false
	}
}
</script>

<style scoped>
@import "./style.css";
</style>
