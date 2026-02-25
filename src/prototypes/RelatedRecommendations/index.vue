<template>
	<main class="recommendation-watchlist">
		<header class="recommendation-watchlist-header">
			<h1 class="recommendation-watchlist-title">Related recommendations</h1>
			<form class="recommendation-watchlist-form" @submit.prevent="search">
				<CdxLabel for="page-queries-input">Page queries (comma-separated)</CdxLabel>
				<CdxTextInput
					id="page-queries-input"
					v-model="pageQueriesInput"
					input-type="text"
					class="recommendation-watchlist-input"
					@input="syncPageQueriesFromInput"
				/>
				<CdxLabel for="user-queries-input">User queries (comma-separated)</CdxLabel>
				<CdxTextInput
					id="user-queries-input"
					v-model="userQueriesInput"
					input-type="text"
					class="recommendation-watchlist-input"
					@input="syncUserQueriesFromInput"
				/>
				<CdxButton type="submit" :disabled="isLoading"> Refresh feed </CdxButton>
			</form>
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<div
				v-if="allRevisionsData.length > 0 || isLoading"
				class="score-filter-row"
				role="group"
				aria-label="Filter by score"
			>
				<CdxLabel :input-id="scoreFilterId"
					>Show top {{ filterKeepPercent }}% recommendations</CdxLabel
				>
				<div class="score-filter-slider-line">
					<input
						:id="scoreFilterId"
						:value="100 - filterKeepPercent"
						type="range"
						min="0"
						max="100"
						step="1"
						class="score-filter-slider"
						aria-valuemin="0"
						:aria-valuenow="filterKeepPercent"
						aria-valuemax="100"
						@input="
							filterKeepPercent =
								100 - Number(($event.target as HTMLInputElement).value)
						"
						@change="onSliderChange"
					/>
					<span class="score-filter-value" aria-hidden="true"
						>{{ filterKeepPercent }}%</span
					>
				</div>
			</div>
		</header>
		<div class="watchlist-container">
			<div class="watchlist-loading watchlist-loading-always">
				<p class="watchlist-loading-text">
					{{ loadingStage.label }}
				</p>
				<div
					v-if="loadingStage.percent === null"
					class="watchlist-loading-bar"
					aria-label="Loading"
				>
					<CdxProgressBar inline aria-label="Loading" />
				</div>
				<div
					v-else
					class="watchlist-loading-bar watchlist-loading-bar-complete"
					role="progressbar"
					:aria-valuenow="loadingStage.percent"
					aria-valuemin="0"
					aria-valuemax="100"
					:aria-label="loadingStage.percent === 100 ? 'Loading complete' : 'Loading'"
				>
					<div
						class="watchlist-loading-bar-fill"
						:style="{ width: loadingStage.percent + '%' }"
					/>
				</div>
			</div>
			<template
				v-if="!isLoading || interleavedRevisions.length > 0"
				v-for="dateGroup in revisionsByDate"
				:key="dateGroup.dateKey"
			>
				<h4 class="watchlist-date-header">{{ dateGroup.dateLabel }}</h4>
				<div class="watchlist-history-box">
					<div
						v-for="(change, changeIndex) in dateGroup.revisions"
						:key="`${change.pageName}-${change.timestamp}`"
						:class="[
							'history-item',
							{ 'history-item-expanded': expandedItemIds.has(change.id) },
							{
								'history-item-recommendation': (change as FeedRevision)
									.isRecommendation,
							},
						]"
						:style="{
							zIndex: String(getItemZIndex(dateGroup.dateKey, changeIndex)),
						}"
						@click="handleItemClick(change, $event)"
					>
						<template v-if="!expandedItemIds.has(change.id)">
							<div class="history-row">
								<CdxIcon
									v-if="getPredictionIcon(change.id).icon"
									:icon="getPredictionIcon(change.id).icon!"
									:style="{ color: getPredictionIcon(change.id).color }"
									:class="[
										'prediction-icon',
										{
											'prediction-icon-loading': getPredictionIcon(change.id)
												.isLoading,
										},
									]"
									size="small"
									:title="getPredictionText(change.id) ?? undefined"
								/><CdxIcon
									:icon="
										(change as FeedRevision).isRecommendation
											? cdxIconLightbulb
											: cdxIconStar
									"
									:class="[
										(change as FeedRevision).isRecommendation
											? 'prediction-icon source-icon recommendation-bulb-icon'
											: 'prediction-icon source-icon recommendation-star-icon',
									]"
									size="small"
								/>
								<span
									v-if="
										(change as FeedRevision).isRecommendation &&
										(change as FeedRevision).score != null
									"
									class="feed-count-badges"
									title="Score (bidirectional×3, outgoing×2, backlink×1)"
									aria-label="Score"
								>
									<span class="feed-count-badge feed-count-badge-score">{{
										(change as FeedRevision).score
									}}</span>
								</span>
								<a
									target="_blank"
									:href="wiki.getPageUrl(change.pageName!)"
									class="history-page"
									>{{ change.pageName }}</a
								><span
									:class="[
										'history-time',
										{
											'history-time-expanded': expandedHistoryIds.has(
												change.id
											),
										},
									]"
								>
									{{ wiki.formatTime(change.timestamp) }}</span
								><span
									:class="[
										'history-delta',
										wiki.getDeltaClass(change.delta ?? 0, false),
										{
											'history-delta-expanded': expandedDiffIds.has(
												change.id
											),
										},
									]"
								>
									{{ wiki.formatDelta(change.delta) }}</span
								>
								<span class="user-name-container"
									><a
										target="_blank"
										:href="wiki.getUserUrl(change.user.name)"
										class="history-user"
										>{{ change.user.name }}</a
									>
									<CdxIcon
										v-if="wiki.getCachedUserCategoryDisplay(change.user.name, { userTypeConfig })?.icon"
										:class="[
											'user-type-icon',
											`user-type-icon-${wiki.getCachedUserCategory(change.user.name) || ''}`,
										]"
										:style="{
											color: wiki.getCachedUserCategoryDisplay(change.user.name, { userTypeConfig })?.color,
										}"
										:icon="wiki.getCachedUserCategoryDisplay(change.user.name, { userTypeConfig })!.icon!"
										size="x-small" /></span
								><span
									class="history-comment"
									v-html="change?.summary?.comment ?? ''"
								></span>
							</div>
						</template>
						<template v-else>
							<div class="history-navigation-buttons">
								<button
									type="button"
									class="history-nav-button history-nav-button-previous"
									:disabled="!hasPrevious(change.id)"
									data-navigation-button="previous"
									@click.stop="navigateToPrevious(change.id, $event)"
									aria-label="Previous item"
								>
									<CdxIcon :icon="cdxIconArrowPrevious" size="small" />
								</button>
								<button
									type="button"
									class="history-nav-button history-nav-button-next"
									:disabled="!hasNext(change.id)"
									data-navigation-button="next"
									@click.stop="navigateToNext(change.id, $event)"
									aria-label="Next item"
								>
									<CdxIcon :icon="cdxIconArrowNext" size="small" />
								</button>
							</div>
							<div class="history-expanded">
								<div class="history-title-row">
									<a
										target="_blank"
										:href="wiki.getPageUrl(change.pageName!)"
										class="history-page-expanded"
										>{{ change.pageName }}</a
									><button
										type="button"
										:class="[
											'history-delta',
											wiki.getDeltaClass(change.delta ?? 0, false),
											{
												'history-delta-expanded': expandedDiffIds.has(
													change.id
												),
											},
										]"
										@click.stop="toggleDiff(change)"
									>
										{{ wiki.formatDelta(change.delta) }}
									</button>
									<button
										type="button"
										class="history-collapse-button"
										@click.stop="collapseItem(change.id)"
										aria-label="Collapse"
									>
										−
									</button>
								</div>
								<span class="user-name-container"
									><a
										target="_blank"
										:href="wiki.getUserUrl(change.user.name)"
										class="history-user-expanded"
										>{{ change.user.name }}</a
									><CdxIcon
										v-if="wiki.getCachedUserCategoryDisplay(change.user.name, { userTypeConfig })?.icon"
										:icon="wiki.getCachedUserCategoryDisplay(change.user.name, { userTypeConfig })!.icon!"
										:class="[
											'user-type-icon',
											'user-type-icon-expanded',
											`user-type-icon-${wiki.getCachedUserCategory(change.user.name) || ''}`,
										]"
										:style="{
											color: wiki.getCachedUserCategoryDisplay(change.user.name, { userTypeConfig })?.color,
										}"
								/></span>
								<button
									type="button"
									:class="[
										'history-date-expanded',
										{
											'history-time-expanded': expandedHistoryIds.has(
												change.id
											),
										},
									]"
									@click.stop="toggleHistory(change)"
								>
									{{ wiki.formatNiceRelativeTimestamp(change.timestamp) }}
								</button>
								<div
									v-if="change?.summary?.comment"
									class="history-comment-expanded"
									v-html="change?.summary?.comment ?? ''"
								></div>

								<div v-if="getPredictionText(change.id)" class="prediction-card">
									<CdxIcon
										v-if="getPredictionIcon(change.id).icon"
										:icon="getPredictionIcon(change.id).icon!"
										:style="{ color: getPredictionIcon(change.id).color }"
										:class="[
											'prediction-card-icon',
											{
												'prediction-icon-loading': getPredictionIcon(
													change.id
												).isLoading,
											},
										]"
										size="small"
										:title="getPredictionText(change.id) ?? undefined"
									/>
									<span class="prediction-card-text">{{
										getPredictionText(change.id)
									}}</span>
								</div>
								<div
									class="item-source-info"
									:class="{
										'item-source-info-watchlist': !(change as FeedRevision)
											.isRecommendation,
										'item-source-info-recommendation': (change as FeedRevision)
											.isRecommendation,
									}"
								>
									<CdxIcon
										:icon="
											(change as FeedRevision).isRecommendation
												? cdxIconLightbulb
												: cdxIconStar
										"
										:class="
											(change as FeedRevision).isRecommendation
												? 'item-source-info-icon recommendation-bulb-icon'
												: 'item-source-info-icon recommendation-star-icon'
										"
										size="small"
									/>
									<span class="item-source-info-text">
										<template v-if="(change as FeedRevision).isRecommendation">
											<template
												v-if="
													change.pageName &&
													getRecommendationSeedPages(change.pageName)
														.length
												"
											>
												Recommended for you because you watch
												<template
													v-for="(name, i) in getRecommendationSeedPages(
														change.pageName!
													)"
													:key="name"
												>
													<a
														:href="wiki.getPageUrl(name)"
														target="_blank"
														rel="noopener"
														class="item-source-info-link"
														@click.stop
														>{{ name }}</a
													><span
														v-if="
															i <
															getRecommendationSeedPages(
																change.pageName!
															).length -
																2
														"
														>, </span
													><span
														v-else-if="
															i ===
															getRecommendationSeedPages(
																change.pageName!
															).length -
																2
														"
													>
														and </span
													><span v-else>.</span>
												</template>
											</template>
											<template v-else
												>This change was recommended for you based on your
												watchlist.</template
											>
										</template>
										<template v-else>This page is on your watchlist.</template>
									</span>
								</div>
								<div
									v-if="
										(change as FeedRevision).isRecommendation &&
										(change as FeedRevision).score != null
									"
									class="feed-count-card feed-count-card-recommendation-score"
									:title="`Recommendation score: ${(change as FeedRevision).score}`"
									aria-label="Recommendation score"
								>
									<div class="feed-count-card-row">
										<CdxIcon
											:icon="cdxIconLink"
											size="small"
											class="feed-count-card-icon"
										/>
										<span
											class="feed-count-card-item feed-count-card-item-score"
										>
											<span class="feed-count-card-label"
												>Recommendation score:</span
											>
											<span class="feed-count-card-value">{{
												(change as FeedRevision).score
											}}</span>
										</span>
									</div>
								</div>
								<footer class="history-expanded-footer">
									<button
										type="button"
										class="history-action-button history-action-button-left"
										:class="{
											'history-action-button-active': expandedTalkIds.has(
												change.id
											),
										}"
										@click.stop="toggleTalk(change)"
									>
										(talk)
									</button>
									<div class="history-action-buttons-right">
										<button
											type="button"
											class="history-action-button"
											:class="{
												'history-action-button-active': expandedDiffIds.has(
													change.id
												),
											}"
											@click.stop="toggleDiff(change)"
										>
											(diff)
										</button>
										<button
											type="button"
											class="history-action-button"
											:class="{
												'history-action-button-active':
													expandedHistoryIds.has(change.id),
											}"
											@click.stop="toggleHistory(change)"
										>
											(hist)
										</button>
										<button
											type="button"
											class="history-action-button"
											:class="{
												'history-action-button-thanked':
													thankedRevisionIds.has(change.id),
											}"
											:disabled="thankedRevisionIds.has(change.id)"
											@click.stop="onThankClick(change, $event)"
										>
											{{
												thankedRevisionIds.has(change.id)
													? "(thanked)"
													: "(thanks)"
											}}
										</button>
									</div>
								</footer>
							</div>
						</template>
						<div v-if="expandedDiffIds.has(change.id)" class="history-inline-diff">
							<div
								v-if="loadedDiffs.get(change.id)?.diff?.length"
								class="change-diff"
							>
								<div
									v-for="(line, lineIdx) in loadedDiffs.get(change.id)!.diff"
									:key="lineIdx"
									:class="['diff-line', wiki.getDiffLineClass(line.type)]"
								>
									<span class="diff-line-text">
										<template
											v-if="
												(line.type === 0 ||
													line.type === 1 ||
													line.type === 2 ||
													line.type === 3 ||
													line.type === 4 ||
													line.type === 5) &&
												line.highlightRanges?.length
											"
										>
											<template
												v-for="(seg, segIdx) in wiki.getDiffLineSegments(
													line
												)"
												:key="segIdx"
											>
												<span
													v-if="seg.type === 'add'"
													class="diff-char-add"
													>{{ seg.text }}</span
												>
												<span
													v-else-if="seg.type === 'remove'"
													class="diff-char-remove"
													>{{ seg.text }}</span
												>
												<span
													v-else-if="seg.type === 'change'"
													class="diff-char-change"
													>{{ seg.text }}</span
												>
												<template v-else>{{ seg.text }}</template>
											</template>
										</template>
										<template v-else>{{ line.text || " " }}</template>
									</span>
								</div>
							</div>
							<div
								v-else-if="loadingDiffIds.has(change.id)"
								class="history-diff-loading"
							>
								<CdxProgressBar inline />
							</div>
							<div v-else class="history-diff-empty">No diff</div>
						</div>
						<div v-if="expandedTalkIds.has(change.id)" class="history-inline-talk">
							<div class="talk-editor">
								<textarea
									class="talk-editor-textarea"
									placeholder="Write on the editor's talk page..."
									:value="talkPageText.get(change.id) || ''"
									@input="
										updateTalkText(
											change.id,
											($event.target as HTMLTextAreaElement).value
										)
									"
								></textarea>
								<div class="talk-editor-footer">
									<!-- <CdxButton
										weight="quiet"
										action="destructive"
										@click="collapseItem(change.id)"
									>
										Cancel
									</CdxButton> -->
									<CdxButton weight="primary" @click="handleAddTopic(change)">
										Add topic
									</CdxButton>
								</div>
							</div>
						</div>
						<div
							v-if="expandedHistoryIds.has(change.id)"
							class="history-inline-history"
						>
							<div
								v-if="loadedHistories.get(change.pageName!)?.revisions?.length"
								class="history-inline-history-box"
							>
								<div
									v-for="rev in loadedHistories.get(change.pageName!)!.revisions"
									:key="rev.id"
									:class="[
										'history-item',
										{ 'history-item-current': rev.id === change.id },
									]"
									@click="
										handleHistoryItemClick(
											change.id,
											rev,
											change.pageName!,
											$event
										)
									"
								>
									<div class="history-row">
										<span class="history-time">{{
											wiki.isToday(rev.timestamp)
												? wiki.formatTime(rev.timestamp)
												: wiki.formatDate(rev.timestamp, "short")
										}}</span
										><span
											:class="[
												'history-delta',
												wiki.getDeltaClass(
													(rev.id === change.id
														? (change.delta ?? rev.delta)
														: rev.delta) ?? 0,
													false
												),
												{
													'history-delta-expanded': expandedHistoryDiffIds
														.get(change.id)
														?.has(rev.id),
												},
											]"
										>
											{{
												wiki.formatDelta(
													rev.id === change.id
														? (change.delta ?? rev.delta)
														: rev.delta
												)
											}}</span
										><a
											target="_blank"
											:href="wiki.getUserUrl(rev.user.name)"
											class="history-user"
											>{{ rev.user.name }}</a
										><CdxIcon
											v-if="wiki.getCachedUserCategoryDisplay(rev.user.name, { userTypeConfig })?.icon"
											:icon="wiki.getCachedUserCategoryDisplay(rev.user.name, { userTypeConfig })!.icon!"
											size="x-small"
											:class="[
												'user-type-icon',
												`user-type-icon-${wiki.getCachedUserCategory(rev.user.name) || ''}`,
											]"
											:style="{
												color: wiki.getCachedUserCategoryDisplay(rev.user.name, { userTypeConfig })?.color,
											}"
										/><span
											class="history-comment"
											v-html="rev.commentHtml ?? rev.comment ?? ''"
										></span>
									</div>
									<div
										v-if="expandedHistoryDiffIds.get(change.id)?.has(rev.id)"
										class="history-inline-diff history-inline-diff-nested"
									>
										<div
											v-if="loadedDiffs.get(rev.id)?.diff?.length"
											class="change-diff"
										>
											<div
												v-for="(line, lineIdx) in loadedDiffs.get(rev.id)!
													.diff"
												:key="lineIdx"
												:class="[
													'diff-line',
													wiki.getDiffLineClass(line.type),
												]"
											>
												<span class="diff-line-text">
													<template
														v-if="
															(line.type === 0 ||
																line.type === 1 ||
																line.type === 2 ||
																line.type === 3 ||
																line.type === 4 ||
																line.type === 5) &&
															line.highlightRanges?.length
														"
													>
														<template
															v-for="(
																seg, segIdx
															) in wiki.getDiffLineSegments(line)"
															:key="segIdx"
														>
															<span
																v-if="seg.type === 'add'"
																class="diff-char-add"
																>{{ seg.text }}</span
															>
															<span
																v-else-if="seg.type === 'remove'"
																class="diff-char-remove"
																>{{ seg.text }}</span
															>
															<span
																v-else-if="seg.type === 'change'"
																class="diff-char-change"
																>{{ seg.text }}</span
															>
															<template v-else>{{
																seg.text
															}}</template>
														</template>
													</template>
													<template v-else>{{
														line.text || " "
													}}</template>
												</span>
											</div>
										</div>
										<div
											v-else-if="loadingDiffIds.has(rev.id)"
											class="history-diff-loading"
										>
											<CdxProgressBar inline />
										</div>
										<div v-else class="history-diff-empty">No diff</div>
									</div>
								</div>
							</div>
							<div v-else class="history-diff-loading">
								<CdxProgressBar inline />
							</div>
						</div>
					</div>
				</div>
			</template>
			<div v-if="!isLoading && hasMore" class="load-more-container">
				<CdxButton :disabled="isLoadingMore" @click="onLoadMore">
					{{ isLoadingMore ? "Loading..." : "Load more" }}
				</CdxButton>
			</div>
		</div>

		<div class="thank-hearts-overlay" aria-hidden="true">
			<div
				v-for="heart in risingHearts"
				:key="heart.id"
				:class="['thank-heart', heart.type === 'unthank' ? 'thank-heart-broken' : '']"
				:style="{ left: heart.x + 'px', top: heart.y + 'px' }"
			>
				{{ heart.type === "unthank" ? "\</3" : "\<3" }}
			</div>
		</div>
	</main>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxProgressBar, CdxTextInput } from "@wikimedia/codex"
