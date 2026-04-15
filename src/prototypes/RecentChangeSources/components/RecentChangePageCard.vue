<template>
	<RecentChangeCardShell :href="href" :title="title" :faded="faded">
		<template v-if="snippetHtml" #summary>
			<div class="feed-card__summary-content" v-html="snippetHtml"></div>
		</template>
		<template #infoBoxes>
			<div v-for="infoBox in infoBoxes" :key="infoBox" class="info-box">
				{{ infoBox }}
			</div>
		</template>
	</RecentChangeCardShell>
</template>

<script setup lang="ts">
import RecentChangeCardShell from "./RecentChangeCardShell.vue"

withDefaults(
	defineProps<{
		href: string
		title: string
		infoBoxes?: string[]
		snippetHtml?: string
		faded?: boolean
	}>(),
	{
		infoBoxes: () => [],
		snippetHtml: undefined,
		faded: false,
	}
)
</script>
