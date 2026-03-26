<template>
	<section class="review-changes" :class="{ 'review-changes--no-border': !showModuleBorder }">
		<div class="review-changes__title-row">
			<div v-if="title" class="review-changes__title">{{ title }}</div>
			<div v-else class="review-changes__title-spacer" aria-hidden="true" />
			<div class="review-changes__title-actions">
				<CdxButton
					type="button"
					weight="quiet"
					aria-label="Reset which diffs are marked as opened"
					class="review-changes__refresh review-changes__refresh--reset-opened"
					@click="clearViewedRevisions"
				>
					<CdxIcon :icon="cdxIconReload" />
				</CdxButton>
				<CdxButton
					type="button"
					weight="quiet"
					:disabled="isLoading"
					aria-label="Refresh"
					class="review-changes__refresh"
					@click="refreshFeed"
				>
					<CdxIcon :icon="cdxIconReload" />
				</CdxButton>
			</div>
		</div>
		<div v-if="errors.length > 0" class="review-changes__errors">
			<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			<div v-if="showRestoreLastLoadedData" class="review-changes__errors-actions">
				<CdxButton action="default" @click="restoreLastSuccessfulFeed">
					Show last loaded data
				</CdxButton>
			</div>
		</div>
		<div v-if="lastLoadedDataNotice" class="review-changes__last-loaded-notice">
			{{ lastLoadedDataNotice }}
		</div>
		<div v-if="isLoading" class="review-changes__loading">
			<CdxProgressBar inline />
		</div>
		<div
			v-else-if="showEmptyCacheNotice"
			class="review-changes__empty-cache-notice"
			role="status"
		>
			Click the refresh button to load changes.
		</div>
		<ul v-else ref="feedRef" class="review-changes__feed" @focusout="onFeedFocusOut">
			<template v-for="dateGroup in revisionsByDateCapped" :key="dateGroup.dateKey">
				<li
					v-for="change in dateGroup.revisions"
					:key="`${change.pageName}-${change.timestamp}-${change.id}`"
					class="review-changes__item"
					:class="{
						'review-changes__item--last-clicked':
							viewedBorder && change.id === lastClickedRevisionId,
						'review-changes__item--unviewed':
							unviewedBorder && !isRevisionViewed(change),
					}"
				>
					<span
						v-if="viewedBorder && change.id === lastClickedRevisionId"
						class="review-changes__item-line review-changes__item-line--last-clicked review-changes__item-line--left"
						aria-hidden="true"
					/>
					<span
						v-if="unviewedBorder && !isRevisionViewed(change)"
						class="review-changes__item-line review-changes__item-line--unviewed review-changes__item-line--left"
						aria-hidden="true"
					/>
					<component
						:is="change.pageName ? 'a' : 'div'"
						:href="
							change.pageName
								? wiki.getRevisionUrl(change.id, change.pageName)
								: undefined
						"
						:target="change.pageName ? '_blank' : undefined"
						:rel="change.pageName ? 'noopener noreferrer' : undefined"
						class="review-changes__item-link"
						:class="{
							'review-changes__item-link--not-link': !change.pageName,
							'review-changes__item-link--revision-viewed': isRevisionViewed(change),
							'review-changes__item-link--unviewed':
								highlightUnviewed && !isRevisionViewed(change),
							'review-changes__item-link--last-clicked':
								lastClickedHighlight && change.id === lastClickedRevisionId,
							'review-changes__item-link--primary-unviewed-tone':
								!isRevisionViewed(change) &&
								getPrimaryFeedFlag(change)?.tier === 'toneReference',
							'review-changes__item-link--primary-unviewed-revert':
								!isRevisionViewed(change) && isPrimaryRevertVeryHigh(change),
							'review-changes__item-link--primary-unviewed-revert-warn':
								!isRevisionViewed(change) && isPrimaryRevertHigh(change),
							'review-changes__item-link--primary-unviewed-recommendation':
								!isRevisionViewed(change) &&
								getPrimaryFeedFlag(change)?.tier === 'recommendation',
						}"
						:aria-label="
							change.pageName
								? `Open diff for ${change.pageName ?? 'page'}`
								: undefined
						"
						@click="change.pageName && markRevisionAsViewed(change)"
						@pointerdown.capture="onCardPointerDown"
						@mousedown.capture="onCardPointerDown"
					>
						<div
							class="review-changes__item-header"
							:class="{
								'review-changes__item-header--has-primary-flag':
									!!getPrimaryFeedFlag(change),
							}"
						>
							<CdxIcon
								v-if="getPrimaryFeedFlag(change)"
								:icon="primaryFlagCdxIcon(change)"
								size="medium"
								:class="[
									'review-changes__primary-flag-icon',
									primaryFlagIconModifierClass(change),
								]"
								aria-hidden="true"
							/>
							<CdxIcon
								v-else-if="showArrowInTopRight"
								:icon="cdxIconArrowNext"
								size="medium"
								class="review-changes__arrow-in-top-right"
								aria-hidden="true"
							/>
							<span class="review-changes__page-cell">
								<template v-if="unifiedTitle">
									<FeedItemTitle
										:page-name="change.pageName ?? ''"
										:short-description="
											change.pageName
												? (shortDescriptionByPage.get(change.pageName) ??
													null)
												: null
										"
										:timestamp="change.timestamp"
										:formatted-timestamp="
											timestampPosition === 'topRight'
												? simplifiedTimestamp
													? formatRelativeTime(change.timestamp)
													: `${formatTime(change.timestamp)}, ${formatTimeLabel(change.timestamp)}`
												: undefined
										"
										:item-source="getItemSource(change)"
										:show-source-icons="showSourceIcons"
										:show-short-description="showShortDescription"
										:show-short-description-separator="
											showShortDescriptionSeparator
										"
									/>
								</template>
								<template v-else>
									<span
										class="review-changes__page-cell-heading review-changes__page-cell-heading--separate"
									>
										<CdxIcon
											v-if="showSourceIcons && getItemSource(change)"
											:icon="
												getItemSource(change) === 'pagesAndUsers' ||
												getItemSource(change) === 'pagesAndUsersLatest'
													? cdxIconUnStar
													: getItemSource(change) === 'relatedChanges'
														? cdxIconLightbulb
														: getItemSource(change) === 'collaborators'
															? cdxIconUserAvatar
															: cdxIconClock
											"
											size="x-small"
											:class="[
												'review-changes__source-icon',
												`review-changes__source-icon--${getItemSource(change)}`,
											]"
											:aria-label="
												getItemSource(change) === 'pagesAndUsers'
													? 'Watchlist'
													: getItemSource(change) ===
														  'pagesAndUsersLatest'
														? 'Watchlist (latest revision)'
														: getItemSource(change) === 'relatedChanges'
															? 'Related changes'
															: getItemSource(change) ===
																  'collaborators'
																? 'Mentor'
																: 'Risky'
											"
										/>
										<span class="review-changes__page">{{
											change.pageName
										}}</span>
										<span
											v-if="
												showShortDescription &&
												change.pageName &&
												shortDescriptionByPage.get(change.pageName)
											"
											class="review-changes__short-desc"
											:class="{
												'review-changes__short-desc--no-separator':
													!showShortDescriptionSeparator,
											}"
										>
											{{ shortDescriptionByPage.get(change.pageName) }}
										</span>
									</span>
								</template>
								<div
									v-if="showSourceSubtitles && getItemSource(change)"
									class="review-changes__source-subtitle"
								>
									{{
										getItemSource(change) === "pagesAndUsers"
											? "From your watchlist"
											: getItemSource(change) === "pagesAndUsersLatest"
												? "From your watchlist (latest)"
												: getItemSource(change) === "relatedChanges"
													? "From recommendations"
													: getItemSource(change) === "collaborators"
														? "By your mentor"
														: "From recent changes"
									}}
								</div>
								<span
									class="review-changes__user-time-group"
									:class="{
										'review-changes__user-time-group--timestamp-below':
											timestampPosition === 'belowUsername',
									}"
								>
									<span v-if="showUserIcon" class="review-changes__user-row">
										<CdxButton
											weight="quiet"
											class="review-changes__user-icon-btn"
											:aria-label="`User: ${change.user.name}`"
											size="small"
											@click.stop.prevent="openUserPopover($event, change)"
										>
											<CdxIcon
												class="review-changes__user-icon"
												:icon="
													wiki.isTemporaryAccount(change.user.name)
														? cdxIconUserTemporary
														: cdxIconUserAvatar
												"
												size="x-small"
												aria-hidden="true"
											/>
										</CdxButton>
										<a
											target="_blank"
											rel="noopener noreferrer"
											:href="wiki.getUserUrl(change.user.name)"
											class="review-changes__user"
											@click.stop
										>
											{{ showUsernameAtPrefix ? "@" : ""
											}}{{ change.user.name }}
										</a>
									</span>
									<a
										v-else
										target="_blank"
										rel="noopener noreferrer"
										:href="wiki.getUserUrl(change.user.name)"
										class="review-changes__user"
										@click.stop
									>
										{{ showUsernameAtPrefix ? "@" : "" }}{{ change.user.name }}
									</a>
									<template v-if="timestampPosition === 'rightOfUsername'">
										<span class="review-changes__time-sep" aria-hidden="true">
											·
										</span>
										<time
											:datetime="change.timestamp"
											class="review-changes__time"
										>
											{{
												simplifiedTimestamp
													? formatRelativeTime(change.timestamp)
													: `${formatTime(change.timestamp)}, ${formatTimeLabel(change.timestamp)}`
											}}
										</time>
									</template>
									<template v-else-if="timestampPosition === 'belowUsername'">
										<time
											:datetime="change.timestamp"
											class="review-changes__time review-changes__time--block"
										>
											{{
												simplifiedTimestamp
													? formatRelativeTime(change.timestamp)
													: `${formatTime(change.timestamp)}, ${formatTimeLabel(change.timestamp)}`
											}}
										</time>
									</template>
								</span>
								<div
									v-if="
										showStructuredDeltasForFlaggedUnviewed && hasAnyFlag(change)
									"
									class="review-changes__structured-delta-row"
									:class="{
										'review-changes__structured-delta-row--viewed':
											isRevisionViewed(change),
									}"
								>
									<template v-if="getStructuredDeltaSegments(change.id)?.length"
										><span :class="structuredDeltaOpenParenClass(change.id)"
											>(</span
										><template
											v-for="(seg, i) in getStructuredDeltaSegments(
												change.id
											)!"
											:key="i"
										>
											<span :class="seg.deltaClass">{{ seg.text }}</span
											><span
												v-if="
													i <
													getStructuredDeltaSegments(change.id)!.length -
														1
												"
												:class="seg.deltaClass"
												>,
											</span> </template
										><span :class="structuredDeltaCloseParenClass(change.id)"
											>)</span
										></template
									>
									<template
										v-else-if="isStructuredDeltaLoadingForRevision(change.id)"
									>
										<span class="review-changes__structured-delta-placeholder"
											>(…)</span
										>
									</template>
									<template v-else>
										<span
											:class="wiki.getDeltaClass(change.delta ?? 0, false)"
											>{{ formatDelta(change.delta) }}</span
										>
									</template>
								</div>
								<div
									v-if="
										// !!(change?.summary?.comment || change?.comment) || showDelta
										true
									"
									class="review-changes__summary"
								>
									<template v-if="showDelta">
										<span
											class="review-changes__summary-prefix"
											:class="wiki.getDeltaClass(change.delta ?? 0, false)"
											>{{ formatDelta(change.delta) }}</span
										>
										<span
											v-if="
												!!(change?.summary?.comment || change?.comment) ||
												showEmptyEditSummary
											"
											class="review-changes__summary-sep"
											aria-hidden="true"
											>&nbsp;·&nbsp;</span
										></template
									><template v-if="change?.summary?.comment"
										><span
											v-if="showDelta"
											:class="[
												'review-changes__comment',
												{
													'review-changes__comment--no-cutout':
														!showSummaryCutout,
												},
											]"
											v-html="change.summary.comment"
										></span
										><span
											v-else
											:class="[
												'review-changes__comment',
												{
													'review-changes__comment--no-cutout':
														!showSummaryCutout,
												},
											]"
											v-html="change.summary.comment"
										></span></template
									><span
										v-else-if="change?.comment"
										:class="[
											'review-changes__comment',
											{
												'review-changes__comment--no-cutout':
													!showSummaryCutout,
											},
										]"
										>{{ change.comment }}</span
									>
								</div>
							</span>
							<time
								v-if="!unifiedTitle && timestampPosition === 'topRight'"
								:datetime="change.timestamp"
								class="review-changes__time"
							>
								{{
									simplifiedTimestamp
										? formatRelativeTime(change.timestamp)
										: `${formatTime(change.timestamp)}, ${formatTimeLabel(change.timestamp)}`
								}}
							</time>
						</div>

						<div
							class="review-changes__user-flags-wrapper"
							:class="{
								'review-changes__user-flags-wrapper--flags-above':
									!flagsBelowUsername,
							}"
						>
							<div
								v-if="
									(showReviewButton || showDismissButton) && !hasAnyFlag(change)
								"
								class="review-changes__user-actions-row"
							>
								<span
									v-if="
										(showReviewButton || showDismissButton) &&
										!hasAnyFlag(change)
									"
									class="review-changes__action-buttons"
								>
									<CdxButton
										v-if="showReviewButton"
										:action="
											isRevisionViewed(change)
												? 'default'
												: isLatestRevision(change)
													? 'progressive'
													: 'default'
										"
										size="small"
										weight="quiet"
										class="review-changes__view-change-btn"
										:class="{
											'review-changes__view-change-btn--viewed':
												isRevisionViewed(change),
										}"
										@pointerdown.stop
										@mousedown.stop
										@click.stop="openDiffInNewTab(change)"
									>
										<CdxIcon :icon="cdxIconLinkExternal" size="x-small" />
										Open
									</CdxButton>
									<CdxButton
										v-if="showDismissButton"
										action="default"
										size="small"
										weight="quiet"
										class="review-changes__dismiss-btn"
										aria-label="Dismiss"
										@pointerdown.stop
										@mousedown.stop
										@click.stop="dismissRevision(change)"
									>
										<CdxIcon :icon="cdxIconCheck" size="x-small" />
										Dismiss
									</CdxButton>
								</span>
							</div>
							<div
								v-if="
									(showRevertRiskFlags && getRevertRiskNotice(change)) ||
									(showRevertedFlag && isReverted(change)) ||
									(showRecommendationFlags &&
										getItemSource(change) === 'relatedChanges' &&
										getRecommendationSourcePageNames(change).length) ||
									(showOnWatchlistLabel &&
										change.pageName &&
										isPageOnWatchlist(change.pageName)) ||
									(showEditCheckOtherFlag && hasReferenceNeed(change)) ||
									(showToneCheckFlag && hasToneCheckFlag(change))
								"
								class="review-changes__flags-actions-row"
								:class="{
									'review-changes__flags-actions-row--flags-only': !(
										showReviewButton || showDismissButton
									),
								}"
							>
								<div
									v-if="
										(showRevertRiskFlags && getRevertRiskNotice(change)) ||
										(showRevertedFlag && isReverted(change)) ||
										(showRecommendationFlags &&
											getItemSource(change) === 'relatedChanges' &&
											getRecommendationSourcePageNames(change).length) ||
										(showOnWatchlistLabel &&
											change.pageName &&
											isPageOnWatchlist(change.pageName)) ||
										(showEditCheckOtherFlag && hasReferenceNeed(change)) ||
										(showToneCheckFlag && hasToneCheckFlag(change))
									"
									class="review-changes__flags-container"
									:class="{
										'review-changes__flags-container--no-box':
											!revertRiskFlagsInBox,
										'review-changes__flags-container--no-summary-above':
											!hasSummaryAbove(change),
									}"
								>
									<div
										v-if="
											showOnWatchlistLabel &&
											change.pageName &&
											isPageOnWatchlist(change.pageName)
										"
										class="review-changes__revert-risk-notice review-changes__revert-risk-notice--edit-check"
									>
										<span class="review-changes__revert-risk-notice-text"
											>On your watchlist</span
										>
									</div>

									<div
										v-if="showRevertedFlag && isReverted(change)"
										class="review-changes__revert-risk-notice review-changes__revert-risk-notice--reverted"
									>
										<span class="review-changes__revert-risk-notice-text">{{
											verboseFlags ? "This change was reverted" : "Reverted"
										}}</span>
									</div>
									<div
										v-if="
											showRevertRiskFlags &&
											getRevertRiskNotice(change) &&
											shouldShowFlagNoticeText(change, 'revertRisk')
										"
										class="review-changes__revert-risk-notice"
										:class="{
											'review-changes__revert-risk-notice--very-high':
												getRevertRiskNotice(change)?.band === 'high',
											'review-changes__revert-risk-notice--high':
												getRevertRiskNotice(change)?.band === 'mediumHigh',
											'review-changes__revert-risk-notice--low':
												getRevertRiskNotice(change)?.band === 'low',
											'review-changes__revert-risk-notice--medium-low':
												getRevertRiskNotice(change)?.band === 'mediumLow',
										}"
									>
										<span class="review-changes__revert-risk-notice-text"
											><strong
												>{{
													getRevertRiskNotice(change)!.label
												}}&nbsp;</strong
											>{{ getRevertRiskNotice(change)!.description }}</span
										>
									</div>
									<div
										v-if="
											showEditCheckOtherFlag &&
											hasReferenceNeed(change) &&
											shouldShowFlagNoticeText(change, 'reference')
										"
										class="review-changes__revert-risk-notice review-changes__revert-risk-notice--tone-ref"
									>
										<span class="review-changes__revert-risk-notice-text"
											><strong>Reference issue.&nbsp;</strong
											>{{ "Citations might be needed." }}</span
										>
									</div>
									<div
										v-if="
											showToneCheckFlag &&
											hasToneCheckFlag(change) &&
											shouldShowFlagNoticeText(change, 'tone')
										"
										class="review-changes__revert-risk-notice review-changes__revert-risk-notice--tone-ref"
									>
										<span class="review-changes__revert-risk-notice-text"
											><strong>Tone issue.&nbsp;</strong
											>{{
												"Might need revising to a more neutral tone."
											}}</span
										>
									</div>
									<div
										v-if="
											showRecommendationFlags &&
											getItemSource(change) === 'relatedChanges' &&
											getRecommendationDetailText(
												getRecommendationSourcePageNames(change)
											) &&
											shouldShowFlagNoticeText(change, 'recommendation')
										"
										class="review-changes__recommendation-notice"
										:class="{
											'review-changes__recommendation-notice--primary':
												isRecommendationPrimaryFlag(change),
											'review-changes__recommendation-notice--secondary':
												!isRecommendationPrimaryFlag(change),
											'review-changes__recommendation-notice--viewed':
												!isRecommendationPrimaryFlag(change) &&
												isRevisionViewed(change),
										}"
									>
										<span class="review-changes__recommendation-notice-text">
											<strong>Recommendation.</strong>
											{{
												getRecommendationDetailText(
													getRecommendationSourcePageNames(change)
												)
											}}</span
										>
									</div>
								</div>
								<span
									v-if="
										(showReviewButton || showDismissButton) &&
										hasAnyFlag(change)
									"
									class="review-changes__action-buttons"
								>
									<CdxButton
										v-if="showReviewButton"
										:action="
											isRevisionViewed(change)
												? 'default'
												: isLatestRevision(change)
													? 'progressive'
													: 'default'
										"
										size="small"
										weight="quiet"
										class="review-changes__view-change-btn"
										:class="{
											'review-changes__view-change-btn--viewed':
												isRevisionViewed(change),
										}"
										@pointerdown.stop
										@mousedown.stop
										@click.stop="openDiffInNewTab(change)"
									>
										<CdxIcon :icon="cdxIconLinkExternal" size="x-small" />
										Open
									</CdxButton>
									<CdxButton
										v-if="showDismissButton"
										action="default"
										size="small"
										weight="quiet"
										class="review-changes__dismiss-btn"
										aria-label="Dismiss"
										@pointerdown.stop
										@mousedown.stop
										@click.stop="dismissRevision(change)"
									>
										<CdxIcon :icon="cdxIconCheck" size="x-small" />
										Dismiss
									</CdxButton>
								</span>
							</div>
						</div>
						<span v-if="showRevertRisk" class="review-changes__revert-risk">
							<span
								v-for="line in getRevertRiskLines(change.id)"
								:key="line.label"
								class="review-changes__revert-risk-line"
								:class="{
									'review-changes__revert-risk-line--loading':
										line.value === '(loading)',
									'review-changes__revert-risk-line--error':
										line.value === '(error)' || line.value === '(missing)',
								}"
								>{{ line.label }}: {{ line.value }}</span
							>
						</span>
						<span v-if="showDebugChecks" class="review-changes__revert-risk">
							<span
								v-for="line in getEditCheckDebugLines(change)"
								:key="line.label"
								class="review-changes__revert-risk-line"
								:class="{
									'review-changes__revert-risk-line--loading':
										line.value === '(loading)',
									'review-changes__revert-risk-line--error':
										line.value === '(error)',
								}"
								>{{ line.label }}: {{ line.value }}</span
							>
						</span>
					</component>
					<span
						v-if="viewedBorder && change.id === lastClickedRevisionId"
						class="review-changes__item-line review-changes__item-line--last-clicked review-changes__item-line--right"
						aria-hidden="true"
					/>
					<span
						v-if="unviewedBorder && !isRevisionViewed(change)"
						class="review-changes__item-line review-changes__item-line--unviewed review-changes__item-line--right"
						aria-hidden="true"
					/>
				</li>
			</template>
		</ul>
		<div v-if="!isLoading && hasFeedItems" class="review-changes__view-more">
			<RouterLink class="review-changes__view-more-link" to="/Special/ReviewChangesPlus">
				More changes...
			</RouterLink>
		</div>
		<CdxPopover
			v-model:open="showUserPopover"
			:anchor="userPopoverAnchor"
			placement="bottom-start"
			:render-in-place="true"
			title="User"
			:use-close-button="true"
		>
			This is where the user information goes!
		</CdxPopover>
	</section>
