<template>
	<main
		class="change-types-watchlist change-types-watchlist-details change-types-watchlist-inline"
	>
		<div class="watchlist-container">
			<h1>Delta snippets</h1>
			<form
				@submit.prevent="search"
				class="recommendation-watchlist-form watchlist-search-form"
			>
				<CdxLabel for="page-queries-input">Page queries (comma-separated)</CdxLabel>
				<div class="input-with-reset">
					<CdxTextInput
						id="page-queries-input"
						v-model="pageQueriesInput"
						input-type="text"
						class="recommendation-watchlist-input"
						autocomplete="off"
						@input="syncPageQueriesFromInput"
					/>
					<CdxButton type="button" @click="resetPageQueriesToDefault">
						Reset to default
					</CdxButton>
				</div>
				<CdxLabel for="user-queries-input">User queries (comma-separated)</CdxLabel>
				<div class="input-with-reset">
					<CdxTextInput
						id="user-queries-input"
						v-model="userQueriesInput"
						input-type="text"
						class="recommendation-watchlist-input"
						autocomplete="off"
						@input="syncUserQueriesFromInput"
					/>
					<CdxButton type="button" @click="resetUserQueriesToDefault">
						Reset to default
					</CdxButton>
				</div>
				<footer>
					<CdxButton type="submit" :disabled="isLoading">Refresh feed</CdxButton>
				</footer>
			</form>
			<div class="inline-highlight-slider-row" role="group" aria-label="Inline label density">
				<CdxLabel :input-id="highlightCountSliderId">Level of detail</CdxLabel>
				<div class="inline-highlight-slider-line">
					<input
						:id="highlightCountSliderId"
						v-model.number="highlightCount"
						type="range"
						min="1"
						:max="MAX_HIGHLIGHT_COUNT"
						step="1"
						class="inline-highlight-slider"
						:disabled="!improvedDeltaEnabled"
					/>
					<span class="inline-highlight-slider-value" aria-hidden="true">{{
						highlightCount
					}}</span>
				</div>
				<label class="inline-smart-filtering-toggle" :for="improvedDeltaCheckboxId">
					<input
						:id="improvedDeltaCheckboxId"
						v-model="improvedDeltaEnabled"
						type="checkbox"
					/>
					Structured deltas
				</label>
				<br />
				<label class="inline-smart-filtering-toggle" :for="relativeDetailLevelCheckboxId">
					<input
						:id="relativeDetailLevelCheckboxId"
						v-model="relativeDetailLevelEnabled"
						type="checkbox"
						:disabled="!improvedDeltaEnabled"
					/>
					Relative level of detail
				</label>
				<br />
				<label class="inline-smart-filtering-toggle" :for="smartFilteringCheckboxId">
					<input
						:id="smartFilteringCheckboxId"
						v-model="smartFilteringEnabled"
						type="checkbox"
						:disabled="!improvedDeltaEnabled"
					/>
					Filter out implied changes
				</label>
				<br />
				<label class="inline-smart-filtering-toggle" :for="snippetsEnabledCheckboxId">
					<input
						:id="snippetsEnabledCheckboxId"
						v-model="snippetsEnabled"
						type="checkbox"
						:disabled="!improvedDeltaEnabled"
					/>
					Show snippets
				</label>
			</div>
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<div v-if="isLoading" class="watchlist-loading">
				<CdxProgressBar inline aria-label="Loading feed" />
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
									{{ formatTime(change.timestamp) }}</span
								><span
									:class="[
										'history-delta',
										getDeltaClassForChange(change),
										{
											'history-delta-expanded': expandedDiffIds.has(
												change.id
											),
										},
									]"
								>
									<span class="history-delta-inline-info"
										><template v-if="getMostSignificantSegments(change.id)"
											>(<template
												v-for="(seg, i) in getMostSignificantSegments(
													change.id
												)"
												:key="i"
											>
												<span :class="['history-delta', seg.deltaClass]">{{
													seg.text
												}}</span
												><span
													v-if="
														i <
														getMostSignificantSegments(change.id)!
															.length -
															1
													"
													>,
												</span> </template
											>)</template
										>
										<template v-else-if="isMostSignificantLoading(change.id)"
											>(...)</template
										>
										<template v-else
											><span
												:class="[
													'history-delta',
													getRawDeltaClass(change.delta),
												]"
												>{{ formatDeltaWithCharacters(change.delta) }}</span
											></template
										></span
									>
								</span>
								<br /><a
									target="_blank"
									:href="wiki.getUserUrl(change.user.name)"
									class="history-user"
									>{{ change.user.name }}</a
								><span
									class="history-comment"
									v-html="change?.summary?.comment ?? ''"
								></span>
							</div>
						</template>
						<template v-else>
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
											getDeltaClassForChange(change),
											{
												'history-delta-expanded': expandedDiffIds.has(
													change.id
												),
											},
										]"
										@click.stop="toggleDiff(change)"
									>
										<span class="history-delta-inline-info"
											><template v-if="getMostSignificantSegments(change.id)"
												>(<template
													v-for="(seg, i) in getMostSignificantSegments(
														change.id
													)"
													:key="i"
												>
													<span
														:class="['history-delta', seg.deltaClass]"
														>{{ seg.text }}</span
													><span
														v-if="
															i <
															getMostSignificantSegments(change.id)!
																.length -
																1
														"
														>,
													</span> </template
												>)</template
											>
											<template
												v-else-if="isMostSignificantLoading(change.id)"
												>(...)</template
											>
											<template v-else
												><span
													:class="[
														'history-delta',
														getRawDeltaClass(change.delta),
													]"
													>{{
														formatDeltaWithCharacters(change.delta)
													}}</span
												></template
											></span
										>
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
								<a
									target="_blank"
									:href="wiki.getUserUrl(change.user.name)"
									class="history-user-expanded"
									>{{ change.user.name }}</a
								>
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
									{{ formatRelativeDate(change.timestamp) }}
								</button>
								<div
									v-if="change?.summary?.comment"
									class="history-comment-expanded"
									v-html="change?.summary?.comment ?? ''"
								></div>
								<!-- Snippets block: show loading, content, or error -->
								<div
									v-if="
										snippetsEnabled &&
										improvedDeltaEnabled &&
										(loadingDetailsIds.has(change.id) ||
											detailsErrorByRevId.get(change.id) ||
											getFlattenedSnippets(change.id).length > 0)
									"
									:class="[
										'change-types-block',
										'significant-changes-block',
										{
											'significant-changes-block-loading':
												loadingDetailsIds.has(change.id),
										},
									]"
								>
									<div class="change-types-label">Snippets</div>
									<div
										v-if="loadingDetailsIds.has(change.id)"
										class="watchlist-loading watchlist-loading-full-width"
									>
										<CdxProgressBar inline aria-label="Loading snippets" />
									</div>
									<div
										v-else-if="detailsErrorByRevId.get(change.id)"
										class="change-types-error"
									>
										{{ detailsErrorByRevId.get(change.id) }}
									</div>
									<div
										v-else-if="getFlattenedSnippets(change.id).length > 0"
										class="snippets-single-card"
									>
										<div
											v-for="(item, itemIdx) in getFlattenedSnippets(
												change.id
											)"
											:key="itemIdx"
											:class="[
												'snippet-item-row',
												item.kind === 'change' && 'snippet-item-row-change',
											]"
										>
											<template v-if="item.kind === 'change'">
												<div class="snippet-box snippet-box-remove">
													<span
														class="snippet-box-text snippet-box-strikethrough"
														>{{
															formatPrevCurrValue(item.before)
														}}</span
													>
												</div>
												<span class="snippet-arrow" aria-hidden="true"
													>→</span
												>
												<div class="snippet-box snippet-box-add">
													<span
														class="snippet-box-text snippet-box-bold"
														>{{ formatPrevCurrValue(item.after) }}</span
													>
												</div>
											</template>
											<template v-else-if="item.kind === 'insert'">
												<div class="snippet-box snippet-box-add">
													<span
														class="snippet-box-text snippet-box-bold"
														>{{ item.text }}</span
													>
												</div>
											</template>
											<template v-else>
												<div class="snippet-box snippet-box-remove">
													<span
														class="snippet-box-text snippet-box-strikethrough"
														>{{ item.text }}</span
													>
												</div>
											</template>
										</div>
									</div>
								</div>
								<!-- Diff block: inside expanded -->
								<div
									v-if="
										expandedDiffIds.has(change.id) ||
										loadingDiffIds.has(change.id)
									"
									:class="[
										'change-types-block',
										'history-inline-diff',
										{
											'history-inline-diff-loading': loadingDiffIds.has(
												change.id
											),
										},
									]"
								>
									<div class="change-types-label">Diff</div>
									<div
										v-if="loadedDiffs.get(change.id)?.diff?.length"
										class="change-diff"
									>
										<div
											v-for="(line, lineIdx) in loadedDiffs.get(change.id)!
												.diff"
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
										<CdxProgressBar inline aria-label="Loading diff" />
									</div>
									<div v-else class="history-diff-empty">No diff</div>
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
											isToday(rev.timestamp)
												? formatTime(rev.timestamp)
												: formatDateShort(rev.timestamp)
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
												formatDeltaWithCharacters(
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
										><span
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
											<CdxProgressBar inline aria-label="Loading diff" />
										</div>
										<div v-else class="history-diff-empty">No diff</div>
									</div>
								</div>
							</div>
							<div v-else class="history-diff-loading">
								<CdxProgressBar inline aria-label="Loading diff" />
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
import { CdxButton, CdxLabel, CdxProgressBar, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki, useStructuredDeltas } from "fakewiki"
import type { FWEditTypesDiffDetails, FWRevision, FWStructuredDeltaCandidate } from "fakewiki/types"
import { computed, onMounted, ref, watch } from "vue"
import { useChangeTypesWatchlist } from "../ChangeTypesWatchlist/useChangeTypesWatchlist"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "DeltaSnippets"
const highlightCountStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "highlightCount")
const smartFilteringStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "smartFilteringEnabled")
const improvedDeltaStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "improvedDeltaEnabled")
const relativeDetailLevelStorageKey = wiki.getStorageKey(
	PROTOTYPE_NAME,
	"relativeDetailLevelEnabled"
)
const snippetsEnabledStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "snippetsEnabled")
const DEFAULT_PAGE_QUERIES = [
	"Confidence Man (band)",
	"Algorave",
	"Little Mix",
	"Gorillaz",
	"Jade Thirlwall",
	"Wet Leg",
]
const DEFAULT_USER_QUERIES = ["Todepond", "Samwalton9"]
const DEFAULT_HIGHLIGHT_COUNT = 1
const DEFAULT_SMART_FILTERING_ENABLED = true
const DEFAULT_IMPROVED_DELTA_ENABLED = true
const DEFAULT_RELATIVE_DETAIL_LEVEL_ENABLED = true

