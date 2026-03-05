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
			<template v-if="feedSource === 'mixed'">
				<div class="review-changes-controls__row" role="group" aria-label="Mix ratio">
					<CdxLabel :input-id="recentChangesSliderId">Recent changes %</CdxLabel>
					<div class="ratio-slider-line">
						<input
							:id="recentChangesSliderId"
							v-model.number="recentChangesRatio"
							type="range"
							min="0"
							max="100"
							step="1"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ recentChangesRatio }}%</span
						>
					</div>
				</div>
				<div class="review-changes-controls__row" role="group" aria-label="Mix ratio">
					<CdxLabel :input-id="pagesAndUsersSliderId">Watchlist %</CdxLabel>
					<div class="ratio-slider-line">
						<input
							:id="pagesAndUsersSliderId"
							v-model.number="pagesAndUsersRatio"
							type="range"
							min="0"
							max="100"
							step="1"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ pagesAndUsersRatio }}%</span
						>
					</div>
				</div>
			</template>
			<label class="show-revert-risk-card__label">
				<input
					v-model="showDelta"
					type="checkbox"
					class="show-revert-risk-card__input"
				/>
				<span class="show-revert-risk-card__text">Delta</span>
			</label>
			<label class="show-revert-risk-card__label">
				<input
					v-model="showSourceIcons"
					type="checkbox"
					class="show-revert-risk-card__input"
				/>
				<span class="show-revert-risk-card__text">Source icons</span>
			</label>
			<label class="show-revert-risk-card__label">
				<input
					v-model="showSourceSubtitles"
					type="checkbox"
					class="show-revert-risk-card__input"
				/>
				<span class="show-revert-risk-card__text">Source subtitles</span>
			</label>
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
			:show-source-icons="showSourceIcons"
			:show-source-subtitles="showSourceSubtitles"
			:show-delta="showDelta"
			:source="feedSource"
			:recent-changes-ratio="recentChangesRatio"
			:pages-and-users-ratio="pagesAndUsersRatio"
			:feed-cap="10"
		/>
	</section>
</template>

<script setup lang="ts">
import type { ReviewChangesSource } from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { CdxLabel, CdxSelect } from "@wikimedia/codex"
import { ref, watch } from "vue"

const SHOW_REVERT_RISK_STORAGE_KEY = "review-changes-show-revert-risk"
const SHOW_DELTA_STORAGE_KEY = "review-changes-show-delta"
const SHOW_SOURCE_ICONS_STORAGE_KEY = "review-changes-show-source-icons"
const SHOW_SOURCE_SUBTITLES_STORAGE_KEY = "review-changes-show-source-subtitles"
const FEED_SOURCE_STORAGE_KEY = "review-changes-feed-source"
const RECENT_CHANGES_RATIO_STORAGE_KEY = "review-changes-recent-changes-ratio"
const PAGES_AND_USERS_RATIO_STORAGE_KEY = "review-changes-pages-and-users-ratio"
const recentChangesSliderId = "review-changes-recent-slider"
const pagesAndUsersSliderId = "review-changes-pages-slider"

function getStoredShowRevertRisk(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_REVERT_RISK_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

function getStoredShowDelta(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_DELTA_STORAGE_KEY)
		if (stored === null) return true
		return stored === "true"
	} catch {
		return true
	}
}

function getStoredShowSourceIcons(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_SOURCE_ICONS_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

function getStoredShowSourceSubtitles(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_SOURCE_SUBTITLES_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

function getStoredFeedSource(): ReviewChangesSource {
	try {
		const stored = localStorage.getItem(FEED_SOURCE_STORAGE_KEY)
		if (stored === "recentChanges" || stored === "pagesAndUsers" || stored === "mixed") {
			return stored
		}
	} catch {
		// ignore
	}
	return "recentChanges"
}

function getStoredRatio(key: string, fallback: number): number {
	try {
		const stored = localStorage.getItem(key)
		if (stored !== null) {
			const n = Number(stored)
			if (Number.isFinite(n) && n >= 0 && n <= 100) return Math.round(n)
		}
	} catch {
		// ignore
	}
	return fallback
}

const sourceOptions = [
	{ value: "recentChanges", label: "Recent changes" },
	{ value: "pagesAndUsers", label: "Watchlist" },
	{ value: "mixed", label: "Mixed" },
]

const showRevertRiskInFeed = ref(getStoredShowRevertRisk())
const showDelta = ref(getStoredShowDelta())
const showSourceIcons = ref(getStoredShowSourceIcons())
const showSourceSubtitles = ref(getStoredShowSourceSubtitles())
const feedSource = ref<ReviewChangesSource>(getStoredFeedSource())
const recentChangesRatio = ref(getStoredRatio(RECENT_CHANGES_RATIO_STORAGE_KEY, 50))
const pagesAndUsersRatio = ref(getStoredRatio(PAGES_AND_USERS_RATIO_STORAGE_KEY, 50))

watch(showRevertRiskInFeed, enabled => {
	try {
		localStorage.setItem(SHOW_REVERT_RISK_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

watch(showDelta, enabled => {
	try {
		localStorage.setItem(SHOW_DELTA_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

watch(showSourceIcons, enabled => {
	try {
		localStorage.setItem(SHOW_SOURCE_ICONS_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

watch(showSourceSubtitles, enabled => {
	try {
		localStorage.setItem(SHOW_SOURCE_SUBTITLES_STORAGE_KEY, String(enabled))
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

watch(recentChangesRatio, value => {
	try {
		localStorage.setItem(RECENT_CHANGES_RATIO_STORAGE_KEY, String(value))
	} catch {
		// ignore
	}
})

watch(pagesAndUsersRatio, value => {
	try {
		localStorage.setItem(PAGES_AND_USERS_RATIO_STORAGE_KEY, String(value))
	} catch {
		// ignore
	}
})
</script>

<style scoped>
@import "./style.css";
</style>