</template>

<script setup lang="ts">
import {
	clearRevisionsCallback,
	setRevisionsCallback,
	useReviewChangesPlusProgress,
} from "@/modules/ReviewChangesPlus/useReviewChangesPlusProgress"
import { CdxButton, CdxIcon, CdxPopover, CdxProgressBar } from "@wikimedia/codex"
import {
	type Icon,
	cdxIconAlert,
	cdxIconArrowNext,
	cdxIconCheck,
	cdxIconClock,
	cdxIconError,
	cdxIconLightbulb,
	cdxIconLinkExternal,
	cdxIconReload,
	cdxIconStar,
	cdxIconUnStar,
	cdxIconUserAvatar,
	cdxIconUserTemporary,
} from "@wikimedia/codex-icons"
import { FakeWiki, FakeWikiHttpError, useStructuredDeltas } from "fakewiki"
import type {
	FWEditTypesDiffSummary,
	FWLiftWingPrediction,
	FWPageHistoryRevision,
	FWPredictionByModel,
	FWPredictionModel,
	FWRevision,
	FWToneCheckPrediction,
} from "fakewiki/types"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import FeedItemTitle from "./FeedItemTitle.vue"

/** Align with Wikimedia guidance (≤3 concurrent API requests); parse + Lift Wing bursts use modest pools. */
const PROCESS_REVISIONS_CONCURRENCY = 4
const RC_SEGMENTS_FETCH_CONCURRENCY = 2
const REFERENCE_NEED_AND_TONE_CONCURRENCY = 4

export type ReviewChangesSource =
	| "recentChanges"
	| "pagesAndUsers"
	| "pagesAndUsersLatest"
	| "relatedChanges"
	| "collaborators"
	| "mixed"

export type ItemSource =
	| "recentChanges"
	| "pagesAndUsers"
	| "pagesAndUsersLatest"
	| "relatedChanges"
	| "collaborators"

const props = withDefaults(
	defineProps<{
		showRevertRisk: boolean
		/** When true, shows "High revert risk" notice flags on feed items. */
		showRevertRiskFlags?: boolean
		/** When true, flag notices have border and padding (box style). When false, no border/padding. */
		revertRiskFlagsInBox?: boolean
		/** When true, shows verbose flag text ("This change has very high revert risk", "This change was reverted", "Because you watch X and Y."). When false, shows simple text ("High revert risk", "Reverted", "Because you watch X and Y."). */
		verboseFlags?: boolean
		/** When true, shows "Reverted" flag for edits that have been reverted. */
		showRevertedFlag?: boolean
		showSourceIcons?: boolean
		showSourceSubtitles?: boolean
		showDelta?: boolean
		/** If false, deltas are shown as +120 / -4 instead of (+120) / (-4). */
		deltaFormatParentheses?: boolean
		source?: ReviewChangesSource
		/** 0–100, used when source is "mixed". 0 = exclude recent changes. */
		recentChangesRatio?: number
		/** 0–100, used when source is "mixed". 0 = exclude pages/users. */
		pagesAndUsersRatio?: number
		/** 0–100, used when source is "mixed". 0 = exclude related changes. */
		relatedChangesRatio?: number
		/** 0–100, used when source is "mixed". 0 = exclude collaborators. */
		collaboratorsRatio?: number
		/** 0–100, used when source is "mixed" or "pagesAndUsersLatest". 0 = exclude watchlist latest. */
		pagesAndUsersLatestRatio?: number
		title?: string
		/** When true, hides the "Help keep Wikipedia reliable..." description line. */
		hideDescription?: boolean
		/** When true, shows @ before usernames. */
		showUsernameAtPrefix?: boolean
		/** When true, shows user icon (head and shoulders) to the left of username. */
		showUserIcon?: boolean
		/** When true, flags (revert risk, reverted, recommendations) appear below the username. Default on. */
		flagsBelowUsername?: boolean
		/** When true, timestamps show relative format ("2 minutes ago", "3 days ago") instead of time + date. */
		simplifiedTimestamp?: boolean
		/** Where to show the timestamp: "topRight" (header), "rightOfUsername", or "belowUsername". */
		timestampPosition?: "topRight" | "rightOfUsername" | "belowUsername"
		/** When true, edit summaries appear with white bg, border and shadow (cutout style). */
		showSummaryCutout?: boolean
		/** When true, show "No edit summary" when there is no edit summary. When false, hide it (delta still shown if enabled). */
		showEmptyEditSummary?: boolean
		/** When true, shows the outer border around the module (for dashboard embedding). */
		showModuleBorder?: boolean
		/** When true, shows an Open button in addition to the card being a link. */
		showReviewButton?: boolean
		/** When true, shows a Dismiss button to the right of the View button. */
		showDismissButton?: boolean
		/** When true, shows recommendation reason for Related changes items (e.g. "Because you watch X and Y."). */
		showRecommendationFlags?: boolean
		/** When true, shows "Reference check" flag for edits where API delta indicates increased uncited content. */
		showEditCheckOtherFlag?: boolean
		/** When true, shows "Tone check" flag for edits where tone check prediction is above threshold. */
		showToneCheckFlag?: boolean
		/** When true, unopened feed items display with a slight blue background. */
		highlightUnviewed?: boolean
		/** When true, unopened feed items display with blue vertical lines on left and right. */
		unviewedBorder?: boolean
		/** When true, the most recently opened feed item displays with black vertical lines until focus leaves the feed. */
		viewedBorder?: boolean
		/** When true, the most recently opened feed item displays with a subtle background until focus leaves the feed. */
		lastClickedHighlight?: boolean
		/** When true, displays a right arrow in the top right of each card. */
		showArrowInTopRight?: boolean
		/** When true, displays the page's short description to the right of the page name. */
		showShortDescription?: boolean
		/** When true, displays a separator (·) between the page name and short description. */
		showShortDescriptionSeparator?: boolean
		/** When true, shows "On your watchlist" for any page in the watchlist set, regardless of feed source. */
		showOnWatchlistLabel?: boolean
		/** When true, shows debug scores for edit checks (reference need delta, tags). */
		showDebugChecks?: boolean
		/** When true, uses unified title component (page name + short desc + timestamp together). When false, uses separate elements (original Review Changes layout). */
		unifiedTitle?: boolean
		/** When true, show structured edit-types deltas in the summary row for items that are flagged and not yet viewed. */
		showStructuredDeltasForFlaggedUnviewed?: boolean
		/**
		 * When true, only show recent-changes-sourced items whose Lift Wing revertrisk score is above
		 * REVERT_RISK_THRESHOLDS.upperLoose (same bar as elevated “High revert risk” notices).
		 */
		requireRecentChangesMeetRevertRiskThresholds?: boolean
	}>(),
	{
		showRevertRiskFlags: false,
		revertRiskFlagsInBox: true,
		verboseFlags: true,
		showRevertedFlag: false,
		showSourceIcons: false,
		showSourceSubtitles: false,
		showUsernameAtPrefix: false,
		showUserIcon: false,
		flagsBelowUsername: true,
		simplifiedTimestamp: false,
		timestampPosition: "topRight",
		showDelta: true,
		deltaFormatParentheses: false,
		source: "recentChanges",
		recentChangesRatio: 50,
		pagesAndUsersRatio: 50,
		relatedChangesRatio: 30,
		collaboratorsRatio: 20,
		pagesAndUsersLatestRatio: 20,
		hideDescription: false,
		showSummaryCutout: true,
		showEmptyEditSummary: true,
		showModuleBorder: true,
		showReviewButton: false,
		showDismissButton: false,
		showRecommendationFlags: false,
		showEditCheckOtherFlag: false,
		showToneCheckFlag: false,
		highlightUnviewed: false,
		unviewedBorder: false,
		viewedBorder: false,
		lastClickedHighlight: false,
		showArrowInTopRight: false,
		showShortDescription: true,
		showShortDescriptionSeparator: false,
		showOnWatchlistLabel: false,
		showDebugChecks: false,
		unifiedTitle: false,
		showStructuredDeltasForFlaggedUnviewed: false,
		requireRecentChangesMeetRevertRiskThresholds: false,
	}
)

