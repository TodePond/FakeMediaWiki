<template>
	<main
		class="change-types-watchlist change-types-watchlist-details change-types-watchlist-inline"
	>
		<div class="watchlist-container">
			<h1>Structured deltas</h1>
			<form
				@submit.prevent="search"
				class="recommendation-watchlist-form watchlist-search-form"
			>
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
			</div>
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
import { CdxButton, CdxLabel, CdxProgressBar, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki, useStructuredDeltas } from "fakewiki"
import type { FWEditTypesDiffDetails, FWRevision } from "fakewiki/types"
import { computed, onMounted, ref, watch } from "vue"
import { useChangeTypesWatchlist } from "../ChangeTypesWatchlist/useChangeTypesWatchlist"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "ChangeTypesWatchlistInline"
const highlightCountStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "highlightCount")
const smartFilteringStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "smartFilteringEnabled")
const improvedDeltaStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "improvedDeltaEnabled")
const relativeDetailLevelStorageKey = wiki.getStorageKey(
	PROTOTYPE_NAME,
	"relativeDetailLevelEnabled"
)
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
const MAX_VALUE_LENGTH = 120
/** Details (unused in template, kept for compatibility while refactoring) */
const editTypesDetailsByRevId = ref<Map<number, FWEditTypesDiffDetails | null>>(new Map())
const detailsErrorByRevId = ref<Map<number, string>>(new Map())
const loadingDetailsIds = ref<Set<number>>(new Set())

const expandedDetailValues = ref<Set<string>>(new Set())
const collapsedDetailsSectionKeys = ref<Set<string>>(new Set())
const collapsedDetailsItemKeys = ref<Set<string>>(new Set())

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

function detailsSectionKey(revId: number, sectionKey: string): string {
	return `${revId}-${sectionKey}`
}
function detailsItemKey(revId: number, sectionKey: string, idx: number): string {
	return `${revId}-${sectionKey}-${idx}`
}
function isSectionCollapsed(revId: number, sectionKey: string): boolean {
	return collapsedDetailsSectionKeys.value.has(detailsSectionKey(revId, sectionKey))
}
function isDetailItemCollapsed(revId: number, sectionKey: string, idx: number): boolean {
	return collapsedDetailsItemKeys.value.has(detailsItemKey(revId, sectionKey, idx))
}
function toggleDetailsSection(revId: number, sectionKey: string): void {
	const key = detailsSectionKey(revId, sectionKey)
	const next = new Set(collapsedDetailsSectionKeys.value)
	if (next.has(key)) next.delete(key)
	else next.add(key)
	collapsedDetailsSectionKeys.value = next
}
function toggleDetailsItem(revId: number, sectionKey: string, idx: number): void {
	const key = detailsItemKey(revId, sectionKey, idx)
	const next = new Set(collapsedDetailsItemKeys.value)
	if (next.has(key)) next.delete(key)
	else next.add(key)
	collapsedDetailsItemKeys.value = next
}

