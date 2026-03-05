<template>
	<section class="review-changes-wrapper">
		<div class="review-changes-controls">
			<div class="review-changes-controls__row">
				<CdxLabel input-id="review-changes-source">Feed source</CdxLabel>
				<CdxSelect
					id="review-changes-source"
					v-model:selected="feedSource"
					:menu-items="sourceOptions"
				/>
			</div>
			<label class="show-revert-risk-card__label">
				<input
					v-model="showRevertRiskInFeed"
					type="checkbox"
					class="show-revert-risk-card__input"
				/>
				<span class="show-revert-risk-card__text">Debug revert risk</span>
			</label>
		</div>
		<ReviewChangesFeed
			:show-revert-risk="showRevertRiskInFeed"
			:source="feedSource"
			:feed-cap="20"
		/>
	</section>
</template>

<script setup lang="ts">
import type { ReviewChangesSource } from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { CdxLabel, CdxSelect } from "@wikimedia/codex"
import { ref, watch } from "vue"

const SHOW_REVERT_RISK_STORAGE_KEY = "review-changes-show-revert-risk"
const FEED_SOURCE_STORAGE_KEY = "review-changes-feed-source"

function getStoredShowRevertRisk(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_REVERT_RISK_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

function getStoredFeedSource(): ReviewChangesSource {
	try {
		const stored = localStorage.getItem(FEED_SOURCE_STORAGE_KEY)
		if (stored === "recentChanges" || stored === "pagesAndUsers") {
			return stored
		}
	} catch {
		// ignore
	}
	return "recentChanges"
}

const sourceOptions = [
	{ value: "recentChanges", label: "Recent changes" },
	{ value: "pagesAndUsers", label: "Watchlist" },
]

const showRevertRiskInFeed = ref(getStoredShowRevertRisk())
const feedSource = ref<ReviewChangesSource>(getStoredFeedSource())

watch(showRevertRiskInFeed, enabled => {
	try {
		localStorage.setItem(SHOW_REVERT_RISK_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

watch(feedSource, source => {
	try {
		localStorage.setItem(FEED_SOURCE_STORAGE_KEY, source)
	} catch {
		// ignore
	}
})
</script>

<style scoped>
@import "./style.css";
</style>