const wiki = new FakeWiki()

/** Set after `useStructuredDeltas` below; used by persist/restore helpers. */
let structuredDeltas: ReturnType<typeof useStructuredDeltas> | null = null

const {
	isRevisionViewed,
	markRevisionAsViewed,
	dismissedRevisionIds,
	dismissRevision,
	lastClickedRevisionId,
	clearLastClickedRevisionId,
	clearViewedRevisions,
} = useReviewChangesPlusProgress()

const feedRef = ref<HTMLElement | null>(null)

function onFeedFocusOut(event: FocusEvent): void {
	const relatedTarget = event.relatedTarget as Node | null
	if (feedRef.value && relatedTarget && !feedRef.value.contains(relatedTarget)) {
		clearLastClickedRevisionId()
	}
}

const userPopoverAnchor = ref<HTMLElement | null>(null)
const showUserPopover = ref(false)

function openUserPopover(event: MouseEvent, _change: FWRevision): void {
	userPopoverAnchor.value = event.currentTarget as HTMLElement
	showUserPopover.value = true
}

function openDiffInNewTab(change: FWRevision): void {
	if (change.pageName) {
		markRevisionAsViewed(change)
		window.open(wiki.getRevisionUrl(change.id, change.pageName), "_blank")
	}
}

/** Prevent pointer/mouse events from the action buttons (View, Dismiss) from activating the card link.
 * Uses capture phase so we run when the event arrives at the link (before it reaches the buttons).
 * We only preventDefault so the event still reaches the buttons; preventDefault stops the link from activating. */
function onCardPointerDown(event: PointerEvent | MouseEvent): void {
	if ((event.target as Element)?.closest(".review-changes__action-buttons")) {
		event.preventDefault()
	}
}

/** Check if a revision has been reverted (mw-reverted or reverted tag). */
function isReverted(change: FWRevision): boolean {
	const tags = change.tags
	if (!tags || tags.length === 0) return false
	return tags.includes("mw-reverted") || tags.includes("reverted")
}

/** Edit check and similar tags. Paste/references may appear on en.wikipedia.org. */
const EDIT_CHECK_OTHER_TAGS = [
	"editcheck-references",
	"editcheck-newreference",
	"editcheck-references-shown",
]
/** Reference check: API delta above threshold (change increased uncited content). Only for positive deltas. Tags indicate tool use, not need. */
function hasReferenceNeed(change: FWRevision): boolean {
	const entry = referenceNeedByRevId.value.get(change.id)
	return (
		entry != null &&
		!("error" in entry) &&
		entry.delta > 0 &&
		entry.delta >= REFERENCE_NEED_THRESHOLD
	)
}

/** Tone check: prediction indicates promotional/subjective language above threshold. */
function hasToneCheckFlag(change: FWRevision): boolean {
	const entry = toneCheckByRevId.value.get(change.id)
	if (entry == null || "error" in entry) return false
	return (
		entry.prediction === true &&
		typeof entry.probability === "number" &&
		entry.probability >= TONE_CHECK_THRESHOLD
	)
}

/** Whether any flag is shown for this change (revert risk, reverted, recommendation, edit check, tone check, on watchlist). */
function hasAnyFlag(change: FWRevision): boolean {
	return (
		(props.showRevertRiskFlags && !!getRevertRiskNotice(change)) ||
		(props.showRevertedFlag && isReverted(change)) ||
		(props.showRecommendationFlags &&
			getItemSource(change) === "relatedChanges" &&
			getRecommendationSourcePageNames(change).length > 0) ||
		(props.showOnWatchlistLabel && !!change.pageName && isPageOnWatchlist(change.pageName)) ||
		(props.showEditCheckOtherFlag && hasReferenceNeed(change)) ||
		(props.showToneCheckFlag && hasToneCheckFlag(change))
	)
}

/** Whether there is summary content (comment, delta, or empty-edit placeholder) above the flags. */
function hasSummaryAbove(change: FWRevision): boolean {
	return (
		!!(change?.summary?.comment || change?.comment) ||
		props.showDelta ||
		props.showEmptyEditSummary ||
		(props.showStructuredDeltasForFlaggedUnviewed && hasAnyFlag(change))
	)
}

/** Enrich revisions that lack tags by fetching from the API (for page history, related changes). */
async function enrichRevisionsWithTags(revisions: FWRevision[]): Promise<FWRevision[]> {
	const revIdsToFetch = revisions
		.filter(r => r.id > 0 && (!r.tags || r.tags.length === 0))
		.map(r => r.id)
	if (revIdsToFetch.length === 0) return revisions

	const tagsMap = await wiki.getRevisionTags(revIdsToFetch)
	if (tagsMap.size === 0) return revisions

	return revisions.map(r => {
		const tags = tagsMap.get(r.id)
		if (!tags) return r
		return { ...r, tags }
	})
}

const revertRiskByRevId = ref<Map<number, FWPredictionByModel | { error: true }>>(new Map())
const isLoadingRevertRisk = ref(false)

const referenceNeedByRevId = ref<
	Map<number, { delta: number; before: number; after: number } | { error: true }>
>(new Map())
const isLoadingReferenceNeed = ref(false)
/** Delta threshold: show flag when change increased uncited content by this much (rn_after - rn_before). */
const REFERENCE_NEED_THRESHOLD = 0.01

const toneCheckByRevId = ref<Map<number, FWToneCheckPrediction | { error: true } | null>>(new Map())
const isLoadingToneCheck = ref(false)
/** Show tone check flag when prediction is true and probability >= this (0–1). */
const TONE_CHECK_THRESHOLD = 0.55

const REVERT_RISK_MODELS = [
	{ key: "revertrisk" as const, label: "Revert risk (language-agnostic)" },
	{ key: "revertrisk-multilingual" as const, label: "Revert risk (multilingual)" },
]

function formatRevertRiskPercent(prediction: FWLiftWingPrediction): number {
	const p = prediction.probability?.true
	return typeof p === "number" ? Math.round(p * 100) : 0
}

function getRevertRiskLines(revId: number): Array<{ label: string; value: string }> {
	if (isLoadingRevertRisk.value) {
		return REVERT_RISK_MODELS.map(m => ({ label: m.label, value: "(loading)" }))
	}
	const entry = revertRiskByRevId.value.get(revId)
	if (!entry) {
		return REVERT_RISK_MODELS.map(m => ({ label: m.label, value: "(loading)" }))
	}
	if ("error" in entry && entry.error) {
		return REVERT_RISK_MODELS.map(m => ({ label: m.label, value: "(error)" }))
	}
	const byModel = entry as FWPredictionByModel
	return REVERT_RISK_MODELS.map(m => {
		const pred = byModel[m.key]
		const value = pred ? `${formatRevertRiskPercent(pred)}%` : "(missing)"
		return { label: m.label, value }
	})
}

const EDIT_CHECK_DEBUG_TAGS = [
	...EDIT_CHECK_OTHER_TAGS,
	"editcheck-paste-shown",
	"editcheck-newcontent",
	"editsuggestion-seen",
]

function getEditCheckDebugLines(change: FWRevision): Array<{ label: string; value: string }> {
	const lines: Array<{ label: string; value: string }> = []

	// Reference need: before, after, delta (only for revisions with pageName)
	if (change.pageName) {
		if (isLoadingReferenceNeed.value) {
			lines.push({ label: "Ref need before", value: "(loading)" })
			lines.push({ label: "Ref need after", value: "(loading)" })
			lines.push({ label: "Ref need Δ", value: "(loading)" })
		} else {
			const rnEntry = referenceNeedByRevId.value.get(change.id)
			if (rnEntry === undefined) {
				lines.push({ label: "Ref need before", value: "(loading)" })
				lines.push({ label: "Ref need after", value: "(loading)" })
				lines.push({ label: "Ref need Δ", value: "(loading)" })
			} else if (typeof rnEntry === "object" && "error" in rnEntry) {
				lines.push({ label: "Ref need before", value: "(error)" })
				lines.push({ label: "Ref need after", value: "(error)" })
				lines.push({ label: "Ref need Δ", value: "(error)" })
			} else {
				lines.push({ label: "Ref need before", value: rnEntry.before.toFixed(3) })
				lines.push({ label: "Ref need after", value: rnEntry.after.toFixed(3) })
				lines.push({ label: "Ref need Δ", value: rnEntry.delta.toFixed(3) })
			}
		}
	} else {
		lines.push({ label: "Ref need before", value: "(n/a)" })
		lines.push({ label: "Ref need after", value: "(n/a)" })
		lines.push({ label: "Ref need Δ", value: "(n/a)" })
	}

	// Tone check: prediction and probability (only for revisions with pageName)
	if (change.pageName) {
		if (isLoadingToneCheck.value) {
			lines.push({ label: "Tone check", value: "(loading)" })
		} else {
			const tcEntry = toneCheckByRevId.value.get(change.id)
			if (tcEntry === undefined) {
				lines.push({ label: "Tone check", value: "(loading)" })
			} else if (tcEntry !== null && "error" in tcEntry) {
				lines.push({ label: "Tone check", value: "(error)" })
			} else if (tcEntry === null) {
				lines.push({ label: "Tone check", value: "(no changes)" })
			} else {
				const pred = tcEntry.prediction ? "yes" : "no"
				const prob = (tcEntry.probability * 100).toFixed(1)
				lines.push({ label: "Tone check", value: `${pred}, ${prob}%` })
			}
		}
	} else {
		lines.push({ label: "Tone check", value: "(n/a)" })
	}

	// Edit check tags present on this revision
	const tags = change.tags ?? []
	const editCheckTags = tags.filter(t => EDIT_CHECK_DEBUG_TAGS.includes(t))
	lines.push({
		label: "Tags",
		value: editCheckTags.length > 0 ? editCheckTags.join(", ") : "(none)",
	})

	return lines
}

/** Band thresholds for language-agnostic revert risk: above 80% = yellow, above 90% = red; below 25% = green, below 45% = blue */
const REVERT_RISK_THRESHOLDS = {
	lowerTight: 0.25,
	lowerLoose: 0.45,
	upperLoose: 0.86,
	upperTight: 0.86,
} as const

type RevertRiskBand = "high" | "mediumHigh" | "low" | "mediumLow"

function getRiskFromPrediction(pred: FWLiftWingPrediction): number {
	const p = pred.probability?.true
	return typeof p === "number" ? p : 0
}

function getRevertRiskNotice(
	change: FWRevision
): { label: string; description: string; band: RevertRiskBand } | null {
	if (isLoadingRevertRisk.value) return null
	const entry = revertRiskByRevId.value.get(change.id)
	if (!entry || ("error" in entry && entry.error)) return null
	const byModel = entry as FWPredictionByModel
	const pred = byModel.revertrisk
	if (!pred) return null
	const risk = getRiskFromPrediction(pred)
	const verbose = props.verboseFlags
	const revWord = isReverted(change) ? "had" : "has"
	if (risk > REVERT_RISK_THRESHOLDS.upperTight) {
		return {
			label: "High revert risk.",
			description: verbose
				? `This change ${revWord} high revert risk.`
				: "This edit has a high chance of getting undone.",
			band: "high",
		}
	}
	if (risk > REVERT_RISK_THRESHOLDS.upperLoose) {
		return {
			label: "High revert risk.",
			description: verbose
				? `This change ${revWord} high revert risk.`
				: "This edit has a high chance of getting undone.",
			band: "mediumHigh",
		}
	}
	if (risk < REVERT_RISK_THRESHOLDS.lowerTight) {
		return {
			label: "Very low revert risk.",
			description: verbose
				? `This change ${revWord} very low revert risk.`
				: "This edit is unlikely to be reverted.",
			band: "low",
		}
	}
	if (risk < REVERT_RISK_THRESHOLDS.lowerLoose) {
		return {
			label: "Low revert risk.",
			description: verbose
				? `This change ${revWord} low revert risk.`
				: "This edit has a low chance of getting undone.",
			band: "mediumLow",
		}
	}
	return null
}

