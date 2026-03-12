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
			<RouterLink to="/Chrome/ReviewChanges" class="mobile-card mobile-card--link">
				<div class="mobile-card__header">
					<span class="mobile-card__title">Review changes</span>
					<CdxIcon :icon="cdxIconArrowNext" size="medium" class="mobile-card__arrow" />
				</div>
				<div class="mobile-card__content mobile-card__content--preview">
					<template v-if="isLoading">
						<CdxProgressBar inline />
					</template>
					<template v-else>
						<div
							v-for="change in previewRevisions"
							:key="`${change.pageName}-${change.timestamp}-${change.id}`"
							class="mobile-card__preview-item"
						>
							<CdxIcon
								:icon="cdxIconEdit"
								size="small"
								class="mobile-card__content-icon"
							/>
							<span class="mobile-card__content-text">
								{{ change.user.name }} changed
								{{ formatPreviewDelta(change.delta) }} bytes in
								{{
									change.pageName
										? `the ${change.pageName} article`
										: "an article"
								}}.
							</span>
						</div>
					</template>
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
				:show-revert-risk="showRevertRiskInFeed"
				:show-revert-risk-flags="showRevertRiskFlags"
				:revert-risk-flags-in-box="revertRiskFlagsInBox"
				:verbose-flags="verboseFlags"
				:show-reverted-flag="showRevertedFlag"
				:show-source-icons="showSourceIcons"
				:show-source-subtitles="showSourceSubtitles"
				:show-username-at-prefix="showUsernameAtPrefix"
				:show-user-icon="showUserIcon"
				:show-summary-cutout="summaryCutout"
				:show-empty-edit-summary="showEmptyEditSummary"
				:show-delta="showDelta"
				:delta-format-parentheses="false"
				:source="feedSource"
				:recent-changes-ratio="recentChangesRatio"
				:pages-and-users-ratio="pagesAndUsersRatio"
				:pages-and-users-latest-ratio="pagesAndUsersLatestRatio"
				:collaborators-ratio="collaboratorsRatio"
				:related-changes-ratio="relatedChangesRatio"
				:feed-cap="10"
				title="Review changes"
				:show-module-border="showModuleBorder"
				:show-review-button="showReviewButton"
				:show-dismiss-button="showDismissButton"
				:highlight-unviewed="showHighlightUnviewed"
				:unviewed-border="showUnviewedBorder"
				:viewed-border="showViewedBorder"
				:last-clicked-highlight="showLastClickedHighlight"
				:show-recommendation-flags="showRecommendationFlags"
				:flags-below-username="flagsBelowUsername"
				:simplified-timestamp="simplifiedTimestamp"
				@preview-update="onPreviewUpdate"
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
					<div class="sidebar-card__title">Prototype settings</div>
					<ReviewChangesControls show-prototype-only-controls />
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
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import ReviewChangesControls from "@/modules/ReviewChanges/ReviewChangesControls.vue"
import { useReviewChangesModule } from "@/modules/ReviewChanges/useReviewChangesModule"
import {
	CdxIcon,
	CdxProgressBar,
} from "@wikimedia/codex"
import {
	cdxIconArrowNext,
	cdxIconCheckAll,
	cdxIconEdit,
	cdxIconInfo,
	cdxIconLinkExternal,
	cdxIconUserTalk,
} from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWRevision } from "fakewiki/types"
import { computed, ref } from "vue"
import { RouterLink } from "vue-router"

const wiki = new FakeWiki()

const THANKS_LOG_USER = "Todepond"
const thanksLogUrl = computed(
	() =>
		`${wiki.base}w/index.php?title=${wiki.encodeForUrl("Special:Log")}&type=thanks&user=${encodeURIComponent(THANKS_LOG_USER)}`
)

const {
		feedSource,
		showModuleBorder,
		showReviewButton,
		showDismissButton,
		showHighlightUnviewed,
		showUnviewedBorder,
		showViewedBorder,
		showLastClickedHighlight,
		recentChangesRatio,
		pagesAndUsersRatio,
		pagesAndUsersLatestRatio,
		collaboratorsRatio,
		relatedChangesRatio,
		showRevertRiskInFeed,
		showRevertRiskFlags,
		revertRiskFlagsInBox,
		verboseFlags,
		showRevertedFlag,
		showDelta,
		showSourceIcons,
		showSourceSubtitles,
		showUsernameAtPrefix,
		showUserIcon,
		summaryCutout,
		showEmptyEditSummary,
		showRecommendationFlags,
		flagsBelowUsername,
		simplifiedTimestamp,
	} = useReviewChangesModule()

const previewRevisions = ref<FWRevision[]>([])
const isLoading = ref(false)

function onPreviewUpdate(payload: { revisions: FWRevision[]; isLoading: boolean }) {
	previewRevisions.value = payload.revisions
	isLoading.value = payload.isLoading
}

function formatPreviewDelta(delta: number | null | undefined): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return "0"
	const sign = n >= 0 ? "+" : ""
	return `${sign}${n}`
}
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
