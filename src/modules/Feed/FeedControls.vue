<template>
	<div class="feed-controls">
		<div class="feed-controls__checkboxes">
			<div
				v-for="section in checkboxSections"
				:key="section.title"
				class="feed-controls__section"
				role="group"
				:aria-label="section.title"
			>
				<div class="feed-controls__section-title">{{ section.title }}</div>
				<div
					v-if="section.title === 'Source'"
					class="feed-controls__section-widget"
				>
					<CdxSelect
						:id="feedSourceId"
						v-model:selected="feedSource"
						:menu-items="sourceOptions"
						aria-label="Feed source"
					/>
				</div>
				<div
					v-if="section.title === 'Source' && feedSource === 'mixed'"
					class="feed-controls__section-widget ratio-sliders"
				>
					<div class="ratio-slider-row" role="group" aria-label="Mix ratio">
						<CdxLabel
							:input-id="recentChangesSliderId"
							class="ratio-slider-label"
							title="Risky %"
							>Risky</CdxLabel
						>
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
					<div class="ratio-slider-row" role="group" aria-label="Mix ratio">
						<CdxLabel
							:input-id="pagesAndUsersLatestSliderId"
							class="ratio-slider-label"
							title="Watchlist (latest) %"
							>WL latest</CdxLabel
						>
						<div class="ratio-slider-line">
							<input
								:id="pagesAndUsersLatestSliderId"
								v-model.number="mixedPagesAndUsersLatestRatio"
								type="range"
								min="0"
								max="100"
								step="10"
								class="ratio-slider"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ mixedPagesAndUsersLatestRatio }}%</span
							>
						</div>
					</div>
					<div class="ratio-slider-row" role="group" aria-label="Mix ratio">
						<CdxLabel
							:input-id="pagesAndUsersSliderId"
							class="ratio-slider-label"
							title="Watchlist %"
							>Watchlist</CdxLabel
						>
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
					<div class="ratio-slider-row" role="group" aria-label="Mix ratio">
						<CdxLabel
							:input-id="collaboratorsSliderId"
							class="ratio-slider-label"
							title="Mentor %"
							>Mentor</CdxLabel
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
					<div class="ratio-slider-row" role="group" aria-label="Mix ratio">
						<CdxLabel
							:input-id="relatedChangesSliderId"
							class="ratio-slider-label"
							title="Related changes %"
							>Related</CdxLabel
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
				</div>
				<div
					v-if="section.title === 'Source' && feedSource !== 'mixed'"
					class="feed-controls__section-widget ratio-sliders ratio-sliders--standalone"
				>
					<div
						v-if="feedSource === 'recentChanges'"
						class="ratio-slider-row"
						role="group"
						aria-label="Show ratio"
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
								aria-label="Risky %"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ standaloneRecentChangesRatio }}%</span
							>
						</div>
					</div>
					<div
						v-if="feedSource === 'pagesAndUsersLatest'"
						class="ratio-slider-row"
						role="group"
						aria-label="Show ratio"
					>
						<div class="ratio-slider-line">
							<input
								:id="pagesAndUsersLatestSliderId"
								v-model.number="standalonePagesAndUsersLatestRatio"
								type="range"
								min="0"
								max="100"
								step="10"
								class="ratio-slider"
								aria-label="Watchlist (latest) %"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ standalonePagesAndUsersLatestRatio }}%</span
							>
						</div>
					</div>
					<div
						v-if="feedSource === 'pagesAndUsers'"
						class="ratio-slider-row"
						role="group"
						aria-label="Show ratio"
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
								aria-label="Watchlist %"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ standalonePagesAndUsersRatio }}%</span
							>
						</div>
					</div>
					<div
						v-if="feedSource === 'collaborators'"
						class="ratio-slider-row"
						role="group"
						aria-label="Show ratio"
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
								aria-label="Mentor %"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ standaloneCollaboratorsRatio }}%</span
							>
						</div>
					</div>
					<div
						v-if="feedSource === 'relatedChanges'"
						class="ratio-slider-row"
						role="group"
						aria-label="Show ratio"
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
								aria-label="Related changes %"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ standaloneRelatedChangesRatio }}%</span
							>
							</div>
					</div>
				</div>
				<div class="feed-controls__section-checkboxes">
					<CdxCheckbox
						v-for="item in section.items"
						:key="item.key"
						:model-value="getCheckboxValue(item.key)"
						@update:model-value="setCheckboxValue(item.key, $event)"
					>
						{{ item.label }}
					</CdxCheckbox>
				</div>
			</div>
		</div>
		<div class="feed-controls__buttons">
			<CdxButton @click="resetProgress">Reset progress</CdxButton>
			<CdxButton @click="resetToDefaults">Reset config</CdxButton>
			<CdxButton @click="completeProgress">Complete progress</CdxButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { CdxButton, CdxCheckbox, CdxLabel, CdxSelect } from "@wikimedia/codex"
import { computed } from "vue"
import {
	FEED_CHECKBOX_CONFIG,
	collaboratorsSliderId,
	feedSourceId,
	pagesAndUsersLatestSliderId,
	pagesAndUsersSliderId,
	recentChangesSliderId,
	relatedChangesSliderId,
	sourceOptions,
	useFeedModule,
} from "./useFeedModule"
import { useReviewChangesProgress } from "@/modules/ReviewChanges/useReviewChangesProgress"

const module = useFeedModule()
const { completeProgress, resetProgress } = useReviewChangesProgress()
const { resetToDefaults } = module

const SECTION_ORDER = ["Source", "Flag types"] as const

const checkboxSections = computed(() => {
	const bySection = new Map<string, (typeof FEED_CHECKBOX_CONFIG)[number][]>()
	for (const item of FEED_CHECKBOX_CONFIG) {
		const section = "section" in item ? (item.section as string) : "Other"
		if (!bySection.has(section)) {
			bySection.set(section, [])
		}
		bySection.get(section)!.push(item)
	}
	// Always include Source section (feed source dropdown + ratio sliders) even if no checkbox items
	if (!bySection.has("Source")) {
		bySection.set("Source", [])
	}
	return SECTION_ORDER.filter(title => bySection.has(title)).map(title => ({
		title,
		items: bySection.get(title)!,
	}))
})

function getCheckboxValue(key: string): boolean {
	const ref = module[key as keyof typeof module]
	return typeof ref === "object" && ref !== null && "value" in ref
		? (ref as { value: boolean }).value
		: false
}

function setCheckboxValue(key: string, value: boolean): void {
	const ref = module[key as keyof typeof module]
	if (typeof ref === "object" && ref !== null && "value" in ref) {
		;(ref as { value: boolean }).value = value
	}
}

const {
	feedSource,
	mixedRecentChangesRatio,
	mixedPagesAndUsersRatio,
	mixedPagesAndUsersLatestRatio,
	mixedCollaboratorsRatio,
	mixedRelatedChangesRatio,
	standaloneRecentChangesRatio,
	standalonePagesAndUsersRatio,
	standalonePagesAndUsersLatestRatio,
	standaloneCollaboratorsRatio,
	standaloneRelatedChangesRatio,
} = module
</script>

<style scoped>
@import "./style.css";
</style>
