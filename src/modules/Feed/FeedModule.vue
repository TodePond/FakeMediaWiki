<template>
	<section class="feed-module-wrapper">
		<div v-show="mobileSettingsVisible">
			<FeedControls />
		</div>
		<ReviewChangesFeed
			:unified-title="true"
			:show-revert-risk="showRevertRiskInFeed"
			:show-revert-risk-flags="showRevertRiskFlags"
			:revert-risk-flags-in-box="true"
			:verbose-flags="false"
			:show-reverted-flag="showRevertedFlag"
			:show-source-icons="false"
			:show-source-subtitles="true"
			:show-username-at-prefix="false"
			:show-user-icon="true"
			:show-summary-cutout="false"
			:show-empty-edit-summary="true"
			:show-delta="false"
			:show-short-description="true"
			:show-short-description-separator="true"
			:show-on-watchlist-label="showOnWatchlistLabel"
			:source="feedSource"
			:recent-changes-ratio="recentChangesRatio"
			:pages-and-users-ratio="pagesAndUsersRatio"
			:pages-and-users-latest-ratio="pagesAndUsersLatestRatio"
			:collaborators-ratio="collaboratorsRatio"
			:related-changes-ratio="relatedChangesRatio"
			:feed-cap="10"
			:hide-description="true"
			:show-review-button="false"
			:show-dismiss-button="false"
			:highlight-unviewed="false"
			:unviewed-border="false"
			:viewed-border="false"
			:last-clicked-highlight="false"
			:show-arrow-in-top-right="false"
			:show-recommendation-flags="showRecommendationFlags"
			:show-edit-check-other-flag="showEditCheckOtherFlag"
			:show-debug-checks="showDebugChecks"
			:flags-below-username="true"
			:simplified-timestamp="true"
			timestamp-position="topRight"
			title="Review changes"
		/>
	</section>
</template>

<script setup lang="ts">
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import FeedControls from "@/modules/Feed/FeedControls.vue"
import type { Ref } from "vue"
import { inject, ref } from "vue"
import { useFeedModule } from "./useFeedModule"

const mobileSettingsVisible = inject<Ref<boolean>>("mobileSettingsVisible", ref(true))

const {
	feedSource,
	recentChangesRatio,
	pagesAndUsersRatio,
	pagesAndUsersLatestRatio,
	collaboratorsRatio,
	relatedChangesRatio,
	showRevertRiskInFeed,
	showRevertRiskFlags,
	showRevertedFlag,
	showOnWatchlistLabel,
	showRecommendationFlags,
	showEditCheckOtherFlag,
	showDebugChecks,
} = useFeedModule()
</script>

<style scoped>
@import "./style.css";
</style>