function getRecommendationSourcePageNames(change: RevisionWithSource): string[] {
	return (
		(change as { recommendationSourcePageNames?: string[] }).recommendationSourcePageNames ?? []
	)
}

/** Body text for recommendation flag (after bold "Recommendation."). */
function getRecommendationDetailText(sourcePageNames: string[]): string {
	if (!sourcePageNames?.length) return ""
	if (sourcePageNames.length === 1) {
		return `Shown because you watch ${sourcePageNames[0]}.`
	}
	if (sourcePageNames.length === 2) {
		return `Shown because you watch ${sourcePageNames[0]} and ${sourcePageNames[1]}.`
	}
	const last = sourcePageNames[sourcePageNames.length - 1]
	const rest = sourcePageNames.slice(0, -1).join(", ")
	return `Shown because you watch ${rest}, and ${last}.`
}

function revertRiskEntryIsComplete(
	entry: FWPredictionByModel | { error: true } | undefined,
	models: FWPredictionModel[]
): boolean {
	if (!entry || ("error" in entry && entry.error)) return false
	const by = entry as FWPredictionByModel
	return models.every(m => by[m] != null)
}

/** Same upper band as elevated revert-risk notices; false if prediction missing or incomplete. */
function revertRiskScoreMeetsUpperThreshold(revision: FWRevision): boolean {
	const entry = revertRiskByRevId.value.get(revision.id)
	if (!entry || ("error" in entry && entry.error)) return false
	const byModel = entry as FWPredictionByModel
	const pred = byModel.revertrisk
	if (!pred) return false
	return getRiskFromPrediction(pred) > REVERT_RISK_THRESHOLDS.upperLoose
}

/** Keep in risky-feed mode if revert risk is high or ref/tone checks flag an issue (when those checks are enabled). */
function recentChangeQualifiesForRiskyFeed(revision: FWRevision): boolean {
	return (
		revertRiskScoreMeetsUpperThreshold(revision) ||
		(props.showEditCheckOtherFlag && hasReferenceNeed(revision)) ||
		(props.showToneCheckFlag && hasToneCheckFlag(revision))
	)
}

function pickFirstNQualifyingRevisions(
	ordered: FWRevision[],
	target: number,
	qualifies: (r: FWRevision) => boolean
): FWRevision[] {
	if (target <= 0) return []
	const out: FWRevision[] = []
	for (const r of ordered) {
		if (out.length >= target) break
		if (qualifies(r)) out.push(r)
	}
	return out
}

function referenceNeedEntryValid(
	entry: { delta: number; before: number; after: number } | { error: true } | undefined
): entry is { delta: number; before: number; after: number } {
	if (entry == null) return false
	return !("error" in entry && entry.error)
}

function toneCheckEntryValid(
	entry: FWToneCheckPrediction | { error: true } | null | undefined
): boolean {
	if (entry == null) return false
	if (typeof entry === "object" && "error" in entry && entry.error) return false
	return true
}

async function fetchRevertRiskForFeed(): Promise<void> {
	let revs: FWRevision[] = [...selectedRevisionsForDisplay.value]
	if (props.requireRecentChangesMeetRevertRiskThresholds) {
		if (props.source === "mixed") {
			const rcCandidates = getMixedRecentChangesFullyOrdered()
			const byId = new Map<number, FWRevision>(revs.map(r => [r.id, r]))
			for (const r of rcCandidates) {
				if (!byId.has(r.id)) byId.set(r.id, r)
			}
			revs = [...byId.values()]
		} else if (props.source === "recentChanges") {
			const rcCandidates = getStandaloneRecentChangesCandidatePool()
			const byId = new Map<number, FWRevision>(revs.map(r => [r.id, r]))
			for (const r of rcCandidates) {
				if (!byId.has(r.id)) byId.set(r.id, r)
			}
			revs = [...byId.values()]
		}
	}
	if (revs.length === 0) return
	const revIds = revs.map(r => r.id)
	const prev = revertRiskByRevId.value
	const models: FWPredictionModel[] = props.showRevertRisk
		? ["revertrisk", "revertrisk-multilingual"]
		: ["revertrisk"]
	const toFetch = revIds.filter(id => !revertRiskEntryIsComplete(prev.get(id), models))
	if (toFetch.length === 0) {
		const pruned = new Map<number, FWPredictionByModel | { error: true }>()
		for (const id of revIds) {
			const e = prev.get(id)
			if (revertRiskEntryIsComplete(e, models)) pruned.set(id, e as FWPredictionByModel)
		}
		revertRiskByRevId.value = pruned
		schedulePersistFeedBundleSave()
		return
	}
	isLoadingRevertRisk.value = true
	const next = new Map<number, FWPredictionByModel | { error: true }>()
	for (const id of revIds) {
		const e = prev.get(id)
		if (revertRiskEntryIsComplete(e, models)) next.set(id, e as FWPredictionByModel)
	}
	try {
		const predictions = await wiki.getRevisionPredictions(toFetch, models)
		for (const revId of toFetch) {
			const byModel = predictions[revId] ?? {}
			next.set(revId, byModel)
		}
		revertRiskByRevId.value = next
	} catch {
		for (const revId of toFetch) {
			if (!next.has(revId)) next.set(revId, { error: true })
		}
		revertRiskByRevId.value = next
	} finally {
		isLoadingRevertRisk.value = false
		schedulePersistFeedBundleSave()
	}
}

async function fetchReferenceNeedForFeed(): Promise<void> {
	let revs: FWRevision[] = [...selectedRevisionsForDisplay.value]
	if (props.requireRecentChangesMeetRevertRiskThresholds) {
		if (props.source === "mixed") {
			const rcCandidates = getMixedRecentChangesFullyOrdered()
			const byId = new Map(revs.map(r => [r.id, r]))
			for (const r of rcCandidates) {
				if (!byId.has(r.id)) byId.set(r.id, r)
			}
			revs = [...byId.values()]
		} else if (props.source === "recentChanges") {
			const rcCandidates = getStandaloneRecentChangesCandidatePool()
			const byId = new Map(revs.map(r => [r.id, r]))
			for (const r of rcCandidates) {
				if (!byId.has(r.id)) byId.set(r.id, r)
			}
			revs = [...byId.values()]
		}
	}
	if (revs.length === 0) return
	const revsWithPage = revs.filter(r => r.pageName)
	if (revsWithPage.length === 0) return
	const prev = referenceNeedByRevId.value
	const toFetch = revsWithPage.filter(c => !referenceNeedEntryValid(prev.get(c.id)))
	if (toFetch.length === 0) {
		const pruned = new Map<
			number,
			{ delta: number; before: number; after: number } | { error: true }
		>()
		for (const c of revsWithPage) {
			const e = prev.get(c.id)
			if (referenceNeedEntryValid(e)) pruned.set(c.id, e)
		}
		referenceNeedByRevId.value = pruned
		schedulePersistFeedBundleSave()
		return
	}
	isLoadingReferenceNeed.value = true
	const next = new Map<
		number,
		{ delta: number; before: number; after: number } | { error: true }
	>()
	for (const c of revsWithPage) {
		const e = prev.get(c.id)
		if (referenceNeedEntryValid(e)) next.set(c.id, e)
	}
	try {
		const results = await wiki.runWithConcurrency(
			toFetch,
			REFERENCE_NEED_AND_TONE_CONCURRENCY,
			async change => {
				try {
					const parentId = await wiki.getParentRevisionId(change.pageName!, change.id)
					const [beforePred, afterPred] = await Promise.all([
						parentId != null ? wiki.getReferenceNeedPrediction(parentId) : null,
						wiki.getReferenceNeedPrediction(change.id),
					])
					const rnBefore = beforePred?.rn_score ?? 0
					const rnAfter = afterPred?.rn_score ?? null
					if (typeof rnAfter !== "number")
						return { revId: change.id, delta: null, error: true } as const
					const delta = rnAfter - rnBefore
					return {
						revId: change.id,
						before: rnBefore,
						after: rnAfter,
						delta,
						error: false,
					} as const
				} catch {
					return { revId: change.id, delta: null, error: true } as const
				}
			}
		)
		for (const result of results) {
			if (result.error) {
				next.set(result.revId, { error: true })
			} else if (typeof result.delta === "number") {
				next.set(result.revId, {
					before: result.before,
					after: result.after,
					delta: result.delta,
				})
			}
		}
		referenceNeedByRevId.value = next
	} catch {
		for (const change of toFetch) {
			if (!next.has(change.id)) next.set(change.id, { error: true })
		}
		referenceNeedByRevId.value = next
	} finally {
		isLoadingReferenceNeed.value = false
		schedulePersistFeedBundleSave()
	}
}

async function fetchToneCheckForFeed(): Promise<void> {
	let revs: FWRevision[] = [...selectedRevisionsForDisplay.value]
	if (props.requireRecentChangesMeetRevertRiskThresholds) {
		if (props.source === "mixed") {
			const rcCandidates = getMixedRecentChangesFullyOrdered()
			const byId = new Map(revs.map(r => [r.id, r]))
			for (const r of rcCandidates) {
				if (!byId.has(r.id)) byId.set(r.id, r)
			}
			revs = [...byId.values()]
		} else if (props.source === "recentChanges") {
			const rcCandidates = getStandaloneRecentChangesCandidatePool()
			const byId = new Map(revs.map(r => [r.id, r]))
			for (const r of rcCandidates) {
				if (!byId.has(r.id)) byId.set(r.id, r)
			}
			revs = [...byId.values()]
		}
	}
	if (revs.length === 0) return
	const revsWithPage = revs.filter(r => r.pageName)
	if (revsWithPage.length === 0) return
	const prev = toneCheckByRevId.value
	const toFetch = revsWithPage.filter(c => !toneCheckEntryValid(prev.get(c.id)))
	if (toFetch.length === 0) {
		const pruned = new Map<number, FWToneCheckPrediction | { error: true } | null>()
		for (const c of revsWithPage) {
			const e = prev.get(c.id)
			if (toneCheckEntryValid(e)) pruned.set(c.id, e as FWToneCheckPrediction)
		}
		toneCheckByRevId.value = pruned
		schedulePersistFeedBundleSave()
		return
	}
	isLoadingToneCheck.value = true
	const next = new Map<number, FWToneCheckPrediction | { error: true } | null>()
	for (const c of revsWithPage) {
		const e = prev.get(c.id)
		if (toneCheckEntryValid(e)) next.set(c.id, e as FWToneCheckPrediction)
	}
	try {
		const results = await wiki.runWithConcurrency(
			toFetch,
			REFERENCE_NEED_AND_TONE_CONCURRENCY,
			async change => {
				try {
					const pred = await wiki.getToneCheckForRevision(change.pageName!, change.id)
					return { revId: change.id, pred } as const
				} catch {
					return { revId: change.id, pred: { error: true } as const } as const
				}
			}
		)
		for (const { revId, pred } of results) {
			next.set(revId, pred)
		}
		toneCheckByRevId.value = next
	} catch {
		for (const change of toFetch) {
			if (!next.has(change.id)) next.set(change.id, { error: true })
		}
		toneCheckByRevId.value = next
	} finally {
		isLoadingToneCheck.value = false
		schedulePersistFeedBundleSave()
	}
}

const allRevisionsData = ref<FWRevision[]>([])
const selectedRevisions = ref<FWRevision[]>([])
/** Cached data for mixed mode; ratio is applied client-side only */
/** Recent changes split into 4 segments across the watchlist time range; we slice from these in parallel when displaying */
const mixedRecentChangesBySegment = ref<FWRevision[][]>([])
const mixedPagesAndUsersData = ref<FWRevision[]>([])
const mixedPagesAndUsersLatestData = ref<FWRevision[]>([])
const mixedCollaboratorsData = ref<FWRevision[]>([])
const mixedRelatedChangesData = ref<FWRevision[]>([])

type RevisionWithSource = FWRevision & { itemSource?: ItemSource }

const NUM_RC_SEGMENTS = 4

/** Full interleaved recent-changes ordering for mixed mode (segment round-robin); not capped by ratio. */
function getMixedRecentChangesFullyOrdered(): FWRevision[] {
	const rcSegments = mixedRecentChangesBySegment.value
	const rcRatioPercent = Math.max(0, Math.min(100, props.recentChangesRatio ?? 50))
	if (rcRatioPercent === 0) return []
	const segments = [
		rcSegments[0] ?? [],
		rcSegments[1] ?? [],
		rcSegments[2] ?? [],
		rcSegments[3] ?? [],
	].filter(s => s.length > 0)
	const segmentsByNewest = [...segments].sort((a, b) => {
		const aNewest = a[0]?.timestamp ?? ""
		const bNewest = b[0]?.timestamp ?? ""
		return bNewest.localeCompare(aNewest)
	})
	const rcOrdered: FWRevision[] = []
	const maxSegLen = Math.max(...segmentsByNewest.map(s => s.length), 0)
	for (let i = 0; i < maxSegLen; i++) {
		for (const seg of segmentsByNewest) {
			if (seg[i]) rcOrdered.push(seg[i])
		}
	}
	return rcOrdered
}

/** Target slot count for recent changes in mixed mode (ratio of RECENT_CHANGES_LIMIT). */
function getMixedRecentChangesTargetCount(): number {
	const rcOrdered = getMixedRecentChangesFullyOrdered()
	const rcRatioPercent = Math.max(0, Math.min(100, props.recentChangesRatio ?? 50))
	if (rcRatioPercent === 0) return 0
	return Math.min(
		Math.floor((RECENT_CHANGES_LIMIT * rcRatioPercent) / 100),
		rcOrdered.length
	)
}

