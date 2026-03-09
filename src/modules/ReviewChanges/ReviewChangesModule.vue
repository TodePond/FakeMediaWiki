<template>
	<section class="review-changes-module-wrapper">
		<div class="review-changes-controls">
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
				<div class="review-changes-controls__row" role="group" aria-label="Mix ratio">
					<CdxLabel :input-id="relatedChangesSliderId"
						>Related changes %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="relatedChangesSliderId"
							v-model.number="relatedChangesRatio"
							type="range"
							min="0"
							max="100"
							step="1"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ relatedChangesRatio }}%</span
						>
					</div>
				</div>
				<div class="review-changes-controls__row" role="group" aria-label="Recommendations percentage">
					<CdxLabel :input-id="relatedChangesRecPercentSliderId"
						>Recommendations %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="relatedChangesRecPercentSliderId"
							v-model.number="relatedChangesRecPercent"
							type="range"
							min="1"
							max="100"
							step="1"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ relatedChangesRecPercent }}%</span
						>
					</div>
				</div>
			</template>
			<template v-if="feedSource === 'relatedChanges'">
				<div class="review-changes-controls__row" role="group" aria-label="Recommendations percentage">
					<CdxLabel :input-id="relatedChangesRecPercentSliderId"
						>Recommendations %</CdxLabel
					>
					<div class="ratio-slider-line">
						<input
							:id="relatedChangesRecPercentSliderId"
							v-model.number="relatedChangesRecPercent"
							type="range"
							min="1"
							max="100"
							step="1"
							class="ratio-slider"
						/>
						<span class="ratio-slider-value" aria-hidden="true"
							>{{ relatedChangesRecPercent }}%</span
						>
					</div>
				</div>
			</template>
			<label class="show-revert-risk-card__label">
				<input v-model="showDelta" type="checkbox" class="show-revert-risk-card__input" />
				<span class="show-revert-risk-card__text">Delta</span>
			</label>
			<label class="show-revert-risk-card__label">
				<input
					v-model="showSourceIcons"
					type="checkbox"
					class="show-revert-risk-card__input"
				/>
				<span class="show-revert-risk-card__text">Source icon</span>
			</label>
			<label class="show-revert-risk-card__label">
				<input
					v-model="showSourceSubtitles"
					type="checkbox"
					class="show-revert-risk-card__input"
				/>
				<span class="show-revert-risk-card__text">Source subtitle</span>
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
			:related-changes-ratio="relatedChangesRatio"
			:related-changes-rec-percent="relatedChangesRecPercent"
			:feed-cap="10"
			:hide-description="true"
		/>
	</section>
</template>

<script setup lang="ts">
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { CdxLabel, CdxSelect } from "@wikimedia/codex"
import {
	pagesAndUsersSliderId,
	recentChangesSliderId,
	relatedChangesRecPercentSliderId,
	relatedChangesSliderId,
	sourceOptions,
	useReviewChangesModule,
} from "./useReviewChangesModule"

const {
	feedSource,
	recentChangesRatio,
	pagesAndUsersRatio,
	relatedChangesRatio,
	relatedChangesRecPercent,
	showRevertRiskInFeed,
	showDelta,
	showSourceIcons,
	showSourceSubtitles,
} = useReviewChangesModule()
</script>

<style scoped>
@import "./style.css";
</style>
