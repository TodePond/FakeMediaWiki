<template>
	<main class="change-types-watchlist">
		<div class="watchlist-container">
			<h1>Change types watchlist</h1>
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
						:style="{ zIndex: String(getItemZIndex(dateGroup.dateKey, changeIndex)) }"
						@click="handleItemClick(change, $event)"
					>
						<template v-if="!expandedItemIds.has(change.id)">
							<div class="history-row">
								<a target="_blank" :href="wiki.getPageUrl(change.pageName!)" class="history-page">{{ change.pageName }}</a>
								<span :class="['history-time', { 'history-time-expanded': expandedHistoryIds.has(change.id) }]">
									{{ formatTime(change.timestamp) }}</span>
								<span :class="['history-delta', wiki.getDeltaClass(change.delta ?? 0, false), { 'history-delta-expanded': expandedDiffIds.has(change.id) }]">
									{{ formatDelta(change.delta) }}</span>
								<a target="_blank" :href="wiki.getUserUrl(change.user.name)" class="history-user">{{ change.user.name }}</a>
								<span class="history-comment" v-html="change?.summary?.comment ?? ''"></span>
							</div>
						</template>
						<template v-else>
							<div class="history-expanded">
								<div class="history-title-row">
									<a target="_blank" :href="wiki.getPageUrl(change.pageName!)" class="history-page-expanded">{{ change.pageName }}</a>
									<button
										type="button"
										:class="['history-delta', wiki.getDeltaClass(change.delta ?? 0, false), { 'history-delta-expanded': expandedDiffIds.has(change.id) }]"
										@click.stop="toggleDiff(change)"
									>
										{{ formatDelta(change.delta) }}
									</button>
									<button type="button" class="history-collapse-button" @click.stop="collapseItem(change.id)" aria-label="Collapse">−</button>
								</div>
								<a target="_blank" :href="wiki.getUserUrl(change.user.name)" class="history-user-expanded">{{ change.user.name }}</a>
								<button
									type="button"
									:class="['history-date-expanded', { 'history-time-expanded': expandedHistoryIds.has(change.id) }]"
									@click.stop="toggleHistory(change)"
								>
									{{ formatRelativeDate(change.timestamp) }}
								</button>
								<div v-if="change?.summary?.comment" class="history-comment-expanded" v-html="change?.summary?.comment ?? ''"></div>
								<div class="change-types-block">
									<div class="change-types-label">Change types</div>
									<div v-if="loadingEditTypesIds.has(change.id)" class="change-types-loading">
										<CdxProgressBar inline />
									</div>
									<div v-else-if="editTypesErrorByRevId.get(change.id)" class="change-types-error">
										{{ editTypesErrorByRevId.get(change.id) }}
									</div>
									<ul v-else-if="displaySummaryByRevId.get(change.id)" class="change-types-list">
										<li
											v-for="row in getChangeTypeRows(displaySummaryByRevId.get(change.id)!)"
											:key="row.key"
											class="change-types-row"
										>
											<span class="change-types-type">{{ row.typeName }}</span>
											<span :class="['change-types-delta', row.deltaClass]">{{ row.symbol }}{{ row.count }}</span>
										</li>
									</ul>
									<div v-else class="change-types-empty">No change types</div>
								</div>
								<footer class="history-expanded-footer">
									<button
										type="button"
										class="history-action-button history-action-button-left"
										:class="{ 'history-action-button-active': expandedTalkIds.has(change.id) }"
										@click.stop="toggleTalk(change)"
									>
										(talk)
									</button>
									<div class="history-action-buttons-right">
										<button
											type="button"
											class="history-action-button"
											:class="{ 'history-action-button-active': expandedDiffIds.has(change.id) }"
											@click.stop="toggleDiff(change)"
										>
											(diff)
										</button>
										<button
											type="button"
											class="history-action-button"
											:class="{ 'history-action-button-active': expandedHistoryIds.has(change.id) }"
											@click.stop="toggleHistory(change)"
										>
											(hist)
										</button>
										<button
											type="button"
											class="history-action-button"
											:class="{ 'history-action-button-thanked': thankedRevisionIds.has(change.id) }"
											:disabled="thankedRevisionIds.has(change.id)"
											@click.stop="onThankClick(change, $event)"
										>
											{{ thankedRevisionIds.has(change.id) ? "(thanked)" : "(thanks)" }}
										</button>
									</div>
								</footer>
							</div>
						</template>
						<div v-if="expandedDiffIds.has(change.id)" class="history-inline-diff">
							<div v-if="loadedDiffs.get(change.id)?.diff?.length" class="change-diff">
								<div
									v-for="(line, lineIdx) in loadedDiffs.get(change.id)!.diff"
									:key="lineIdx"
									:class="['diff-line', wiki.getDiffLineClass(line.type)]"
								>
									<span class="diff-line-text">
										<template v-if="(line.type === 0 || line.type === 1 || line.type === 2 || line.type === 3 || line.type === 4 || line.type === 5) && line.highlightRanges?.length">
											<template v-for="(seg, segIdx) in wiki.getDiffLineSegments(line)" :key="segIdx">
												<span v-if="seg.type === 'add'" class="diff-char-add">{{ seg.text }}</span>
												<span v-else-if="seg.type === 'remove'" class="diff-char-remove">{{ seg.text }}</span>
												<span v-else-if="seg.type === 'change'" class="diff-char-change">{{ seg.text }}</span>
												<template v-else>{{ seg.text }}</template>
											</template>
										</template>
										<template v-else>{{ line.text || " " }}</template>
									</span>
								</div>
							</div>
							<div v-else-if="loadingDiffIds.has(change.id)" class="history-diff-loading">
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
									@input="updateTalkText(change.id, ($event.target as HTMLTextAreaElement).value)"
								></textarea>
								<div class="talk-editor-footer">
									<CdxButton weight="primary" @click="handleAddTopic(change)">Add topic</CdxButton>
								</div>
							</div>
						</div>
						<div v-if="expandedHistoryIds.has(change.id)" class="history-inline-history">
							<div v-if="loadedHistories.get(change.pageName!)?.revisions?.length" class="history-inline-history-box">
								<div
									v-for="rev in loadedHistories.get(change.pageName!)!.revisions"
									:key="rev.id"
									:class="['history-item', { 'history-item-current': rev.id === change.id }]"
									@click="handleHistoryItemClick(change.id, rev, change.pageName!, $event)"
								>
									<div class="history-row">
										<span class="history-time">{{ isToday(rev.timestamp) ? formatTime(rev.timestamp) : formatDateShort(rev.timestamp) }}</span>
										<span :class="['history-delta', wiki.getDeltaClass((rev.id === change.id ? (change.delta ?? rev.delta) : rev.delta) ?? 0, false), { 'history-delta-expanded': expandedHistoryDiffIds.get(change.id)?.has(rev.id) }]">
											{{ formatDelta(rev.id === change.id ? (change.delta ?? rev.delta) : rev.delta) }}</span>
										<a target="_blank" :href="wiki.getUserUrl(rev.user.name)" class="history-user">{{ rev.user.name }}</a>
										<span class="history-comment" v-html="rev.commentHtml ?? rev.comment ?? ''"></span>
									</div>
									<div v-if="expandedHistoryDiffIds.get(change.id)?.has(rev.id)" class="history-inline-diff history-inline-diff-nested">
										<div v-if="loadedDiffs.get(rev.id)?.diff?.length" class="change-diff">
											<div v-for="(line, lineIdx) in loadedDiffs.get(rev.id)!.diff" :key="lineIdx" :class="['diff-line', wiki.getDiffLineClass(line.type)]">
												<span class="diff-line-text">
													<template v-if="(line.type === 0 || line.type === 1 || line.type === 2 || line.type === 3 || line.type === 4 || line.type === 5) && line.highlightRanges?.length">
														<template v-for="(seg, segIdx) in wiki.getDiffLineSegments(line)" :key="segIdx">
															<span v-if="seg.type === 'add'" class="diff-char-add">{{ seg.text }}</span>
															<span v-else-if="seg.type === 'remove'" class="diff-char-remove">{{ seg.text }}</span>
															<span v-else-if="seg.type === 'change'" class="diff-char-change">{{ seg.text }}</span>
															<template v-else>{{ seg.text }}</template>
														</template>
													</template>
													<template v-else>{{ line.text || " " }}</template>
												</span>
											</div>
										</div>
										<div v-else-if="loadingDiffIds.has(rev.id)" class="history-diff-loading"><CdxProgressBar inline /></div>
										<div v-else class="history-diff-empty">No diff</div>
									</div>
								</div>
							</div>
							<div v-else class="history-diff-loading"><CdxProgressBar inline /></div>
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
import { CdxButton, CdxLabel, CdxProgressBar, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import type { FWEditTypesDiffSummary, FWRevision } from "fakewiki/types"
import { computed, onMounted, ref } from "vue"
import { getChangeTypeRows, getSummaryForDisplay } from "./changeTypesDisplay"
import { useChangeTypesWatchlist } from "./useChangeTypesWatchlist"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "ChangeTypesWatchlist"
const DEFAULT_PAGE_QUERIES = ["Wikipedia", "Wet Leg", "Water", "Confidence Man (band)", "Algorave"]
const DEFAULT_USER_QUERIES = ["Todepond", "Samwalton9"]

const editTypesByRevId = ref<Map<number, FWEditTypesDiffSummary | null>>(new Map())
const editTypesErrorByRevId = ref<Map<number, string>>(new Map())
const loadingEditTypesIds = ref<Set<number>>(new Set())

function loadEditTypesSummary(revId: number): void {
	if (editTypesByRevId.value.has(revId) || editTypesErrorByRevId.value.has(revId)) return
	loadingEditTypesIds.value = new Set(loadingEditTypesIds.value).add(revId)
	wiki
		.getEditTypesDiffSummary(revId)
		.then(summary => {
			editTypesByRevId.value = new Map(editTypesByRevId.value).set(revId, summary)
			editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value)
			editTypesErrorByRevId.value.delete(revId)
			loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
			loadingEditTypesIds.value.delete(revId)
		})
		.catch(e => {
			const msg = e instanceof Error ? e.message : String(e)
			editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value).set(revId, msg)
			editTypesByRevId.value = new Map(editTypesByRevId.value).set(revId, null)
			loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
			loadingEditTypesIds.value.delete(revId)
		})
}