const SECTION_TITLES: Record<string, string> = {
	context: "Context",
	"node-edits": "Node edits",
	node_edits: "Node edits",
	nodes: "Node edits",
	"text-edits": "Text edits",
	text_edits: "Text edits",
	text: "Text edits",
}
function humanizeSectionKey(key: string): string {
	return SECTION_TITLES[key] ?? key.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

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

function getDetailsSections(
	details: FWEditTypesDiffDetails
): Array<{ key: string; title: string; items: unknown[] }> {
	const payload = getDetailsPayload(details)
	if (!payload) return []
	const order = ["context", "nodes", "text", "node-edits", "text-edits"]
	const sections: Array<{ key: string; title: string; items: unknown[] }> = []
	for (const key of order) {
		const val = payload[key]
		if (Array.isArray(val) && val.length > 0) {
			const items = [...val]
			sections.push({ key, title: humanizeSectionKey(key), items })
		}
	}
	return sections
}
function hasAnyDetailsSections(details: FWEditTypesDiffDetails): boolean {
	return getDetailsSections(details).length > 0
}
function isDetailObject(item: unknown): item is Record<string, unknown> {
	return item !== null && typeof item === "object" && !Array.isArray(item)
}
function isContextSection(sectionKey: string): boolean {
	return sectionKey.toLowerCase() === "context"
}

function getContextItemContent(item: Record<string, unknown>): string {
	const v = item.text ?? item.name ?? item.title ?? item.value
	if (v == null) return ""
	if (typeof v === "string") return v
	return formatDetailValue(v)
}

const ACTION_DISPLAY: Record<string, { symbol: string; deltaClass: string }> = {
	insert: { symbol: "+", deltaClass: "change-types-delta-add" },
	remove: { symbol: "-", deltaClass: "change-types-delta-remove" },
	change: { symbol: "↻", deltaClass: "change-types-delta-change" },
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
function getDetailItemSummaryRow(item: Record<string, unknown>): {
	typeName: string
	symbol: string
	count: number
	deltaClass: string
} {
	const typeName = String(item.type ?? item.edittype ?? "Item")
	const op = getDetailItemOperation(item)
	const count = typeof item.count === "number" ? item.count : 1
	const display = op
		? ACTION_DISPLAY[op]
		: { symbol: "", deltaClass: "change-types-delta-change" }
	return { typeName, symbol: display.symbol, count, deltaClass: display.deltaClass }
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

const DETAIL_KEY_LABELS: Record<string, string> = {
	type: "Type",
	edittype: "Edit type",
	action: "Action",
	name: "Name",
	title: "Title",
	label: "Label",
	section: "Section",
	before: "Before",
	after: "After",
	old: "Old value",
	new: "New value",
	key: "Key",
	value: "Value",
	text: "Content",
	content: "Content",
	changes: "Changes",
	count: "Count",
}
function getDetailRowLabel(key: string): string {
	const k = key.toLowerCase()
	return DETAIL_KEY_LABELS[k] ?? key.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}
const DETAIL_KEY_ORDER = [
	"type",
	"action",
	"edittype",
	"name",
	"title",
	"label",
	"section",
	"before",
	"after",
	"old",
	"new",
	"key",
	"value",
	"text",
	"count",
	"changes",
]

function getBadgeClass(key: string, value: unknown): string {
	const k = key.toLowerCase()
	if ((k === "action" || k === "edittype") && typeof value === "string") {
		const v = (value as string).toLowerCase()
		if (v === "insert" || v === "add") return "change-types-details-badge-add"
		if (v === "remove" || v === "delete") return "change-types-details-badge-remove"
		if (v === "change" || v === "move") return "change-types-details-badge-change"
	}
	if (k === "type" && typeof value === "string") return "change-types-details-badge-type"
	return ""
}

interface DetailCardRow {
	key: string
	label: string
	raw: string
	short?: string
	truncated?: boolean
	expandKey?: string
	badgeClass: string
	rawValue?: unknown
}

function getVisibleKeysForSection(sectionKey: string): string[] {
	const k = sectionKey.toLowerCase()
	if (k === "nodes" || k === "node-edits" || k === "node_edits")
		return ["name", "section", "changes"]
	if (k === "text" || k === "text-edits" || k === "text_edits") return ["text"]
	if (k === "context") return ["type", "name", "text", "section", "label"]
	return ["type", "edittype", "name", "section", "text", "before", "after", "changes", "count"]
}

function expandedDetailKey(
	revId: number,
	sectionKey: string,
	itemIdx: number,
	rowKey: string
): string {
	return `${revId}-${sectionKey}-${itemIdx}-${rowKey}`
}

function getDetailCardRows(
	obj: Record<string, unknown>,
	revId: number,
	sectionKey: string,
	itemIdx: number
): DetailCardRow[] {
	const visible = getVisibleKeysForSection(sectionKey)
	const keys = Object.keys(obj).filter(k => visible.includes(k.toLowerCase()))
	const ordered = [
		...DETAIL_KEY_ORDER.filter(k => keys.includes(k)),
		...keys.filter(k => !DETAIL_KEY_ORDER.includes(k)),
	]
	const rows: DetailCardRow[] = []
	for (const key of ordered) {
		const value = obj[key]
		const raw = formatDetailValue(value)
		if (key.toLowerCase() === "name" && (value == null || value === "" || raw === "null"))
			continue
		const truncated = raw.length > MAX_VALUE_LENGTH
		const short = truncated ? raw.slice(0, MAX_VALUE_LENGTH) + "…" : raw
		const expandKey = truncated ? expandedDetailKey(revId, sectionKey, itemIdx, key) : undefined
		rows.push({
			key,
			label:
				(sectionKey.toLowerCase() === "text" ||
					sectionKey.toLowerCase() === "text-edits") &&
				key.toLowerCase() === "text"
					? ""
					: getDetailRowLabel(key),
			raw,
			short: truncated ? short : undefined,
			truncated,
			expandKey,
			badgeClass: getBadgeClass(key, value),
			rawValue: key === "changes" ? value : undefined,
		})
	}
	return rows
}

function toggleExpandedDetail(expandKey: string): void {
	const next = new Set(expandedDetailValues.value)
	if (next.has(expandKey)) next.delete(expandKey)
	else next.add(expandKey)
	expandedDetailValues.value = next
}

function isChangesArray(v: unknown): v is Record<string, unknown>[] {
	return Array.isArray(v) && v.length > 0 && v.every(isDetailObject)
}
function getChangeTypeLabel(entry: Record<string, unknown>): string {
	const t = entry["change-type"] ?? entry.change_type ?? entry.type
	return t != null ? String(t) : "—"
}
/** Resolve the value to show in the Prev column (previous/before state). Prefer before/old over previous so we don't show action/count when API also sends before/after. */
function getPrevValue(entry: Record<string, unknown>): unknown {
	return entry.prev ?? entry.before ?? entry.old ?? entry.previous
}
/** Resolve the value to show in the Curr column (current/after state). Prefer after/new over current so we don't show action/count when API also sends before/after. */
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

// Keep detail helpers referenced while we temporarily retain legacy detail-loading code.
const _legacyDetailsHelpers = [
	isSectionCollapsed,
	isDetailItemCollapsed,
	toggleDetailsSection,
	toggleDetailsItem,
	hasAnyDetailsSections,
	isContextSection,
	getContextItemContent,
	getDetailItemSummaryRow,
	getDetailCardRows,
	toggleExpandedDetail,
	isChangesArray,
	getChangeTypeLabel,
	getPrevValue,
	getCurrValue,
	formatPrevCurrValue,
]
void _legacyDetailsHelpers

function resetEditTypesState(): void {
	resetStructuredDeltaState()
	editTypesDetailsByRevId.value = new Map()
	detailsErrorByRevId.value = new Map()
	loadingDetailsIds.value = new Set()
	expandedDetailValues.value = new Set()
	collapsedDetailsSectionKeys.value = new Set()
	collapsedDetailsItemKeys.value = new Set()
}

function onExpandItem(change: FWRevision): void {
	loadEditTypesSummary(change.id)
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

onMounted(search)
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