/** Pre-filter recent-changes slice for mixed mode when not using risky-feed backfill (same ordering as the feed). */
function getMixedRecentChangesSlicedRevisions(): FWRevision[] {
	const rcOrdered = getMixedRecentChangesFullyOrdered()
	const target = getMixedRecentChangesTargetCount()
	return rcOrdered.slice(0, target)
}

/** Full candidate pool for standalone recent changes (time order), for prediction fetch and backfill. */
function getStandaloneRecentChangesCandidatePool(): FWRevision[] {
	if (props.source !== "recentChanges") return []
	return selectedRevisions.value
}

function getSelectedRevisionsForDisplay(): RevisionWithSource[] {
	if (props.source !== "mixed") {
		let all = selectedRevisions.value
		if (props.source === "relatedChanges") {
			all = [...all].sort((a, b) => {
				const scoreA = (a as FWRevision & { score?: number }).score ?? -Infinity
				const scoreB = (b as FWRevision & { score?: number }).score ?? -Infinity
				if (scoreB !== scoreA) return scoreB - scoreA
				return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			})
		}
		const ratioPercent =
			props.source === "recentChanges"
				? Math.max(0, Math.min(100, props.recentChangesRatio ?? 50))
				: props.source === "pagesAndUsers"
					? Math.max(0, Math.min(100, props.pagesAndUsersRatio ?? 50))
					: props.source === "pagesAndUsersLatest"
						? Math.max(0, Math.min(100, props.pagesAndUsersLatestRatio ?? 20))
						: props.source === "collaborators"
							? Math.max(0, Math.min(100, props.collaboratorsRatio ?? 20))
							: Math.max(0, Math.min(100, props.relatedChangesRatio ?? 30))
		const count = Math.min(Math.floor((RECENT_CHANGES_LIMIT * ratioPercent) / 100), all.length)
		let toShow =
			props.requireRecentChangesMeetRevertRiskThresholds && props.source === "recentChanges"
				? pickFirstNQualifyingRevisions(all, count, recentChangeQualifiesForRiskyFeed)
				: all.slice(0, count)
		return toShow.map(r => ({ ...r, itemSource: props.source as ItemSource }))
	}
	const wl = mixedPagesAndUsersData.value
	const wlLatest = mixedPagesAndUsersLatestData.value
	const collaborators = mixedCollaboratorsData.value
	const related = mixedRelatedChangesData.value
	const rcRatioPercent = Math.max(0, Math.min(100, props.recentChangesRatio ?? 50))
	const wlRatioPercent = Math.max(0, Math.min(100, props.pagesAndUsersRatio ?? 50))
	const wlLatestRatioPercent = Math.max(0, Math.min(100, props.pagesAndUsersLatestRatio ?? 20))
	const collaboratorsRatioPercent = Math.max(0, Math.min(100, props.collaboratorsRatio ?? 20))
	const relatedRatioPercent = Math.max(0, Math.min(100, props.relatedChangesRatio ?? 30))

	// 0% all: show nothing
	if (
		rcRatioPercent === 0 &&
		wlRatioPercent === 0 &&
		wlLatestRatioPercent === 0 &&
		collaboratorsRatioPercent === 0 &&
		relatedRatioPercent === 0
	)
		return []

	let rcSliced = props.requireRecentChangesMeetRevertRiskThresholds
		? pickFirstNQualifyingRevisions(
				getMixedRecentChangesFullyOrdered(),
				getMixedRecentChangesTargetCount(),
				recentChangeQualifiesForRiskyFeed
			)
		: getMixedRecentChangesSlicedRevisions()

	const wlCount = Math.min(Math.floor((RECENT_CHANGES_LIMIT * wlRatioPercent) / 100), wl.length)
	const wlSliced = wl.slice(0, wlCount)

	const wlLatestCount = Math.min(
		Math.floor((RECENT_CHANGES_LIMIT * wlLatestRatioPercent) / 100),
		wlLatest.length
	)
	const wlLatestSliced = wlLatest.slice(0, wlLatestCount)

	const collaboratorsCount = Math.min(
		Math.floor((RECENT_CHANGES_LIMIT * collaboratorsRatioPercent) / 100),
		collaborators.length
	)
	const collaboratorsSliced = collaborators.slice(0, collaboratorsCount)

	// Related: order by score (higher first), then by recency (newest first) within same score
	const relatedSorted = [...related].sort((a, b) => {
		const scoreA = (a as FWRevision & { score?: number }).score ?? -Infinity
		const scoreB = (b as FWRevision & { score?: number }).score ?? -Infinity
		if (scoreB !== scoreA) return scoreB - scoreA
		return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	})
	const relatedCount = Math.min(
		Math.floor((RECENT_CHANGES_LIMIT * relatedRatioPercent) / 100),
		relatedSorted.length
	)
	const relatedSliced = relatedSorted.slice(0, relatedCount)

	// Round-robin across 5 pools: RC, WL, WL latest, collaborators, relatedChanges
	const pools = [
		rcSliced.map(r => ({ ...r, itemSource: "recentChanges" as const })),
		wlSliced.map(r => ({ ...r, itemSource: "pagesAndUsers" as const })),
		wlLatestSliced.map(r => ({ ...r, itemSource: "pagesAndUsersLatest" as const })),
		collaboratorsSliced.map(r => ({ ...r, itemSource: "collaborators" as const })),
		relatedSliced.map(r => ({ ...r, itemSource: "relatedChanges" as const })),
	]
	const maxLen = Math.max(...pools.map(p => p.length))
	const merged: RevisionWithSource[] = []
	for (let i = 0; i < maxLen; i++) {
		for (const pool of pools) {
			if (pool[i]) merged.push(pool[i])
		}
	}
	return merged
}

function getItemSource(change: RevisionWithSource): ItemSource | undefined {
	return change.itemSource
}

type PrimaryFeedFlag =
	| { tier: "toneReference" }
	| { tier: "revertRisk"; band: "high" | "mediumHigh" }
	| { tier: "recommendation" }

/** Highest-priority feed alert for header icon and (when unviewed) card border: tone/ref > elevated revert risk > recommendation. Low/very-low revert risk does not count toward primary. */
function getPrimaryFeedFlag(change: RevisionWithSource): PrimaryFeedFlag | null {
	const tone = props.showToneCheckFlag && hasToneCheckFlag(change)
	const reference = props.showEditCheckOtherFlag && hasReferenceNeed(change)
	if (tone || reference) {
		return { tier: "toneReference" }
	}
	if (props.showRevertRiskFlags) {
		const notice = getRevertRiskNotice(change)
		if (notice?.band === "high") return { tier: "revertRisk", band: "high" }
		if (notice?.band === "mediumHigh") return { tier: "revertRisk", band: "mediumHigh" }
	}
	if (
		props.showRecommendationFlags &&
		getItemSource(change) === "relatedChanges" &&
		getRecommendationSourcePageNames(change).length > 0
	) {
		return { tier: "recommendation" }
	}
	return null
}

function isPrimaryRevertVeryHigh(change: RevisionWithSource): boolean {
	const p = getPrimaryFeedFlag(change)
	return p?.tier === "revertRisk" && p.band === "high"
}

function isPrimaryRevertHigh(change: RevisionWithSource): boolean {
	const p = getPrimaryFeedFlag(change)
	return p?.tier === "revertRisk" && p.band === "mediumHigh"
}

function primaryFlagCdxIcon(change: RevisionWithSource): Icon {
	const p = getPrimaryFeedFlag(change)
	if (!p) return cdxIconAlert
	if (p.tier === "toneReference") return cdxIconAlert
	if (p.tier === "revertRisk") {
		return p.band === "high" ? cdxIconError : cdxIconAlert
	}
	// return cdxIconLightbulb
	return cdxIconStar
}

function primaryFlagIconModifierClass(change: RevisionWithSource): string {
	const p = getPrimaryFeedFlag(change)
	if (!p) return ""
	if (p.tier === "toneReference") return "review-changes__primary-flag-icon--tone"
	if (p.tier === "revertRisk") {
		return p.band === "high"
			? "review-changes__primary-flag-icon--revert"
			: "review-changes__primary-flag-icon--revert-warn"
	}
	return "review-changes__primary-flag-icon--recommendation"
}

function isRecommendationPrimaryFlag(change: RevisionWithSource): boolean {
	return getPrimaryFeedFlag(change)?.tier === "recommendation"
}

/** When a primary alert exists, show only that notice (e.g. revert risk hides reference/tone/recommendation text). Watchlist and reverted stay visible. */
function shouldShowFlagNoticeText(
	change: RevisionWithSource,
	which: "revertRisk" | "reference" | "tone" | "recommendation"
): boolean {
	const p = getPrimaryFeedFlag(change)
	if (!p) return true
	if (p.tier === "recommendation") return which === "recommendation"
	if (p.tier === "revertRisk") return which === "revertRisk"
	if (p.tier === "toneReference") {
		if (which === "recommendation" || which === "revertRisk") return false
		if (which === "tone") {
			return !!(props.showToneCheckFlag && hasToneCheckFlag(change))
		}
		if (which === "reference") {
			if (!(props.showEditCheckOtherFlag && hasReferenceNeed(change))) return false
			if (props.showToneCheckFlag && hasToneCheckFlag(change)) return false
			return true
		}
	}
	return false
}

function isPageOnWatchlist(pageName: string | undefined): boolean {
	if (!pageName) return false
	const lower = pageName.toLowerCase()
	return HARDCODED_PAGE_NAMES.some(p => p.toLowerCase() === lower)
}

/** Latest revision ID per page for watchlist (pagesAndUsers) source. */
function buildLatestRevIdByPage(revisions: FWRevision[]): Map<string, number> {
	const map = new Map<string, number>()
	for (const rev of revisions) {
		const page = rev.pageName
		if (!page) continue
		const current = map.get(page)
		if (current === undefined || rev.id > current) {
			map.set(page, rev.id)
		}
	}
	return map
}

const latestRevIdByPageWatchlist = computed(() => {
	if (props.source === "mixed") {
		return buildLatestRevIdByPage(mixedPagesAndUsersData.value)
	}
	if (props.source === "pagesAndUsers") {
		return buildLatestRevIdByPage(allRevisionsData.value)
	}
	return new Map<string, number>()
})

const latestRevIdByPageCollaborators = computed(() => {
	if (props.source === "mixed") {
		return buildLatestRevIdByPage(mixedCollaboratorsData.value)
	}
	if (props.source === "collaborators") {
		return buildLatestRevIdByPage(allRevisionsData.value)
	}
	return new Map<string, number>()
})

function isLatestRevision(change: RevisionWithSource): boolean {
	const source = change.itemSource ?? props.source
	if (
		source === "recentChanges" ||
		source === "relatedChanges" ||
		source === "pagesAndUsersLatest"
	)
		return true
	if (!change.pageName) return false
	const latestMap =
		source === "pagesAndUsers"
			? latestRevIdByPageWatchlist.value
			: latestRevIdByPageCollaborators.value
	return latestMap.get(change.pageName) === change.id
}

const selectedRevisionsForDisplay = computed(() => getSelectedRevisionsForDisplay())

const shortDescriptionByPage = ref<Map<string, string | null>>(new Map())

async function fetchShortDescriptionsForFeed(): Promise<void> {
	if (!props.showShortDescription) return
	const revs = selectedRevisionsForDisplay.value
	const pageNames = [...new Set(revs.map(r => r.pageName).filter((p): p is string => !!p))]
	const toFetch = pageNames.filter(p => !shortDescriptionByPage.value.has(p))
	if (toFetch.length === 0) return
	const results = await Promise.all(
		toFetch.map(async pageName => {
			const desc = await wiki.getShortDescription(pageName)
			return { pageName, desc } as const
		})
	)
	const next = new Map(shortDescriptionByPage.value)
	for (const { pageName, desc } of results) {
		next.set(pageName, desc)
	}
	shortDescriptionByPage.value = next
	schedulePersistFeedBundleSave()
}

watch(
	() => [
		props.showShortDescription,
		selectedRevisionsForDisplay.value.map(r => r.pageName).join(","),
	],
	() => {
		fetchShortDescriptionsForFeed()
	}
)

watch(
	() =>
		props.showRevertRisk ||
		props.showRevertRiskFlags ||
		props.requireRecentChangesMeetRevertRiskThresholds,
	enabled => {
		if (!enabled) return
		const hasRcCandidates =
			props.requireRecentChangesMeetRevertRiskThresholds &&
			((props.source === "mixed" && getMixedRecentChangesFullyOrdered().length > 0) ||
				(props.source === "recentChanges" &&
					getStandaloneRecentChangesCandidatePool().length > 0))
		if (selectedRevisionsForDisplay.value.length > 0 || hasRcCandidates) {
			void fetchRevertRiskForFeed()
		}
	}
)

watch(
	() => props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks,
	enabled => {
		if (!enabled) return
		const hasRcCandidates =
			props.requireRecentChangesMeetRevertRiskThresholds &&
			((props.source === "mixed" && getMixedRecentChangesFullyOrdered().length > 0) ||
				(props.source === "recentChanges" &&
					getStandaloneRecentChangesCandidatePool().length > 0))
		if (selectedRevisionsForDisplay.value.length > 0 || hasRcCandidates) {
			fetchReferenceNeedForFeed()
			fetchToneCheckForFeed()
		}
	}
)

