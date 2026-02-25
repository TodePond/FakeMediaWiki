<template>
	<main class="change-types-watchlist change-types-watchlist-details">
		<div class="watchlist-container">
			<h1>Change types watchlist (details)</h1>
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
										wiki.getDeltaClass(change.delta ?? 0, false),
										{
											'history-delta-expanded': expandedDiffIds.has(
												change.id
											),
										},
									]"
								>
									{{ formatDelta(change.delta) }}</span
								><a
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
											wiki.getDeltaClass(change.delta ?? 0, false),
											{
												'history-delta-expanded': expandedDiffIds.has(
													change.id
												),
											},
										]"
										@click.stop="toggleDiff(change)"
									>
										{{ formatDelta(change.delta) }}
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
								<!-- Change type details (edit-types API) -->
								<div class="change-types-block change-types-details-block">
									<div
										v-if="loadingEditTypesIds.has(change.id)"
										class="change-types-loading"
									>
										<CdxProgressBar inline />
									</div>
									<div
										v-else-if="editTypesErrorByRevId.get(change.id)"
										class="change-types-error"
									>
										{{ editTypesErrorByRevId.get(change.id) }}
									</div>
									<template v-else-if="editTypesDetailsByRevId.get(change.id)">
										<div class="change-types-label change-types-details-label">
											Change type details
										</div>
										<div
											v-for="section in getDetailsSections(
												editTypesDetailsByRevId.get(change.id)!
											)"
											:key="section.key"
											class="change-types-details-section"
										>
											<button
												type="button"
												class="change-types-details-section-toggle"
												:aria-expanded="
													!isSectionCollapsed(change.id, section.key)
												"
												@click.stop="
													toggleDetailsSection(change.id, section.key)
												"
											>
												<span
													class="change-types-details-toggle-icon"
													aria-hidden="true"
													>{{
														isSectionCollapsed(change.id, section.key)
															? "+"
															: "−"
													}}</span
												>
												<span class="change-types-details-section-title">{{
													section.title
												}}</span>
												<span class="change-types-details-section-count"
													>{{ section.items.length }}
													{{
														section.items.length === 1
															? "item"
															: "items"
													}}</span
												>
											</button>
											<ul
												v-show="!isSectionCollapsed(change.id, section.key)"
												class="change-types-details-list"
											>
												<li
													v-for="(item, idx) in section.items"
													:key="`${section.key}-${idx}`"
													class="change-types-details-item"
												>
													<template v-if="isContextSection(section.key)">
														<div
															class="change-types-details-context-line change-types-row"
															:class="[
																getDetailItemOperation(isDetailObject(item) ? item : {}) &&
																	`change-types-details-op-${getDetailItemOperation(isDetailObject(item) ? item : {})}`,
															]"
														>
															<template v-if="isDetailObject(item)">
																<span class="change-types-type">{{
																	getDetailItemSummaryRow(item).typeName
																}}</span>
																<span
																	v-if="getDetailItemSummaryRow(item).symbol"
																	:class="[
																		'change-types-delta',
																		getDetailItemSummaryRow(item).deltaClass,
																	]"
																>{{ getDetailItemSummaryRow(item).symbol }}{{
																	getDetailItemSummaryRow(item).count
																}}</span>
																<span
																	v-if="getContextItemContent(item)"
																	class="change-types-details-context-content"
																>{{ getContextItemContent(item) }}</span>
															</template>
															<template v-else>
																<span class="change-types-details-primitive">{{
																	formatDetailValue(item)
																}}</span>
															</template>
														</div>
													</template>
													<template v-else-if="isDetailObject(item)">
														<button
															v-if="
																isDetailItemCollapsed(
																	change.id,
																	section.key,
																	idx
																)
															"
															type="button"
															class="change-types-details-item-summary change-types-row"
															:class="[
																getDetailItemOperation(item) &&
																	`change-types-details-op-${getDetailItemOperation(item)}`,
															]"
															:aria-expanded="false"
															@click.stop="
																toggleDetailsItem(
																	change.id,
																	section.key,
																	idx
																)
															"
														>
															<span
																class="change-types-details-toggle-icon"
																aria-hidden="true"
																>+</span
															>
															<span class="change-types-type">{{
																getDetailItemSummaryRow(item)
																	.typeName
															}}</span>
															<span
																v-if="
																	getDetailItemSummaryRow(item)
																		.symbol
																"
																:class="[
																	'change-types-delta',
																	getDetailItemSummaryRow(item)
																		.deltaClass,
																]"
																>{{
																	getDetailItemSummaryRow(item)
																		.symbol
																}}{{
																	getDetailItemSummaryRow(item)
																		.count
																}}</span
															>
														</button>
														<div
															v-else
															:class="[
																'change-types-details-card-wrapper',
																getDetailItemOperation(item) &&
																	`change-types-details-op-${getDetailItemOperation(item)}`,
															]"
														>
															<button
																type="button"
																class="change-types-details-card-collapse change-types-row"
																aria-label="Collapse"
																@click.stop="
																	toggleDetailsItem(
																		change.id,
																		section.key,
																		idx
																	)
																"
															>
																<span
																	class="change-types-details-toggle-icon"
																	aria-hidden="true"
																	>−</span
																>
																<span class="change-types-type">{{
																	getDetailItemSummaryRow(item)
																		.typeName
																}}</span>
																<span
																	v-if="
																		getDetailItemSummaryRow(
																			item
																		).symbol
																	"
																	:class="[
																		'change-types-delta',
																		getDetailItemSummaryRow(
																			item
																		).deltaClass,
																	]"
																	>{{
																		getDetailItemSummaryRow(
																			item
																		).symbol
																	}}{{
																		getDetailItemSummaryRow(
																			item
																		).count
																	}}</span
																>
															</button>
															<div class="change-types-details-card">
																<div
																	v-for="row in getDetailCardRows(
																		item,
																		change.id,
																		section.key,
																		idx
																	)"
																	:key="row.key"
																	class="change-types-details-row"
																>
																	<span v-if="row.label" class="change-types-details-key">{{
																		row.label
																	}}</span>
																	<template v-if="row.key === 'changes' && isChangesArray(row.rawValue)">
																		<div class="change-types-details-changes-table-wrap">
																			<table class="change-types-details-changes-table">
																				<thead>
																					<tr>
																						<th>Change type</th>
																						<th>Prev</th>
																						<th>Curr</th>
																					</tr>
																				</thead>
																				<tbody>
																					<tr
																						v-for="(entry, ei) in row.rawValue"
																						:key="ei"
																					>
																						<td>{{ getChangeTypeLabel(entry) }}</td>
																						<td>
																							<div class="change-types-details-prev-curr-box">{{
																								formatPrevCurrValue(
																									entry.prev ?? entry.previous
																								)
																							}}</div>
																						</td>
																						<td>
																							<div class="change-types-details-prev-curr-box">{{
																								formatPrevCurrValue(
																									entry.curr ?? entry.current
																								)
																							}}</div>
																						</td>
																					</tr>
																				</tbody>
																			</table>
																		</div>
																	</template>
																	<span
																		v-else
																		:class="[
																			'change-types-details-value',
																			row.badgeClass,
																		]"
																	>
																		<template
																			v-if="
																				row.expandKey !==
																				undefined
																			"
																		>
																			<span
																				v-if="
																					!expandedDetailValues.has(
																						row.expandKey
																					)
																				"
																			>
																				{{ row.short }}
																				<button
																					v-if="
																						row.truncated
																					"
																					type="button"
																					class="change-types-details-more"
																					@click.stop="
																						toggleExpandedDetail(
																							row.expandKey!
																						)
																					"
																				>
																					… more
																				</button>
																			</span>
																			<span v-else>
																				{{ row.raw }}
																				<button
																					type="button"
																					class="change-types-details-more"
																					@click.stop="
																						toggleExpandedDetail(
																							row.expandKey!
																						)
																					"
																				>
																					less
																				</button>
																			</span>
																		</template>
																		<template v-else>{{
																			row.raw
																		}}</template>
																	</span>
																</div>
															</div>
														</div>
													</template>
													<template v-else>
														<span
															class="change-types-details-primitive"
															>{{ formatDetailValue(item) }}</span
														>
													</template>
												</li>
											</ul>
										</div>
										<div
											v-if="
												!hasAnyDetailsSections(
													editTypesDetailsByRevId.get(change.id)!
												)
											"
											class="change-types-empty"
										>
											No structured details (empty or non-array sections)
										</div>
									</template>
									<div v-else class="change-types-empty">
										No change type details
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
												formatDelta(
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
import console from "console"
import { FakeWiki } from "fakewiki"
import type {
	FWCompareResponse,
	FWEditTypesDiffDetails,
	FWPageHistoryResponse,
	FWPageHistoryRevision,
	FWRevision,
} from "fakewiki/types"
import { computed, onMounted, ref } from "vue"

/** History revision with edit summary rendered as HTML */
interface HistoryRevisionWithHtml extends FWPageHistoryRevision {
	commentHtml: string
}

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "ChangeTypesWatchlistDetails"

const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries")
const defaultPageSearchQueries = [
	"Wikipedia",
	"Wet Leg",
	"Water",
	"Confidence Man (band)",
	"Algorave",
]
const defaultUserSearchQueries = ["Todepond", "Samwalton9"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserSearchQueries))
const pageQueriesInput = ref(pageSearchQueries.value.join(", "))
const userQueriesInput = ref(userSearchQueries.value.join(", "))

