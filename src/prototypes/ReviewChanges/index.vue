<template>
	<section class="review-changes">
		<p class="review-changes__description">
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
							<span class="review-changes__page">{{ change.pageName }}</span>
							<time :datetime="change.timestamp" class="review-changes__time">
								{{ formatTime(change.timestamp) }},
								{{ formatTimeLabel(change.timestamp) }}
							</time>
						</div>
						<div class="review-changes__summary">
							<span
								class="review-changes__summary-prefix"
								:class="wiki.getDeltaClass(change.delta ?? 0, false)"
								>{{ formatDelta(change.delta) }}</span
							>
							<span class="review-changes__summary-sep" aria-hidden="true"
								>&nbsp;·</span
							><span
								v-if="change?.summary?.comment"
								class="review-changes__comment"
								v-html="change.summary.comment"
							></span
							><span
								v-else-if="change?.comment"
								class="review-changes__comment"
								>{{ change.comment }}</span
							><em
								v-else
								class="review-changes__comment review-changes__comment--empty"
								>No edit summary</em
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
							v-if="
								showRevertRiskInFeed &&
								getRevertRiskLines(change.id).length > 0
							"
							class="review-changes__revert-risk"
						>
							<template
								v-for="(line, idx) in getRevertRiskLines(change.id)"
								:key="line.label"
							>
								<span v-if="idx > 0"> · </span
								><span>{{ line.label }}: {{ line.pct }}%</span>
							</template>
						</span>
						<span
							v-else-if="showRevertRiskInFeed && isLoadingRevertRisk"
							class="review-changes__revert-risk review-changes__revert-risk--loading"
							>Revert risk: loading…</span
						>
					</a>
				</li>
			</template>
		</ul>
		<div v-if="!isLoading" class="review-changes__view-more">
			View more edits in the
			<a
				target="_blank"
				:href="wiki.getPageUrl('Special:RecentChanges')"
				class="review-changes__view-more-link"
				>recent changes</a
			>
			page.
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxProgressBar } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import type {
	FWLiftWingPrediction,
	FWPageHistoryRevision,
	FWPredictionByModel,
	FWRevision,
} from "fakewiki/types"
import { computed, onMounted, ref, watch } from "vue"

const wiki = new FakeWiki()

const SHOW_REVERT_RISK_STORAGE_KEY = "review-changes-show-revert-risk"

function getStoredShowRevertRisk(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_REVERT_RISK_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

const showRevertRiskInFeed = ref(getStoredShowRevertRisk())

watch(showRevertRiskInFeed, enabled => {
	try {
		localStorage.setItem(SHOW_REVERT_RISK_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
	if (enabled && selectedRevisions.value.length > 0) {
		fetchRevertRiskForFeed()
	}
})

const revertRiskByRevId = ref<Map<number, FWPredictionByModel>>(new Map())
const isLoadingRevertRisk = ref(false)

function formatRevertRiskPercent(prediction: FWLiftWingPrediction): number {
	const p = prediction.probability?.true
	return typeof p === "number" ? Math.round(p * 100) : 0
}

function getRevertRiskLines(revId: number): Array<{ label: string; pct: number }> {
	const byModel = revertRiskByRevId.value.get(revId)
	if (!byModel) return []
	const lines: Array<{ label: string; pct: number }> = []
	if (byModel.revertrisk) {
		lines.push({
			label: "Revert risk (language-agnostic)",
			pct: formatRevertRiskPercent(byModel.revertrisk),
		})
	}
	if (byModel["revertrisk-multilingual"]) {
		lines.push({
			label: "Revert risk (multilingual)",
			pct: formatRevertRiskPercent(byModel["revertrisk-multilingual"]),
		})
	}
	return lines
}

async function fetchRevertRiskForFeed(): Promise<void> {
	const revs = selectedRevisions.value
	if (revs.length === 0) return
	const revIds = revs.map(r => r.id)
	isLoadingRevertRisk.value = true
	try {
		const predictions = await wiki.getRevisionPredictions(revIds, [
			"revertrisk",
			"revertrisk-multilingual",
		])
		const next = new Map<number, FWPredictionByModel>()
		for (const revId of revIds) {
			const byModel = predictions[revId]
			if (byModel && (byModel.revertrisk || byModel["revertrisk-multilingual"])) {
				next.set(revId, byModel)
			}
		}
		revertRiskByRevId.value = next
	} finally {
		isLoadingRevertRisk.value = false
	}
}

const allRevisionsData = ref<FWRevision[]>([])
const selectedRevisions = ref<FWRevision[]>([])
const rccontinue = ref<string | undefined>(undefined)
const useNeedsReviewFilter = ref(true)
const isLoading = ref(false)
const errors = ref<string[]>([])

const FEED_CAP = 20
const RECENT_CHANGES_LIMIT = 50

function randomPick<T>(array: T[], n: number): T[] {
	if (array.length <= n) return [...array]
	const shuffled = [...array]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}
	return shuffled.slice(0, n)
}

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
		const onlyNeedsReview = append ? useNeedsReviewFilter.value : true
		const result = await wiki.getRecentChanges({
			limit: RECENT_CHANGES_LIMIT,
			onlyNeedsReview,
			rccontinue: append ? rccontinue.value : undefined,
		})

		let revisions = result.revisions
		if (revisions.length === 0 && !append && onlyNeedsReview) {
			throw new Error("No edits that need review were returned. Try again later.")
		}
		rccontinue.value = result.rccontinue

		const processed = await processRevisions(revisions)

		if (append) {
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

		selectedRevisions.value = randomPick(allRevisionsData.value, FEED_CAP)

		isLoading.value = false
		if (showRevertRiskInFeed.value) {
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
	const source = selectedRevisions.value

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

onMounted(() => {
	loadFeed()
})
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
