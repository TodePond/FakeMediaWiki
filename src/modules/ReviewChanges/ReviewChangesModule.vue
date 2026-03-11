<template>
	<section class="review-changes-module-wrapper">
		<div v-show="mobileSettingsVisible" class="review-changes-controls">
			<div class="review-changes-controls__checkboxes" role="group" aria-label="Prototype settings">
				<CdxCheckbox v-model="showDelta">Delta</CdxCheckbox>
				<CdxCheckbox v-model="showSourceIcons">Source icon</CdxCheckbox>
				<CdxCheckbox v-model="showSourceSubtitles">Source subtitle</CdxCheckbox>
				<CdxCheckbox v-model="showRevertRiskInFeed">Debug revert risk</CdxCheckbox>
				<CdxCheckbox v-model="showUsernameAtPrefix">@ username</CdxCheckbox>
				<CdxCheckbox v-model="showUserIcon">User icon</CdxCheckbox>
				<CdxCheckbox v-model="summaryCutout">Cutout</CdxCheckbox>
				<CdxCheckbox v-model="hideEmptySummary">Hide empty summary</CdxCheckbox>
				<CdxCheckbox v-model="cardAsLink">Card as link</CdxCheckbox>
			</div>
			<div class="review-changes-controls__row">
				<CdxLabel input-id="review-changes-module-source">Feed source</CdxLabel>
				<CdxSelect
					id="review-changes-module-source"
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
							v-model.number="mixedRecentChangesRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ mixedRecentChangesRatio }}%</span
						>
					</div>
				</div>
				<div class="review-changes-controls__row" role="group" aria-label="Mix ratio">
					<CdxLabel :input-id="pagesAndUsersSliderId">Watchlist %</CdxLabel>
					<div class="ratio-slider-line">
						<input
							:id="pagesAndUsersSliderId"
							v-model.number="mixedPagesAndUsersRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ mixedPagesAndUsersRatio }}%</span
						>
					</div>
				</div>
				<div class="review-changes-controls__row" role="group" aria-label="Mix ratio">
					<CdxLabel :input-id="collaboratorsSliderId"
						>Collaborators %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="collaboratorsSliderId"
							v-model.number="mixedCollaboratorsRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ mixedCollaboratorsRatio }}%</span
						>
					</div>
				</div>
				<div class="review-changes-controls__row" role="group" aria-label="Mix ratio">
					<CdxLabel :input-id="relatedChangesSliderId"
						>Related changes %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="relatedChangesSliderId"
							v-model.number="mixedRelatedChangesRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ mixedRelatedChangesRatio }}%</span
						>
					</div>
				</div>
			</template>
			<template v-if="feedSource === 'recentChanges'">
				<div class="review-changes-controls__row" role="group" aria-label="Show ratio">
					<CdxLabel :input-id="recentChangesSliderId"
						>Recent changes %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="recentChangesSliderId"
							v-model.number="standaloneRecentChangesRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ standaloneRecentChangesRatio }}%</span
						>
					</div>
				</div>
			</template>
			<template v-if="feedSource === 'pagesAndUsers'">
				<div class="review-changes-controls__row" role="group" aria-label="Show ratio">
					<CdxLabel :input-id="pagesAndUsersSliderId"
						>Watchlist %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="pagesAndUsersSliderId"
							v-model.number="standalonePagesAndUsersRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ standalonePagesAndUsersRatio }}%</span
						>
					</div>
				</div>
			</template>
			<template v-if="feedSource === 'collaborators'">
				<div class="review-changes-controls__row" role="group" aria-label="Show ratio">
					<CdxLabel :input-id="collaboratorsSliderId"
						>Collaborators %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="collaboratorsSliderId"
							v-model.number="standaloneCollaboratorsRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ standaloneCollaboratorsRatio }}%</span
						>
					</div>
				</div>
			</template>
			<template v-if="feedSource === 'relatedChanges'">
				<div class="review-changes-controls__row" role="group" aria-label="Show ratio">
					<CdxLabel :input-id="relatedChangesSliderId"
						>Related changes %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="relatedChangesSliderId"
							v-model.number="standaloneRelatedChangesRatio"
							type="range"
							min="0"
							max="100"
							step="10"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ standaloneRelatedChangesRatio }}%</span
						>
					</div>
				</div>
			</template>
		</div>
		<ReviewChangesFeed
			:show-revert-risk="showRevertRiskInFeed"
			:show-source-icons="showSourceIcons"
			:show-source-subtitles="showSourceSubtitles"
			:show-username-at-prefix="showUsernameAtPrefix"
			:show-user-icon="showUserIcon"
			:show-summary-cutout="summaryCutout"
			:hide-empty-summary="hideEmptySummary"
			:show-delta="showDelta"
			:source="feedSource"
			:recent-changes-ratio="recentChangesRatio"
			:pages-and-users-ratio="pagesAndUsersRatio"
			:collaborators-ratio="collaboratorsRatio"
			:related-changes-ratio="relatedChangesRatio"
			:feed-cap="10"
			:hide-description="true"
			:card-as-link="cardAsLink"
		/>
	</section>
</template>

<script setup lang="ts">
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { CdxCheckbox, CdxLabel, CdxSelect } from "@wikimedia/codex"
import type { Ref } from "vue"
import { inject, ref } from "vue"
import {
	collaboratorsSliderId,
	pagesAndUsersSliderId,
	recentChangesSliderId,
	relatedChangesSliderId,
	sourceOptions,
	useReviewChangesModule,
} from "./useReviewChangesModule"

const mobileSettingsVisible = inject<Ref<boolean>>("mobileSettingsVisible", ref(true))

const {
	feedSource,
	cardAsLink,
	mixedRecentChangesRatio,
	mixedPagesAndUsersRatio,
	mixedCollaboratorsRatio,
	mixedRelatedChangesRatio,
	standaloneRecentChangesRatio,
	standalonePagesAndUsersRatio,
	standaloneCollaboratorsRatio,
	standaloneRelatedChangesRatio,
	recentChangesRatio,
	pagesAndUsersRatio,
	collaboratorsRatio,
	relatedChangesRatio,
	showRevertRiskInFeed,
	showDelta,
	showSourceIcons,
	showSourceSubtitles,
	showUsernameAtPrefix,
	showUserIcon,
	summaryCutout,
	hideEmptySummary,
} = useReviewChangesModule()
</script>

<style scoped>
@import "./style.css";
</style>
