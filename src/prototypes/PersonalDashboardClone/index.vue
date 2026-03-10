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
				:show-source-icons="showSourceIcons"
				:show-source-subtitles="showSourceSubtitles"
				:show-username-at-prefix="showUsernameAtPrefix"
				:show-user-icon="showUserIcon"
				:show-summary-cutout="summaryCutout"
				:show-delta="showDelta"
				:delta-format-parentheses="false"
				:source="feedSource"
				:recent-changes-ratio="recentChangesRatio"
				:pages-and-users-ratio="pagesAndUsersRatio"
				:collaborators-ratio="collaboratorsRatio"
				:related-changes-ratio="relatedChangesRatio"
				:feed-cap="10"
				title="Review changes"
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
					<div class="review-changes-controls">
						<div class="review-changes-controls__checkboxes" role="group" aria-label="Prototype settings">
							<CdxCheckbox v-model="showDelta">Delta</CdxCheckbox>
							<CdxCheckbox v-model="showSourceIcons">Source icon</CdxCheckbox>
							<CdxCheckbox v-model="showSourceSubtitles">Source subtitle</CdxCheckbox>
							<CdxCheckbox v-model="showRevertRiskInFeed">Debug revert risk</CdxCheckbox>
							<CdxCheckbox v-model="showUsernameAtPrefix">@ username</CdxCheckbox>
							<CdxCheckbox v-model="showUserIcon">User icon</CdxCheckbox>
							<CdxCheckbox v-model="summaryCutout">Cutout</CdxCheckbox>
						</div>
						<div class="review-changes-controls__row">
							<CdxLabel :input-id="reviewChangesSourceId">Feed source</CdxLabel>
							<CdxSelect
								:id="reviewChangesSourceId"
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
										v-model.number="mixedRecentChangesRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ mixedRecentChangesRatio }}%</span
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
										v-model.number="mixedPagesAndUsersRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ mixedPagesAndUsersRatio }}%</span
									>
								</div>
							</div>
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Mix ratio"
							>
								<CdxLabel :input-id="collaboratorsSliderId"
									>Collaborators %</CdxLabel
								>
								<div class="ratio-slider-line">
									<input
										:id="collaboratorsSliderId"
										v-model.number="mixedCollaboratorsRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ mixedCollaboratorsRatio }}%</span
									>
								</div>
							</div>
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Mix ratio"
							>
								<CdxLabel :input-id="relatedChangesSliderId"
									>Related changes %</CdxLabel
								>
								<div class="ratio-slider-line">
									<input
										:id="relatedChangesSliderId"
										v-model.number="mixedRelatedChangesRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ mixedRelatedChangesRatio }}%</span
									>
								</div>
							</div>
						</template>
						<template v-if="feedSource === 'recentChanges'">
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Show ratio"
							>
								<CdxLabel :input-id="recentChangesSliderId"
									>Recent changes %</CdxLabel
								>
								<div class="ratio-slider-line">
									<input
										:id="recentChangesSliderId"
										v-model.number="standaloneRecentChangesRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ standaloneRecentChangesRatio }}%</span
									>
								</div>
							</div>
						</template>
						<template v-if="feedSource === 'pagesAndUsers'">
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Show ratio"
							>
								<CdxLabel :input-id="pagesAndUsersSliderId"
									>Watchlist %</CdxLabel
								>
								<div class="ratio-slider-line">
									<input
										:id="pagesAndUsersSliderId"
										v-model.number="standalonePagesAndUsersRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ standalonePagesAndUsersRatio }}%</span
									>
								</div>
							</div>
						</template>
						<template v-if="feedSource === 'collaborators'">
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Show ratio"
							>
								<CdxLabel :input-id="collaboratorsSliderId"
									>Collaborators %</CdxLabel
								>
								<div class="ratio-slider-line">
									<input
										:id="collaboratorsSliderId"
										v-model.number="standaloneCollaboratorsRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ standaloneCollaboratorsRatio }}%</span
									>
								</div>
							</div>
						</template>
						<template v-if="feedSource === 'relatedChanges'">
							<div
								class="review-changes-controls__row"
								role="group"
								aria-label="Show ratio"
							>
								<CdxLabel :input-id="relatedChangesSliderId"
									>Related changes %</CdxLabel
								>
								<div class="ratio-slider-line">
									<input
										:id="relatedChangesSliderId"
										v-model.number="standaloneRelatedChangesRatio"
										type="range"
										min="0"
										max="100"
										step="10"
										class="ratio-slider"
									/>
									<span class="ratio-slider-value" aria-hidden="true"
										>{{ standaloneRelatedChangesRatio }}%</span
									>
								</div>
							</div>
						</template>
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
import ReviewChangesFeed from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { useReviewChangesModule } from "@/modules/ReviewChanges/useReviewChangesModule"
import {
	CdxCheckbox,
	CdxIcon,
	CdxLabel,
	CdxProgressBar,
	CdxSelect,
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
	mixedRecentChangesRatio,
	mixedPagesAndUsersRatio,
	mixedCollaboratorsRatio,
	mixedRelatedChangesRatio,
	standaloneRecentChangesRatio,
	standalonePagesAndUsersRatio,
	standaloneCollaboratorsRatio,
	standaloneRelatedChangesRatio,
	recentChangesRatio,
	pagesAndUsersRatio,
	collaboratorsRatio,
	relatedChangesRatio,
	showRevertRiskInFeed,
	showDelta,
	showSourceIcons,
	showSourceSubtitles,
	showUsernameAtPrefix,
	showUserIcon,
	summaryCutout,
	sourceOptions,
	reviewChangesSourceId,
	recentChangesSliderId,
	pagesAndUsersSliderId,
	collaboratorsSliderId,
	relatedChangesSliderId,
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
