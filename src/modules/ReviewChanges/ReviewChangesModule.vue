<template>
	<section class="review-changes-module-wrapper">
		<div v-show="mobileSettingsVisible">
			<ReviewChangesControls />
		</div>
		<ReviewChangesFeed
			:show-revert-risk="showRevertRiskInFeed"
			:show-revert-risk-flags="showRevertRiskFlags"
			:revert-risk-flags-in-box="revertRiskFlagsInBox"
			:verbose-flags="verboseFlags"
			:show-reverted-flag="showRevertedFlag"
			:show-source-icons="showSourceIcons"
			:show-source-subtitles="showSourceSubtitles"
			:show-username-at-prefix="showUsernameAtPrefix"
			:show-user-icon="showUserIcon"
			:show-summary-cutout="summaryCutout"
			:show-empty-edit-summary="showEmptyEditSummary"
			:show-delta="showDelta"
			:show-short-description="showShortDescription"
			:show-short-description-separator="showShortDescriptionSeparator"
			:show-on-watchlist-label="showOnWatchlistLabel"
			:source="feedSource"
			:recent-changes-ratio="recentChangesRatio"
			:pages-and-users-ratio="pagesAndUsersRatio"
			:pages-and-users-latest-ratio="pagesAndUsersLatestRatio"
			:pages-ive-edited-ratio="pagesIveEditedRatio"
			:collaborators-ratio="collaboratorsRatio"
			:related-changes-ratio="relatedChangesRatio"
			:feed-cap="10"
			:hide-description="true"
			:show-review-button="showReviewButton"
			:show-dismiss-button="showDismissButton"
			:highlight-unviewed="showHighlightUnviewed"
			:unviewed-border="showUnviewedBorder"
			:viewed-border="showViewedBorder"
			:last-clicked-highlight="showLastClickedHighlight"
			:show-arrow-in-top-right="showArrowInTopRight"
			:show-recommendation-flags="showRecommendationFlags"
			:show-edit-check-other-flag="showEditCheckOtherFlag"
			:show-tone-check-flag="showToneCheckFlag"
			:show-debug-checks="showDebugChecks"
			:flags-below-username="flagsBelowUsername"
			:simplified-timestamp="simplifiedTimestamp"
			:timestamp-position="timestampPosition"
		/>
	</section>
</template>

<script setup lang="ts">
import ReviewChangesFeed from "./components/ReviewChangesFeed/ReviewChangesFeed.vue"
import ReviewChangesControls from "@/modules/ReviewChanges/ReviewChangesControls.vue"
import type { Ref } from "vue"
import { inject, ref } from "vue"
import {
	useReviewChangesModule,
} from "./useReviewChangesModule"

const mobileSettingsVisible = inject<Ref<boolean>>("mobileSettingsVisible", ref(true))

const {
	feedSource,
	showReviewButton,
	showDismissButton,
	showHighlightUnviewed,
	showUnviewedBorder,
	showViewedBorder,
	showLastClickedHighlight,
	showArrowInTopRight,
	recentChangesRatio,
	pagesAndUsersRatio,
	pagesAndUsersLatestRatio,
	pagesIveEditedRatio,
	collaboratorsRatio,
	relatedChangesRatio,
	showRevertRiskInFeed,
	showRevertRiskFlags,
	revertRiskFlagsInBox,
	verboseFlags,
	showRevertedFlag,
	showDelta,
	showShortDescription,
	showShortDescriptionSeparator,
	showOnWatchlistLabel,
	showSourceIcons,
	showSourceSubtitles,
	showUsernameAtPrefix,
	showUserIcon,
	summaryCutout,
	showEmptyEditSummary,
	showRecommendationFlags,
	showEditCheckOtherFlag,
	showToneCheckFlag,
	showDebugChecks,
	flagsBelowUsername,
	simplifiedTimestamp,
	timestampPosition,
} = useReviewChangesModule()
</script>

<style scoped>
@import "./style.css";
</style>
