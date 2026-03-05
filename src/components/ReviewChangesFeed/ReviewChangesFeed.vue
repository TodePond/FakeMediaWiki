<template>
	<section class="review-changes">
		<div v-if="title" class="review-changes__title">{{ title }}</div>
		<p
			class="review-changes__description"
			:class="{ 'review-changes__description--with-title': !!title }"
		>
			Help keep Wikipedia reliable by reviewing the following edits which may need
			attention.
		</p>
		<div v-if="errors.length > 0" class="review-changes__errors">
			<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
		</div>
		<div v-if="isLoading" class="review-changes__loading">
			<CdxProgressBar inline />
		</div>
		<ul v-else class="review-changes__feed">
			<template v-for="dateGroup in revisionsByDateCapped" :key="dateGroup.dateKey">
				<li
					v-for="change in dateGroup.revisions"
					:key="`${change.pageName}-${change.timestamp}-${change.id}`"
					class="review-changes__item"
				>
					<a
						:href="
							change.pageName
								? wiki.getRevisionUrl(change.id, change.pageName)
								: '#'
						"
						target="_blank"
						rel="noopener noreferrer"
						class="review-changes__item-link"
						:aria-label="`View diff for ${change.pageName ?? 'page'}`"
					>
						<div class="review-changes__item-header">
							<span class="review-changes__page-cell">
								<CdxIcon
									v-if="showSourceIcons && getItemSource(change)"
									:icon="getItemSource(change) === 'pagesAndUsers' ? cdxIconUnStar : cdxIconClock"
									size="x-small"
									:class="[
										'review-changes__source-icon',
										`review-changes__source-icon--${getItemSource(change)}`,
									]"
									:aria-label="getItemSource(change) === 'pagesAndUsers' ? 'Watchlist' : 'Recent changes'"
								/>
								<span class="review-changes__page">{{ change.pageName }}</span>
							</span>
							<time :datetime="change.timestamp" class="review-changes__time">
								{{ formatTime(change.timestamp) }},
								{{ formatTimeLabel(change.timestamp) }}
							</time>
						</div>
						<div
							v-if="showSourceSubtitles && getItemSource(change)"
							class="review-changes__source-subtitle"
						>
							{{ getItemSource(change) === 'pagesAndUsers' ? 'From your watchlist' : 'From recent changes' }}
						</div>
						<div class="review-changes__summary">
							<template v-if="showDelta">
								<span
									class="review-changes__summary-prefix"
									:class="wiki.getDeltaClass(change.delta ?? 0, false)"
									>{{ formatDelta(change.delta) }}</span
								>
								<span
									v-if="change?.summary?.comment || change?.comment"
									class="review-changes__summary-sep"
									aria-hidden="true"
									>&nbsp;·</span
								>
							</template><span
								v-if="change?.summary?.comment"
								class="review-changes__comment"
								v-html="change.summary.comment"
							></span
							><span
								v-else-if="change?.comment"
								class="review-changes__comment"
								>{{ change.comment }}</span
							>
						</div>
						<a
							target="_blank"
							rel="noopener noreferrer"
							:href="wiki.getUserUrl(change.user.name)"
							class="review-changes__user"
							@click.stop
						>
							{{ change.user.name }}
						</a>
						<span
							v-if="showRevertRisk"
							class="review-changes__revert-risk"
						>
							<span
								v-for="line in getRevertRiskLines(change.id)"
								:key="line.label"
								class="review-changes__revert-risk-line"
								:class="{
									'review-changes__revert-risk-line--loading': line.value === '(loading)',
									'review-changes__revert-risk-line--error': line.value === '(error)' || line.value === '(missing)',
								}"
								>{{ line.label }}: {{ line.value }}</span
							>
						</span>
					</a>
				</li>
			</template>
		</ul>
		<div
			v-if="
				!isLoading &&
				(props.source === 'recentChanges' ||
					(props.source === 'mixed' && (props.recentChangesRatio ?? 50) > 0))
			"
			class="review-changes__view-more"
		>
			View more edits in the
			<a
				target="_blank"
				rel="noopener noreferrer"
				:href="wiki.getPageUrl('Special:RecentChanges')"
				class="review-changes__view-more-link"
				>recent changes page</a
			>.
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxIcon, CdxProgressBar } from "@wikimedia/codex"
import { cdxIconClock, cdxIconUnStar } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type {
	FWLiftWingPrediction,
	FWPageHistoryRevision,
	FWPredictionByModel,
	FWRevision,
} from "fakewiki/types"
import { computed, onMounted, ref, watch } from "vue"

