<template>
	<main class="personal-dashboard-clone">
		<div class="dashboard-mobile-banner">
			<a
				href="#"
				target="_blank"
				rel="noopener noreferrer"
				class="dashboard-mobile-banner__feedback"
			>
				Share feedback
				<CdxIcon :icon="cdxIconLinkExternal" size="x-small" />
			</a>
		</div>
		<!-- Mobile: simplified card modules -->
		<div class="dashboard-mobile-cards">
			<RouterLink to="/Special/ReviewChanges" class="mobile-card mobile-card--link">
				<div class="mobile-card__header">
					<span class="mobile-card__title">Review changes</span>
					<CdxIcon :icon="cdxIconArrowNext" size="medium" class="mobile-card__arrow" />
				</div>
				<div class="mobile-card__content">
					<CdxIcon :icon="cdxIconEdit" size="small" class="mobile-card__content-icon" />
					<span class="mobile-card__content-text">
						<template v-if="sampleRevision">
							{{ sampleRevision.user.name }} changed bytes in
							{{
								sampleRevision.pageName
									? `the ${sampleRevision.pageName} article`
									: "an article"
							}}.
						</template>
						<template v-else-if="isLoading"> Loading edits… </template>
						<template v-else> No edits to review right now. </template>
					</span>
				</div>
				<span class="mobile-card__button">View more edits</span>
			</RouterLink>

			<section class="mobile-card">
				<div class="mobile-card__header">
					<span class="mobile-card__title">Your impact</span>
				</div>
				<div class="mobile-card__content mobile-card__content--stacked">
					<div class="mobile-card__stat">
						<CdxIcon
							:icon="cdxIconUserTalk"
							size="small"
							class="mobile-card__stat-icon"
						/>
						<a
							:href="thanksLogUrl"
							target="_blank"
							rel="noopener noreferrer"
							class="mobile-card__stat-link"
							>0</a
						>
						<span>Thanks sent.</span>
					</div>
					<div class="mobile-card__stat">
						<CdxIcon
							:icon="cdxIconCheckAll"
							size="small"
							class="mobile-card__stat-icon"
						/>
						<span class="mobile-card__stat-value">0</span>
						<span>Edits reviewed.</span>
						<CdxIcon :icon="cdxIconInfo" size="small" class="mobile-card__stat-info" />
					</div>
				</div>
			</section>

			<a href="#" class="mobile-card mobile-card--link">
				<div class="mobile-card__header">
					<span class="mobile-card__title">Policies and guidelines</span>
					<CdxIcon :icon="cdxIconArrowNext" size="medium" class="mobile-card__arrow" />
				</div>
				<div class="mobile-card__content">
					<span class="mobile-card__content-text">
						Review best practices to create a free and reliable encyclopedia.
					</span>
				</div>
			</a>
		</div>

		<!-- Desktop: full dashboard -->
		<div class="dashboard-main">
			<ReviewChangesFeed
				ref="reviewChangesFeedRef"
				:show-revert-risk="showRevertRiskInFeed"
				:show-source-icons="showSourceIcons"
				:show-source-subtitles="showSourceSubtitles"
				:source="feedSource"
				:recent-changes-ratio="recentChangesRatio"
				:pages-and-users-ratio="pagesAndUsersRatio"
				:feed-cap="10"
				title="Review changes"
			/>

			<aside class="dashboard-sidebar">
				<section class="sidebar-card your-impact">
					<div class="sidebar-card__title">Your impact</div>
					<div class="your-impact__metrics">
						<div class="your-impact__metric">
							<div class="your-impact__value-row">
								<CdxIcon :icon="cdxIconUserTalk" class="your-impact__icon" />
								<a
									:href="thanksLogUrl"
									target="_blank"
									rel="noopener noreferrer"
									class="your-impact__value your-impact__value-link"
									>0</a
								>
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

				<section class="sidebar-card review-changes-controls-card">
					<div class="review-changes-controls">
						<div class="review-changes-controls__row">
							<CdxLabel input-id="review-changes-source">Feed source</CdxLabel>
							<CdxSelect
								id="review-changes-source"
								v-model:selected="feedSource"
								:menu-items="sourceOptions"
							/>
						</div>
						<template v-if="feedSource === 'mixed'">
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Mix ratio"
							>
								<CdxLabel :input-id="recentChangesSliderId"
									>Recent changes %</CdxLabel
								>
								<div class="ratio-slider-line">
									<input
										:id="recentChangesSliderId"
										v-model.number="recentChangesRatio"
										type="range"
										min="0"
										max="100"
										step="1"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ recentChangesRatio }}%</span
									>
								</div>
							</div>
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Mix ratio"
							>
								<CdxLabel :input-id="pagesAndUsersSliderId">Watchlist %</CdxLabel>
								<div class="ratio-slider-line">
									<input
										:id="pagesAndUsersSliderId"
										v-model.number="pagesAndUsersRatio"
										type="range"
										min="0"
										max="100"
										step="1"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ pagesAndUsersRatio }}%</span
									>
								</div>
							</div>
						</template>
						<label class="show-revert-risk-card__label">
							<input
								v-model="showSourceIcons"
								type="checkbox"
								class="show-revert-risk-card__input"
							/>
							<span class="show-revert-risk-card__text">Source icons</span>
						</label>
						<label class="show-revert-risk-card__label">
							<input
								v-model="showSourceSubtitles"
								type="checkbox"
								class="show-revert-risk-card__input"
							/>
							<span class="show-revert-risk-card__text">Source subtitles</span>
						</label>
						<label class="show-revert-risk-card__label">
							<input
								v-model="showRevertRiskInFeed"
								type="checkbox"
								class="show-revert-risk-card__input"
							/>
							<span class="show-revert-risk-card__text">Debug revert risk</span>
						</label>
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
import type { ReviewChangesSource } from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { CdxIcon, CdxLabel, CdxSelect } from "@wikimedia/codex"
import {
	cdxIconArrowNext,
	cdxIconCheckAll,
	cdxIconEdit,
	cdxIconInfo,
	cdxIconLinkExternal,
	cdxIconUserTalk,
} from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import { computed, ref, watch } from "vue"
import { RouterLink } from "vue-router"

