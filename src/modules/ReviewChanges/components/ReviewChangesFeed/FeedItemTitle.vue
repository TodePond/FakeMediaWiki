<template>
	<span class="review-changes__page-cell-heading review-changes__page-cell-heading--unified">
		<span class="review-changes__page-title-group">
			<CdxIcon
				v-if="showSourceIcons && itemSource"
				:icon="sourceIcon"
				size="x-small"
				:class="[
					'review-changes__source-icon',
					`review-changes__source-icon--${itemSource}`,
				]"
				:aria-label="sourceIconLabel"
			/>
			<span class="review-changes__page">{{ pageName }}</span>
			<span
				v-if="showShortDescription && pageName && shortDescription"
				class="review-changes__short-desc"
				:class="{
					'review-changes__short-desc--no-separator': !showShortDescriptionSeparator,
				}"
			>
				{{ shortDescription }}
			</span>
		</span>
		<time
			v-if="formattedTimestamp"
			:datetime="timestamp"
			class="review-changes__time"
		>
			{{ formattedTimestamp }}
		</time>
	</span>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { CdxIcon } from "@wikimedia/codex"
import {
	cdxIconClock,
	cdxIconEdit,
	cdxIconLightbulb,
	cdxIconUnStar,
	cdxIconUserAvatar,
} from "@wikimedia/codex-icons"

export type ItemSource =
	| "recentChanges"
	| "pagesAndUsers"
	| "pagesAndUsersLatest"
	| "pagesIveEdited"
	| "relatedChanges"
	| "collaborators"

const props = withDefaults(
	defineProps<{
		pageName: string
		shortDescription?: string | null
		timestamp?: string
		formattedTimestamp?: string
		itemSource?: ItemSource
		showSourceIcons?: boolean
		showShortDescription?: boolean
		showShortDescriptionSeparator?: boolean
	}>(),
	{
		shortDescription: null,
		showSourceIcons: false,
		showShortDescription: false,
		showShortDescriptionSeparator: false,
	}
)

const sourceIcon = computed(() => {
	if (!props.itemSource) return cdxIconClock
	switch (props.itemSource) {
		case "pagesAndUsers":
		case "pagesAndUsersLatest":
			return cdxIconUnStar
		case "relatedChanges":
			return cdxIconLightbulb
		case "collaborators":
			return cdxIconUserAvatar
		case "pagesIveEdited":
			return cdxIconEdit
		default:
			return cdxIconClock
	}
})

const sourceIconLabel = computed(() => {
	if (!props.itemSource) return ""
	switch (props.itemSource) {
		case "pagesAndUsers":
			return "Watchlist"
		case "pagesAndUsersLatest":
			return "Watchlist (latest revision)"
		case "relatedChanges":
			return "Related changes"
		case "collaborators":
			return "Mentor"
		case "pagesIveEdited":
			return "Pages you have edited"
		default:
			return "Risky"
	}
})
</script>
