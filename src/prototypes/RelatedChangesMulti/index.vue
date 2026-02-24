<template>
	<main class="related-changes">
		<form class="page-input-form" @submit.prevent="search">
			<h1>Multi-page related changes</h1>
			<CdxLabel input-id="page-name">Page names</CdxLabel>
			<div class="page-input-row">
				<CdxTextInput
					id="page-name"
					v-model="pageName"
					autocomplete="off"
					input-type="search"
					placeholder="e.g. Wikipedia, Wikidata"
				/>
				<CdxButton type="submit">Load related changes</CdxButton>
			</div>
			<div
				v-if="allRevisionsData.length > 0 && !isMultiPage"
				class="link-type-filters"
				role="group"
				aria-label="Filter by link type"
			>
				<label class="filter-checkbox">
					<input v-model="showOutgoing" type="checkbox" />
					<CdxIcon :icon="cdxIconArrowUp" size="x-small" class="filter-icon" />
					<span>Outgoing</span>
				</label>
				<label class="filter-checkbox">
					<input v-model="showIncoming" type="checkbox" />
					<CdxIcon :icon="cdxIconArrowDown" size="x-small" class="filter-icon" />
					<span>Incoming</span>
				</label>
				<label class="filter-checkbox">
					<input v-model="showBidirectional" type="checkbox" />
					<CdxIcon :icon="cdxIconLink" size="x-small" class="filter-icon" />
					<span>Bidirectional</span>
				</label>
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
						aria-valuemin="100"
						:aria-valuenow="filterKeepPercent"
						aria-valuemax="0"
						@input="
							filterKeepPercent =
								100 - Number(($event.target as HTMLInputElement).value)
						"
						@change="saveTopPercent"
					/>
					<span class="score-filter-value" aria-hidden="true"
						>{{ filterKeepPercent }}%</span
					>
				</div>
			</div>
		</form>

		<div class="watchlist-container">
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<div v-if="isLoading" class="watchlist-loading">
				<CdxProgressBar inline />
			</div>
			<template v-else v-for="dateGroup in revisionsByDate" :key="dateGroup.dateKey">
				<h4 class="watchlist-date-header">{{ dateGroup.dateLabel }}</h4>
				<div class="watchlist-history-box">
					<div
						v-for="(change, changeIndex) in dateGroup.revisions"
						:key="`${change.pageName}-${change.timestamp}`"
						:class="[
							'history-item',
							{ 'history-item-expanded': expandedItemIds.has(change.id) },
						]"
						:style="{
							zIndex: String(getItemZIndex(dateGroup.dateKey, changeIndex)),
						}"
						@click="handleItemClick(change, $event)"
					>
						<template v-if="!expandedItemIds.has(change.id)">
							<div class="history-row">
								<span
									class="feed-count-badges"
									:title="
										getFeedCountTitle(change) +
										'. Page score: ' +
										(change.score ?? 0) +
										' (bidirectional×4, outgoing×2, backlink×1 per seed)'
									"
									:aria-label="getFeedCountTitle(change)"
								>
									<span
										class="feed-count-badge feed-count-badge-score"
										title="Page score: sum over seeds of weighted link-type presence (bidirectional×4, outgoing×2, backlink×1)"
										aria-label="Score"
										>{{ change.score ?? 0 }}</span
									>
									<span
										v-if="(change.feedCountBidirectional ?? 0) > 0"
										class="feed-count-badge"
										title="Bidirectional"
									>
										<CdxIcon
											:icon="cdxIconLink"
											size="x-small"
											class="feed-count-icon"
										/>
										{{ change.feedCountBidirectional }}
									</span>
									<span
										v-if="(change.feedCountOutgoing ?? 0) > 0"
										class="feed-count-badge"
										title="Outgoing"
									>
										<CdxIcon
											:icon="cdxIconArrowUp"
											size="x-small"
											class="feed-count-icon"
										/>
										{{ change.feedCountOutgoing }}
									</span>
									<span
										v-if="(change.feedCountBacklink ?? 0) > 0"
										class="feed-count-badge"
										title="Backlinks"
									>
										<CdxIcon
											:icon="cdxIconArrowDown"
											size="x-small"
											class="feed-count-icon"
										/>
										{{ change.feedCountBacklink }}
									</span>
								</span>
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
								/>
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
									v-if="change.delta != null"
									:class="[
										'history-delta',
										change.delta != null
											? wiki.getDeltaClass(change.delta, false)
											: 'history-delta-unknown',
										{
											'history-delta-expanded': expandedDiffIds.has(
												change.id
											),
										},
									]"
								>
									{{
										change.delta != null ? wiki.formatDelta(change.delta) : ""
									}}</span
								>
								<span class="user-name-container"
									><a
										target="_blank"
										:href="wiki.getUserUrl(change.user.name)"
										class="history-user"
										>{{ change.user.name }}</a
									>
									<CdxIcon
										v-if="getUserTypeConfig(change.user.name)?.icon"
										:class="[
											'user-type-icon',
											`user-type-icon-${getCachedUserCategory(change.user.name) || ''}`,
										]"
										:style="{
											color: getUserTypeConfig(change.user.name)?.color,
										}"
										:icon="getUserTypeConfig(change.user.name)!.icon!"
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
											change.delta != null
												? wiki.getDeltaClass(change.delta, false)
												: 'history-delta-unknown',
											{
												'history-delta-expanded': expandedDiffIds.has(
													change.id
												),
											},
										]"
										@click.stop="toggleDiff(change)"
									>
										{{
											change.delta != null
												? wiki.formatDelta(change.delta)
												: ""
										}}
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
										v-if="getUserTypeConfig(change.user.name)?.icon"
										:icon="getUserTypeConfig(change.user.name)!.icon!"
										:class="[
											'user-type-icon',
											'user-type-icon-expanded',
											`user-type-icon-${getCachedUserCategory(change.user.name) || ''}`,
										]"
										:style="{
											color: getUserTypeConfig(change.user.name)?.color,
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
								<div class="feed-count-card" :title="getFeedCountTitle(change)">
									<div class="feed-count-card-row">
										<span
											class="feed-count-card-item feed-count-card-item-score"
											:title="`Page score: ${change.score ?? 0} (bidirectional×4, outgoing×2, backlink×1 per seed)`"
										>
											<span class="feed-count-card-label">Score</span>
											<span class="feed-count-card-value">{{
												change.score ?? 0
											}}</span>
										</span>
										<span class="feed-count-card-item">
											<CdxIcon
												:icon="cdxIconLink"
												size="x-small"
												class="feed-count-card-icon"
											/>
											<span class="feed-count-card-label"
												>Bidirectional links</span
											>
											<span class="feed-count-card-value">{{
												change.feedCountBidirectional ?? 0
											}}</span>
										</span>
										<span class="feed-count-card-item">
											<CdxIcon
												:icon="cdxIconArrowUp"
												size="x-small"
												class="feed-count-card-icon"
											/>
											<span class="feed-count-card-label"
												>Outgoing links</span
											>
											<span class="feed-count-card-value">{{
												change.feedCountOutgoing ?? 0
											}}</span>
										</span>
										<span class="feed-count-card-item">
											<CdxIcon
												:icon="cdxIconArrowDown"
												size="x-small"
												class="feed-count-card-icon"
											/>
											<span class="feed-count-card-label"
												>Backlink links</span
											>
											<span class="feed-count-card-value">{{
												change.feedCountBacklink ?? 0
											}}</span>
										</span>
									</div>
								</div>
								<div
									v-if="(change.sourcePageNames?.length ?? 0) > 0"
									class="feed-source-pages"
								>
									<span class="feed-source-pages-label">Seed pages:</span>
									<ul class="feed-source-pages-list">
										<li
											v-for="name in change.sourcePageNames"
											:key="name"
											class="feed-source-page-item"
										>
											<span class="feed-source-page-name">{{ name }}</span>
											<span
												class="feed-source-page-icons"
												aria-label="Link types"
											>
												<CdxIcon
													v-if="
														(
															change.sourcePageNamesBidirectional ??
															[]
														).includes(name)
													"
													:icon="cdxIconLink"
													size="x-small"
													class="feed-source-page-icon"
													title="Bidirectional"
												/>
												<CdxIcon
													v-if="
														(
															change.sourcePageNamesOutgoing ?? []
														).includes(name)
													"
													:icon="cdxIconArrowUp"
													size="x-small"
													class="feed-source-page-icon"
													title="Outgoing"
												/>
												<CdxIcon
													v-if="
														(
															change.sourcePageNamesBacklink ?? []
														).includes(name)
													"
													:icon="cdxIconArrowDown"
													size="x-small"
													class="feed-source-page-icon"
													title="Backlink"
												/>
											</span>
										</li>
									</ul>
								</div>
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
												deltaForRev(change, rev) != null
													? wiki.getDeltaClass(
															deltaForRev(change, rev)!,
															false
														)
													: 'history-delta-unknown',
												{
													'history-delta-expanded': expandedHistoryDiffIds
														.get(change.id)
														?.has(rev.id),
												},
											]"
										>
											{{
												deltaForRev(change, rev) != null
													? wiki.formatDelta(deltaForRev(change, rev))
													: ""
											}}</span
										><a
											target="_blank"
											:href="wiki.getUserUrl(rev.user.name)"
											class="history-user"
											>{{ rev.user.name }}</a
										><CdxIcon
											v-if="getUserTypeConfig(rev.user.name)?.icon"
											:icon="getUserTypeConfig(rev.user.name)!.icon!"
											size="x-small"
											:class="[
												'user-type-icon',
												`user-type-icon-${getCachedUserCategory(rev.user.name) || ''}`,
											]"
											:style="{
												color: getUserTypeConfig(rev.user.name)?.color,
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
	cdxIconArrowDown,
	cdxIconArrowNext,
	cdxIconArrowPrevious,
	cdxIconArrowUp,
	cdxIconLink,
} from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWCompareResponse, FWPageHistoryResponse, FWRevision } from "fakewiki/types"
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { isInteractiveClickTarget } from "../FlaggedWatchlist/clickTargets"
import { HEART_RISE_DURATION_MS } from "../FlaggedWatchlist/config"
import type { HistoryRevisionWithHtml, RisingHeart } from "../FlaggedWatchlist/types"
import { usePredictions } from "../FlaggedWatchlist/usePredictions"
import { useUser } from "../FlaggedWatchlist/useUser"
import { getRevisionItemZIndex } from "../FlaggedWatchlist/zIndex"
import type { RelatedChangeRevisionMulti } from "./useRelatedPagesFeedMulti"
import { useRelatedPagesFeedMulti } from "./useRelatedPagesFeedMulti"

