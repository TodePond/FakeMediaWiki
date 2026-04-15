<template>
	<RecentChangeCardShell :href="changeUrl" :title="item.pageName || '(no page)'" :faded="faded">
		<template #meta>
			<span class="feed-card__user">
				<CdxIcon :icon="cdxIconUserAvatar" size="x-small" />
				<span>{{ item.user.name }}</span>
			</span>
			<span>{{ formatTimestamp(item.timestamp) }}</span>
		</template>
		<template v-if="formattedSummary" #summary>
			<div class="feed-card__summary-content">{{ formattedSummary }}</div>
		</template>
		<template #infoBoxes>
			<div v-if="sourceLabelList.length > 0" class="info-box">
				change sources: {{ sourceLabelList.join(", ") }}
			</div>
			<div v-if="pageSourceLabels.length > 0" class="info-box">
				page sources: {{ pageSourceLabels.join(", ") }}
			</div>
			<div v-if="item.pageScore !== undefined" class="info-box">
				page score: {{ item.pageScore.toFixed(2) }}
			</div>
			<div v-if="searchQueryRankLabel" class="info-box">
				{{ searchQueryRankLabel }}
			</div>
			<div v-if="relatedToPages.length > 0" class="info-box">
				related to: {{ relatedToPages.join(", ") }}
			</div>
			<div v-if="relationshipTypeCounts.length > 0" class="info-box">
				link types: {{ relationshipTypeCounts.join(", ") }}
			</div>
			<div v-if="item.priorityScore !== undefined" class="info-box">
				change score: {{ item.priorityScore.toFixed(2) }}
			</div>
			<template v-if="showMetrics">
				<div class="info-box">revert risk: {{ toPercentLabel(item.revertRisk) }}</div>
				<div class="info-box">tone: {{ toSignedPercentLabel(item.toneProbability) }}</div>
				<div class="info-box">
					reference need: {{ toSignedPercentLabel(item.referenceNeedDelta) }}
				</div>
			</template>
		</template>
	</RecentChangeCardShell>
</template>

<script setup lang="ts">
import { CdxIcon } from "@wikimedia/codex"
import { cdxIconUserAvatar } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import { computed } from "vue"
import RecentChangeCardShell from "./RecentChangeCardShell.vue"

type FeedDisplayItem = {
	id: number
	pageName?: string
	timestamp: string
	user: { name: string }
	comment?: string
	sourceId?: string
	sourceIds?: string[]
	recommendationSourcePageNames?: string[]
	pageSourceLabels?: string[]
	pageScore?: number
	moreLikeRanks?: Partial<
		Record<
			| "moreLikeWatchPages"
			| "moreLikeBookmarkPages"
			| "moreLikeEditedPages"
			| "moreLikeDiscussedPages"
			| "moreLikeInteractedPages",
			number
		>
	>
	relatedSeedLinks?: Array<{
		pageName: string
		linkType: "to" | "from" | "both"
	}>
	priorityScore?: number
	revertRisk?: number | null
	toneProbability?: number | null
	referenceNeedDelta?: number | null
}

const props = defineProps<{
	item: FeedDisplayItem
	faded?: boolean
	showMetrics?: boolean
}>()
const wiki = new FakeWiki()

const SOURCE_LABELS: Record<string, string> = {
	recentRisky: "recent risky",
	fromSelectedPages: "changes from selected pages",
	relatedToSelectedPages: "changes related to selected pages",
}

const sourceLabelList = computed(() => {
	const raw = props.item.sourceIds?.length
		? props.item.sourceIds
		: props.item.sourceId
			? [props.item.sourceId]
			: []
	return raw.map(id => SOURCE_LABELS[id] ?? id)
})

const relatedToPages = computed(() => {
	const pages = props.item.recommendationSourcePageNames ?? []
	return [...new Set(pages)].filter(Boolean)
})

const pageSourceLabels = computed(() => {
	const labels = props.item.pageSourceLabels ?? []
	return [...new Set(labels)].filter(Boolean)
})

const MORE_LIKE_SOURCE_LABELS = {
	moreLikeWatchPages: "more like pages I watch",
	moreLikeBookmarkPages: "more like pages I've bookmarked",
	moreLikeEditedPages: "more like pages I've edited",
	moreLikeDiscussedPages: "more like pages I've discussed",
	moreLikeInteractedPages: "more like pages I've interacted with",
} as const

