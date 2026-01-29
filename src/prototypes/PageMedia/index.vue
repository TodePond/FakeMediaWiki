<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi, type MediaItem } from "../../wiki-api/WikiApi"

const wiki = new WikiApi()

const pageName = ref(localStorage.getItem("pageMediaQuery") || "Wet Leg")
const mediaItems = ref<MediaItem[]>([])
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

.media-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 1rem;
}

.media-item {
	overflow: hidden;
	background-color: var(--background-color-base);
}

.media-item img {
	width: 100%;
	/* height: 150px; */
	/* object-fit: cover; */
}

.media-info {
	padding: 0.5rem;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.media-title {
	font-size: 0.75rem;
	word-break: break-word;
	color: var(--color-base);
}

.media-type {
	font-size: 0.625rem;
	color: var(--color-subtle);
	text-transform: uppercase;
}

.no-media {
	color: var(--color-subtle);
	padding: 1rem;
	text-align: center;
}

.error {
	color: var(--color-destructive);
	padding: 0.5rem;
	border: 1px solid var(--color-destructive);
	background-color: var(--background-color-destructive-subtle);
}
</style>