import {
	cdxIconArrowNext,
	cdxIconArrowPrevious,
	cdxIconLightbulb,
	cdxIconLink,
	cdxIconStar,
} from "@wikimedia/codex-icons"
import {
	FakeWiki,
	type FeedRevisionRelatedChanges as FeedRevision,
	useFeed,
	usePredictions,
	useRelatedChangesRecommendations,
} from "fakewiki"
import type { FWCompareResponse, FWPageHistoryResponse, FWRevision } from "fakewiki/types"
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"
import { isInteractiveClickTarget } from "./clickTargets"
import {
	DEFAULT_TOP_PERCENT,
	HEART_RISE_DURATION_MS,
	PROTOTYPE_NAME,
	RECOMMENDATION_HISTORY_LIMIT,
	RECOMMENDATION_MAX_PAGES,
	RECOMMENDATION_PROCESS_CONCURRENCY,
	userTypeConfig,
} from "./config"
import { loadQueries } from "./queries"
import type { HistoryRevisionWithHtml, RisingHeart } from "./types"
import { getRevisionItemZIndex } from "./zIndex"

const wiki = new FakeWiki()

const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries3")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries3")
const topPercentStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "topPercent")
const defaultPageSearchQueries = [
	"Little Mix",
	"Wet Leg",
	"Wolf Alice",
	"Jade Thirlwall",
	"Confidence Man (band)",
	"Rizzle Kicks",
]
const defaultUserSearchQueries = ["Todepond", "Samwalton9"]
const pageSearchQueries = ref<string[]>(loadQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadQueries(userStorageKey, defaultUserSearchQueries))
const scoreFilterId = "related-recommendations-score-filter"