const searchQueryRankLabel = computed(() => {
	const entries = Object.entries(props.item.moreLikeRanks ?? {}) as Array<
		[keyof typeof MORE_LIKE_SOURCE_LABELS, number]
	>
	if (entries.length === 0) return null
	if (entries.length === 1) {
		return `search query rank: #${entries[0][1]}`
	}
	return `search query ranks: ${entries
		.map(([stepId, rank]) => `${MORE_LIKE_SOURCE_LABELS[stepId]} #${rank}`)
		.join(", ")}`
})

const RELATIONSHIP_TYPE_LABELS: Record<"to" | "from" | "both", string> = {
	to: "outlink",
	from: "backlink",
	both: "bidirectional",
}

const relationshipTypeCounts = computed(() => {
	const links = props.item.relatedSeedLinks ?? []
	const counts = new Map<"to" | "from" | "both", number>()
	for (const link of links) {
		counts.set(link.linkType, (counts.get(link.linkType) ?? 0) + 1)
	}
	const orderedTypes: Array<"both" | "to" | "from"> = ["both", "to", "from"]
	return orderedTypes
		.map(type => {
			const count = counts.get(type) ?? 0
			if (count === 0) return null
			const label = RELATIONSHIP_TYPE_LABELS[type]
			return count === 1 ? `1 ${label}` : `${count} ${label} links`
		})
		.filter((value): value is string => value !== null)
})

const changeUrl = computed(() => {
	const pageName = props.item.pageName?.trim() || "Special:RecentChanges"
	return wiki.getRevisionUrl(props.item.id, pageName)
})

const formattedSummary = computed(() => {
	const rawComment = (props.item.comment ?? "").trim()
	if (!rawComment) return ""
	const sectionFromRaw = rawComment.match(/^\/\*\s*(.*?)\s*\*\/\s*(.*)$/)
	if (sectionFromRaw) {
		const sectionHeading = sectionFromRaw[1]?.trim() ?? ""
		const trailingText = sectionFromRaw[2]?.trim() ?? ""
		return trailingText ? `→${sectionHeading}: ${trailingText}` : `→${sectionHeading}`
	}
	const pageName = props.item.pageName ?? ""
	const preprocessed = wiki.preprocessEditSummary(rawComment, pageName)
	const toolbar = wiki.parseToolbarEditSummary(preprocessed)
	const commentPart = (toolbar?.comment ?? preprocessed).trim()
	let text = commentPart
		.replace(/\[\[[^|\]]*\|([^\]]+)\]\]/g, "$1")
		.replace(/\[\[([^\]]+)\]\]/g, "$1")
		.trim()
	// If section arrow is followed by text without punctuation, normalize to "→Section: Text".
	const sectionWithTail = text.match(/^(→[^:]+?)\s+(.+)$/)
	if (sectionWithTail) {
		text = `${sectionWithTail[1]}: ${sectionWithTail[2]}`
	}
	return text
})

function toPercentLabel(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return "n/a"
	return `${Math.round(value * 100)}%`
}

function toSignedPercentLabel(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return "n/a"
	const percent = Math.round(Math.abs(value) * 100)
	return `${value >= 0 ? "+" : "-"}${percent}%`
}

function formatTimestamp(timestamp: string): string {
	if (!timestamp) return "-"
	const date = new Date(timestamp)
	const nowMs = Date.now()
	const diffMs = Math.max(0, nowMs - date.getTime())
	const minuteMs = 60 * 1000
	const hourMs = 60 * minuteMs
	const dayMs = 24 * hourMs
	const weekMs = 7 * dayMs
	const monthMs = 30 * dayMs
	const yearMs = 365 * dayMs
	if (diffMs < minuteMs) return "just now"
	if (diffMs < hourMs) {
		const minutes = Math.floor(diffMs / minuteMs)
		return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
	}
	if (diffMs < dayMs) {
		const hours = Math.floor(diffMs / hourMs)
		return `${hours} hour${hours === 1 ? "" : "s"} ago`
	}
	if (diffMs < weekMs) {
		const days = Math.floor(diffMs / dayMs)
		return `${days} day${days === 1 ? "" : "s"} ago`
	}
	if (diffMs < monthMs) {
		const weeks = Math.floor(diffMs / weekMs)
		return `${weeks} week${weeks === 1 ? "" : "s"} ago`
	}
	if (diffMs < yearMs) {
		const months = Math.floor(diffMs / monthMs)
		return `${months} month${months === 1 ? "" : "s"} ago`
	}
	const years = Math.floor(diffMs / yearMs)
	return `${years} year${years === 1 ? "" : "s"} ago`
}
</script>

<style scoped>
.feed-card__user {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-weight: var(--font-weight-bold);
}
</style>