export type ReviewChangesSource = "recentChanges" | "pagesAndUsers" | "mixed"

export type ItemSource = "recentChanges" | "pagesAndUsers"

const props = withDefaults(
	defineProps<{
		showRevertRisk: boolean
		showSourceIcons?: boolean
		showSourceSubtitles?: boolean
		showDelta?: boolean
		source?: ReviewChangesSource
		/** 0–100, used when source is "mixed". 0 = exclude recent changes. */
		recentChangesRatio?: number
		/** 0–100, used when source is "mixed". 0 = exclude pages/users. */
		pagesAndUsersRatio?: number
		title?: string
	}>(),
	{ showSourceIcons: false, showSourceSubtitles: false, showDelta: true, source: "recentChanges", recentChangesRatio: 50, pagesAndUsersRatio: 50 }
)

const wiki = new FakeWiki()

const revertRiskByRevId = ref<Map<number, FWPredictionByModel | { error: true }>>(new Map())
const isLoadingRevertRisk = ref(false)

const REVERT_RISK_MODELS = [
	{ key: "revertrisk" as const, label: "Revert risk (language-agnostic)" },
	{ key: "revertrisk-multilingual" as const, label: "Revert risk (multilingual)" },
]

function formatRevertRiskPercent(prediction: FWLiftWingPrediction): number {
	const p = prediction.probability?.true
	return typeof p === "number" ? Math.round(p * 100) : 0
}

function getRevertRiskLines(revId: number): Array<{ label: string; value: string }> {
	if (isLoadingRevertRisk.value) {
		return REVERT_RISK_MODELS.map(m => ({ label: m.label, value: "(loading)" }))
	}
	const entry = revertRiskByRevId.value.get(revId)
	if (!entry) {
		return REVERT_RISK_MODELS.map(m => ({ label: m.label, value: "(loading)" }))
	}
	if ("error" in entry && entry.error) {
		return REVERT_RISK_MODELS.map(m => ({ label: m.label, value: "(error)" }))
	}
	const byModel = entry as FWPredictionByModel
	return REVERT_RISK_MODELS.map(m => {
		const pred = byModel[m.key]
		const value = pred
			? `${formatRevertRiskPercent(pred)}%`
			: "(missing)"
		return { label: m.label, value }
	})
}

async function fetchRevertRiskForFeed(): Promise<void> {
	const revs = selectedRevisionsForDisplay.value
	if (revs.length === 0) return
	const revIds = revs.map(r => r.id)
	isLoadingRevertRisk.value = true
	revertRiskByRevId.value = new Map()
	try {
		const predictions = await wiki.getRevisionPredictions(revIds, [
			"revertrisk",
			"revertrisk-multilingual",
		])
		const next = new Map<number, FWPredictionByModel | { error: true }>()
		for (const revId of revIds) {
			const byModel = predictions[revId] ?? {}
			next.set(revId, byModel)
		}
		revertRiskByRevId.value = next
	} catch {
		const next = new Map<number, FWPredictionByModel | { error: true }>()
		for (const revId of revIds) {
			next.set(revId, { error: true })
		}
		revertRiskByRevId.value = next
	} finally {
		isLoadingRevertRisk.value = false
	}
}

const allRevisionsData = ref<FWRevision[]>([])
const selectedRevisions = ref<FWRevision[]>([])
/** Cached data for mixed mode; ratio is applied client-side only */
/** Recent changes split into 4 segments across the watchlist time range; we slice from these in parallel when displaying */
const mixedRecentChangesBySegment = ref<FWRevision[][]>([])
const mixedPagesAndUsersData = ref<FWRevision[]>([])

type RevisionWithSource = FWRevision & { itemSource?: ItemSource }

const NUM_RC_SEGMENTS = 4