const PROTOTYPE_NAME = "RelatedChangesMulti"
const wiki = new FakeWiki()
const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageName")
const filterStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "linkTypeFilters")
const topPercentStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "topPercent")
const pageName = ref(
	localStorage.getItem(pageStorageKey) ||
		"Little Mix, Wet Leg, Wolf Alice, Jade Thirlwall, Confidence Man (band), Rizzle Kicks"
)

function loadFilterState(): { outgoing: boolean; incoming: boolean; bidirectional: boolean } {
	try {
		const s = localStorage.getItem(filterStorageKey)
		if (s) {
			const parsed = JSON.parse(s)
			return {
				outgoing: parsed.outgoing !== false,
				incoming: parsed.incoming !== false,
				bidirectional: parsed.bidirectional !== false,
			}
		}
	} catch {
		// ignore
	}
	return { outgoing: true, incoming: true, bidirectional: true }
}

function saveFilterState(): void {
	localStorage.setItem(
		filterStorageKey,
		JSON.stringify({
			outgoing: showOutgoing.value,
			incoming: showIncoming.value,
			bidirectional: showBidirectional.value,
		})
	)
}

const filterState = loadFilterState()
const showOutgoing = ref(filterState.outgoing)
const showIncoming = ref(filterState.incoming)
const showBidirectional = ref(filterState.bidirectional)

