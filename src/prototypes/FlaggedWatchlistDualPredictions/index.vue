<template>
	<main class="flagged-watchlist">
		<div class="watchlist-container">
			<h1>Multiple flag watchlist</h1>
			<form @submit.prevent="search" class="recommendation-watchlist-form watchlist-search-form">
				<CdxLabel for="page-queries-input">Page queries (comma-separated)</CdxLabel>
				<CdxTextInput
					id="page-queries-input"
					v-model="pageQueriesInput"
					input-type="text"
					class="recommendation-watchlist-input"
					autocomplete="off"
					@input="syncPageQueriesFromInput"
				/>
				<CdxLabel for="user-queries-input">User queries (comma-separated)</CdxLabel>
				<CdxTextInput
					id="user-queries-input"
					v-model="userQueriesInput"
					input-type="text"
					class="recommendation-watchlist-input"
					autocomplete="off"
					@input="syncUserQueriesFromInput"
				/>
				<footer>
					<CdxButton type="submit" :disabled="isLoading">Refresh feed</CdxButton>
				</footer>
			</form>
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
									v-if="
										getPredictionIconForModel(change.id, 'damaging').icon ||
										getPredictionIconForModel(change.id, 'goodfaith').icon
									"
									class="prediction-icons-dual"
								>
									<CdxIcon
										v-if="getPredictionIconForModel(change.id, 'damaging').icon"
										:icon="getPredictionIconForModel(change.id, 'damaging').icon!"
										:style="{
											color: getPredictionIconForModel(change.id, 'damaging').color,
										}"
										:class="[
											'prediction-icon',
											{
												'prediction-icon-loading': getPredictionIconForModel(
													change.id,
													'damaging'
												).isLoading,
											},
										]"
										size="small"
										title="Damaging prediction"
									/>
									<CdxIcon
										v-if="getPredictionIconForModel(change.id, 'goodfaith').icon"
										:icon="getPredictionIconForModel(change.id, 'goodfaith').icon!"
										:style="{
											color: getPredictionIconForModel(change.id, 'goodfaith').color,
										}"
										:class="[
											'prediction-icon',
											{
												'prediction-icon-loading': getPredictionIconForModel(
													change.id,
													'goodfaith'
												).isLoading,
											},
										]"
										size="small"
										title="Good faith prediction"
									/>
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
								<div
									v-if="getPredictionPercentages(change.id)"
									class="prediction-percentages"
								>
									<span class="prediction-percentages-item">
										<span class="prediction-percentages-label">Damaging:</span>
										<span class="prediction-percentages-value">{{
											Math.round(
												(getPredictionPercentages(change.id)!.damaging ?? 0) *
													100
											)
										}}%</span>
									</span>
									<span class="prediction-percentages-item">
										<span class="prediction-percentages-label">Good faith:</span>
										<span class="prediction-percentages-value">{{
											Math.round(
												(getPredictionPercentages(change.id)!.goodfaith ?? 0) *
													100
											)
										}}%</span>
									</span>
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
				<CdxButton :disabled="isLoadingMore" @click="loadMore">
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
import { cdxIconArrowNext, cdxIconArrowPrevious } from "@wikimedia/codex-icons"
import { FakeWiki, useFeed, usePredictions } from "fakewiki"
import type { FWCompareResponse, FWPageHistoryResponse, FWRevision } from "fakewiki/types"
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"
import { isInteractiveClickTarget } from "../FlaggedWatchlist/clickTargets"
import {
	defaultPageSearchQueries,
	defaultUserSearchQueries,
	HEART_RISE_DURATION_MS,
	PROTOTYPE_NAME,
	userTypeConfig,
} from "./config"
import { loadQueries } from "../FlaggedWatchlist/queries"
import type { HistoryRevisionWithHtml, RisingHeart } from "../FlaggedWatchlist/types"
import { getRevisionItemZIndex } from "../FlaggedWatchlist/zIndex"

const wiki = new FakeWiki()

const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries2")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries2")
const pageSearchQueries = ref<string[]>(loadQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadQueries(userStorageKey, defaultUserSearchQueries))
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

const { allRevisionsData, isLoading, isLoadingMore, errors, hasMore, loadFeed, loadMore } = useFeed(
	{
		wiki,
		pageSearchQueries,
		userSearchQueries,
	}
)

/** Which revision ids have the talk page expanded */
const expandedTalkIds = ref<Set<number>>(new Set())
/** Talk page text content keyed by revision id */
const talkPageText = ref<Map<number, string>>(new Map())
/** Current editor mode: 'visual' or 'source' */
const editorMode = ref<Map<number, "visual" | "source">>(new Map())

const {
	getPredictionIconForModel,
	getPredictionPercentages,
} = usePredictions(wiki)

onMounted(() => {
	search()
	setupKeyboardNavigation()
})

function setupKeyboardNavigation(): void {
	const handleKeyDown = (event: KeyboardEvent): void => {
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
	;(window as any).__flaggedWatchlistKeyHandler = handleKeyDown
}

onUnmounted(() => {
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
	saveSearchQueries()
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

const allRevisions = computed(() => allRevisionsData.value)

const allRevisionsInOrder = computed(() => {
	const result: FWRevision[] = []
	for (const group of revisionsByDate.value) {
		result.push(...group.revisions)
	}
	return result
})

const revisionsByDate = computed(() => {
	return wiki.groupRevisionsByDate(allRevisions.value)
})

function expandItem(change: FWRevision, event: MouseEvent): void {
	const target = event.target as HTMLElement
	if (isInteractiveClickTarget(target)) {
		return
	}
	const id = change.id
	expandedItemIds.value = new Set(expandedItemIds.value).add(id)
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
	const target = event.target as HTMLElement
	if (isInteractiveClickTarget(target)) {
		return
	}
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
	wiki.clearPageHistoryCache(pageName)
	wiki.getPageHistory(pageName)
		.then(async response => {
			const revisions = await Promise.all(
				(response.revisions || []).map(async rev => {
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

<style scoped>
@import "./style.css";
</style>

<style>
@import "../FlaggedWatchlist/global.css";
</style>