function getSelectedRevisionsForDisplay(): RevisionWithSource[] {
	if (props.source !== "mixed") {
		return selectedRevisions.value.map(r => ({ ...r, itemSource: props.source as ItemSource }))
	}
	const rcSegments = mixedRecentChangesBySegment.value // RC0, RC1, RC2, RC3
	const wl = mixedPagesAndUsersData.value
	const rcRatio = Math.max(0, Math.min(100, props.recentChangesRatio ?? 50)) / 100
	const wlRatio = Math.max(0, Math.min(100, props.pagesAndUsersRatio ?? 50)) / 100

	// 0% / 0%: show nothing
	if (rcRatio === 0 && wlRatio === 0) return []

	// Take fraction of each pool: RC0, RC1, RC2, RC3 each get rcRatio; WL gets wlRatio
	const rc0 = (rcSegments[0] ?? []).slice(0, Math.floor((rcSegments[0]?.length ?? 0) * rcRatio))
	const rc1 = (rcSegments[1] ?? []).slice(0, Math.floor((rcSegments[1]?.length ?? 0) * rcRatio))
	const rc2 = (rcSegments[2] ?? []).slice(0, Math.floor((rcSegments[2]?.length ?? 0) * rcRatio))
	const rc3 = (rcSegments[3] ?? []).slice(0, Math.floor((rcSegments[3]?.length ?? 0) * rcRatio))
	const wlSliced = wl.slice(0, Math.floor(wl.length * wlRatio))

	// Round-robin across 5 pools: RC0[0], RC1[0], RC2[0], RC3[0], WL[0], RC0[1], ...
	const pools = [
		rc0.map(r => ({ ...r, itemSource: "recentChanges" as const })),
		rc1.map(r => ({ ...r, itemSource: "recentChanges" as const })),
		rc2.map(r => ({ ...r, itemSource: "recentChanges" as const })),
		rc3.map(r => ({ ...r, itemSource: "recentChanges" as const })),
		wlSliced.map(r => ({ ...r, itemSource: "pagesAndUsers" as const })),
	]
	const maxLen = Math.max(...pools.map(p => p.length))
	const merged: RevisionWithSource[] = []
	for (let i = 0; i < maxLen; i++) {
		for (const pool of pools) {
			if (pool[i]) merged.push(pool[i])
		}
	}
	return merged
}

function getItemSource(change: RevisionWithSource): ItemSource | undefined {
	return change.itemSource
}

const selectedRevisionsForDisplay = computed(() => getSelectedRevisionsForDisplay())

watch(
	() => props.showRevertRisk,
	enabled => {
		if (enabled && selectedRevisionsForDisplay.value.length > 0) {
			fetchRevertRiskForFeed()
		}
	}
)

let revertRiskDebounceId: ReturnType<typeof setTimeout> | null = null
watch(
	() => [selectedRevisionsForDisplay.value.map(r => r.id).join(","), props.showRevertRisk],
	([, enabled]) => {
		if (!enabled || props.source !== "mixed" || selectedRevisionsForDisplay.value.length === 0) {
			return
		}
		if (revertRiskDebounceId) clearTimeout(revertRiskDebounceId)
		revertRiskDebounceId = setTimeout(() => {
			revertRiskDebounceId = null
			fetchRevertRiskForFeed()
		}, 300)
	}
)

const rccontinue = ref<string | undefined>(undefined)
const useNeedsReviewFilter = ref(true)
const isLoading = ref(false)
const errors = ref<string[]>([])

const RECENT_CHANGES_LIMIT = 10

/** Hardcoded pages and users for source="pagesAndUsers" (matches DeltaSnippets / Structured deltas) */
const HARDCODED_PAGE_NAMES = [
	"Confidence Man (band)",
	"Algorave",
	"Little Mix",
	"Gorillaz",
	"Jade Thirlwall",
	"Wet Leg",
]
const HARDCODED_USER_NAMES = ["Todepond", "Samwalton9"]