const editTypesDetailsByRevId = ref<Map<number, FWEditTypesDiffDetails | null>>(new Map())
const detailsErrorByRevId = ref<Map<number, string>>(new Map())
const loadingDetailsIds = ref<Set<number>>(new Set())

const MAX_HIGHLIGHT_COUNT = wiki.STRUCTURED_DELTA_MAX_HIGHLIGHT_COUNT
const highlightCountSliderId = "highlight-count-slider"
const smartFilteringCheckboxId = "smart-filtering-checkbox"
const improvedDeltaCheckboxId = "improved-delta-checkbox"
const relativeDetailLevelCheckboxId = "relative-detail-level-checkbox"
function loadHighlightCount(): number {
	const raw = localStorage.getItem(highlightCountStorageKey)
	if (raw === null) return DEFAULT_HIGHLIGHT_COUNT
	const n = Number(raw)
	return Number.isFinite(n)
		? Math.max(1, Math.min(MAX_HIGHLIGHT_COUNT, Math.round(n)))
		: DEFAULT_HIGHLIGHT_COUNT
}
const initialHighlightCount = loadHighlightCount()
function loadSmartFilteringEnabled(): boolean {
	const raw = localStorage.getItem(smartFilteringStorageKey)
	if (raw === null) return DEFAULT_SMART_FILTERING_ENABLED
	return raw === "true"
}
const initialSmartFilteringEnabled = loadSmartFilteringEnabled()
function loadImprovedDeltaEnabled(): boolean {
	const raw = localStorage.getItem(improvedDeltaStorageKey)
	if (raw === null) return DEFAULT_IMPROVED_DELTA_ENABLED
	return raw === "true"
}
const initialImprovedDeltaEnabled = loadImprovedDeltaEnabled()
function loadRelativeDetailLevelEnabled(): boolean {
	const raw = localStorage.getItem(relativeDetailLevelStorageKey)
	if (raw === null) return DEFAULT_RELATIVE_DETAIL_LEVEL_ENABLED
	return raw === "true"
}
const initialRelativeDetailLevelEnabled = loadRelativeDetailLevelEnabled()