function loadTopPercent(): number {
	const raw = localStorage.getItem(topPercentStorageKey)
	if (raw === null) return DEFAULT_TOP_PERCENT
	const n = Number(raw)
	return Number.isFinite(n) ? Math.max(1, Math.min(100, Math.round(n))) : DEFAULT_TOP_PERCENT
}
const filterKeepPercent = ref(loadTopPercent())
/** Comma-separated string for the page queries input; kept in sync with pageSearchQueries. */
const pageQueriesInput = ref(pageSearchQueries.value.join(", "))
/** Comma-separated string for the user queries input; kept in sync with userSearchQueries. */
const userQueriesInput = ref(userSearchQueries.value.join(", "))

function syncPageQueriesFromInput(): void {
	pageSearchQueries.value = pageQueriesInput.value
		.split(",")
		.map(s => s.trim())
		.filter(Boolean)
}

function syncUserQueriesFromInput(): void {
	userSearchQueries.value = userQueriesInput.value
		.split(",")
		.map(s => s.trim())
		.filter(Boolean)
}

/** Which revision ids have the inline diff expanded */
const expandedDiffIds = ref<Set<number>>(new Set())
/** Loaded diff data keyed by revision id */
const loadedDiffs = ref<Map<number, FWCompareResponse>>(new Map())
/** Revision ids currently loading their diff */
const loadingDiffIds = ref<Set<number>>(new Set())

