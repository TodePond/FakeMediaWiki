<template>
	<a :href="changeUrl" target="_blank" rel="noreferrer" class="feed-card-link">
		<article class="feed-card" :class="{ 'feed-card--faded': faded }">
			<div class="feed-card__title">{{ item.pageName || "(no page)" }}</div>
			<div class="feed-card__meta">
				<span class="feed-card__user">
					<CdxIcon :icon="cdxIconUserAvatar" size="x-small" />
					<span>{{ item.user.name }}</span>
				</span>
				<span>{{ formatTimestamp(item.timestamp) }}</span>
			</div>
			<div v-if="formattedSummary" class="feed-card__summary">{{ formattedSummary }}</div>
			<div class="info-boxes">
				<div v-if="sourceLabelList.length > 0" class="info-box">
					sources: {{ sourceLabelList.join(", ") }}
				</div>
				<div v-if="relatedToPages.length > 0" class="info-box">
					related to: {{ relatedToPages.join(", ") }}
				</div>
				<div v-if="item.priorityScore !== undefined" class="info-box">
					priority {{ item.priorityScore.toFixed(2) }}
				</div>
				<template v-if="showMetrics">
					<div class="info-box">revert risk: {{ toPercentLabel(item.revertRisk) }}</div>
					<div class="info-box">
						tone: {{ toSignedPercentLabel(item.toneProbability) }}
					</div>
					<div class="info-box">
						reference need: {{ toSignedPercentLabel(item.referenceNeedDelta) }}
					</div>
				</template>
			</div>
		</article>
	</a>
</template>

<script setup lang="ts">
import { CdxIcon } from "@wikimedia/codex"
import { cdxIconUserAvatar } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import { computed } from "vue"

type FeedDisplayItem = {
	id: number
	pageName?: string
	timestamp: string
	user: { name: string }
	comment?: string
	sourceId?: string
	sourceIds?: string[]
	recommendationSourcePageNames?: string[]
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
	watchlistLatest: "watchlist latest",
	pagesIEditedByOthers: "pages I edited",
	relatedChanges: "related changes",
	relatedToEdits: "related to edits",
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
.feed-card-link {
	display: block;
	text-decoration: none;
	color: inherit;
}

.feed-card-link:visited,
.feed-card-link:hover,
.feed-card-link:active {
	color: inherit;
}

.feed-card {
	padding: 10px;
	display: flex;
	flex-direction: column;
	border-radius: 2px;
	gap: 0px;
	background: var(--background-color-base, #fff);
	font-size: var(--font-size-small);
	line-height: var(--line-height-small);
	color: var(--color-emphasized);
}

.feed-card-link:hover .feed-card,
.feed-card-link:focus-visible .feed-card {
	border: 1px solid var(--border-color-subtle);
	margin: -1px;
}

.feed-card--faded {
	/* opacity: 0.8; */
	background: var(--background-color-neutral-subtle);
	color: var(--color-subtle);
}

.feed-card--faded .feed-card__user {
	color: var(--color-subtle);
	font-weight: var(--font-weight-normal);
}

.feed-card--faded .cdx-icon {
	color: var(--color-subtle);
}

.feed-card__title {
	font-weight: 600;
}

.feed-card__meta {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.feed-card__user {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-weight: var(--font-weight-bold);
}

.feed-card__summary {
	padding-top: 2px;
	padding-bottom: 8px;
}

.info-boxes {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding-top: 6px;
}

.info-box {
	padding: 0px 6px;
	border: 1px solid var(--border-color-subtle, #c8ccd1);
	border-radius: 2px;
	font-size: 12px;
}
</style>