function loadTopPercent(): number {
	const raw = localStorage.getItem(topPercentStorageKey)
	if (raw === null) return 15
	const n = Number(raw)
	return Number.isFinite(n) ? Math.max(1, Math.min(100, Math.round(n))) : 15
}

const scoreFilterId = "related-changes-multi-score-filter"
/** Keep top N% by score (0–100). Default 15%. */
const filterKeepPercent = ref(loadTopPercent())

function saveTopPercent(): void {
	localStorage.setItem(topPercentStorageKey, String(filterKeepPercent.value))
}

/** Which revision ids have the inline diff expanded */
const expandedDiffIds = ref<Set<number>>(new Set())
const loadedDiffs = ref<Map<number, FWCompareResponse>>(new Map())
const loadingDiffIds = ref<Set<number>>(new Set())

/** Which revision ids have inline history expanded */
const expandedHistoryIds = ref<Set<number>>(new Set())
const expandedHistoryDiffIds = ref<Map<number, Set<number>>>(new Map())
const loadedHistories = ref<
	Map<
		string,
		Omit<FWPageHistoryResponse, "revisions"> & { revisions?: HistoryRevisionWithHtml[] }
	>
>(new Map())
const loadingHistoryPageNames = ref<Set<string>>(new Set())

/** Which revision ids have the feed item body expanded */
const expandedItemIds = ref<Set<number>>(new Set())

/** Revision ids that have been "thanked" (mock) */
const thankedRevisionIds = ref<Set<number>>(new Set())
const risingHearts = ref<RisingHeart[]>([])
let nextHeartId = 0