const snippetsEnabledCheckboxId = "snippets-enabled-checkbox"
function loadSnippetsEnabled(): boolean {
	const raw = localStorage.getItem(snippetsEnabledStorageKey)
	if (raw === null) return false
	return raw === "true"
}
const snippetsEnabled = ref(loadSnippetsEnabled())

function getDetailsPayload(details: FWEditTypesDiffDetails | null): Record<string, unknown> | null {
	if (!details || typeof details !== "object") return null
	const inner = (details as { details?: Record<string, unknown> }).details
	if (inner && typeof inner === "object") return inner
	const result: Record<string, unknown> = {}
	for (const key of ["context", "nodes", "text", "node-edits", "text-edits"]) {
		const val = (details as Record<string, unknown>)[key]
		if (Array.isArray(val)) result[key] = val
	}
	return Object.keys(result).length > 0 ? result : null
}

function getDetailItemOperation(
	item: Record<string, unknown>
): "insert" | "remove" | "change" | null {
	const edittype = (item.edittype ?? item.action) as string | undefined
	if (edittype == null || typeof edittype !== "string") return null
	const v = edittype.toLowerCase()
	if (v === "insert" || v === "add") return "insert"
	if (v === "remove" || v === "delete") return "remove"
	if (v === "change" || v === "move") return "change"
	return null
}

