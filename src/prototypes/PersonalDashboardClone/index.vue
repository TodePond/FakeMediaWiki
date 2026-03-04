<template>
	<main class="personal-dashboard-clone">
		<div class="dashboard-main">
			<section class="review-changes">
				<div class="review-changes__title">Review changes</div>
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
									><span v-else class="review-changes__comment">{{
										change.comment || ""
									}}</span>
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

			<aside class="dashboard-sidebar">
				<section class="sidebar-card your-impact">
					<div class="sidebar-card__title">Your impact</div>
					<div class="your-impact__metrics">
						<div class="your-impact__metric">
							<div class="your-impact__value-row">
								<CdxIcon :icon="cdxIconUserTalk" class="your-impact__icon" />
								<span class="your-impact__value">0</span>
							</div>
							<span class="your-impact__label">Thanks sent</span>
						</div>
						<div class="your-impact__divider" aria-hidden="true"></div>
						<div class="your-impact__metric">
							<div class="your-impact__value-row">
								<CdxIcon :icon="cdxIconCheckAll" class="your-impact__icon" />
								<span class="your-impact__value">0</span>
							</div>
							<span class="your-impact__label-row">
								<span class="your-impact__label">Edits reviewed</span>
								<CdxIcon
									:icon="cdxIconInfo"
									size="small"
									class="your-impact__info"
								/>
							</span>
						</div>
					</div>
				</section>

				<section class="sidebar-card policies">
					<div class="sidebar-card__title">Policies and guidelines</div>
					<p class="policies__intro">
						Check what is acceptable and expected on Wikipedia.
					</p>
					<div class="policies__box">
						<ul class="policies__list">
							<li class="policies__item">
								<strong class="policies__item-title">Neutral point of view</strong>
								<span class="policies__item-desc"
									>Content must represent significant views fairly,
									proportionately, and without bias.<a
										href="#"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">No original research</strong>
								<span class="policies__item-desc"
									>Articles should summarise published sources, and not contain
									users' own interpretation or knowledge.<a
										href="#"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">Verifiability</strong>
								<span class="policies__item-desc"
									>New additions should include a citation, providing the source
									of the information.<a href="#" class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">Assume good faith</strong>
								<span class="policies__item-desc"
									>Remember that most users are trying to improve Wikipedia and
									not deliberately reduce its quality.<a
										href="#"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
						</ul>
					</div>
				</section>
			</aside>
		</div>
	</main>
</template>

<script setup lang="ts">
import { CdxIcon, CdxProgressBar } from "@wikimedia/codex"
import { cdxIconCheckAll, cdxIconInfo, cdxIconUserTalk } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWPageHistoryRevision, FWRevision } from "fakewiki/types"
import { computed, onMounted, ref } from "vue"

/** Watchlist configured from code (no form) */
const WATCHLIST_PAGE_NAMES = ["Wikipedia", "Wet Leg", "Water", "Gorillaz", "Algorave"]
const WATCHLIST_USER_NAMES = ["Todepond", "Samwalton9"]

const wiki = new FakeWiki()

const allRevisionsData = ref<FWRevision[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const errors = ref<string[]>([])
const hasMore = ref(true)

async function loadFeed(after?: Record<string, string>, append = false): Promise<void> {
	if (!append) {
		isLoading.value = true
		errors.value = []
	} else {
		isLoadingMore.value = true
	}

	const pageNames = WATCHLIST_PAGE_NAMES.filter(name => name.trim() !== "")
	const userNames = WATCHLIST_USER_NAMES.filter(name => name.trim() !== "")

	try {
		const revisions = await wiki.getCombinedFeed({
			pageNames,
			userNames,
			limit: 20,
			after,
		})

		const processedRevisions = await Promise.all(
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

		if (append) {
			const existingIds = new Set(allRevisionsData.value.map(r => r.id))
			const newRevisions = processedRevisions.filter(r => !existingIds.has(r.id))
			const merged = [...allRevisionsData.value, ...newRevisions].sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			allRevisionsData.value = merged
			hasMore.value = newRevisions.length > 0
		} else {
			allRevisionsData.value = processedRevisions
			hasMore.value = processedRevisions.length === 20
		}

		isLoading.value = false
		isLoadingMore.value = false
	} catch (e) {
		isLoading.value = false
		isLoadingMore.value = false
		const errorObj = e as Error
		if (!append) {
			errors.value = [errorObj.message]
			allRevisionsData.value = []
		}
		hasMore.value = false
	}
}

/**
 * Strip <a> tags from HTML, leaving their text content (and any nested markup) behind.
 */
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
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	]
	const month = monthNames[d.getMonth()]
	const year = d.getFullYear()
	return `${day} ${month} ${year}`
}

function isToday(timestamp: string): boolean {
	const d = new Date(timestamp)
	const today = new Date()
	return (
		d.getDate() === today.getDate() &&
		d.getMonth() === today.getMonth() &&
		d.getFullYear() === today.getFullYear()
	)
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

	allRevisionsData.value.forEach(revision => {
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
			revisions: data.revisions,
		}))
})

const FEED_CAP = 6

const revisionsByDateCapped = computed(() => {
	const capped = allRevisionsData.value.slice(0, FEED_CAP)
	const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()

	capped.forEach(revision => {
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
			revisions: data.revisions,
		}))
})

async function loadMore(): Promise<void> {
	if (allRevisionsData.value.length === 0) return
	const pageNames = WATCHLIST_PAGE_NAMES.filter(name => name.trim() !== "")
	const userNames = WATCHLIST_USER_NAMES.filter(name => name.trim() !== "")
	const afterMap: Record<string, string> = {}
	for (const pageName of pageNames) {
		const revs = allRevisionsData.value.filter(r => r.pageName === pageName)
		if (revs.length > 0) {
			afterMap[pageName] = String(Math.min(...revs.map(r => r.id)))
		}
	}
	for (const userName of userNames) {
		const revs = allRevisionsData.value.filter(r => r.user?.name === userName)
		if (revs.length > 0) {
			afterMap[userName] = String(Math.min(...revs.map(r => r.id)))
		}
	}
	if (Object.keys(afterMap).length === 0) return
	await loadFeed(afterMap, true)
}

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