const MAX_VALUE_LENGTH = 120

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

const allRevisionsData = ref<FWRevision[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const errors = ref<string[]>([])
const hasMore = ref(true)

const expandedDiffIds = ref<Set<number>>(new Set())
const loadedDiffs = ref<Map<number, FWCompareResponse>>(new Map())
const loadingDiffIds = ref<Set<number>>(new Set())

const expandedHistoryIds = ref<Set<number>>(new Set())
const expandedHistoryDiffIds = ref<Map<number, Set<number>>>(new Map())
const loadedHistories = ref<
	Map<
		string,
		Omit<FWPageHistoryResponse, "revisions"> & { revisions?: HistoryRevisionWithHtml[] }
	>
>(new Map())
const loadingHistoryPageNames = ref<Set<string>>(new Set())

const expandedItemIds = ref<Set<number>>(new Set())
const expandedTalkIds = ref<Set<number>>(new Set())
const talkPageText = ref<Map<number, string>>(new Map())
const editorMode = ref<Map<number, "visual" | "source">>(new Map())

const thankedRevisionIds = ref<Set<number>>(new Set())
const risingHearts = ref<Array<{ id: number; x: number; y: number; type: "thank" | "unthank" }>>([])
let nextHeartId = 0
const HEART_RISE_DURATION_MS = 2500

/** Edit-types: details per revision id */
const editTypesDetailsByRevId = ref<Map<number, FWEditTypesDiffDetails | null>>(new Map())
const editTypesErrorByRevId = ref<Map<number, string>>(new Map())
const loadingEditTypesIds = ref<Set<number>>(new Set())

/** Expanded long values: key is "revId-sectionKey-itemIdx-rowKey" for "… more" / "less" */
const expandedDetailValues = ref<Set<string>>(new Set())

/** Section (Context / Node edits / Text edits) collapsed: key = "revId-sectionKey" */
const collapsedDetailsSectionKeys = ref<Set<string>>(new Set())
/** Item (card) collapsed: key = "revId-sectionKey-idx" */
const collapsedDetailsItemKeys = ref<Set<string>>(new Set())

function expandedDetailKey(
	revId: number,
	sectionKey: string,
	itemIdx: number,
	rowKey: string
): string {
	return `${revId}-${sectionKey}-${itemIdx}-${rowKey}`
}

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

/** Human-readable section key; known keys get friendly titles */
function humanizeSectionKey(key: string): string {
	const map: Record<string, string> = {
		context: "Context",
		"node-edits": "Node edits",
		node_edits: "Node edits",
		nodes: "Node edits",
		"text-edits": "Text edits",
		text_edits: "Text edits",
		text: "Text edits",
	}
	return map[key] ?? key.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Edit-types API returns { article, summary, details: { context, nodes, text } }.
 * We only use the inner details object for sections (context, nodes, text).
 * We never treat "article" as an array or use it for sections; summary is parsed separately via getSummaryFromResponse.
 */
function getDetailsPayload(details: FWEditTypesDiffDetails | null): Record<string, unknown> | null {
	if (!details || typeof details !== "object") return null
	const inner = (details as { details?: Record<string, unknown> }).details
	if (inner && typeof inner === "object") return inner
	// No nested details: extract only context/nodes/text so we never pass article or summary to sections
	const result: Record<string, unknown> = {}
	const keys = ["context", "nodes", "text", "node-edits", "text-edits"]
	for (const key of keys) {
		const val = (details as Record<string, unknown>)[key]
		if (Array.isArray(val)) result[key] = val
	}
	return Object.keys(result).length > 0 ? result : null
}

/** Order for "type" field: biggest structural units first (paragraph > sentence > word). Lower rank = earlier. */
const TYPE_ORDER: Record<string, number> = {
	Section: 0,
	Paragraph: 1,
	Sentence: 2,
	Word: 3,
	Template: 4,
	Wikilink: 5,
	Heading: 6,
	List: 7,
	Punctuation: 8,
	Whitespace: 9,
}

function getTypeRank(type: unknown): number {
	if (type == null || typeof type !== "string") return 999
	const rank = TYPE_ORDER[type]
	return rank !== undefined ? rank : 999
}

/** Sections from details payload: only known section keys (context, nodes, text). Ignore article, summary, etc. */
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
			const items = [...val].sort((a, b) => {
				const aRank = isDetailObject(a) && a.type != null ? getTypeRank(a.type) : 999
				const bRank = isDetailObject(b) && b.type != null ? getTypeRank(b.type) : 999
				return aRank - bRank
			})
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

/** Content to show for a context item (non-expandable line). */
function getContextItemContent(item: Record<string, unknown>): string {
	const v = item.text ?? item.name ?? item.title ?? item.value
	if (v == null) return ""
	if (typeof v === "string") return v
	return formatDetailValue(v)
}

/** Summary-variant style: type name + colored symbol + count (e.g. "Paragraph ↻1", "Word -4") */
function getDetailItemSummaryRow(item: Record<string, unknown>): {
	typeName: string
	symbol: string
	count: number
	deltaClass: string
} {
	const typeName = String(item.type ?? item.edittype ?? "Item")
	const op = getDetailItemOperation(item)
	const count = typeof item.count === "number" ? item.count : 1
	const actionDisplay: Record<string, { symbol: string; deltaClass: string }> = {
		insert: { symbol: "+", deltaClass: "change-types-delta-add" },
		remove: { symbol: "-", deltaClass: "change-types-delta-remove" },
		change: { symbol: "↻", deltaClass: "change-types-delta-change" },
	}
	const display = op ? actionDisplay[op] : { symbol: "", deltaClass: "change-types-delta-change" }
	return {
		typeName,
		symbol: display.symbol,
		count,
		deltaClass: display.deltaClass,
	}
}

/** Operation type for row color coding: insert → green, remove → red, change → blue */
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

function formatDetailValue(v: unknown): string {
	if (v === null) return "null"
	if (v === undefined) return "—"
	if (typeof v === "string") return v
	if (typeof v === "number" || typeof v === "boolean") return String(v)
	if (Array.isArray(v)) {
		if (v.length === 0) return "[]"
		// Short array of primitives: show inline
		if (v.every(item => item === null || typeof item !== "object")) {
			return v.map(item => formatDetailValue(item)).join(", ")
		}
		return `[${v.length} items]`
	}
	if (typeof v === "object") return "[object]"
	return String(v)
}

/** Human-friendly labels for detail card keys so it's clear what each value refers to */
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

/** Priority order for object keys: reference first, then change (before/after), then content */
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

/** Badge class for known keys (action/edittype) */
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
	/** Original value for special rendering (e.g. changes array as table) */
	rawValue?: unknown
}

/** Keys to show per section: node-edits use name/section/changes; text and context show type, edittype, content. */
function getVisibleKeysForSection(sectionKey: string): string[] {
	const k = sectionKey.toLowerCase()
	if (k === "nodes" || k === "node-edits" || k === "node_edits")
		return ["name", "section", "changes"]
	if (k === "text" || k === "text-edits" || k === "text_edits")
		return ["text"]
	if (k === "context") return ["type", "name", "text", "section", "label"]
	// Fallback: show all except none
	return ["type", "edittype", "name", "section", "text", "before", "after", "changes", "count"]
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
				(sectionKey.toLowerCase() === "text" || sectionKey.toLowerCase() === "text-edits") &&
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

/** Whether the value is a changes array (list of { change-type, prev, curr }). */
function isChangesArray(v: unknown): v is Record<string, unknown>[] {
	return Array.isArray(v) && v.length > 0 && v.every(isDetailObject)
}

/** Get change-type label from an item (supports change-type and change_type). */
function getChangeTypeLabel(entry: Record<string, unknown>): string {
	const t = entry["change-type"] ?? entry.change_type ?? entry.type
	return t != null ? String(t) : "—"
}

/** Format a single prev/curr value for display: object with name+value as lines, else string. */
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

onMounted(search)

function saveSearchQueries(): void {
	localStorage.setItem(pageStorageKey, JSON.stringify(pageSearchQueries.value))
	localStorage.setItem(userStorageKey, JSON.stringify(userSearchQueries.value))
}

function loadSearchQueries(key: string, defaultValues: string[]): string[] {
	const savedSearchQueries = localStorage.getItem(key)
	if (!savedSearchQueries) return defaultValues
	try {
		const parsed = JSON.parse(savedSearchQueries)
		if (Array.isArray(parsed) && parsed.every(value => typeof value === "string")) {
			return parsed
		}
	} catch {
		// ignore
	}
	return defaultValues
}

async function loadFeed(after?: Record<string, string>, append = false): Promise<void> {
	if (!append) {
		isLoading.value = true
		errors.value = []
	} else {
		isLoadingMore.value = true
	}
	const pageNames = pageSearchQueries.value.filter(name => name.trim() !== "")
	const userNames = userSearchQueries.value.filter(name => name.trim() !== "")
	try {
		const revisions = await wiki.getCombinedFeed({
			pageNames,
			userNames,
			limit: 20,
			after,
		})
		const processedRevisions = await Promise.all(
			revisions.map(async revision => {
				const pageName =
					(revision as FWPageHistoryRevision & { pageName?: string }).pageName || ""
				const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName)
				const toolbar = wiki.parseToolbarEditSummary(_summary)
				const summary = toolbar
					? toolbar
					: {
							comment: _summary,
							hashtags: [],
							other: [],
							suggestedBy: null,
							useThisBot: null,
							reportBugs: null,
						}
				const commentText = summary.comment
					? summary.comment +
						(summary.suggestedBy
							? " Suggested by [[User:" +
								summary.suggestedBy +
								"|" +
								summary.suggestedBy +
								"]]"
							: "")
					: ""
				summary.comment = commentText
					? await wiki.transformWikitextToHtml(commentText, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				return {
					...revision,
					comment: revision.comment || "",
					summary,
					pageName,
					avatarUrl: null,
				} as FWRevision
			})
		)
		if (append) {
			const existingIds = new Set(allRevisionsData.value.map(r => r.id))
			const newRevisions = processedRevisions.filter(r => !existingIds.has(r.id))
			const merged = [...allRevisionsData.value, ...newRevisions].sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			allRevisionsData.value = merged
			hasMore.value = newRevisions.length > 0
		} else {
			allRevisionsData.value = processedRevisions
			hasMore.value = processedRevisions.length === 20
		}
		isLoading.value = false
		isLoadingMore.value = false
	} catch (e) {
		isLoading.value = false
		isLoadingMore.value = false
		const errorObj = e as Error
		if (!append) {
			errors.value = [errorObj.message]
			allRevisionsData.value = []
		}
		hasMore.value = false
	}
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
	editTypesDetailsByRevId.value = new Map()
	editTypesErrorByRevId.value = new Map()
	loadingEditTypesIds.value = new Set()
	expandedDetailValues.value = new Set()
	collapsedDetailsSectionKeys.value = new Set()
	collapsedDetailsItemKeys.value = new Set()
}

async function loadMore(): Promise<void> {
	if (allRevisionsData.value.length === 0) return
	const pageNames = pageSearchQueries.value.filter(name => name.trim() !== "")
	const userNames = userSearchQueries.value.filter(name => name.trim() !== "")
	const afterMap: Record<string, string> = {}
	for (const pageName of pageNames) {
		const revs = allRevisionsData.value.filter(r => r.pageName === pageName)
		if (revs.length > 0) afterMap[pageName] = String(Math.min(...revs.map(r => r.id)))
	}
	for (const userName of userNames) {
		const revs = allRevisionsData.value.filter(r => r.user?.name === userName)
		if (revs.length > 0) afterMap[userName] = String(Math.min(...revs.map(r => r.id)))
	}
	if (Object.keys(afterMap).length === 0) return
	await loadFeed(afterMap, true)
}

const allRevisions = computed(() => allRevisionsData.value)

const revisionsByDate = computed(() => {
	const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()
	allRevisions.value.forEach(revision => {
		const dateKey = getDateKey(revision.timestamp)
		const dateLabel = formatDate(revision.timestamp)
		if (!grouped.has(dateKey)) grouped.set(dateKey, { dateLabel, revisions: [] })
		grouped.get(dateKey)!.revisions.push(revision)
	})
	return Array.from(grouped.entries())
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([dateKey, data]) => ({
			dateKey,
			dateLabel: data.dateLabel,
			revisions: data.revisions,
		}))
})

function formatDate(timestamp: string): string {
	const d = new Date(timestamp)
	const day = d.getDate()
	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	]
	return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
}