function getContextItemContent(item: Record<string, unknown>): string {
	const v = item.text ?? item.name ?? item.title ?? item.value
	if (v == null) return ""
	if (typeof v === "string") return v
	return formatDetailValue(v)
}

function formatDetailValue(v: unknown): string {
	if (v === null) return "null"
	if (v === undefined) return "—"
	if (typeof v === "string") return v
	if (typeof v === "number" || typeof v === "boolean") return String(v)
	if (Array.isArray(v)) {
		if (v.length === 0) return "[]"
		if (v.every(item => item === null || typeof item !== "object"))
			return v.map(item => formatDetailValue(item)).join(", ")
		return `[${v.length} items]`
	}
	if (typeof v === "object") return "[object]"
	return String(v)
}

function getPrevValue(entry: Record<string, unknown>): unknown {
	return entry.prev ?? entry.before ?? entry.old ?? entry.previous
}
function getCurrValue(entry: Record<string, unknown>): unknown {
	return entry.curr ?? entry.after ?? entry.new ?? entry.current
}
function formatPrevCurrValue(v: unknown): string {
	if (v === null || v === undefined) return "—"
	if (typeof v === "string") return v
	if (typeof v === "number" || typeof v === "boolean") return String(v)
	if (Array.isArray(v)) return v.map(formatPrevCurrValue).join(", ")
	if (typeof v === "object") {
		const o = v as Record<string, unknown>
		const name = o.name ?? o.key ?? o.param
		const value = o.value ?? o.text
		if (name != null && value !== undefined)
			return `${String(name)}\n${formatPrevCurrValue(value)}`
		return Object.entries(o)
			.map(([k, val]) => `${k}: ${formatPrevCurrValue(val)}`)
			.join("\n")
	}
	return String(v)
}

