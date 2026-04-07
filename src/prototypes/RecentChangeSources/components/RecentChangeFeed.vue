<template>
	<div class="feed-list">
		<p v-if="items.length === 0" class="feed-empty">{{ emptyLabel }}</p>
		<RecentChangeCard
			v-for="item in items"
			:key="`${keyPrefix}-${item.id}`"
			:item="item"
			:faded="fadedIdSet.has(item.id)"
			:show-metrics="showMetrics"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import RecentChangeCard from "./RecentChangeCard.vue"

type FeedDisplayItem = {
	id: number
	pageName?: string
	timestamp: string
	user: { name: string }
	sourceIds?: string[]
	priorityScore?: number
	revertRisk?: number | null
	toneProbability?: number | null
	referenceNeedDelta?: number | null
}

const props = withDefaults(
	defineProps<{
		items: FeedDisplayItem[]
		keyPrefix?: string
		emptyLabel?: string
		showMetrics?: boolean
		fadedIds?: number[]
	}>(),
	{
		keyPrefix: "feed",
		emptyLabel: "No revisions yet.",
		showMetrics: false,
		fadedIds: () => [],
	}
)

const fadedIdSet = computed(() => new Set(props.fadedIds))
</script>

<style scoped>
.feed-list {
	max-height: 500px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 4px;
	background-color: var(--background-color-neutral);
	border: 1px solid var(--border-color-muted);
	border-radius: 2px;

	/* small scrollbar */
	scrollbar-width: thin;
}

.feed-empty {
	font-size: 12px;
	margin: 0;
}
</style>