/** Which revision ids have inline history expanded (we use change.id as key) */
const expandedHistoryIds = ref<Set<number>>(new Set())
/** Per change (change.id): set of revision ids with inline diff expanded in that history */
const expandedHistoryDiffIds = ref<Map<number, Set<number>>>(new Map())
/** Loaded history data keyed by page name (revisions include commentHtml) */
const loadedHistories = ref<
	Map<
		string,
		Omit<FWPageHistoryResponse, "revisions"> & { revisions?: HistoryRevisionWithHtml[] }
	>
>(new Map())
/** Page names currently loading history */
const loadingHistoryPageNames = ref<Set<string>>(new Set())

/** Which revision ids have the feed item body expanded */
const expandedItemIds = ref<Set<number>>(new Set())

/** Revision ids that have been "thanked" (mock) */
const thankedRevisionIds = ref<Set<number>>(new Set())
/** Rising heart particles: id, viewport position, and thank vs unthank */
const risingHearts = ref<RisingHeart[]>([])
let nextHeartId = 0

/** Shared ref so feed and recommendations use one list (user queries + recommended page names). */
const allRevisionsDataRef = ref<FWRevision[]>([])
const {
	loadRecommendations,
	loadMoreRecommendations,
	interleavedRevisions,
	getRecommendationSeedPages,
	isRecommendationsLoading,
	recommendationProgress,
} = useRelatedChangesRecommendations({
	wiki,
	pageSearchQueries,
	allRevisionsData: allRevisionsDataRef,
	filterKeepPercent,
	options: {
		defaultTopPercent: DEFAULT_TOP_PERCENT,
		recommendationHistoryLimit: RECOMMENDATION_HISTORY_LIMIT,
		recommendationMaxPages: RECOMMENDATION_MAX_PAGES,
		recommendationProcessConcurrency: RECOMMENDATION_PROCESS_CONCURRENCY,
	},
})
const { allRevisionsData, isLoading, isLoadingMore, errors, hasMore, loadFeed, loadMore } = useFeed(
	{
		wiki,
		pageSearchQueries,
		userSearchQueries,
		allRevisionsDataRef,
	}
)