/** True if the displayed string is effectively blank (placeholder or empty). */
function isBlankSnippetDisplay(s: string): boolean {
	const t = s.trim()
	return t === "" || t === "—"
}

/** Canonicalize type name for matching (same as FakeWiki). */
function canonicalizeType(value: string): string {
	return value.toLowerCase().replace(/[\s_-]+/g, "")
}

function isDetailObject(item: unknown): item is Record<string, unknown> {
	return item !== null && typeof item === "object" && !Array.isArray(item)
}

/** Collect all detail items from payload (context, text-edits, node-edits). */
function getAllDetailItems(
	payload: Record<string, unknown> | null
): Array<Record<string, unknown>> {
	if (!payload) return []
	const order = ["context", "nodes", "text", "node-edits", "text-edits"]
	const items: Array<Record<string, unknown>> = []
	for (const key of order) {
		const val = payload[key]
		if (Array.isArray(val)) {
			for (const item of val) {
				if (isDetailObject(item)) items.push(item)
			}
		}
	}
	return items
}

/** Match detail item type to candidate canonicalType. */
function detailTypeMatchesCandidate(
	item: Record<string, unknown>,
	candidate: FWStructuredDeltaCandidate
): boolean {
	const itemType = item.type ?? item.edittype
	if (itemType == null) return false
	const normalizedItem = canonicalizeType(String(itemType))
	const normalizedCanonical = canonicalizeType(candidate.canonicalType)
	return normalizedItem === normalizedCanonical
}

/**
 * When the API represents a "change" as adjacent remove + insert (e.g. word change
 * "Trip" → "trip"), find pairs of consecutive remove-then-insert items of the same type.
 * Returns up to maxPairs pairs of [before, after] (removed content, inserted content).
 */
function getChangePairsFromRemoveInsert(
	items: Array<Record<string, unknown>>,
	typeMatches: (item: Record<string, unknown>) => boolean,
	maxPairs: number
): Array<{ before: unknown; after: unknown }> {
	const ofType = items
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => typeMatches(item))
	const pairs: Array<{ before: unknown; after: unknown }> = []
	for (let i = 0; i < ofType.length - 1 && pairs.length < maxPairs; i++) {
		const a = getDetailItemOperation(ofType[i].item)
		const b = getDetailItemOperation(ofType[i + 1].item)
		if (a === "remove" && b === "insert") {
			pairs.push({
				before: getContextItemContent(ofType[i].item) || "—",
				after: getContextItemContent(ofType[i + 1].item) || "—",
			})
			i++ // skip the insert so we don't pair it again
		}
	}
	return pairs
}

export type SnippetEntry =
	| { candidate: FWStructuredDeltaCandidate; snippets: string[] }
	| {
			candidate: FWStructuredDeltaCandidate
			pairs: Array<{ before: unknown; after: unknown }>
	  }