async function processRevisions(
	revisions: Array<{
		id: number
		timestamp: string
		comment: string
		user: { name: string }
		delta: number | null
		pageName?: string
	}>
): Promise<FWRevision[]> {
	return Promise.all(
		revisions.map(async revision => {
			const pageName =
				(revision as FWPageHistoryRevision & { pageName?: string }).pageName || ""
			const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName)
			const toolbar = wiki.parseToolbarEditSummary(_summary)
			const summary = toolbar
				? toolbar
				: {
						comment: _summary,
						hashtags: [],
						other: [],
						suggestedBy: null,
						useThisBot: null,
						reportBugs: null,
					}
			const commentText = summary.comment
				? summary.comment +
					(summary.suggestedBy
						? " Suggested by [[User:" +
							summary.suggestedBy +
							"|" +
							summary.suggestedBy +
							"]]"
						: "")
				: ""
			summary.comment = commentText
				? await wiki.transformWikitextToHtml(commentText, pageName)
				: ""
			if (summary.comment) {
				summary.comment = stripLinksFromHtml(summary.comment)
			}
			summary.hashtags = Array.isArray(summary.hashtags)
				? summary.hashtags.join(" ")
				: summary.hashtags
			const processedRevision: FWRevision = {
				...revision,
				comment: revision.comment || "",
				summary,
				pageName,
				avatarUrl: null,
			}
			return processedRevision
		})
	)
}

async function loadFeed(append = false): Promise<void> {
	if (!append) {
		isLoading.value = true
		errors.value = []
	}

	try {
		let revisions: Array<{
			id: number
			timestamp: string
			comment: string
			user: { name: string }
			delta: number | null
			pageName?: string
		}>

		if (props.source === "mixed") {
			if (append) {
				isLoading.value = false
				return
			}
			// Fetch watchlist first to get its time range, then fetch recent changes from that same period
			const pagesRevisions = await wiki.getCombinedFeed({
				pageNames: HARDCODED_PAGE_NAMES,
				userNames: HARDCODED_USER_NAMES,
				limit: RECENT_CHANGES_LIMIT,
			})
			const processedPages = await processRevisions(pagesRevisions)
			const sortedPages = processedPages.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			mixedPagesAndUsersData.value = sortedPages

			// Divide time range into 4 segments, query each in parallel
			const LIMIT_PER_QUERY = Math.ceil(RECENT_CHANGES_LIMIT / NUM_RC_SEGMENTS)
			let processedBySegment: FWRevision[][] = []
			let rangeStart: number
			let rangeEnd: number
			if (sortedPages.length > 0) {
				const timestamps = sortedPages.map(r => new Date(r.timestamp).getTime())
				const earliest = Math.min(...timestamps)
				const latest = Math.max(...timestamps)
				const bufferMs = 12 * 60 * 60 * 1000 // 12 hours each direction
				rangeStart = earliest - bufferMs
				rangeEnd = latest + bufferMs
			} else {
				// Watchlist empty: use default range (last 7 days) so we still get 4 segments of RC
				const now = Date.now()
				const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
				rangeEnd = now
				rangeStart = now - sevenDaysMs
			}
			const rangeMs = rangeEnd - rangeStart
			const segmentDuration = rangeMs / NUM_RC_SEGMENTS
			const queries = Array.from({ length: NUM_RC_SEGMENTS }, (_, i) => {
				const segEnd = rangeStart + (i + 1) * segmentDuration
				const segStart = rangeStart + i * segmentDuration
				return {
					rcstart: new Date(segEnd).toISOString(),
					rcend: new Date(segStart).toISOString(),
				}
			})
			const results = await Promise.all(
				queries.map(q =>
					wiki.getRecentChanges({
						limit: LIMIT_PER_QUERY,
						onlyNeedsReview: true,
						rcstart: q.rcstart,
						rcend: q.rcend,
					})
				)
			)
			processedBySegment = await Promise.all(
				results.map(r => processRevisions(r.revisions))
			)
			processedBySegment = processedBySegment.map(seg =>
				seg.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			)
			mixedRecentChangesBySegment.value = processedBySegment
			allRevisionsData.value = []
			selectedRevisions.value = []
			isLoading.value = false
			if (props.showRevertRisk) {
				fetchRevertRiskForFeed()
			}
			return
		}

		if (props.source === "pagesAndUsers") {
			if (append) {
				isLoading.value = false
				return
			}
			revisions = await wiki.getCombinedFeed({
				pageNames: HARDCODED_PAGE_NAMES,
				userNames: HARDCODED_USER_NAMES,
				limit: RECENT_CHANGES_LIMIT,
			})
		} else {
			const onlyNeedsReview = append ? useNeedsReviewFilter.value : true
			const result = await wiki.getRecentChanges({
				limit: RECENT_CHANGES_LIMIT,
				onlyNeedsReview,
				rccontinue: append ? rccontinue.value : undefined,
			})

			revisions = result.revisions
			if (revisions.length === 0 && !append && onlyNeedsReview) {
				throw new Error("No edits that need review were returned. Try again later.")
			}
			rccontinue.value = result.rccontinue
		}

		const processed = await processRevisions(revisions)
		mixedRecentChangesBySegment.value = []
		mixedPagesAndUsersData.value = []

		if (append && props.source === "recentChanges") {
			const existingIds = new Set(allRevisionsData.value.map(r => r.id))
			const newRevisions = processed.filter(r => !existingIds.has(r.id))
			allRevisionsData.value = [...allRevisionsData.value, ...newRevisions].sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
		} else {
			allRevisionsData.value = processed.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
		}

		selectedRevisions.value = allRevisionsData.value

		isLoading.value = false
		if (props.showRevertRisk) {
			fetchRevertRiskForFeed()
		}
	} catch (e) {
		isLoading.value = false
		const errorObj = e as Error
		if (!append) {
			errors.value = [errorObj.message]
			allRevisionsData.value = []
			selectedRevisions.value = []
		}
	}
}