/** Which revision ids have the talk page expanded */
const expandedTalkIds = ref<Set<number>>(new Set())
/** Talk page text content keyed by revision id */
const talkPageText = ref<Map<number, string>>(new Map())
/** Current editor mode: 'visual' or 'source' */
const editorMode = ref<Map<number, "visual" | "source">>(new Map())

const { getPredictionIcon, getPredictionText } = usePredictions(wiki)

/** Loading stage label and bar percent (0–100 or null for indeterminate) for the always-visible loading block. */
const loadingStage = computed(() => {
	const loading = isLoading.value || isRecommendationsLoading.value
	if (!loading) {
		return { label: "Ready", percent: 100 as number }
	}
	if (isLoading.value) {
		return { label: "Loading main feed…", percent: null as number | null }
	}
	const p = recommendationProgress.value
	if (p.listBuildingTotal > 0 && p.listBuildingCompleted < p.listBuildingTotal) {
		return { label: "Finding related pages…", percent: 10 }
	}
	if (p.historiesTotal > 0 && p.historiesLoaded < p.historiesTotal) {
		const ratio = p.historiesTotal > 0 ? p.historiesLoaded / p.historiesTotal : 0
		return {
			label: `Loading page histories… (${p.historiesLoaded} of ${p.historiesTotal})`,
			percent: Math.round(15 + 40 * ratio),
		}
	}
	if (p.processingTotal > 0 && p.processingLoaded < p.processingTotal) {
		const ratio = p.processingTotal > 0 ? p.processingLoaded / p.processingTotal : 0
		return {
			label: `Processing revisions… (${p.processingLoaded} of ${p.processingTotal})`,
			percent: Math.round(55 + 45 * ratio),
		}
	}
	return { label: "Loading…", percent: null as number | null }
})