const wiki = new FakeWiki()

const THANKS_LOG_USER = "Todepond"
const thanksLogUrl = computed(
	() =>
		`${wiki.base}w/index.php?title=${wiki.encodeForUrl("Special:Log")}&type=thanks&user=${encodeURIComponent(THANKS_LOG_USER)}`
)

const SHOW_REVERT_RISK_STORAGE_KEY = "personal-dashboard-clone-show-revert-risk"
const SHOW_SOURCE_ICONS_STORAGE_KEY = "personal-dashboard-clone-show-source-icons"
const SHOW_SOURCE_SUBTITLES_STORAGE_KEY = "personal-dashboard-clone-show-source-subtitles"
const FEED_SOURCE_STORAGE_KEY = "personal-dashboard-clone-feed-source"
const RECENT_CHANGES_RATIO_STORAGE_KEY = "personal-dashboard-clone-recent-changes-ratio"
const PAGES_AND_USERS_RATIO_STORAGE_KEY = "personal-dashboard-clone-pages-and-users-ratio"
const recentChangesSliderId = "personal-dashboard-recent-slider"
const pagesAndUsersSliderId = "personal-dashboard-pages-slider"

function getStoredShowRevertRisk(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_REVERT_RISK_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

function getStoredShowSourceIcons(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_SOURCE_ICONS_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

function getStoredShowSourceSubtitles(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_SOURCE_SUBTITLES_STORAGE_KEY)
		return stored === "true"
	} catch {
		return false
	}
}

function getStoredFeedSource(): ReviewChangesSource {
	try {
		const stored = localStorage.getItem(FEED_SOURCE_STORAGE_KEY)
		if (stored === "recentChanges" || stored === "pagesAndUsers" || stored === "mixed") {
			return stored
		}
	} catch {
		// ignore
	}
	return "recentChanges"
}

function getStoredRatio(key: string, fallback: number): number {
	try {
		const stored = localStorage.getItem(key)
		if (stored !== null) {
			const n = Number(stored)
			if (Number.isFinite(n) && n >= 0 && n <= 100) return Math.round(n)
		}
	} catch {
		// ignore
	}
	return fallback
}

const sourceOptions = [
	{ value: "recentChanges", label: "Recent changes" },
	{ value: "pagesAndUsers", label: "Watchlist" },
	{ value: "mixed", label: "Mixed" },
]

const showRevertRiskInFeed = ref(getStoredShowRevertRisk())
const showSourceIcons = ref(getStoredShowSourceIcons())
const showSourceSubtitles = ref(getStoredShowSourceSubtitles())
const feedSource = ref<ReviewChangesSource>(getStoredFeedSource())
const recentChangesRatio = ref(getStoredRatio(RECENT_CHANGES_RATIO_STORAGE_KEY, 50))
const pagesAndUsersRatio = ref(getStoredRatio(PAGES_AND_USERS_RATIO_STORAGE_KEY, 50))

watch(showRevertRiskInFeed, enabled => {
	try {
		localStorage.setItem(SHOW_REVERT_RISK_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

watch(showSourceIcons, enabled => {
	try {
		localStorage.setItem(SHOW_SOURCE_ICONS_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

watch(showSourceSubtitles, enabled => {
	try {
		localStorage.setItem(SHOW_SOURCE_SUBTITLES_STORAGE_KEY, String(enabled))
	} catch {
		// ignore
	}
})

watch(feedSource, source => {
	try {
		localStorage.setItem(FEED_SOURCE_STORAGE_KEY, source)
	} catch {
		// ignore
	}
})

watch(recentChangesRatio, value => {
	try {
		localStorage.setItem(RECENT_CHANGES_RATIO_STORAGE_KEY, String(value))
	} catch {
		// ignore
	}
})

watch(pagesAndUsersRatio, value => {
	try {
		localStorage.setItem(PAGES_AND_USERS_RATIO_STORAGE_KEY, String(value))
	} catch {
		// ignore
	}
})

const reviewChangesFeedRef = ref<InstanceType<typeof ReviewChangesFeed> | null>(null)

const sampleRevision = computed(() => {
	const inst = reviewChangesFeedRef.value as { sampleRevision?: { value: unknown } } | null
	return (inst?.sampleRevision?.value ?? null) as import("fakewiki/types").FWRevision | null
})
const isLoading = computed(() => {
	const inst = reviewChangesFeedRef.value as { isLoading?: { value: boolean } } | null
	return inst?.isLoading?.value ?? false
})
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
