<template>
	<main class="personal-dashboard-clone">
		<div class="dashboard-mobile-banner">
			<a
				:href="wiki.getPageUrl('Wikipedia:Feedback')"
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
			<RouterLink to="/Chrome/Feed" class="mobile-card mobile-card--link">
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
				<span class="mobile-card__button">Open more edits</span>
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
						<span>Edits opened.</span>
						<CdxIcon :icon="cdxIconInfo" size="small" class="mobile-card__stat-info" />
					</div>
				</div>
			</section>

			<a
				:href="wiki.getPageUrl('Wikipedia:List_of_policies')"
				target="_blank"
				rel="noopener noreferrer"
				class="mobile-card mobile-card--link"
			>
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
				:unified-title="true"
				:hide-description="true"
				:show-revert-risk="showRevertRiskInFeed"
				:show-revert-risk-flags="showRevertRiskFlags"
				:revert-risk-flags-in-box="true"
				:verbose-flags="false"
				:show-reverted-flag="showRevertedFlag"
				:show-source-icons="false"
				:show-source-subtitles="true"
				:show-username-at-prefix="false"
				:show-user-icon="true"
				:show-summary-cutout="false"
				:show-empty-edit-summary="true"
				:show-delta="false"
				:show-short-description="true"
				:show-short-description-separator="true"
				:show-on-watchlist-label="showOnWatchlistLabel"
				:source="feedSource"
				:recent-changes-ratio="recentChangesRatio"
				:pages-and-users-ratio="pagesAndUsersRatio"
				:pages-and-users-latest-ratio="pagesAndUsersLatestRatio"
				:collaborators-ratio="collaboratorsRatio"
				:related-changes-ratio="relatedChangesRatio"
				:feed-cap="10"
				title="Review changes"
				:show-review-button="false"
				:show-dismiss-button="false"
				:highlight-unviewed="false"
				:unviewed-border="false"
				:viewed-border="false"
				:last-clicked-highlight="false"
				:show-arrow-in-top-right="false"
				:show-recommendation-flags="showRecommendationFlags"
				:show-edit-check-other-flag="showEditCheckOtherFlag"
				:show-debug-checks="showDebugChecks"
				:flags-below-username="true"
				:simplified-timestamp="true"
				timestamp-position="topRight"
				:show-module-border="true"
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
								<span class="your-impact__label">Edits opened</span>
								<CdxIcon
									:icon="cdxIconInfo"
									size="small"
									class="your-impact__info"
								/>
							</span>
						</div>
					</div>
				</section>

				<section class="sidebar-card feed-controls-card">
					<div class="sidebar-card__title">Prototype settings</div>
					<FeedControls />
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
										:href="wiki.getPageUrl('Wikipedia:Neutral_point_of_view') + '#Examples'"
										target="_blank"
										rel="noopener noreferrer"
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
										:href="wiki.getPageUrl('Wikipedia:No_original_research') + '#Examples'"
										target="_blank"
										rel="noopener noreferrer"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">Verifiability</strong>
								<span class="policies__item-desc"
									>New additions should include a citation, providing the source
									of the information.<a
										:href="wiki.getPageUrl('Wikipedia:Verifiability') + '#Examples'"
										target="_blank"
										rel="noopener noreferrer"
										class="policies__examples"
										>Examples</a
									></span
								>
							</li>
							<li class="policies__item">
								<strong class="policies__item-title">Assume good faith</strong>
								<span class="policies__item-desc"
									>Remember that most users are trying to improve Wikipedia and
									not deliberately reduce its quality.<a
										:href="wiki.getPageUrl('Wikipedia:Assume_good_faith') + '#Examples'"
										target="_blank"
										rel="noopener noreferrer"
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
import FeedControls from "@/modules/Feed/FeedControls.vue"
import { useFeedModule } from "@/modules/Feed/useFeedModule"
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
	recentChangesRatio,
	pagesAndUsersRatio,
	pagesAndUsersLatestRatio,
	collaboratorsRatio,
	relatedChangesRatio,
	showRevertRiskInFeed,
	showRevertRiskFlags,
	showRevertedFlag,
	showOnWatchlistLabel,
	showRecommendationFlags,
	showEditCheckOtherFlag,
	showDebugChecks,
} = useFeedModule()

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
@import "../PersonalDashboardClone/style.css";
</style>

<style>
@import "../PersonalDashboardClone/global.css";
</style>
