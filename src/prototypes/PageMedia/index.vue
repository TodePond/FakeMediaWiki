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
				<CdxButton>Load media</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="mediaItems.length" class="media-grid">
			<div v-for="(item, index) in mediaItems" :key="index" class="media-item">
				<a
					v-if="item.srcset && item.srcset.length > 0 && item.srcset[0]"
					:href="wiki.getAssetUrlFromUploadUrl(item.srcset[0].src, pageName)"
					target="_blank"
				>
					<img
						:src="item.srcset[0].src"
						:alt="item.title || 'Media item'"
						loading="lazy"
					/>
				</a>
			</div>
		</div>
		<div v-else-if="!isLoading && !error" class="no-media">No media found for this page.</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { FakeWiki } from "../../fake-wiki/FakeWiki"
import type { FWMediaItem } from "../../fake-wiki/types"

const wiki = new FakeWiki()

const pageName = ref(localStorage.getItem("pageMediaQuery") || "Wet Leg")
const mediaItems = ref<FWMediaItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadPage = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const data = await wiki.getPageMedia(pageName.value)
		mediaItems.value = data.items || []
		localStorage.setItem("pageMediaQuery", pageName.value)
	} catch (err) {
		const errorObj = err as Error
		if (errorObj.message.includes("404")) {
			error.value = "Page not found"
		} else {
			error.value = errorObj.message
		}
		mediaItems.value = []
	} finally {
		isLoading.value = false
	}
}

onMounted(loadPage)
</script>

<style scoped>
@import "./style.css";
</style>