const { cacheUserCategory, getCachedUserCategory, getUserTypeConfig } = useUser()
const { getPredictionIcon, getPredictionText } = usePredictions(wiki)
const { allRevisionsData, isLoading, errors, loadFeed } = useRelatedPagesFeedMulti({
	wiki,
	pageName,
	onUserCategory: cacheUserCategory,
})

const pageNamesList = computed(() => {
	const raw = pageName.value.trim()
	if (!raw) return []
	return [
		...new Set(
			raw
				.split(",")
				.map(s => s.trim())
				.filter(Boolean)
		),
	]
})
const isMultiPage = computed(() => pageNamesList.value.length > 1)

function getFeedCountTitle(change: RelatedChangeRevisionMulti): string {
	const both = change.feedCountBidirectional ?? 0
	const out = change.feedCountOutgoing ?? 0
	const back = change.feedCountBacklink ?? 0
	const parts: string[] = []
	if (both > 0) parts.push(`${both} bidirectional`)
	if (out > 0) parts.push(`${out} outgoing`)
	if (back > 0) parts.push(`${back} backlink`)
	return parts.length ? parts.join("; ") : "No feeds"
}

const expandedTalkIds = ref<Set<number>>(new Set())
const talkPageText = ref<Map<number, string>>(new Map())
const editorMode = ref<Map<number, "visual" | "source">>(new Map())

function deltaForRev(
	change: FWRevision,
	rev: { id: number; delta?: number | null }
): number | null {
	const d =
		rev.id === change.id
			? (change.delta ?? (rev as FWRevision).delta)
			: (rev as FWRevision).delta
	return d != null ? d : null
}

watch([showOutgoing, showIncoming, showBidirectional], saveFilterState)

const RESERVE_SCROLLBAR_GUTTER_CLASS = "reserve-scrollbar-gutter"

onMounted(() => {
	document.documentElement.classList.add(RESERVE_SCROLLBAR_GUTTER_CLASS)
	if (pageName.value.trim()) {
		search()
	}
	setupKeyboardNavigation()
})

function setupKeyboardNavigation(): void {
	const handleKeyDown = (event: KeyboardEvent): void => {
		const activeElement = document.activeElement
		if (!activeElement) return
		const isInputElement =
			activeElement.tagName === "INPUT" ||
			activeElement.tagName === "TEXTAREA" ||
			activeElement.tagName === "SELECT"
		const isContentEditable =
			activeElement instanceof HTMLElement && activeElement.isContentEditable
		if (isInputElement || isContentEditable) return

		const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
		if (direction === 0) return

		const expandedIds = Array.from(expandedItemIds.value)
		if (expandedIds.length === 0) return

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
	;(window as any).__relatedChangesKeyHandler = handleKeyDown
}

onUnmounted(() => {
	document.documentElement.classList.remove(RESERVE_SCROLLBAR_GUTTER_CLASS)
	const handler = (window as any).__relatedChangesKeyHandler
	if (handler) {
		window.removeEventListener("keydown", handler)
		delete (window as any).__relatedChangesKeyHandler
	}
})

async function search(): Promise<void> {
	if (!pageName.value.trim()) return
	localStorage.setItem(pageStorageKey, pageName.value)
	await loadFeed()
	expandedDiffIds.value = new Set()
	loadedDiffs.value = new Map()
	loadingDiffIds.value = new Set()
	expandedHistoryIds.value = new Set()
	expandedHistoryDiffIds.value = new Map()
	loadedHistories.value = new Map()
	loadingHistoryPageNames.value = new Set()
	expandedItemIds.value = new Set()
	expandedTalkIds.value = new Set()
}

const filteredRevisions = computed(() => {
	const revs = allRevisionsData.value
	if (isMultiPage.value) return revs
	const out = showOutgoing.value
	const inc = showIncoming.value
	const both = showBidirectional.value
	if (out && inc && both) return revs
	return revs.filter(r => {
		const t = r.linkType
		if (!t) return true
		if (t === "to") return out
		if (t === "from") return inc
		return both
	})
})

/** Keep only the top N% of items by score (client-side; no refetch when slider changes). */
const allRevisions = computed(() => {
	const revs = filteredRevisions.value
	if (revs.length === 0) return revs
	const keepFraction = filterKeepPercent.value / 100
	const scores = revs.map(r => r.score ?? 0)
	const sortedScores = [...scores].sort((a, b) => b - a)
	const keepCount = Math.max(1, Math.ceil(revs.length * keepFraction))
	const threshold = sortedScores[keepCount - 1] ?? 0
	return revs.filter(r => (r.score ?? 0) >= threshold)
})

const allRevisionsInOrder = computed(() => {
	const result: FWRevision[] = []
	for (const group of revisionsByDate.value) {
		result.push(...group.revisions)
	}
	return result
})

const revisionsByDate = computed(
	() =>
		wiki.groupRevisionsByDate(allRevisions.value) as Array<{
			dateKey: string
			dateLabel: string
			revisions: RelatedChangeRevisionMulti[]
		}>
)

function expandItem(change: FWRevision, event: MouseEvent): void {
	const target = event.target as HTMLElement
	if (isInteractiveClickTarget(target)) return
	const id = change.id
	expandedItemIds.value = new Set(expandedItemIds.value).add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value).add(id)
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
	expandedDiffIds.value = new Set(expandedDiffIds.value).add(id)
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
	const target = event.target as HTMLElement
	if (isInteractiveClickTarget(target)) return
	toggleHistoryDiff(changeId, rev, pageName)
}