/** Build snippet entries for a given list of candidates (e.g. one level). Returns first non-empty set. */
function tryBuildEntriesForCandidates(
	candidates: FWStructuredDeltaCandidate[],
	allItems: Array<Record<string, unknown>>
): SnippetEntry[] {
	const result: SnippetEntry[] = []
	for (const candidate of candidates) {
		if (candidate.kind === "change") {
			const matchingChange = allItems.filter(
				item =>
					detailTypeMatchesCandidate(item, candidate) &&
					getDetailItemOperation(item) === "change"
			)
			const takeChange = matchingChange.slice(0, candidate.count)
			const pairs: Array<{ before: unknown; after: unknown }> = []
			if (takeChange.length > 0) {
				for (const item of takeChange) {
					pairs.push({
						before: getPrevValue(item),
						after: getCurrValue(item),
					})
				}
			} else {
				const typeMatches = (item: Record<string, unknown>) =>
					detailTypeMatchesCandidate(item, candidate)
				pairs.push(
					...getChangePairsFromRemoveInsert(allItems, typeMatches, candidate.count)
				)
			}
			if (pairs.length > 0) {
				const nonBlankPairs = pairs.filter(
					p =>
						!isBlankSnippetDisplay(formatPrevCurrValue(p.before)) ||
						!isBlankSnippetDisplay(formatPrevCurrValue(p.after))
				)
				if (nonBlankPairs.length > 0) {
					result.push({ candidate, pairs: nonBlankPairs })
				}
			}
		} else {
			const matching = allItems.filter(
				item =>
					detailTypeMatchesCandidate(item, candidate) &&
					getDetailItemOperation(item) === candidate.kind
			)
			const take = matching.slice(0, candidate.count)
			const snippets = take
				.map(item => getContextItemContent(item) || "—")
				.filter(s => !isBlankSnippetDisplay(s))
			if (snippets.length > 0) {
				result.push({ candidate, snippets })
			}
		}
	}
	return result
}

function getSnippetEntries(revId: number): SnippetEntry[] {
	const candidates = getCandidatesForSnippets(revId)
	const details = editTypesDetailsByRevId.value.get(revId) ?? null
	if (!candidates?.length || !details) return []
	const payload = getDetailsPayload(details)
	const allItems = getAllDetailItems(payload)

	// Only consider levels at or above (same or more significant than) the delta's level — never deeper
	const highlighted = getHighlightedCandidates(revId)
	const startingLevelIndex =
		highlighted?.length && highlighted[0]
			? wiki.getStructuredDeltaLevelIndex(highlighted[0].canonicalType)
			: Math.max(
					0,
					...candidates
						.map(c => wiki.getStructuredDeltaLevelIndex(c.canonicalType))
						.filter(l => l !== Number.MAX_SAFE_INTEGER)
				)
	const candidatesAtOrAbove = candidates.filter(
		c => wiki.getStructuredDeltaLevelIndex(c.canonicalType) <= startingLevelIndex
	)
	if (candidatesAtOrAbove.length === 0) return []

	// Try delta level first, then climb up (more significant) until we find a snippet set
	for (let levelIndex = startingLevelIndex; levelIndex >= 0; levelIndex--) {
		const atLevel = candidatesAtOrAbove.filter(
			c => wiki.getStructuredDeltaLevelIndex(c.canonicalType) === levelIndex
		)
		if (atLevel.length === 0) continue
		const result = tryBuildEntriesForCandidates(atLevel, allItems)
		if (result.length > 0) return result
	}
	return []
}

export type FlattenedSnippet =
	| { kind: "insert"; text: string }
	| { kind: "remove"; text: string }
	| { kind: "change"; before: unknown; after: unknown }

function getFlattenedSnippets(revId: number): FlattenedSnippet[] {
	const entries = getSnippetEntries(revId)
	const flat: FlattenedSnippet[] = []
	for (const entry of entries) {
		if ("pairs" in entry) {
			for (const pair of entry.pairs) {
				flat.push({ kind: "change", before: pair.before, after: pair.after })
			}
		} else {
			for (const text of entry.snippets) {
				flat.push(
					entry.candidate.kind === "insert"
						? { kind: "insert", text }
						: { kind: "remove", text }
				)
			}
		}
	}
	return flat
}