function getDateKey(timestamp: string): string {
	const d = new Date(timestamp)
	return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
}

function formatTime(timestamp: string): string {
	const d = new Date(timestamp)
	return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

function isToday(timestamp: string): boolean {
	const d = new Date(timestamp)
	const today = new Date()
	return (
		d.getDate() === today.getDate() &&
		d.getMonth() === today.getMonth() &&
		d.getFullYear() === today.getFullYear()
	)
}

function formatDateShort(timestamp: string): string {
	const d = new Date(timestamp)
	return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear().toString().slice(-2)}`
}

function formatRelativeDate(timestamp: string): string {
	return wiki.formatRelativeTimestamp(timestamp, {
		seconds: "words",
		minutes: "minutes",
		hours: "hours",
		days: "days",
		weeks: "weeks",
		months: "months",
		years: "years",
	})
}

function formatDelta(delta: number | null): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return "(0)"
	return `(${n >= 0 ? "+" : ""}${n})`
}

function loadEditTypesDetails(revId: number): void {
	if (editTypesDetailsByRevId.value.has(revId) || editTypesErrorByRevId.value.has(revId)) return
	loadingEditTypesIds.value = new Set(loadingEditTypesIds.value).add(revId)
	wiki
		.getEditTypesDiffDetails(revId)
		.then(details => {
			editTypesDetailsByRevId.value = new Map(editTypesDetailsByRevId.value).set(
				revId,
				details
			)
			editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value)
			editTypesErrorByRevId.value.delete(revId)
			loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
			loadingEditTypesIds.value.delete(revId)
			// Start all sections and items collapsed
			const sections = getDetailsSections(details)
			collapsedDetailsSectionKeys.value = new Set(collapsedDetailsSectionKeys.value)
			collapsedDetailsItemKeys.value = new Set(collapsedDetailsItemKeys.value)
			for (const section of sections) {
				collapsedDetailsSectionKeys.value.add(detailsSectionKey(revId, section.key))
				section.items.forEach((_, idx) => {
					collapsedDetailsItemKeys.value.add(detailsItemKey(revId, section.key, idx))
				})
			}
		})
		.catch(e => {
			const msg = e instanceof Error ? e.message : String(e)
			editTypesErrorByRevId.value = new Map(editTypesErrorByRevId.value).set(revId, msg)
			editTypesDetailsByRevId.value = new Map(editTypesDetailsByRevId.value).set(revId, null)
			loadingEditTypesIds.value = new Set(loadingEditTypesIds.value)
			loadingEditTypesIds.value.delete(revId)
		})
}

function expandItem(change: FWRevision, event: MouseEvent): void {
	const target = event.target as HTMLElement
	if (
		target.tagName === "A" ||
		target.tagName === "BUTTON" ||
		target.closest("a") ||
		target.closest("button")
	)
		return
	const id = change.id
	expandedItemIds.value = new Set(expandedItemIds.value).add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value).add(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
	loadEditTypesDetails(id)
	if (!loadedDiffs.value.has(id)) {
		const pageName = change.pageName
		if (!pageName) return
		loadingDiffIds.value = new Set(loadingDiffIds.value).add(id)
		wiki.getRevisionDiff(pageName, id)
			.then(response => {
				loadedDiffs.value = new Map(loadedDiffs.value).set(id, response)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
			})
			.catch(e => {
				console.error("Failed to load diff", e)
				loadingDiffIds.value = new Set(loadingDiffIds.value)
				loadingDiffIds.value.delete(id)
			})
	}
}

function collapseItem(id: number): void {
	expandedItemIds.value.delete(id)
	expandedDiffIds.value.delete(id)
	expandedHistoryIds.value.delete(id)
	expandedTalkIds.value.delete(id)
}

function handleItemClick(change: FWRevision, event: MouseEvent): void {
	if (!expandedItemIds.value.has(change.id)) expandItem(change, event)
}

function toggleDiff(change: FWRevision): void {
	const id = change.id
	if (expandedDiffIds.value.has(id)) {
		expandedDiffIds.value = new Set(expandedDiffIds.value)
		expandedDiffIds.value.delete(id)
		return
	}
	expandedDiffIds.value = new Set(expandedDiffIds.value).add(id)
	expandedHistoryIds.value = new Set(expandedHistoryIds.value)
	expandedHistoryIds.value.delete(id)
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(id)
	if (loadedDiffs.value.has(id)) return
	const pageName = change.pageName
	if (!pageName) return
	loadingDiffIds.value = new Set(loadingDiffIds.value).add(id)
	wiki.getRevisionDiff(pageName, id)
		.then(response => {
			loadedDiffs.value = new Map(loadedDiffs.value).set(id, response)
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
		.catch(e => {
			console.error("Failed to load diff", e)
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
}

function toggleHistoryDiff(changeId: number, rev: { id: number }, pageName: string): void {
	const id = rev.id
	const set = expandedHistoryDiffIds.value.get(changeId) ?? new Set<number>()
	const expanded = set.has(id)
	const newSet = expanded
		? (() => {
				const s = new Set(set)
				s.delete(id)
				return s
			})()
		: new Set(set).add(id)
	expandedHistoryDiffIds.value = new Map(expandedHistoryDiffIds.value).set(changeId, newSet)
	if (expanded) return
	if (loadedDiffs.value.has(id)) return
	loadingDiffIds.value = new Set(loadingDiffIds.value).add(id)
	wiki.getRevisionDiff(pageName, id)
		.then(response => {
			loadedDiffs.value = new Map(loadedDiffs.value).set(id, response)
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
		.catch(e => {
			console.error("Failed to load diff", e)
			loadingDiffIds.value = new Set(loadingDiffIds.value)
			loadingDiffIds.value.delete(id)
		})
}

function handleHistoryItemClick(
	changeId: number,
	rev: { id: number },
	pageName: string,
	event: MouseEvent
): void {
	const target = event.target as HTMLElement
	if (
		target.tagName === "A" ||
		target.tagName === "BUTTON" ||
		target.closest("a") ||
		target.closest("button")
	)
		return
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
	expandedHistoryIds.value = new Set(expandedHistoryIds.value).add(id)
	expandedDiffIds.value = new Set(expandedDiffIds.value)
	expandedDiffIds.value.delete(id)
	expandedTalkIds.value = new Set(expandedTalkIds.value)
	expandedTalkIds.value.delete(id)
	if (loadedHistories.value.has(pageName)) return
	loadingHistoryPageNames.value = new Set(loadingHistoryPageNames.value).add(pageName)
	wiki.getPageHistory(pageName)
		.then(async response => {
			const revisions = await Promise.all(
				(response.revisions || []).map(async rev => ({
					...rev,
					commentHtml: await wiki.getEditSummaryHtml(rev.comment || "", pageName),
				}))
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
	let cumulativeIndex = 0
	for (const group of revisionsByDate.value) {
		if (group.dateKey === dateKey) return 10 + cumulativeIndex + changeIndex
		cumulativeIndex += group.revisions.length
	}
	return 10 + cumulativeIndex + changeIndex
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
	if (!talkPageText.value.has(id)) talkPageText.value = new Map(talkPageText.value).set(id, "")
	if (!editorMode.value.has(id)) editorMode.value = new Map(editorMode.value).set(id, "source")
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
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
