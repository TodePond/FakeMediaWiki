<template>
	<div class="result-row">
		<div class="result-thumbnail-wrap">
			<img
				v-if="thumbnail"
				:src="thumbnail"
				:alt="item.page_title !== '-' ? item.page_title : ''"
				class="result-thumbnail"
				loading="lazy"
				width="80"
				height="80"
			/>
		</div>
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
				<span v-else>{{
					item.page_title === "-" ? "Article missing" : item.page_title
				}}</span>
				<span v-if="item.qid" class="result-qid">
					<a
						:href="wikidataUrl"
						target="_blank"
						rel="noopener noreferrer"
						class="qid-link"
						>{{ item.qid }}</a
					>
				</span>
			</span>
			<p v-if="item.description" class="result-description">{{ item.description }}</p>
			<p v-if="listPageTitles && listPageTitles.length > 0" class="result-list-pages">
				{{ listPageTitles.length }} list{{ listPageTitles.length === 1 ? "" : "s" }}:
				<template v-for="(pageTitle, idx) in listPageTitles" :key="pageTitle">
					<span v-if="idx > 0">, </span>
					<a
						:href="pageUrl(pageTitle)"
						target="_blank"
						rel="noopener noreferrer"
						class="list-page-link"
						>{{ pageTitle }}</a
					>
				</template>
			</p>
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
		listCount?: number
		listPageTitles?: string[]
	}>(),
	{ thumbnail: undefined, listCount: undefined, listPageTitles: undefined }
)

const articleUrl = computed(() => {
	const title = props.item.page_title === "-" ? "" : props.item.page_title
	return `https://${props.lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`
})

const wikidataUrl = computed(() =>
	props.item.qid ? `https://www.wikidata.org/wiki/${props.item.qid}` : ""
)

function pageUrl(title: string): string {
	return `https://${props.lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`
}
</script>

<style scoped>
@import "./style.css";
</style>
