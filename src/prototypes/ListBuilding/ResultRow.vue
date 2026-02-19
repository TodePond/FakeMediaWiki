<template>
	<div class="result-row">
		<img
			v-if="thumbnail"
			:src="thumbnail"
			:alt="item.page_title !== '-' ? item.page_title : ''"
			class="result-thumbnail"
			loading="lazy"
			width="80"
			height="80"
		/>
		<div class="result-body">
			<span class="result-title">
				<a
					v-if="!item.redlink && item.page_title !== '-'"
					:href="articleUrl"
					target="_blank"
					rel="noopener noreferrer"
					class="main-link"
					>{{ item.page_title }}</a
				>
				<a
					v-else-if="item.qid"
					:href="wikidataUrl"
					target="_blank"
					rel="noopener noreferrer"
					class="main-link"
					>{{ item.page_title === "-" ? "Article missing" : item.page_title }}</a
				>
				<span v-else>{{ item.page_title === "-" ? "Article missing" : item.page_title }}</span>
				<span v-if="item.qid" class="result-qid">
					<a :href="wikidataUrl" target="_blank" rel="noopener noreferrer" class="qid-link">{{
						item.qid
					}}</a>
				</span>
			</span>
			<p v-if="item.description" class="result-description">{{ item.description }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { FWListBuildingResult } from "fakewiki/types"
import { computed } from "vue"

const props = withDefaults(
	defineProps<{
		item: FWListBuildingResult
		lang: string
		thumbnail?: string
	}>(),
	{ thumbnail: undefined }
)

const articleUrl = computed(() => {
	const title = props.item.page_title === "-" ? "" : props.item.page_title
	return `https://${props.lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`
})

const wikidataUrl = computed(() =>
	props.item.qid ? `https://www.wikidata.org/wiki/${props.item.qid}` : ""
)
</script>

<style scoped>
@import "./style.css";
</style>