function loadEditTypesDetails(revId: number): void {
	if (editTypesDetailsByRevId.value.has(revId) || detailsErrorByRevId.value.has(revId)) return
	loadingDetailsIds.value = new Set(loadingDetailsIds.value).add(revId)
	wiki.getEditTypesDetails(revId)
		.then(details => {
			editTypesDetailsByRevId.value = new Map(editTypesDetailsByRevId.value).set(
				revId,
				details
			)
			detailsErrorByRevId.value = new Map(detailsErrorByRevId.value)
			detailsErrorByRevId.value.delete(revId)
			loadingDetailsIds.value = new Set(loadingDetailsIds.value)
			loadingDetailsIds.value.delete(revId)
		})
		.catch(e => {
			const msg = e instanceof Error ? e.message : String(e)
			detailsErrorByRevId.value = new Map(detailsErrorByRevId.value).set(revId, msg)
			editTypesDetailsByRevId.value = new Map(editTypesDetailsByRevId.value).set(revId, null)
			loadingDetailsIds.value = new Set(loadingDetailsIds.value)
			loadingDetailsIds.value.delete(revId)
		})
}

function resetEditTypesState(): void {
	resetStructuredDeltaState()
	editTypesDetailsByRevId.value = new Map()
	detailsErrorByRevId.value = new Map()
	loadingDetailsIds.value = new Set()
}

function onExpandItem(change: FWRevision): void {
	loadEditTypesSummary(change.id)
	loadEditTypesDetails(change.id)
}

const watchlist = useChangeTypesWatchlist({
	wiki,
	prototypeName: PROTOTYPE_NAME,
	defaultPageQueries: DEFAULT_PAGE_QUERIES,
	defaultUserQueries: DEFAULT_USER_QUERIES,
	onExpandItem,
	resetEditTypesState,
})