function stripLinksFromHtml(html: string): string {
	if (typeof document === "undefined") return html
	const div = document.createElement("div")
	div.innerHTML = html
	const links = Array.from(div.querySelectorAll("a"))
	links.forEach(a => {
		const span = document.createElement("span")
		span.innerHTML = a.innerHTML
		a.parentNode?.replaceChild(span, a)
	})
	return div.innerHTML
}

function getDateKey(timestamp: string): string {
	const d = new Date(timestamp)
	const year = d.getFullYear()
	const month = (d.getMonth() + 1).toString().padStart(2, "0")
	const day = d.getDate().toString().padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatDate(timestamp: string): string {
	const d = new Date(timestamp)
	const day = d.getDate()
	const monthNames = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	]
	const month = monthNames[d.getMonth()]
	const year = d.getFullYear()
	return `${day} ${month} ${year}`
}

function formatTime(timestamp: string): string {
	const d = new Date(timestamp)
	const hours = d.getHours()
	const minutes = d.getMinutes()
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function daysAgo(timestamp: string): number {
	const d = new Date(timestamp)
	const today = new Date()
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
	const pastStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
	return Math.floor((todayStart.getTime() - pastStart.getTime()) / (1000 * 60 * 60 * 24))
}

const RELATIVE_DAYS_CAP = 6

function formatTimeLabel(timestamp: string): string {
	const days = daysAgo(timestamp)
	if (days === 0) return "Today"
	if (days === 1) return "Yesterday"
	if (days >= 2 && days <= RELATIVE_DAYS_CAP) return `${days} days ago`
	return formatDate(timestamp)
}

function formatDelta(delta: number | null | undefined): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return "(0)"
	const sign = n >= 0 ? "+" : ""
	return `(${sign}${n})`
}

const revisionsByDate = computed(() => {
	const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()
	const source = selectedRevisionsForDisplay.value

	source.forEach(revision => {
		const dateKey = getDateKey(revision.timestamp)
		const dateLabel = formatDate(revision.timestamp)

		if (!grouped.has(dateKey)) {
			grouped.set(dateKey, { dateLabel, revisions: [] })
		}

		grouped.get(dateKey)!.revisions.push(revision)
	})

	return Array.from(grouped.entries())
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([dateKey, data]) => ({
			dateKey,
			dateLabel: data.dateLabel,
			revisions: [...data.revisions].sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			),
		}))
})

const revisionsByDateCapped = computed(() => revisionsByDate.value)

const sampleRevision = computed(() => selectedRevisionsForDisplay.value[0] ?? null)

defineExpose({ sampleRevision, isLoading })

onMounted(() => {
	loadFeed()
})

watch(
	() => props.source,
	() => {
		loadFeed()
	}
)
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
