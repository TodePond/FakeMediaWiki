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
		<div class="review-changes-controls__row">
			<CdxLabel :input-id="timestampPositionId">Timestamp position</CdxLabel>
			<CdxSelect
				:id="timestampPositionId"
				v-model:selected="timestampPosition"
				:menu-items="timestampPositionOptions"
			/>
		</div>
		<div class="review-changes-controls__row">
			<CdxLabel :input-id="reviewChangesSourceId">Feed source</CdxLabel>
			<CdxSelect
				:id="reviewChangesSourceId"
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
				<CdxLabel :input-id="pagesAndUsersLatestSliderId">Watchlist (latest) %</CdxLabel>
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
				<CdxLabel :input-id="collaboratorsSliderId">Collaborators %</CdxLabel>
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
				<CdxLabel :input-id="relatedChangesSliderId">Related changes %</CdxLabel>
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
				<CdxLabel :input-id="recentChangesSliderId">Recent changes %</CdxLabel>
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
		<template v-if="feedSource === 'pagesAndUsersLatest'">
			<div class="review-changes-controls__row" role="group" aria-label="Show ratio">
				<CdxLabel :input-id="pagesAndUsersLatestSliderId">Watchlist (latest) %</CdxLabel>
				<div class="ratio-slider-line">
					<input
						:id="pagesAndUsersLatestSliderId"
						v-model.number="standalonePagesAndUsersLatestRatio"
						type="range"
						min="0"
						max="100"
						step="10"
						class="ratio-slider"
					/>
					<span class="ratio-slider-value" aria-hidden="true"
						>{{ standalonePagesAndUsersLatestRatio }}%</span
					>
				</div>
			</div>
		</template>
		<template v-if="feedSource === 'pagesAndUsers'">
			<div class="review-changes-controls__row" role="group" aria-label="Show ratio">
				<CdxLabel :input-id="pagesAndUsersSliderId">Watchlist %</CdxLabel>
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
				<CdxLabel :input-id="collaboratorsSliderId">Collaborators %</CdxLabel>
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
				<CdxLabel :input-id="relatedChangesSliderId">Related changes %</CdxLabel>
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
		<div class="review-changes-controls__buttons">
			<CdxButton @click="resetProgress">Reset progress</CdxButton>
			<CdxButton @click="resetToDefaults">Reset config</CdxButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { CdxButton, CdxCheckbox, CdxLabel, CdxSelect } from "@wikimedia/codex"
import { computed } from "vue"
import {
	REVIEW_CHANGES_CHECKBOX_CONFIG,
	collaboratorsSliderId,
	pagesAndUsersSliderId,
	pagesAndUsersLatestSliderId,
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
const { resetProgress } = useReviewChangesProgress()
const { resetToDefaults } = module

const visibleCheckboxes = computed(() =>
	REVIEW_CHANGES_CHECKBOX_CONFIG.filter(
		item => !("prototypeOnly" in item && item.prototypeOnly) || props.showPrototypeOnlyControls
	)
)

const SECTION_ORDER = [
	"Structured information",
	"Source",
	"Revert risk",
	"User & flags",
	"Timestamp",
	"Edit summary",
	"Actions",
	"Viewing state",
	"Layout",
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
