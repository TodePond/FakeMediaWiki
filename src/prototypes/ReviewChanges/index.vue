<template>
	<section class="review-changes-wrapper">
		<label class="show-revert-risk-card__label">
			<input
				v-model="showRevertRiskInFeed"
				type="checkbox"
				class="show-revert-risk-card__input"
			/>
			<span class="show-revert-risk-card__text">Debug revert risk</span>
		</label>
		<ReviewChangesFeed
			:show-revert-risk="showRevertRiskInFeed"
			:feed-cap="20"
		/>
	</section>
</template>

<script setup lang="ts">
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { ref, watch } from "vue"

const SHOW_REVERT_RISK_STORAGE_KEY = "review-changes-show-revert-risk"

function getStoredShowRevertRisk(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_REVERT_RISK_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

const showRevertRiskInFeed = ref(getStoredShowRevertRisk())

watch(showRevertRiskInFeed, enabled => {
	try {
		localStorage.setItem(SHOW_REVERT_RISK_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})
</script>

<style scoped>
@import "./style.css";
</style>