function resetEditTypesState(): void {
	editTypesByRevId.value = new Map()
	editTypesErrorByRevId.value = new Map()
	loadingEditTypesIds.value = new Set()
}

const displaySummaryByRevId = computed(() => {
	const map = new Map<number, ReturnType<typeof getSummaryForDisplay>>()
	for (const [revId, raw] of editTypesByRevId.value) {
		map.set(revId, getSummaryForDisplay(raw as Record<string, unknown>))
	}
	return map
})

const watchlist = useChangeTypesWatchlist({
	wiki,
	prototypeName: PROTOTYPE_NAME,
	defaultPageQueries: DEFAULT_PAGE_QUERIES,
	defaultUserQueries: DEFAULT_USER_QUERIES,
	onExpandItem: (change: FWRevision) => loadEditTypesSummary(change.id),
	resetEditTypesState,
})

const {
	pageQueriesInput,
	userQueriesInput,
	syncPageQueriesFromInput,
	syncUserQueriesFromInput,
	isLoading,
	isLoadingMore,
	errors,
	hasMore,
	search,
	loadMore,
	revisionsByDate,
	formatTime,
	formatDateShort,
	isToday,
	formatRelativeDate,
	formatDelta,
	expandedDiffIds,
	expandedHistoryIds,
	expandedItemIds,
	expandedTalkIds,
	loadedDiffs,
	loadingDiffIds,
	loadedHistories,
	expandedHistoryDiffIds,
	talkPageText,
	thankedRevisionIds,
	risingHearts,
	collapseItem,
	handleItemClick,
	toggleDiff,
	toggleHistory,
	toggleTalk,
	updateTalkText,
	handleAddTopic,
	onThankClick,
	getItemZIndex,
	handleHistoryItemClick,
} = watchlist

onMounted(search)
</script>

<style scoped>
@import "./style.css";
</style>
<style>
@import "./global.css";
</style>
