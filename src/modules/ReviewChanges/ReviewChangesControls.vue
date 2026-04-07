<template>
	<div class="review-changes-controls">
		<div class="review-changes-controls__checkboxes">
			<div
				v-for="section in checkboxSections"
				:key="section.title"
				class="review-changes-controls__section"
				role="group"
				:aria-label="section.title"
			>
				<div class="review-changes-controls__section-title">{{ section.title }}</div>
				<div
					v-if="section.title === 'Source'"
					class="review-changes-controls__section-widget"
				>
					<CdxSelect
						:id="reviewChangesSourceId"
						v-model:selected="feedSource"
						:menu-items="sourceOptions"
						aria-label="Feed source"
					/>
				</div>
				<div
					v-if="section.title === 'Source' && feedSource === 'mixed'"
					class="review-changes-controls__section-widget ratio-sliders"
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
							:input-id="pagesIveEditedSliderId"
							class="ratio-slider-label"
							title="Pages you've edited %"
							>Pages you've edited</CdxLabel
						>
						<div class="ratio-slider-line">
							<input
								:id="pagesIveEditedSliderId"
								v-model.number="mixedPagesIveEditedRatio"
								type="range"
								min="0"
								max="100"
								step="10"
								class="ratio-slider"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ mixedPagesIveEditedRatio }}%</span
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
					class="review-changes-controls__section-widget ratio-sliders ratio-sliders--standalone"
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
						v-if="feedSource === 'pagesIveEdited'"
						class="ratio-slider-row"
						role="group"
						aria-label="Show ratio"
					>
						<div class="ratio-slider-line">
							<input
								:id="pagesIveEditedSliderId"
								v-model.number="standalonePagesIveEditedRatio"
								type="range"
								min="0"
								max="100"
								step="10"
								class="ratio-slider"
								aria-label="Pages you've edited %"
							/>
							<span class="ratio-slider-value" aria-hidden="true"
								>{{ standalonePagesIveEditedRatio }}%</span
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
				<div
					v-if="section.title === 'Timestamp'"
					class="review-changes-controls__section-widget"
				>
					<CdxSelect
						:id="timestampPositionId"
						v-model:selected="timestampPosition"
						:menu-items="timestampPositionOptions"
						aria-label="Timestamp position"
					/>
				</div>
				<div class="review-changes-controls__section-checkboxes">
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
		<div class="review-changes-controls__buttons">
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
	REVIEW_CHANGES_CHECKBOX_CONFIG,
	collaboratorsSliderId,
	pagesIveEditedSliderId,
	pagesAndUsersLatestSliderId,
	pagesAndUsersSliderId,
	recentChangesSliderId,
	relatedChangesSliderId,
	reviewChangesSourceId,
	sourceOptions,
	timestampPositionId,
	timestampPositionOptions,
	useReviewChangesModule,
} from "./useReviewChangesModule"
import { useReviewChangesProgress } from "./useReviewChangesProgress"

const props = withDefaults(
	defineProps<{
		/** When true, show prototype-only controls (e.g. Module border) at the top. Use in dashboard context. */
		showPrototypeOnlyControls?: boolean
	}>(),
	{ showPrototypeOnlyControls: false }
)

const module = useReviewChangesModule()
const { completeProgress, resetProgress } = useReviewChangesProgress()
const { resetToDefaults } = module

const visibleCheckboxes = computed(() =>
	REVIEW_CHANGES_CHECKBOX_CONFIG.filter(
		item => !("prototypeOnly" in item && item.prototypeOnly) || props.showPrototypeOnlyControls
	)
)

const SECTION_ORDER = [
	"Structured information",
	"Source",
	"Flag types",
	"Flag appearance",
	"User",
	"Timestamp",
	"Edit summary",
	"Actions",
	"Open state",
	"Module",
] as const

const checkboxSections = computed(() => {
	const bySection = new Map<string, typeof visibleCheckboxes.value>()
	for (const item of visibleCheckboxes.value) {
		const section = "section" in item ? (item.section as string) : "Other"
		if (!bySection.has(section)) {
			bySection.set(section, [])
		}
		bySection.get(section)!.push(item)
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
	timestampPosition,
	mixedRecentChangesRatio,
	mixedPagesAndUsersRatio,
	mixedPagesAndUsersLatestRatio,
	mixedPagesIveEditedRatio,
	mixedCollaboratorsRatio,
	mixedRelatedChangesRatio,
	standaloneRecentChangesRatio,
	standalonePagesAndUsersRatio,
	standalonePagesAndUsersLatestRatio,
	standalonePagesIveEditedRatio,
	standaloneCollaboratorsRatio,
	standaloneRelatedChangesRatio,
} = module
</script>

<style scoped>
@import "./style.css";
</style>