function toggleHistory(change: FWRevision): void {
	const id = change.id
	const page = change.pageName
	if (!page) return
	const expanded = expandedHistoryIds.value.has(id)
	if (expanded) {
		expandedHistoryIds.value = new Set(expandedHistoryIds.value)
		expandedHistoryIds.value.delete(id)
		return
	}
	expandedHistoryIds.value = new Set(expandedHistoryIds.value).add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.delete(id)
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(id)
	if (loadedHistories.value.has(page)) return
	loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value).add(page)
	wiki.clearPageHistoryCache(page)
	wiki.getPageHistory(page)
		.then(async response => {
			const revisions = await Promise.all(
				(response.revisions || []).map(async rev => {
					const userCategory = await wiki.getUserCategory(rev.user.name)
					cacheUserCategory(rev.user.name, userCategory)
					return {
						...rev,
						commentHtml: await wiki.getEditSummaryHtml(rev.comment || "", page),
					}
				})
			)
			loadedHistories.value = new Map(loadedHistories.value).set(page, {
				...response,
				revisions,
			})
			loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
			loadingHistoryPageNames.value.delete(page)
		})
		.catch(e => {
			console.error("Failed to load history", e)
			loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value)
			loadingHistoryPageNames.value.delete(page)
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
	expandedTalkIds.value = new Set(expandedTalkIds.value).add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.delete(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
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
	const text = talkPageText.value.get(change.id) || ""
	console.log("Add topic:", text)
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(change.id)
}

function ensureDiffLoaded(change: Pick<FWRevision, "id" | "pageName">): void {
	if (loadedDiffs.value.has(change.id)) return
	const page = change.pageName
	if (!page) return
	loadingDiffIds.value = new Set(loadingDiffIds.value).add(change.id)
	wiki.getRevisionDiff(page, change.id)
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
	if (currentIndex < 0) return

	const nextIndex = currentIndex + direction
	if (nextIndex < 0 || nextIndex >= revisions.length) return

	const targetRevision = revisions[nextIndex]
	if (!targetRevision) return

	collapseItem(currentId)

	expandedItemIds.value = new Set(expandedItemIds.value).add(targetRevision.id)
	expandedDiffIds.value = new Set(expandedDiffIds.value).add(targetRevision.id)
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
			if (!navButton) continue
			const newButtonTopRelativeToViewport =
				navButton.getBoundingClientRect().top + window.scrollY
			const scrollDelta = newButtonTopRelativeToViewport - buttonTopRelativeToViewport
			window.scrollBy(0, scrollDelta)
			break
		}
	})
}

function navigateToPrevious(currentId: number, event: MouseEvent): void {
	event.stopPropagation()
	const button = event.currentTarget as HTMLElement
	const buttonTopRelativeToViewport = button.getBoundingClientRect().top + window.scrollY
	navigateToAdjacent(currentId, -1, buttonTopRelativeToViewport)
}

function navigateToNext(currentId: number, event: MouseEvent): void {
	event.stopPropagation()
	const button = event.currentTarget as HTMLElement
	const buttonTopRelativeToViewport = button.getBoundingClientRect().top + window.scrollY
	navigateToAdjacent(currentId, 1, buttonTopRelativeToViewport)
}

function hasPrevious(currentId: number): boolean {
	const revisions = allRevisionsInOrder.value
	const currentIndex = revisions.findIndex(r => r.id === currentId)
	return currentIndex > 0
}

function hasNext(currentId: number): boolean {
	const revisions = allRevisionsInOrder.value
	const currentIndex = revisions.findIndex(r => r.id === currentId)
	return currentIndex >= 0 && currentIndex < revisions.length - 1
}
</script>

<style>
@import "../RelatedChanges/global.css";
</style>

<style scoped>
@import "./style.css";
</style>