let referenceNeedDebounceId: ReturnType<typeof setTimeout> | null = null
watch(
	() => [
		selectedRevisionsForDisplay.value.map(r => r.id).join(","),
		props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks,
		props.requireRecentChangesMeetRevertRiskThresholds && props.source === "mixed"
			? getMixedRecentChangesFullyOrdered()
					.map(r => r.id)
					.join(",")
			: props.requireRecentChangesMeetRevertRiskThresholds && props.source === "recentChanges"
				? getStandaloneRecentChangesCandidatePool()
						.map(r => r.id)
						.join(",")
				: "",
	],
	([, enabled]) => {
		if (!enabled) return
		const thresholdRc =
			props.requireRecentChangesMeetRevertRiskThresholds &&
			(props.source === "mixed" || props.source === "recentChanges")
		const hasMixedPool =
			props.source === "mixed" && getMixedRecentChangesFullyOrdered().length > 0
		const hasStandalonePool =
			props.source === "recentChanges" &&
			getStandaloneRecentChangesCandidatePool().length > 0
		if (props.source === "mixed") {
			if (!hasMixedPool && selectedRevisionsForDisplay.value.length === 0) return
		} else if (thresholdRc && props.source === "recentChanges") {
			if (!hasStandalonePool && selectedRevisionsForDisplay.value.length === 0) return
		} else {
			return
		}
		if (referenceNeedDebounceId) clearTimeout(referenceNeedDebounceId)
		referenceNeedDebounceId = setTimeout(() => {
			referenceNeedDebounceId = null
			fetchReferenceNeedForFeed()
			fetchToneCheckForFeed()
		}, 300)
	}
)

let revertRiskDebounceId: ReturnType<typeof setTimeout> | null = null
watch(
	() => [
		selectedRevisionsForDisplay.value.map(r => r.id).join(","),
		props.showRevertRisk ||
			props.showRevertRiskFlags ||
			props.requireRecentChangesMeetRevertRiskThresholds,
		props.requireRecentChangesMeetRevertRiskThresholds && props.source === "mixed"
			? getMixedRecentChangesFullyOrdered()
					.map(r => r.id)
					.join(",")
			: props.requireRecentChangesMeetRevertRiskThresholds && props.source === "recentChanges"
				? getStandaloneRecentChangesCandidatePool()
						.map(r => r.id)
						.join(",")
				: "",
	],
	([, enabled]) => {
		if (!enabled) return
		const isMixedOrFilteredRc =
			props.source === "mixed" ||
			(props.source === "recentChanges" && props.requireRecentChangesMeetRevertRiskThresholds)
		if (!isMixedOrFilteredRc) return
		const hasRcCandidates =
			props.requireRecentChangesMeetRevertRiskThresholds &&
			((props.source === "mixed" && getMixedRecentChangesFullyOrdered().length > 0) ||
				(props.source === "recentChanges" &&
					getStandaloneRecentChangesCandidatePool().length > 0))
		if (selectedRevisionsForDisplay.value.length === 0 && !hasRcCandidates) return
		if (revertRiskDebounceId) clearTimeout(revertRiskDebounceId)
		revertRiskDebounceId = setTimeout(() => {
			revertRiskDebounceId = null
			void fetchRevertRiskForFeed()
		}, 300)
	}
)

const rccontinue = ref<string | undefined>(undefined)
const useNeedsReviewFilter = ref(true)
const isLoading = ref(false)
const errors = ref<string[]>([])

type ReviewChangesFeedSnapshot = {
	allRevisionsData: FWRevision[]
	selectedRevisions: FWRevision[]
	mixedRecentChangesBySegment: FWRevision[][]
	mixedPagesAndUsersData: FWRevision[]
	mixedPagesAndUsersLatestData: FWRevision[]
	mixedCollaboratorsData: FWRevision[]
	mixedRelatedChangesData: FWRevision[]
	rccontinue?: string
}

function collectRevisionIdsFromSnapshot(s: ReviewChangesFeedSnapshot): Set<number> {
	const ids = new Set<number>()
	for (const r of s.allRevisionsData) ids.add(r.id)
	for (const r of s.selectedRevisions) ids.add(r.id)
	for (const r of s.mixedPagesAndUsersData) ids.add(r.id)
	for (const r of s.mixedPagesAndUsersLatestData) ids.add(r.id)
	for (const r of s.mixedCollaboratorsData) ids.add(r.id)
	for (const r of s.mixedRelatedChangesData) ids.add(r.id)
	for (const seg of s.mixedRecentChangesBySegment) {
		for (const r of seg) ids.add(r.id)
	}
	return ids
}

function collectPageNamesFromSnapshot(s: ReviewChangesFeedSnapshot): Set<string> {
	const names = new Set<string>()
	const add = (r: FWRevision) => {
		if (r.pageName) names.add(r.pageName)
	}
	for (const r of s.allRevisionsData) add(r)
	for (const r of s.selectedRevisions) add(r)
	for (const r of s.mixedPagesAndUsersData) add(r)
	for (const r of s.mixedPagesAndUsersLatestData) add(r)
	for (const r of s.mixedCollaboratorsData) add(r)
	for (const r of s.mixedRelatedChangesData) add(r)
	for (const seg of s.mixedRecentChangesBySegment) {
		for (const r of seg) add(r)
	}
	return names
}

type PersistedFeedBundleV1 = {
	version: 1
	snapshot: ReviewChangesFeedSnapshot
	shortDescriptions: [string, string | null][]
	revertRiskEntries: [number, FWPredictionByModel | { error: true }][]
	referenceNeedEntries: [
		number,
		{ delta: number; before: number; after: number } | { error: true },
	][]
	toneCheckEntries: [number, FWToneCheckPrediction | { error: true } | null][]
	/** Normalized edit-types summaries for structured deltas (revision ids in current feed). */
	editTypesSummaries?: [number, FWEditTypesDiffSummary | null][]
	editTypesErrors?: [number, string][]
}

const PERSISTED_FEED_KEY_PREFIX = "review-changes-plus-feed-v1:"

function storageKeyForFeed(source: ReviewChangesSource): string {
	return `${PERSISTED_FEED_KEY_PREFIX}${source}`
}

function parsePersistedFeedBundleJson(raw: string): PersistedFeedBundleV1 | null {
	try {
		const o = JSON.parse(raw) as Record<string, unknown>
		if (o.version !== 1 || !o.snapshot || typeof o.snapshot !== "object") return null
		const snap = o.snapshot as ReviewChangesFeedSnapshot
		if (!Array.isArray(snap.allRevisionsData)) return null
		if (!Array.isArray(snap.selectedRevisions)) return null
		if (!Array.isArray(snap.mixedRecentChangesBySegment)) return null
		if (!Array.isArray(snap.mixedPagesAndUsersData)) return null
		if (!Array.isArray(snap.mixedPagesAndUsersLatestData)) return null
		if (!Array.isArray(snap.mixedCollaboratorsData)) return null
		if (!Array.isArray(snap.mixedRelatedChangesData)) return null
		return {
			version: 1,
			snapshot: JSON.parse(JSON.stringify(snap)) as ReviewChangesFeedSnapshot,
			shortDescriptions: (Array.isArray(o.shortDescriptions)
				? o.shortDescriptions
				: []) as PersistedFeedBundleV1["shortDescriptions"],
			revertRiskEntries: (Array.isArray(o.revertRiskEntries)
				? o.revertRiskEntries
				: []) as PersistedFeedBundleV1["revertRiskEntries"],
			referenceNeedEntries: (Array.isArray(o.referenceNeedEntries)
				? o.referenceNeedEntries
				: []) as PersistedFeedBundleV1["referenceNeedEntries"],
			toneCheckEntries: (Array.isArray(o.toneCheckEntries)
				? o.toneCheckEntries
				: []) as PersistedFeedBundleV1["toneCheckEntries"],
			editTypesSummaries: (Array.isArray(o.editTypesSummaries)
				? o.editTypesSummaries
				: []) as NonNullable<PersistedFeedBundleV1["editTypesSummaries"]>,
			editTypesErrors: (Array.isArray(o.editTypesErrors)
				? o.editTypesErrors
				: []) as NonNullable<PersistedFeedBundleV1["editTypesErrors"]>,
		}
	} catch {
		return null
	}
}

function loadPersistedFeedBundleForSource(
	source: ReviewChangesSource
): PersistedFeedBundleV1 | null {
	try {
		const raw = localStorage.getItem(storageKeyForFeed(source))
		if (!raw) return null
		return parsePersistedFeedBundleJson(raw)
	} catch {
		return null
	}
}

const lastSuccessfulFeedSnapshot = ref<ReviewChangesFeedSnapshot | null>(null)
const lastFeedErrorWasRateLimit = ref(false)
const lastLoadedDataNotice = ref("")

/** Plain-data clone for snapshots. `structuredClone` throws on Vue reactive Proxies. */
function cloneForFeedSnapshot<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T
}

function isFeedSnapshotNonEmpty(s: ReviewChangesFeedSnapshot): boolean {
	return (
		s.allRevisionsData.length > 0 ||
		s.mixedPagesAndUsersData.length > 0 ||
		s.mixedPagesAndUsersLatestData.length > 0 ||
		s.mixedCollaboratorsData.length > 0 ||
		s.mixedRelatedChangesData.length > 0 ||
		s.mixedRecentChangesBySegment.some(seg => seg.length > 0)
	)
}

function snapshotFromCurrentRefs(): ReviewChangesFeedSnapshot {
	return {
		allRevisionsData: cloneForFeedSnapshot(allRevisionsData.value),
		selectedRevisions: cloneForFeedSnapshot(selectedRevisions.value),
		mixedRecentChangesBySegment: mixedRecentChangesBySegment.value.map(seg =>
			cloneForFeedSnapshot(seg)
		),
		mixedPagesAndUsersData: cloneForFeedSnapshot(mixedPagesAndUsersData.value),
		mixedPagesAndUsersLatestData: cloneForFeedSnapshot(mixedPagesAndUsersLatestData.value),
		mixedCollaboratorsData: cloneForFeedSnapshot(mixedCollaboratorsData.value),
		mixedRelatedChangesData: cloneForFeedSnapshot(mixedRelatedChangesData.value),
		rccontinue: rccontinue.value,
	}
}

function persistLastSuccessfulFeedSnapshot(): void {
	lastSuccessfulFeedSnapshot.value = snapshotFromCurrentRefs()
	// Do not schedulePersistFeedBundleSave() here: loadFeed calls this while revert risk /
	// reference need / tone fetches are still running; an immediate debounced save would
	// persist empty prediction maps and overwrite good data on reload.
}

const showRestoreLastLoadedData = computed(
	() =>
		lastFeedErrorWasRateLimit.value &&
		lastSuccessfulFeedSnapshot.value !== null &&
		isFeedSnapshotNonEmpty(lastSuccessfulFeedSnapshot.value)
)

function restoreLastSuccessfulFeed(): void {
	const snap = lastSuccessfulFeedSnapshot.value
	if (!snap || !isFeedSnapshotNonEmpty(snap)) return
	allRevisionsData.value = cloneForFeedSnapshot(snap.allRevisionsData)
	selectedRevisions.value = cloneForFeedSnapshot(snap.selectedRevisions)
	mixedRecentChangesBySegment.value = snap.mixedRecentChangesBySegment.map(seg =>
		cloneForFeedSnapshot(seg)
	)
	mixedPagesAndUsersData.value = cloneForFeedSnapshot(snap.mixedPagesAndUsersData)
	mixedPagesAndUsersLatestData.value = cloneForFeedSnapshot(snap.mixedPagesAndUsersLatestData)
	mixedCollaboratorsData.value = cloneForFeedSnapshot(snap.mixedCollaboratorsData)
	mixedRelatedChangesData.value = cloneForFeedSnapshot(snap.mixedRelatedChangesData)
	rccontinue.value = snap.rccontinue
	errors.value = []
	lastFeedErrorWasRateLimit.value = false
	lastLoadedDataNotice.value = "Showing data from before this refresh."
	revertRiskByRevId.value = new Map()
	referenceNeedByRevId.value = new Map()
	toneCheckByRevId.value = new Map()
	if (
		props.showRevertRisk ||
		props.showRevertRiskFlags ||
		props.requireRecentChangesMeetRevertRiskThresholds
	) {
		void fetchRevertRiskForFeed()
	}
	if (props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks) {
		void fetchReferenceNeedForFeed()
		void fetchToneCheckForFeed()
	}
	const persistedForRestore = loadPersistedFeedBundleForSource(props.source ?? "recentChanges")
	if (
		props.showStructuredDeltasForFlaggedUnviewed &&
		structuredDeltas &&
		persistedForRestore &&
		(persistedForRestore.editTypesSummaries?.length ||
			persistedForRestore.editTypesErrors?.length)
	) {
		structuredDeltas.hydrateFromEntries(
			persistedForRestore.editTypesSummaries ?? [],
			persistedForRestore.editTypesErrors ?? []
		)
	}
	if (
		!(
			props.showRevertRisk ||
			props.showRevertRiskFlags ||
			props.requireRecentChangesMeetRevertRiskThresholds
		) &&
		!(props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks)
	) {
		schedulePersistFeedBundleSave()
	}
}

let persistFeedBundleDebounceId: ReturnType<typeof setTimeout> | null = null