/** Called when the "Keep top N%" slider is released; persist and reload recommendations with new percentage. */
function onSliderChange(): void {
	localStorage.setItem(topPercentStorageKey, String(filterKeepPercent.value))
	loadRecommendations()
}

async function onLoadMore(): Promise<void> {
	await loadMore()
	await loadMoreRecommendations()
}

const RESERVE_SCROLLBAR_GUTTER_CLASS = "reserve-scrollbar-gutter"

onMounted(async () => {
	document.documentElement.classList.add(RESERVE_SCROLLBAR_GUTTER_CLASS)
	await loadFeed(undefined, false)
	await loadRecommendations()
	saveSearchQueries()
	setupKeyboardNavigation()
})

function setupKeyboardNavigation(): void {
	const handleKeyDown = (event: KeyboardEvent): void => {
		// Don't handle if a form element is focused
		const activeElement = document.activeElement
		if (!activeElement) {
			return
		}
		const isInputElement =
			activeElement.tagName === "INPUT" ||
			activeElement.tagName === "TEXTAREA" ||
			activeElement.tagName === "SELECT"
		const isContentEditable =
			activeElement instanceof HTMLElement && activeElement.isContentEditable
		if (isInputElement || isContentEditable) {
			return
		}

		const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
		if (direction === 0) {
			return
		}

		const expandedIds = Array.from(expandedItemIds.value)
		if (expandedIds.length === 0) {
			return
		}

		const currentId = expandedIds[0]
		const buttonType = direction < 0 ? "previous" : "next"
		const currentButton = document.querySelector(
			`[data-navigation-button="${buttonType}"]`
		) as HTMLElement | null
		const buttonTopRelativeToViewport = currentButton
			? currentButton.getBoundingClientRect().top + window.scrollY
			: window.scrollY

		navigateToAdjacent(currentId, direction, buttonTopRelativeToViewport)
	}

	window.addEventListener("keydown", handleKeyDown)
	// Store the handler so we can remove it later
	;(window as any).__flaggedWatchlistKeyHandler = handleKeyDown
}

onUnmounted(() => {
	document.documentElement.classList.remove(RESERVE_SCROLLBAR_GUTTER_CLASS)
	const handler = (window as any).__flaggedWatchlistKeyHandler
	if (handler) {
		window.removeEventListener("keydown", handler)
		delete (window as any).__flaggedWatchlistKeyHandler
	}
})

function saveSearchQueries(): void {
	localStorage.setItem(pageStorageKey, JSON.stringify(pageSearchQueries.value))
	localStorage.setItem(userStorageKey, JSON.stringify(userSearchQueries.value))
}

async function search(): Promise<void> {
	await loadFeed(undefined, false)
	await loadRecommendations()
	saveSearchQueries()
	// Clear expanded/loaded diffs and history when feed is refreshed
	expandedDiffIds.value = new Set()
	loadedDiffs.value = new Map()
	loadingDiffIds.value = new Set()
	expandedHistoryIds.value = new Set()
	expandedHistoryDiffIds.value = new Map()
	loadedHistories.value = new Map()
	loadingHistoryPageNames.value = new Set()
	expandedItemIds.value = new Set()
	expandedTalkIds.value = new Set()
	// Keep thanked state - don't clear it on refresh
	// Keep talk page text cached
}

