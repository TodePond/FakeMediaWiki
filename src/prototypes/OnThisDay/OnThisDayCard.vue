<template>
	<CdxCard :url="pageUrl">
		<template #title>{{ item.text }}</template>
		<template v-if="hasYear" #description>Year: {{ year }}</template>
	</CdxCard>
</template>

<script setup lang="ts">
import { CdxCard } from "@wikimedia/codex"
import { computed } from "vue"
import { FakeWiki } from "../../fakewiki/FakeWiki"
import type { FWOnThisDayItem } from "../../fakewiki/types"

const wiki = new FakeWiki()

const props = defineProps<{
	item: FWOnThisDayItem
}>()

const pageUrl = computed(() => wiki.getPageUrl(props.item.pages?.[0]?.title || ""))

const hasYear = computed(() => "year" in props.item && props.item.year != null)
const year = computed(() => (props.item.type === "event" ? props.item.year : null))
</script>
