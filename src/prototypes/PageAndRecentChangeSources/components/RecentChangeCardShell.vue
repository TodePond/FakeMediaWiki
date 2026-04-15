<template>
	<a :href="href" target="_blank" rel="noreferrer" class="feed-card-link">
		<article class="feed-card" :class="{ 'feed-card--faded': faded }">
			<div class="feed-card__title">{{ title }}</div>
			<div v-if="hasMeta" class="feed-card__meta">
				<slot name="meta" />
			</div>
			<div v-if="hasSummary" class="feed-card__summary">
				<slot name="summary" />
			</div>
			<div v-if="hasInfoBoxes" class="info-boxes">
				<slot name="infoBoxes" />
			</div>
		</article>
	</a>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue"

withDefaults(
	defineProps<{
		href: string
		title: string
		faded?: boolean
	}>(),
	{
		faded: false,
	}
)

const slots = useSlots()

const hasMeta = computed(() => (slots.meta?.() ?? []).length > 0)
const hasSummary = computed(() => (slots.summary?.() ?? []).length > 0)
const hasInfoBoxes = computed(() => (slots.infoBoxes?.() ?? []).length > 0)
</script>

<style scoped>
.feed-card-link {
	display: block;
	text-decoration: none;
	color: inherit;
}

.feed-card-link:visited,
.feed-card-link:hover,
.feed-card-link:active {
	color: inherit;
}

.feed-card {
	padding: 10px;
	display: flex;
	flex-direction: column;
	border-radius: 2px;
	gap: 0;
	background: var(--background-color-base, #fff);
	font-size: var(--font-size-small);
	line-height: var(--line-height-small);
	color: var(--color-emphasized);
}

.feed-card-link:hover .feed-card,
.feed-card-link:focus-visible .feed-card {
	border: 1px solid var(--border-color-subtle);
	margin: -1px;
}

.feed-card--faded {
	background: var(--background-color-neutral-subtle);
	color: var(--color-subtle);
}

.feed-card--faded,
.feed-card--faded :deep(*) {
	font-weight: var(--font-weight-normal);
}

.feed-card__title {
	font-weight: 600;
}

.feed-card__meta {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.feed-card__summary {
	padding-top: 2px;
	padding-bottom: 2px;
}

.info-boxes {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding-top: 6px;
}

.info-boxes :deep(.info-box) {
	padding: 0 6px;
	border: 1px solid var(--border-color-subtle, #c8ccd1);
	border-radius: 2px;
	font-size: 12px;
}

.feed-card--faded :deep(.feed-card__user),
.feed-card--faded :deep(.cdx-icon),
.feed-card--faded :deep(.info-box),
.feed-card--faded :deep(.feed-card__summary-content) {
	color: var(--color-subtle);
}

.feed-card--faded :deep(.feed-card__user) {
	font-weight: var(--font-weight-normal);
}

.feed-card--faded .feed-card__title,
.feed-card--faded .feed-card__meta,
.feed-card--faded .feed-card__summary,
.feed-card--faded :deep(.info-box),
.feed-card--faded :deep(.feed-card__summary-content) {
	font-weight: var(--font-weight-normal);
}
</style>