/** Get all revisions in order (flattened from revisionsByDate) */
const allRevisionsInOrder = computed(() => {
	const result: FWRevision[] = []
	for (const group of revisionsByDate.value) {
		result.push(...group.revisions)
	}
	return result
})

/** Group by date using groupByTimestamp for recs so they appear in the same date section as the main feed they're interleaved with. */
const revisionsByDate = computed(() => {
	const revisions = interleavedRevisions.value
	const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()
	revisions.forEach(revision => {
		const ts = (revision as FeedRevision).groupByTimestamp ?? revision.timestamp
		const key = wiki.toDateKey(ts)
		const dateLabel = wiki.formatDate(ts, "long")
		if (!grouped.has(key)) {
			grouped.set(key, { dateLabel, revisions: [] })
		}
		grouped.get(key)!.revisions.push(revision)
	})
	return Array.from(grouped.entries())
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([dateKey, data]) => ({
			dateKey,
			dateLabel: data.dateLabel,
			revisions: data.revisions,
		}))
})

function expandItem(change: FWRevision, event: MouseEvent): void {
	// Don't expand if clicking on links or buttons
	const target = event.target as HTMLElement
	if (isInteractiveClickTarget(target)) {
		return
	}
	const id = change.id
	// Add this item to the set of expanded items
	expandedItemIds.value = new Set(expandedItemIds.value).add(id)
	// Automatically expand diff view
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.add(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
	ensureDiffLoaded(change)
}

function collapseItem(id: number): void {
	expandedItemIds.value.delete(id)
	expandedDiffIds.value.delete(id)
	expandedHistoryIds.value.delete(id)
	expandedTalkIds.value.delete(id)
}

function handleItemClick(change: FWRevision, event: MouseEvent): void {
	// Only expand if not already expanded
	if (!expandedItemIds.value.has(change.id)) {
		expandItem(change, event)
	}
}

function toggleDiff(change: FWRevision): void {
	const id = change.id
	const expanded = expandedDiffIds.value.has(id)
	if (expanded) {
		expandedDiffIds.value = new Set(expandedDiffIds.value)
		expandedDiffIds.value.delete(id)
		return
	}
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.add(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(id)
	ensureDiffLoaded(change)
}

function toggleHistoryDiff(changeId: number, rev: { id: number }, pageName: string): void {
	const id = rev.id
	const set = expandedHistoryDiffIds.value.get(changeId) ?? new Set<number>()
	const expanded = set.has(id)
	let newSet: Set<number>
	if (expanded) {
		newSet = new Set(set)
		newSet.delete(id)
	} else {
		newSet = new Set(set).add(id)
	}
	expandedHistoryDiffIds.value = new Map(expandedHistoryDiffIds.value).set(changeId, newSet)
	if (expanded) return
	ensureDiffLoaded({ id, pageName })
}

function handleHistoryItemClick(
	changeId: number,
	rev: { id: number },
	pageName: string,
	event: MouseEvent
): void {
	// Don't toggle if clicking on links or buttons
	const target = event.target as HTMLElement
	if (isInteractiveClickTarget(target)) {
		return
	}
	// Toggle the diff for this history item
	toggleHistoryDiff(changeId, rev, pageName)
}

function toggleHistory(change: FWRevision): void {
	const id = change.id
	const pageName = change.pageName
	if (!pageName) return
	const expanded = expandedHistoryIds.value.has(id)
	if (expanded) {
		expandedHistoryIds.value = new Set(expandedHistoryIds.value)
		expandedHistoryIds.value.delete(id)
		return
	}
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.delete(id)
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(id)
	if (loadedHistories.value.has(pageName)) return
	loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
	loadingHistoryPageNames.value.add(pageName)
	// Clear cache so we get fresh data; cache may be stale or from getCombinedFeed pagination
	wiki.clearPageHistoryCache(pageName)
	wiki.getPageHistory(pageName)
		.then(async response => {
			const revisions = await Promise.all(
				(response.revisions || []).map(async rev => {
					// Fetch user category for history revisions
					await wiki.getUserCategory(rev.user.name)
					return {
						...rev,
						commentHtml: await wiki.getEditSummaryHtml(rev.comment || "", pageName),
					}
				})
			)
			loadedHistories.value = new Map(loadedHistories.value).set(pageName, {
				...response,
				revisions,
			})
			loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
			loadingHistoryPageNames.value.delete(pageName)
		})
		.catch(e => {
			console.error("Failed to load history", e)
			loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
			loadingHistoryPageNames.value.delete(pageName)
		})
}

function onThankClick(change: FWRevision, e: MouseEvent): void {
	e.preventDefault()
	const id = change.id
	const x = e.clientX
	const y = e.clientY
	const heartId = ++nextHeartId

	if (thankedRevisionIds.value.has(id)) {
		thankedRevisionIds.value = new Set(thankedRevisionIds.value)
		thankedRevisionIds.value.delete(id)
		risingHearts.value = [...risingHearts.value, { id: heartId, x, y: y - 15, type: "unthank" }]
	} else {
		thankedRevisionIds.value = new Set(thankedRevisionIds.value).add(id)
		risingHearts.value = [...risingHearts.value, { id: heartId, x, y: y - 15, type: "thank" }]
	}

	setTimeout(() => {
		risingHearts.value = risingHearts.value.filter(h => h.id !== heartId)
	}, HEART_RISE_DURATION_MS)
}

function getItemZIndex(dateKey: string, changeIndex: number): number {
	return getRevisionItemZIndex(revisionsByDate.value, dateKey, changeIndex)
}

function toggleTalk(change: FWRevision): void {
	const id = change.id
	const expanded = expandedTalkIds.value.has(id)
	if (expanded) {
		expandedTalkIds.value = new Set(expandedTalkIds.value)
		expandedTalkIds.value.delete(id)
		return
	}
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.delete(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
	// Initialize text content and editor mode if not already set
	if (!talkPageText.value.has(id)) {
		talkPageText.value = new Map(talkPageText.value).set(id, "")
	}
	if (!editorMode.value.has(id)) {
		editorMode.value = new Map(editorMode.value).set(id, "source")
	}
}

function updateTalkText(id: number, text: string): void {
	talkPageText.value = new Map(talkPageText.value).set(id, text)
}

function handleAddTopic(change: FWRevision): void {
	// TODO: Implement add topic functionality
	const text = talkPageText.value.get(change.id) || ""
	console.log("Add topic:", text)
	// For now, just close the talk tab
	// Keep the item expanded though
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(change.id)
}

function ensureDiffLoaded(change: Pick<FWRevision, "id" | "pageName">): void {
	if (loadedDiffs.value.has(change.id)) {
		return
	}
	const pageName = change.pageName
	if (!pageName) {
		return
	}
	loadingDiffIds.value = new Set(loadingDiffIds.value)
	loadingDiffIds.value.add(change.id)
	wiki.getRevisionDiff(pageName, change.id)
		.then(response => {
			loadedDiffs.value = new Map(loadedDiffs.value).set(change.id, response)
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(change.id)
		})
		.catch(e => {
			console.error("Failed to load diff", e)
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(change.id)
		})
}

function navigateToAdjacent(
	currentId: number,
	direction: -1 | 1,
	buttonTopRelativeToViewport: number
): void {
	const revisions = allRevisionsInOrder.value
	const currentIndex = revisions.findIndex(r => r.id === currentId)
	if (currentIndex < 0) {
		return
	}

	const nextIndex = currentIndex + direction
	if (nextIndex < 0 || nextIndex >= revisions.length) {
		return
	}

	const targetRevision = revisions[nextIndex]
	if (!targetRevision) {
		return
	}

	collapseItem(currentId)

	expandedItemIds.value = new Set(expandedItemIds.value).add(targetRevision.id)
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.add(targetRevision.id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(targetRevision.id)
	ensureDiffLoaded(targetRevision)

	const buttonType = direction < 0 ? "previous" : "next"
	nextTick(() => {
		const allItems = document.querySelectorAll(".history-item-expanded")
		for (const item of allItems) {
			const navButton = item.querySelector(
				`[data-navigation-button="${buttonType}"]`
			) as HTMLElement | null
			if (!navButton) {
				continue
			}
			const newButtonTopRelativeToViewport =
				navButton.getBoundingClientRect().top + window.scrollY
			const scrollDelta = newButtonTopRelativeToViewport - buttonTopRelativeToViewport
			window.scrollBy(0, scrollDelta)
			break
		}
	})
}

/** Navigate to previous item, maintaining scroll position */
function navigateToPrevious(currentId: number, event: MouseEvent): void {
	event.stopPropagation()
	const button = event.currentTarget as HTMLElement
	const buttonTopRelativeToViewport = button.getBoundingClientRect().top + window.scrollY
	navigateToAdjacent(currentId, -1, buttonTopRelativeToViewport)
}

/** Navigate to next item, maintaining scroll position */
function navigateToNext(currentId: number, event: MouseEvent): void {
	event.stopPropagation()
	const button = event.currentTarget as HTMLElement
	const buttonTopRelativeToViewport = button.getBoundingClientRect().top + window.scrollY
	navigateToAdjacent(currentId, 1, buttonTopRelativeToViewport)
}

/** Check if there is a previous item */
function hasPrevious(currentId: number): boolean {
	const revisions = allRevisionsInOrder.value
	const currentIndex = revisions.findIndex(r => r.id === currentId)
	return currentIndex > 0
}

/** Check if there is a next item */
function hasNext(currentId: number): boolean {
	const revisions = allRevisionsInOrder.value
	const currentIndex = revisions.findIndex(r => r.id === currentId)
	return currentIndex >= 0 && currentIndex < revisions.length - 1
}
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
