<template>
	<section class="your-impact">
		<article class="your-impact-card">
			<header class="your-impact-card__header">
				<button class="your-impact-card__back" type="button" aria-label="Back">
					<CdxIcon :icon="cdxIconArrowPrevious" />
				</button>
				<h1 class="your-impact-card__title">Your impact</h1>
			</header>

			<section class="impact-metrics" aria-label="Impact metrics">
				<div
					v-for="metric in metrics"
					:key="metric.label"
					class="impact-metrics__item"
				>
					<div class="impact-metrics__value-row">
						<CdxIcon :icon="metric.icon" class="impact-metrics__icon" />
						<strong class="impact-metrics__value">{{ metric.value }}</strong>
					</div>
					<div class="impact-metrics__label-row">
						<span>{{ metric.label }}</span>
						<CdxIcon
							v-if="metric.hasInfo"
							:icon="cdxIconInfo"
							size="small"
							class="impact-metrics__info"
						/>
					</div>
				</div>
			</section>

			<section class="activity-block">
				<h2 class="activity-block__title">Your recent activity</h2>
				<div class="activity-block__big-number">8 <span>Edits</span></div>
				<div class="activity-bars" aria-hidden="true">
					<span
						v-for="(barHeight, index) in editActivityBars"
						:key="index"
						class="activity-bars__bar"
						:class="{ 'activity-bars__bar--active': barHeight > 0 }"
						:style="{ height: `${Math.max(barHeight, 6)}%` }"
					/>
				</div>
				<div class="activity-block__range">
					<span>Dec 4</span>
					<span>Feb 1</span>
				</div>
			</section>

			<section class="activity-block">
				<div class="activity-block__big-number">
					1,309 <span>Views on articles you edited</span>
				</div>
				<svg
					class="views-line-chart"
					viewBox="0 0 320 56"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<polyline
						class="views-line-chart__path"
						:points="viewTrendPoints"
					/>
				</svg>
			</section>

			<section class="top-pages">
				<h2 class="top-pages__title">Most viewed articles (since your edit)</h2>
				<ul class="top-pages__list">
					<li v-for="item in topPages" :key="item.title" class="top-pages__item">
						<img :src="item.image" :alt="item.title" class="top-pages__thumb" />
						<span class="top-pages__name">{{ item.title }}</span>
						<div class="top-pages__meta">
							<strong class="top-pages__views">{{ item.views }}</strong>
							<CdxIcon :icon="cdxIconCheckAll" size="small" class="top-pages__check" />
						</div>
					</li>
				</ul>
			</section>

			<a href="#" class="your-impact-card__footer-link">View all your edits (23)</a>
		</article>
	</section>
</template>

<script setup lang="ts">
import { CdxIcon } from "@wikimedia/codex"
import {
	cdxIconArrowPrevious,
	cdxIconCheckAll,
	cdxIconClock,
	cdxIconEdit,
	cdxIconInfo,
	cdxIconUserAvatar,
} from "@wikimedia/codex-icons"
import { computed } from "vue"

const metrics = [
	{ icon: cdxIconEdit, value: "62", label: "Total edits", hasInfo: false },
	{ icon: cdxIconUserAvatar, value: "3", label: "Thanks received", hasInfo: true },
	{ icon: cdxIconClock, value: "2 weeks ago", label: "Last edited", hasInfo: false },
	{ icon: cdxIconCheckAll, value: "3 days", label: "Longest streak", hasInfo: true },
]

const editActivityBars = [
	0, 0, 28, 6, 0, 0, 0, 16, 30, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 0, 18, 22, 0, 0, 0, 0,
	20, 38, 0, 0, 0, 0,
]

const viewTrend = [18, 20, 24, 22, 21, 16, 25, 20, 23, 21, 19, 26, 27, 18, 18, 24, 21, 23, 20, 27, 25, 28, 31]
const viewTrendPoints = computed(() => {
	const last = viewTrend.length - 1
	return viewTrend
		.map((value, index) => {
			const x = (index / last) * 320
			const y = 56 - value
			return `${x},${y}`
		})
		.join(" ")
})

const topPages = [
	{
		title: "Canele",
		views: "505",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Caneles_2.jpg/120px-Caneles_2.jpg",
	},
	{
		title: "Pavlova",
		views: "231",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Pavlova_dessert.jpg/120px-Pavlova_dessert.jpg",
	},
	{
		title: "The Australian Women's Weekly...",
		views: "173",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Christmas_Cookbook_by_The_Australian_Women%27s_Weekly.jpg/120px-Christmas_Cookbook_by_The_Australian_Women%27s_Weekly.jpg",
	},
	{
		title: "Le Cordon Bleu",
		views: "120",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/PlaceholderLCB.png/120px-PlaceholderLCB.png",
	},
	{
		title: "Monosodium glutamate",
		views: "72",
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Monosodium_glutamate-3D-balls.png/120px-Monosodium_glutamate-3D-balls.png",
	},
]
</script>

<style scoped>
@import "./style.css";
</style>