function savePersistedFeedBundleNow(): void {
	try {
		const snap = snapshotFromCurrentRefs()
		if (!isFeedSnapshotNonEmpty(snap)) return
		const allowedRevIds = collectRevisionIdsFromSnapshot(snap)
		const allowedPageNames = collectPageNamesFromSnapshot(snap)
		const storageKey = storageKeyForFeed(props.source ?? "recentChanges")
		const prevBundle = loadPersistedFeedBundleForSource(props.source ?? "recentChanges")

		const predictionModels: FWPredictionModel[] = props.showRevertRisk
			? ["revertrisk", "revertrisk-multilingual"]
			: ["revertrisk"]

		const revertRisk = new Map(revertRiskByRevId.value)
		if (prevBundle) {
			for (const [id, entry] of prevBundle.revertRiskEntries) {
				if (!allowedRevIds.has(id)) continue
				if (
					revertRiskEntryIsComplete(revertRisk.get(id), predictionModels) ||
					!revertRiskEntryIsComplete(entry, predictionModels)
				) {
					continue
				}
				revertRisk.set(id, entry)
			}
		}

		const referenceNeed = new Map(referenceNeedByRevId.value)
		if (prevBundle) {
			for (const [id, entry] of prevBundle.referenceNeedEntries) {
				if (!allowedRevIds.has(id)) continue
				if (
					referenceNeedEntryValid(referenceNeed.get(id)) ||
					!referenceNeedEntryValid(entry)
				) {
					continue
				}
				referenceNeed.set(id, entry)
			}
		}

		const toneCheck = new Map(toneCheckByRevId.value)
		if (prevBundle) {
			for (const [id, entry] of prevBundle.toneCheckEntries) {
				if (!allowedRevIds.has(id)) continue
				if (toneCheckEntryValid(toneCheck.get(id)) || !toneCheckEntryValid(entry)) continue
				toneCheck.set(id, entry)
			}
		}

		const shortDesc = new Map(shortDescriptionByPage.value)
		if (prevBundle) {
			for (const [page, desc] of prevBundle.shortDescriptions) {
				if (!allowedPageNames.has(page)) continue
				if (shortDesc.has(page)) continue
				shortDesc.set(page, desc)
			}
		}

		let editTypesSummaries: [number, FWEditTypesDiffSummary | null][] = []
		let editTypesErrors: [number, string][] = []
		if (props.showStructuredDeltasForFlaggedUnviewed && structuredDeltas) {
			const summ = new Map(structuredDeltas.editTypesByRevId.value)
			const err = new Map(structuredDeltas.editTypesErrorByRevId.value)
			if (prevBundle) {
				for (const [id, v] of prevBundle.editTypesSummaries ?? []) {
					if (!allowedRevIds.has(id)) continue
					if (!summ.has(id)) summ.set(id, v)
				}
				for (const [id, msg] of prevBundle.editTypesErrors ?? []) {
					if (!allowedRevIds.has(id)) continue
					if (!err.has(id)) err.set(id, msg)
				}
			}
			editTypesSummaries = [...summ.entries()].filter(([id]) => allowedRevIds.has(id))
			editTypesErrors = [...err.entries()].filter(([id]) => allowedRevIds.has(id))
		}
		const bundle: PersistedFeedBundleV1 = {
			version: 1,
			snapshot: cloneForFeedSnapshot(snap),
			shortDescriptions: [...shortDesc.entries()].filter(([p]) => allowedPageNames.has(p)),
			revertRiskEntries: [...revertRisk.entries()].filter(([id]) => allowedRevIds.has(id)),
			referenceNeedEntries: [...referenceNeed.entries()].filter(([id]) =>
				allowedRevIds.has(id)
			),
			toneCheckEntries: [...toneCheck.entries()].filter(([id]) => allowedRevIds.has(id)),
			editTypesSummaries,
			editTypesErrors,
		}
		localStorage.setItem(storageKey, JSON.stringify(bundle))
	} catch {
		// ignore quota / private mode
	}
}

function schedulePersistFeedBundleSave(): void {
	if (persistFeedBundleDebounceId) clearTimeout(persistFeedBundleDebounceId)
	persistFeedBundleDebounceId = setTimeout(() => {
		persistFeedBundleDebounceId = null
		savePersistedFeedBundleNow()
	}, 300)
}

/** When no revert / reference / tone fetches run after loadFeed, persist snapshot here. */
function schedulePersistFeedBundleIfSkippingPredictionFetches(): void {
	if (
		props.showRevertRisk ||
		props.showRevertRiskFlags ||
		props.requireRecentChangesMeetRevertRiskThresholds ||
		props.showEditCheckOtherFlag ||
		props.showToneCheckFlag ||
		props.showDebugChecks
	) {
		return
	}
	schedulePersistFeedBundleSave()
}

function applyPersistedFeedBundle(bundle: PersistedFeedBundleV1): void {
	const snap = bundle.snapshot
	allRevisionsData.value = cloneForFeedSnapshot(snap.allRevisionsData)
	selectedRevisions.value = cloneForFeedSnapshot(snap.selectedRevisions)
	mixedRecentChangesBySegment.value = snap.mixedRecentChangesBySegment.map(seg =>
		cloneForFeedSnapshot(seg)
	)
	mixedPagesAndUsersData.value = cloneForFeedSnapshot(snap.mixedPagesAndUsersData)
	mixedPagesAndUsersLatestData.value = cloneForFeedSnapshot(snap.mixedPagesAndUsersLatestData)
	mixedCollaboratorsData.value = cloneForFeedSnapshot(snap.mixedCollaboratorsData)
	mixedRelatedChangesData.value = cloneForFeedSnapshot(snap.mixedRelatedChangesData)
	rccontinue.value = snap.rccontinue
	lastSuccessfulFeedSnapshot.value = cloneForFeedSnapshot(snap)
	revertRiskByRevId.value = new Map(bundle.revertRiskEntries)
	referenceNeedByRevId.value = new Map(bundle.referenceNeedEntries)
	toneCheckByRevId.value = new Map(bundle.toneCheckEntries)
	shortDescriptionByPage.value = new Map(bundle.shortDescriptions)
	errors.value = []
	lastFeedErrorWasRateLimit.value = false
	lastLoadedDataNotice.value = ""
	if (props.showStructuredDeltasForFlaggedUnviewed && structuredDeltas) {
		structuredDeltas.hydrateFromEntries(
			bundle.editTypesSummaries ?? [],
			bundle.editTypesErrors ?? []
		)
	}
}

function clearFeedToEmptyState(): void {
	allRevisionsData.value = []
	selectedRevisions.value = []
	mixedRecentChangesBySegment.value = []
	mixedPagesAndUsersData.value = []
	mixedPagesAndUsersLatestData.value = []
	mixedCollaboratorsData.value = []
	mixedRelatedChangesData.value = []
	rccontinue.value = undefined
	shortDescriptionByPage.value = new Map()
	revertRiskByRevId.value = new Map()
	referenceNeedByRevId.value = new Map()
	toneCheckByRevId.value = new Map()
	lastSuccessfulFeedSnapshot.value = null
	errors.value = []
	lastFeedErrorWasRateLimit.value = false
	lastLoadedDataNotice.value = ""
	structuredDeltas?.resetStructuredDeltaState()
}

function tryHydrateFromPersistedCache(): void {
	const source = props.source ?? "recentChanges"
	const bundle = loadPersistedFeedBundleForSource(source)
	if (bundle && isFeedSnapshotNonEmpty(bundle.snapshot)) {
		applyPersistedFeedBundle(bundle)
		return
	}
	clearFeedToEmptyState()
}

function refreshFeed(): void {
	clearViewedRevisions()
	void loadFeed(false)
}

const RECENT_CHANGES_LIMIT = 10
const RELATED_CHANGES_TOP_N = 10

/** Hardcoded pages and users for source="pagesAndUsers" (matches DeltaSnippets / Structured deltas) */
const HARDCODED_PAGE_NAMES = [
	"Confidence Man (band)",
	"Algorave",
	"Little Mix",
	"Gorillaz",
	"Jade Thirlwall",
	"Wet Leg",
]
const HARDCODED_USER_NAMES = ["Samwalton9"]

/** Select top N pages by score; on ties, randomly pick among tying pages. */
function selectTopNByScoreWithRandomTies(
	pages: Array<{ title: string; score: number }>,
	n: number
): Array<{ title: string; score: number }> {
	const filtered = pages.filter(p => !/^(Help|File):/i.test(p.title))
	if (filtered.length <= n) return filtered
	const sorted = [...filtered].sort((a, b) => b.score - a.score)
	const byScore = new Map<number, Array<{ title: string; score: number }>>()
	for (const p of sorted) {
		const arr = byScore.get(p.score) ?? []
		arr.push(p)
		byScore.set(p.score, arr)
	}
	const sortedScores = [...byScore.keys()].sort((a, b) => b - a)
	const result: Array<{ title: string; score: number }> = []
	for (const score of sortedScores) {
		const tier = byScore.get(score) ?? []
		const remaining = n - result.length
		if (tier.length <= remaining) {
			result.push(...tier)
		} else {
			const shuffled = [...tier]
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))
				;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
			}
			result.push(...shuffled.slice(0, remaining))
			break
		}
	}
	return result
}

async function loadRelatedChangesRevisions(): Promise<FWRevision[]> {
	const { pages: pagesWithScores, changes } = await wiki.getTopRelatedPages(
		HARDCODED_PAGE_NAMES,
		{
			percentage: 100,
			limit: 50,
		}
	)
	const sourcePageNamesByPage = new Map<string, string[]>()
	for (const c of changes) {
		const pageName = c.pageName?.trim()
		if (pageName && c.sourcePageNames?.length) {
			const existing = sourcePageNamesByPage.get(pageName) ?? []
			const combined = [...new Set([...existing, ...c.sourcePageNames])]
			sourcePageNamesByPage.set(pageName, combined)
		}
	}
	const watchlistTitles = new Set(HARDCODED_PAGE_NAMES.map(t => t.toLowerCase()))
	const pagesExcludingWatchlist = pagesWithScores.filter(
		p => !watchlistTitles.has(p.title.toLowerCase())
	)
	const selected = selectTopNByScoreWithRandomTies(pagesExcludingWatchlist, RELATED_CHANGES_TOP_N)
	const recommendedTitles = selected.map(p => p.title)
	if (recommendedTitles.length === 0) return []
	const scoreByPage = new Map(selected.map(p => [p.title, p.score]))
	const latestRevisions: Array<FWPageHistoryRevision & { pageName?: string }> = []
	for (const pageName of recommendedTitles) {
		const history = await wiki.getPageHistory(pageName, { limit: 1 })
		const rev = history.revisions?.[0]
		if (rev) {
			latestRevisions.push({ ...rev, pageName })
		}
	}
	const processed = await processRevisions(latestRevisions)
	const enriched = await enrichRevisionsWithTags(processed)
	return enriched.map(r => {
		const score = scoreByPage.get(r.pageName ?? "")
		const recommendationSourcePageNames = sourcePageNamesByPage.get(r.pageName ?? "")
		return {
			...r,
			...(score !== undefined && { score }),
			...(recommendationSourcePageNames !== undefined && {
				recommendationSourcePageNames,
			}),
		}
	})
}

async function loadWatchlistLatestRevisions(): Promise<FWRevision[]> {
	const latestRevisions: Array<FWPageHistoryRevision & { pageName?: string }> = []
	for (const pageName of HARDCODED_PAGE_NAMES) {
		const history = await wiki.getPageHistory(pageName, { limit: 1 })
		const rev = history.revisions?.[0]
		if (rev) {
			latestRevisions.push({ ...rev, pageName })
		}
	}
	const processed = await processRevisions(latestRevisions)
	const enriched = await enrichRevisionsWithTags(processed)
	return enriched.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	)
}

async function processRevisions(
	revisions: Array<{
		id: number
		timestamp: string
		comment: string
		user: { name: string }
		delta: number | null
		pageName?: string
	}>
): Promise<FWRevision[]> {
	return wiki.runWithConcurrency(revisions, PROCESS_REVISIONS_CONCURRENCY, async revision => {
		const pageName = (revision as FWPageHistoryRevision & { pageName?: string }).pageName || ""
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
		if (summary.comment) {
			summary.comment = stripLinksFromHtml(summary.comment)
		}
		summary.hashtags = Array.isArray(summary.hashtags)
			? summary.hashtags.join(" ")
			: summary.hashtags
		const processedRevision: FWRevision = {
			...revision,
			comment: revision.comment || "",
			summary,
			pageName,
			avatarUrl: null,
		}
		return processedRevision
	})
}