const {
	pageQueriesInput,
	userQueriesInput,
	syncPageQueriesFromInput,
	syncUserQueriesFromInput,
	resetPageQueriesToDefault,
	resetUserQueriesToDefault,
	allRevisionsData,
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

const revisionIds = computed(() => allRevisionsData.value.map(revision => revision.id))
const {
	highlightCount,
	improvedDeltaEnabled,
	relativeDetailLevelEnabled,
	smartFilteringEnabled,
	loadEditTypesSummary,
	resetStructuredDeltaState,
	getMostSignificantSegments,
	getCandidatesForSnippets,
	getHighlightedCandidates,
	isMostSignificantLoading,
	getDeltaClassForRevision,
} = useStructuredDeltas({
	wiki,
	revisionIds,
	initialSettings: {
		highlightCount: initialHighlightCount,
		improvedDeltaEnabled: initialImprovedDeltaEnabled,
		relativeDetailLevelEnabled: initialRelativeDetailLevelEnabled,
		smartFilteringEnabled: initialSmartFilteringEnabled,
	},
})

function formatDeltaWithCharacters(delta: number | null | undefined): string {
	return formatDelta(delta ?? null)
}

function getRawDeltaClass(delta: number | null | undefined): string {
	return wiki.getDeltaClass(delta ?? 0, false)
}

function getDeltaClassForChange(change: FWRevision): string {
	return getDeltaClassForRevision(change.id, change.delta)
}

watch(
	() => highlightCount.value,
	value => {
		localStorage.setItem(highlightCountStorageKey, String(value))
	}
)

watch(
	() => smartFilteringEnabled.value,
	value => {
		localStorage.setItem(smartFilteringStorageKey, String(value))
	}
)

watch(
	() => improvedDeltaEnabled.value,
	value => {
		localStorage.setItem(improvedDeltaStorageKey, String(value))
	}
)

watch(
	() => relativeDetailLevelEnabled.value,
	value => {
		localStorage.setItem(relativeDetailLevelStorageKey, String(value))
	}
)

watch(
	() => snippetsEnabled.value,
	value => {
		localStorage.setItem(snippetsEnabledStorageKey, String(value))
	}
)

onMounted(search)
</script>

<style scoped>
@import "../ChangeTypesWatchlistInline/style.css";

/* Full-width loading containers so progress indicator is visible */
.watchlist-loading,
.history-diff-loading {
	width: 100%;
	min-height: 2rem;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0.75rem 0;
}

/* Full-width loading wrapper for progress bar in flex layout */
.watchlist-loading-full-width {
	flex: 1 1 100%;
	min-width: 0;
	width: 100%;
}

/* Ensure Codex progress bar fills the container */
.watchlist-loading-full-width :deep(.cdx-progress-bar),
.history-diff-loading :deep(.cdx-progress-bar) {
	width: 100%;
}

/* Snippets block when loading: full width so bar is visible, zero height so no layout jump */
.significant-changes-block-loading {
	width: 100%;
	min-width: 0;
	/* height: 0; */
	/* min-height: 0; */
	overflow: visible;
	position: relative;
	z-index: 1;
}

.significant-changes-block-loading .change-types-label {
	/* position: absolute;
	top: 0;
	left: 0;
	margin: 0; */
}

.significant-changes-block-loading .watchlist-loading {
	/* position: absolute;
	top: 1.25rem;
	left: 0;
	right: 0;
	padding: 0; */
	/* min-height: 0; */
}

/* Diff block when loading: full width so bar is visible, zero height so no layout jump */
.history-inline-diff-loading {
	width: 100%;
	/* min-width: 0; */
	/* height: 0; */
	/* min-height: 0; */
	overflow: visible;
	position: relative;
}

.history-inline-diff-loading .change-types-label {
	/* position: absolute; */
	/* top: 0; */
	/* left: 0; */
	/* margin: 0; */
}

.history-inline-diff-loading .history-diff-loading {
	/* position: absolute; */
	/* top: 0.5rem; */
	/* left: 0; */
	/* right: 0; */
	/* padding: 0; */
	/* min-height: 0; */
}

/* Single card: match FlaggedWatchlist flag/prediction card look */
.snippets-single-card {
	/* background-color: var(--background-color-subtle, #f8f9fa); */
	/* border: 1px solid var(--border-color-subtle); */
	/* border-radius: 2px; */
	/* padding: 0.75rem 1rem; */
	width: 100%;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.snippet-item-row {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 0.5rem 0.75rem;
	width: 100%;
	min-width: 0;
}

/* Change rows: before and after stay on one line (horizontal layout) */
.snippet-item-row-change {
	flex-wrap: nowrap;
}
.snippet-item-row-change .snippet-box {
	flex: 1 1 min-content;
	min-width: min-content;
	word-break: normal;
}

.snippet-box {
	padding: 0.35rem 0.5rem;
	font-size: 0.8125rem;
	line-height: 1.4;
	word-break: break-word;
	border: 1px solid var(--border-color-base);
}

.snippet-box-add {
	background-color: var(--green300);
	color: var(--color-base);
}

.snippet-box-remove {
	background-color: var(--red300);
	color: var(--color-base);
}

.snippet-box-text {
	display: inline;
}

.snippet-box-bold {
	font-weight: 700;
}

.snippet-box-strikethrough {
	text-decoration: line-through;
}

.snippet-arrow {
	color: var(--color-subtle);
	font-size: 1.125rem;
	font-weight: 700;
	line-height: 1;
	flex-shrink: 0;
	margin-top: 0.35rem;
}

/* Legacy (kept for any remaining use) */
.snippet-before-after {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem 1rem;
	width: 100%;
	min-width: 0;
}
.snippet-before-after + .snippet-before-after {
	margin-top: 0.5rem;
}
.snippet-change-table {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	width: 100%;
	min-width: 0;
}
.snippet-change-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem 1rem;
	width: 100%;
	min-width: 0;
}
.snippet-change-row .change-types-details-prev-curr-box {
	flex: 1;
	min-width: 0;
}
.snippet-change-header {
	margin-bottom: 0.15rem;
}
.snippet-change-header .snippet-box-label {
	flex: 1;
	min-width: 0;
}
.snippet-box-with-label {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	flex: 1;
	min-width: 0;
}
.snippet-box-label {
	font-size: 0.7rem;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	font-weight: 600;
	color: var(--color-subtle);
}
</style>

<style>
@import "../ChangeTypesWatchlistInline/global.css";
</style>
