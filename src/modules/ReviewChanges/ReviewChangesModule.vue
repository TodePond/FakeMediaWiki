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
			:source="feedSource"
			:recent-changes-ratio="recentChangesRatio"
			:pages-and-users-ratio="pagesAndUsersRatio"
			:collaborators-ratio="collaboratorsRatio"
			:related-changes-ratio="relatedChangesRatio"
			:feed-cap="10"
			:hide-description="true"
			:show-review-button="showReviewButton"
		/>
	</section>
</template>

<script setup lang="ts">
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
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
	recentChangesRatio,
	pagesAndUsersRatio,
	collaboratorsRatio,
	relatedChangesRatio,
	showRevertRiskInFeed,
	showRevertRiskFlags,
	revertRiskFlagsInBox,
	verboseFlags,
	showRevertedFlag,
	showDelta,
	showSourceIcons,
	showSourceSubtitles,
	showUsernameAtPrefix,
	showUserIcon,
	summaryCutout,
	showEmptyEditSummary,
} = useReviewChangesModule()
</script>

<style scoped>
@import "./style.css";
</style>