async function loadFeed(append = false): Promise<void> {
	if (!append) {
		isLoading.value = true
		errors.value = []
		lastLoadedDataNotice.value = ""
		lastFeedErrorWasRateLimit.value = false
	}

	try {
		let revisions: Array<{
			id: number
			timestamp: string
			comment: string
			user: { name: string }
			delta: number | null
			pageName?: string
		}>

		if (props.source === "relatedChanges") {
			if (append) {
				isLoading.value = false
				return
			}
			const relatedRevisions = await loadRelatedChangesRevisions()
			const sorted = relatedRevisions.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			allRevisionsData.value = sorted
			selectedRevisions.value = sorted
			mixedRecentChangesBySegment.value = []
			mixedPagesAndUsersData.value = []
			mixedPagesAndUsersLatestData.value = []
			mixedCollaboratorsData.value = []
			mixedRelatedChangesData.value = []
			isLoading.value = false
			persistLastSuccessfulFeedSnapshot()
			if (
				props.showRevertRisk ||
				props.showRevertRiskFlags ||
				props.requireRecentChangesMeetRevertRiskThresholds
			) {
				void fetchRevertRiskForFeed()
			}
			if (props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks) {
				fetchReferenceNeedForFeed()
				fetchToneCheckForFeed()
			}
			schedulePersistFeedBundleIfSkippingPredictionFetches()
			return
		}

		if (props.source === "mixed") {
			if (append) {
				isLoading.value = false
				return
			}
			// Serialize page vs user combined feeds so we never stack 3× REST history + 3× usercontribs
			// (Wikimedia: ≤3 concurrent API requests total across Action + REST).
			const pagesRevisions = await wiki.getCombinedFeed({
				pageNames: HARDCODED_PAGE_NAMES,
				limit: RECENT_CHANGES_LIMIT,
			})
			const collaboratorsRevisions = await wiki.getCombinedFeed({
				userNames: HARDCODED_USER_NAMES,
				limit: RECENT_CHANGES_LIMIT,
			})
			const watchlistLatestRevisions = await loadWatchlistLatestRevisions()
			const processedPages = await enrichRevisionsWithTags(
				await processRevisions(pagesRevisions)
			)
			const processedCollaborators = await processRevisions(collaboratorsRevisions)
			const sortedPages = processedPages.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			const sortedCollaborators = processedCollaborators.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			mixedPagesAndUsersData.value = sortedPages
			mixedPagesAndUsersLatestData.value = watchlistLatestRevisions
			mixedCollaboratorsData.value = sortedCollaborators

			// Divide time range into 4 segments, query each in parallel
			const LIMIT_PER_QUERY = Math.ceil(RECENT_CHANGES_LIMIT / NUM_RC_SEGMENTS)
			let processedBySegment: FWRevision[][] = []
			let rangeStart: number
			let rangeEnd: number
			if (sortedPages.length > 0) {
				const timestamps = sortedPages.map(r => new Date(r.timestamp).getTime())
				const earliest = Math.min(...timestamps)
				const latest = Math.max(...timestamps)
				const bufferMs = 12 * 60 * 60 * 1000 // 12 hours each direction
				rangeStart = earliest - bufferMs
				rangeEnd = latest + bufferMs
			} else {
				// Watchlist empty: use default range (last 7 days) so we still get 4 segments of RC
				const now = Date.now()
				const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
				rangeEnd = now
				rangeStart = now - sevenDaysMs
			}
			const rangeMs = rangeEnd - rangeStart
			const segmentDuration = rangeMs / NUM_RC_SEGMENTS
			const queries = Array.from({ length: NUM_RC_SEGMENTS }, (_, i) => {
				const segEnd = rangeStart + (i + 1) * segmentDuration
				const segStart = rangeStart + i * segmentDuration
				return {
					rcstart: new Date(segEnd).toISOString(),
					rcend: new Date(segStart).toISOString(),
				}
			})
			const results = await wiki.runWithConcurrency(
				queries,
				RC_SEGMENTS_FETCH_CONCURRENCY,
				q =>
					wiki.getRecentChanges({
						limit: LIMIT_PER_QUERY,
						onlyNeedsReview: true,
						rcstart: q.rcstart,
						rcend: q.rcend,
					})
			)
			processedBySegment = await wiki.runWithConcurrency(
				results,
				PROCESS_REVISIONS_CONCURRENCY,
				r => processRevisions(r.revisions)
			)
			processedBySegment = processedBySegment.map(seg =>
				seg.sort(
					(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
				)
			)
			mixedRecentChangesBySegment.value = processedBySegment

			// Fetch related changes (latest revision per recommended page) - loadRelatedChangesRevisions already enriches with tags
			const relatedRevisions = await loadRelatedChangesRevisions()
			mixedRelatedChangesData.value = relatedRevisions.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)

			allRevisionsData.value = []
			selectedRevisions.value = []
			isLoading.value = false
			persistLastSuccessfulFeedSnapshot()
			if (
				props.showRevertRisk ||
				props.showRevertRiskFlags ||
				props.requireRecentChangesMeetRevertRiskThresholds
			) {
				void fetchRevertRiskForFeed()
			}
			if (props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks) {
				fetchReferenceNeedForFeed()
				fetchToneCheckForFeed()
			}
			schedulePersistFeedBundleIfSkippingPredictionFetches()
			return
		}

		if (props.source === "pagesAndUsers") {
			if (append) {
				isLoading.value = false
				return
			}
			revisions = await wiki.getCombinedFeed({
				pageNames: HARDCODED_PAGE_NAMES,
				limit: RECENT_CHANGES_LIMIT,
			})
		} else if (props.source === "pagesAndUsersLatest") {
			if (append) {
				isLoading.value = false
				return
			}
			const watchlistLatestRevisions = await loadWatchlistLatestRevisions()
			allRevisionsData.value = watchlistLatestRevisions
			selectedRevisions.value = watchlistLatestRevisions
			mixedRecentChangesBySegment.value = []
			mixedPagesAndUsersData.value = []
			mixedPagesAndUsersLatestData.value = []
			mixedCollaboratorsData.value = []
			mixedRelatedChangesData.value = []
			isLoading.value = false
			persistLastSuccessfulFeedSnapshot()
			if (
				props.showRevertRisk ||
				props.showRevertRiskFlags ||
				props.requireRecentChangesMeetRevertRiskThresholds
			) {
				void fetchRevertRiskForFeed()
			}
			if (props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks) {
				fetchReferenceNeedForFeed()
				fetchToneCheckForFeed()
			}
			schedulePersistFeedBundleIfSkippingPredictionFetches()
			return
		} else if (props.source === "collaborators") {
			if (append) {
				isLoading.value = false
				return
			}
			revisions = await wiki.getCombinedFeed({
				userNames: HARDCODED_USER_NAMES,
				limit: RECENT_CHANGES_LIMIT,
			})
		} else {
			const onlyNeedsReview = append ? useNeedsReviewFilter.value : true
			let result = await wiki.getRecentChanges({
				limit: RECENT_CHANGES_LIMIT,
				onlyNeedsReview,
				rccontinue: append ? rccontinue.value : undefined,
			})

			// Fallback: if "needs review" filter returns empty, show any recent changes
			if (result.revisions.length === 0 && !append && onlyNeedsReview) {
				result = await wiki.getRecentChanges({
					limit: RECENT_CHANGES_LIMIT,
					onlyNeedsReview: false,
				})
			}

			revisions = result.revisions
			if (revisions.length === 0 && !append) {
				throw new Error("No edits that need review were returned. Try again later.")
			}
			rccontinue.value = result.rccontinue
		}

		let processed = await processRevisions(revisions)
		// Enrich with tags: page history (REST API) and related changes (Atom feed) don't include tags.
		// User contribs and recent changes include tags; enrichRevisionsWithTags skips revs that already have them.
		processed = await enrichRevisionsWithTags(processed)
		mixedRecentChangesBySegment.value = []
		mixedPagesAndUsersData.value = []
		mixedPagesAndUsersLatestData.value = []
		mixedCollaboratorsData.value = []
		mixedRelatedChangesData.value = []

		if (append && props.source === "recentChanges") {
			const existingIds = new Set(allRevisionsData.value.map(r => r.id))
			const newRevisions = processed.filter(r => !existingIds.has(r.id))
			allRevisionsData.value = [...allRevisionsData.value, ...newRevisions].sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
		} else {
			allRevisionsData.value = processed.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
		}

		selectedRevisions.value = allRevisionsData.value

		isLoading.value = false
		if (
			props.showRevertRisk ||
			props.showRevertRiskFlags ||
			props.requireRecentChangesMeetRevertRiskThresholds
		) {
			void fetchRevertRiskForFeed()
		}
		if (props.showEditCheckOtherFlag || props.showToneCheckFlag || props.showDebugChecks) {
			fetchReferenceNeedForFeed()
			fetchToneCheckForFeed()
		}
		persistLastSuccessfulFeedSnapshot()
		schedulePersistFeedBundleIfSkippingPredictionFetches()
	} catch (e) {
		isLoading.value = false
		const errorObj = e as Error
		if (!append) {
			lastFeedErrorWasRateLimit.value = e instanceof FakeWikiHttpError && e.status === 429
			errors.value = [errorObj.message]
			allRevisionsData.value = []
			selectedRevisions.value = []
			mixedRecentChangesBySegment.value = []
			mixedPagesAndUsersData.value = []
			mixedPagesAndUsersLatestData.value = []
			mixedCollaboratorsData.value = []
			mixedRelatedChangesData.value = []
		}
	}
}

function stripLinksFromHtml(html: string): string {
	if (typeof document === "undefined") return html
	const div = document.createElement("div")
	div.innerHTML = html
	// Remove <base> tags – they change document base URL and break relative links (e.g. RouterLink)
	div.querySelectorAll("base").forEach(el => el.remove())
	const links = Array.from(div.querySelectorAll("a"))
	links.forEach(a => {
		const span = document.createElement("span")
		span.innerHTML = a.innerHTML
		a.parentNode?.replaceChild(span, a)
	})
	return div.innerHTML
}

function getDateKey(timestamp: string): string {
	const d = new Date(timestamp)
	const year = d.getFullYear()
	const month = (d.getMonth() + 1).toString().padStart(2, "0")
	const day = d.getDate().toString().padStart(2, "0")
	return `${year}-${month}-${day}`
}

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
	const month = monthNames[d.getMonth()]
	const year = d.getFullYear()
	return `${day} ${month} ${year}`
}

function formatTime(timestamp: string): string {
	const d = new Date(timestamp)
	const hours = d.getHours()
	const minutes = d.getMinutes()
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function daysAgo(timestamp: string): number {
	const d = new Date(timestamp)
	const today = new Date()
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
	const pastStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
	return Math.floor((todayStart.getTime() - pastStart.getTime()) / (1000 * 60 * 60 * 24))
}

function formatRelativeTime(timestamp: string): string {
	const d = new Date(timestamp)
	const now = new Date()
	const diffMs = now.getTime() - d.getTime()
	const diffSec = Math.floor(diffMs / 1000)
	const diffMin = Math.floor(diffSec / 60)
	const diffHour = Math.floor(diffMin / 60)
	const diffDay = Math.floor(diffHour / 24)
	const diffWeek = Math.floor(diffDay / 7)
	const diffMonth = Math.floor(diffDay / 30)
	const diffYear = Math.floor(diffDay / 365)

	if (diffSec < 60) return "just now"
	if (diffMin < 60) return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`
	if (diffHour < 24) return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`
	if (diffDay < 7) return diffDay === 1 ? "1 day ago" : `${diffDay} days ago`
	if (diffWeek < 4) return diffWeek === 1 ? "1 week ago" : `${diffWeek} weeks ago`
	if (diffMonth < 12) return diffMonth === 1 ? "1 month ago" : `${diffMonth} months ago`
	return diffYear === 1 ? "1 year ago" : `${diffYear} years ago`
}

const RELATIVE_DAYS_CAP = 6

function formatTimeLabel(timestamp: string): string {
	const days = daysAgo(timestamp)
	if (days === 0) return "Today"
	if (days === 1) return "Yesterday"
	if (days >= 2 && days <= RELATIVE_DAYS_CAP) return `${days} days ago`
	return formatDate(timestamp)
}

function formatDelta(delta: number | null | undefined): string {
	const n = delta != null ? Number(delta) : 0
	if (Number.isNaN(n)) return props.deltaFormatParentheses ? "(0)" : "0"
	const sign = n >= 0 ? "+" : ""
	return props.deltaFormatParentheses ? `(${sign}${n})` : `${sign}${n}`
}

const revisionsByDate = computed(() => {
	const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()
	const source = selectedRevisionsForDisplay.value.filter(
		revision => !dismissedRevisionIds.value.has(revision.id)
	)

	source.forEach(revision => {
		const dateKey = getDateKey(revision.timestamp)
		const dateLabel = formatDate(revision.timestamp)

		if (!grouped.has(dateKey)) {
			grouped.set(dateKey, { dateLabel, revisions: [] })
		}

		grouped.get(dateKey)!.revisions.push(revision)
	})

	return Array.from(grouped.entries())
		.sort((a, b) => b[0].localeCompare(a[0]))
		.map(([dateKey, data]) => ({
			dateKey,
			dateLabel: data.dateLabel,
			revisions: [...data.revisions].sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			),
		}))
})

const revisionsByDateCapped = computed(() => revisionsByDate.value)

const hasFeedItems = computed(() => revisionsByDateCapped.value.some(g => g.revisions.length > 0))

const showEmptyCacheNotice = computed(
	() => !isLoading.value && errors.value.length === 0 && !hasFeedItems.value
)

const revisionsOnScreen = computed(() => revisionsByDateCapped.value.flatMap(g => g.revisions))

const structuredDeltaRevisionIds = computed(() =>
	props.showStructuredDeltasForFlaggedUnviewed
		? revisionsOnScreen.value.filter(r => hasAnyFlag(r)).map(r => r.id)
		: []
)

structuredDeltas = useStructuredDeltas({
	wiki,
	revisionIds: structuredDeltaRevisionIds,
	loadConcurrency: 1,
	autoLoad: true,
})

function getStructuredDeltaSegments(
	changeId: number
): Array<{ text: string; deltaClass: string }> | null {
	if (!props.showStructuredDeltasForFlaggedUnviewed || !structuredDeltas) return null
	return structuredDeltas.getMostSignificantSegments(changeId)
}

function isStructuredDeltaLoadingForRevision(changeId: number): boolean {
	if (!props.showStructuredDeltasForFlaggedUnviewed || !structuredDeltas) return false
	return structuredDeltas.isMostSignificantLoading(changeId)
}

function structuredDeltaOpenParenClass(changeId: number): string {
	return getStructuredDeltaSegments(changeId)?.[0]?.deltaClass ?? ""
}

function structuredDeltaCloseParenClass(changeId: number): string {
	const segs = getStructuredDeltaSegments(changeId)
	if (!segs?.length) return ""
	return segs[segs.length - 1]!.deltaClass
}

watch(
	[
		() => structuredDeltas?.editTypesByRevId.value,
		() => structuredDeltas?.editTypesErrorByRevId.value,
	],
	() => {
		if (props.showStructuredDeltasForFlaggedUnviewed) schedulePersistFeedBundleSave()
	}
)

const sampleRevision = computed(
	() =>
		selectedRevisionsForDisplay.value.filter(r => !dismissedRevisionIds.value.has(r.id))[0] ??
		null
)

const previewRevisions = computed(() =>
	selectedRevisionsForDisplay.value.filter(r => !dismissedRevisionIds.value.has(r.id)).slice(0, 3)
)

defineExpose({ sampleRevision, previewRevisions, isLoading })

const emit = defineEmits<{
	previewUpdate: [payload: { revisions: FWRevision[]; isLoading: boolean }]
}>()

watch(
	[previewRevisions, isLoading],
	([revisions, loading]) => {
		emit("previewUpdate", {
			revisions: (revisions as FWRevision[]) ?? [],
			isLoading: (loading as boolean) ?? false,
		})
	},
	{ immediate: true }
)

onMounted(() => {
	tryHydrateFromPersistedCache()
	setRevisionsCallback(() => revisionsOnScreen.value)
})

onUnmounted(() => {
	if (persistFeedBundleDebounceId) clearTimeout(persistFeedBundleDebounceId)
	persistFeedBundleDebounceId = null
	clearRevisionsCallback()
})

watch(
	() => props.source,
	() => {
		tryHydrateFromPersistedCache()
	}
)
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
