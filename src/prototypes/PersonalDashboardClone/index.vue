<template>
	<main class="personal-dashboard-clone">
		<div class="dashboard-main">
			<section class="review-changes">
				<h3 class="review-changes__title">Review changes</h3>
				<p class="review-changes__description">
					Help keep Wikipedia reliable by reviewing the following edits which may need attention.
				</p>
				<div v-if="errors.length > 0" class="review-changes__errors">
					<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
				</div>
				<div v-if="isLoading" class="review-changes__loading">
					<CdxProgressBar inline />
				</div>
				<ul v-else class="review-changes__feed">
					<template v-for="dateGroup in revisionsByDate" :key="dateGroup.dateKey">
						<li
							v-for="change in dateGroup.revisions"
							:key="`${change.pageName}-${change.timestamp}-${change.id}`"
							class="review-changes__item"
						>
							<div class="review-changes__item-header">
								<a
									target="_blank"
									:href="wiki.getPageUrl(change.pageName!)"
									class="review-changes__page"
								>
									{{ change.pageName }}
								</a>
								<time
									:datetime="change.timestamp"
									class="review-changes__time"
								>
									{{ formatTime(change.timestamp) }}, {{ formatTimeLabel(change.timestamp) }}
								</time>
							</div>
							<div class="review-changes__summary">
								<span class="review-changes__summary-prefix">0 ·</span>
								<span
									v-if="change?.summary?.comment"
									class="review-changes__comment"
									v-html="change.summary.comment"
								></span>
								<span v-else class="review-changes__comment">{{
									change.comment || ""
								}}</span>
							</div>
							<a
								target="_blank"
								:href="wiki.getUserUrl(change.user.name)"
								class="review-changes__user"
							>
								{{ change.user.name }}
							</a>
						</li>
					</template>
				</ul>
				<div v-if="!isLoading && hasMore && allRevisionsData.length > 0" class="review-changes__load-more">
					<CdxButton :disabled="isLoadingMore" @click="loadMore">
						{{ isLoadingMore ? "Loading..." : "Load more" }}
					</CdxButton>
				</div>
			</section>

			<aside class="dashboard-sidebar">
				<section class="sidebar-card your-impact">
					<h2 class="sidebar-card__title">Your impact</h2>
					<div class="your-impact__metrics">
						<div class="your-impact__metric">
							<CdxIcon :icon="cdxIconSpeechBubble" class="your-impact__icon" />
							<span class="your-impact__value">0</span>
							<span class="your-impact__label">Thanks sent</span>
						</div>
						<div class="your-impact__metric">
							<CdxIcon :icon="cdxIconArticleCheck" class="your-impact__icon" />
							<span class="your-impact__value">0</span>
							<span class="your-impact__label-row">
								<span class="your-impact__label">Edits reviewed</span>
								<CdxIcon :icon="cdxIconInfo" size="small" class="your-impact__info" />
							</span>
						</div>
					</div>
				</section>

				<section class="sidebar-card policies">
					<h2 class="sidebar-card__title">Policies and guidelines</h2>
					<p class="policies__intro">Check what is acceptable and expected on Wikipedia.</p>
					<ul class="policies__list">
						<li class="policies__item">
							<strong>Neutral point of view:</strong>
							Content must represent significant views fairly, proportionately, and without bias.
							<a href="#" class="policies__examples">Examples</a>
						</li>
						<li class="policies__item">
							<strong>No original research:</strong>
							Articles should summarise published sources, and not contain users' own interpretation or knowledge.
							<a href="#" class="policies__examples">Examples</a>
						</li>
						<li class="policies__item">
							<strong>Verifiability:</strong>
							New additions should include a citation, providing the source of the information.
							<a href="#" class="policies__examples">Examples</a>
						</li>
						<li class="policies__item">
							<strong>Assume good faith:</strong>
							Remember that most users are trying to improve Wikipedia and not deliberately reduce its quality.
							<a href="#" class="policies__examples">Examples</a>
						</li>
					</ul>
				</section>
			</aside>
		</div>
	</main>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxProgressBar } from "@wikimedia/codex"
import { cdxIconArticleCheck, cdxIconInfo, cdxIconSpeechBubble } from "@wikimedia/codex-icons"
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

function formatTimeLabel(timestamp: string): string {
	return isToday(timestamp) ? "Today" : formatDate(timestamp)
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
