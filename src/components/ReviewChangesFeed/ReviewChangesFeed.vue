<template>
	<section class="review-changes" :class="{ 'review-changes--no-border': !showModuleBorder }">
		<div v-if="title" class="review-changes__title">{{ title }}</div>
		<p
			v-if="!hideDescription"
			class="review-changes__description"
			:class="{ 'review-changes__description--with-title': !!title }"
		>
			Help keep Wikipedia reliable by reviewing the following edits which may need attention.
		</p>
		<div v-if="errors.length > 0" class="review-changes__errors">
			<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
		</div>
		<div v-if="isLoading" class="review-changes__loading">
			<CdxProgressBar inline />
		</div>
		<ul v-else class="review-changes__feed">
			<template v-for="dateGroup in revisionsByDateCapped" :key="dateGroup.dateKey">
				<li
					v-for="change in dateGroup.revisions"
					:key="`${change.pageName}-${change.timestamp}-${change.id}`"
					class="review-changes__item"
				>
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
						:class="{ 'review-changes__item-link--not-link': !change.pageName }"
						:aria-label="
							change.pageName
								? `View diff for ${change.pageName ?? 'page'}`
								: undefined
						"
					>
						<div class="review-changes__item-header">
							<span class="review-changes__page-cell">
								<span class="review-changes__page-cell-heading">
									<CdxIcon
										v-if="showSourceIcons && getItemSource(change)"
										:icon="
											getItemSource(change) === 'pagesAndUsers'
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
												: getItemSource(change) === 'relatedChanges'
													? 'Related changes'
													: getItemSource(change) === 'collaborators'
														? 'Collaborators'
														: 'Recent changes'
										"
									/>
									<span class="review-changes__page">{{ change.pageName }} </span>
								</span>
								<div
									v-if="showSourceSubtitles && getItemSource(change)"
									class="review-changes__source-subtitle"
								>
									{{
										getItemSource(change) === "pagesAndUsers"
											? "From your watchlist"
											: getItemSource(change) === "relatedChanges"
												? "From recommendations"
												: getItemSource(change) === "collaborators"
													? "By your mentor"
													: "From recent changes"
									}}
								</div>
							</span>
							<time :datetime="change.timestamp" class="review-changes__time">
								{{ formatTime(change.timestamp) }},
								{{ formatTimeLabel(change.timestamp) }}
							</time>
						</div>

						<div
							v-if="
								!!(change?.summary?.comment || change?.comment) ||
								showDelta ||
								showEmptyEditSummary
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
									{ 'review-changes__comment--no-cutout': !showSummaryCutout },
								]"
								>{{ change.comment }}</span
							><em
								v-else-if="showEmptyEditSummary"
								class="review-changes__comment review-changes__comment--empty"
								>{{ showDelta ? "" : "" }}No edit summary</em
							>
						</div>
						<div
							v-if="
								(showRevertRiskFlags && getRevertRiskNotice(change)) ||
								(showRevertedFlag && isReverted(change)) ||
								(showRecommendationFlags &&
									getItemSource(change) === 'relatedChanges' &&
									getRecommendationSourcePageNames(change).length)
							"
							class="review-changes__flags-container"
							:class="{
								'review-changes__flags-container--no-box': !revertRiskFlagsInBox,
								'review-changes__flags-container--no-summary-above':
									!hasSummaryAbove(change),
							}"
						>
							<div
								v-if="
									showRecommendationFlags &&
									getItemSource(change) === 'relatedChanges' &&
									getRecommendationReason(getRecommendationSourcePageNames(change))
								"
								class="review-changes__recommendation-notice"
							>
								<CdxIcon
									:icon="cdxIconLightbulb"
									size="small"
									class="review-changes__recommendation-notice-icon"
									aria-hidden="true"
								/>
								<span class="review-changes__recommendation-notice-text">{{
									getRecommendationReason(getRecommendationSourcePageNames(change))
								}}</span>
							</div>
							<div
								v-if="showRevertedFlag && isReverted(change)"
								class="review-changes__revert-risk-notice review-changes__revert-risk-notice--reverted"
							>
								<CdxIcon
									:icon="cdxIconEditUndo"
									size="small"
									class="review-changes__revert-risk-notice-icon review-changes__revert-risk-notice-icon--reverted"
								/>
								<span class="review-changes__revert-risk-notice-text">{{
									verboseFlags ? "This change was reverted" : "Reverted"
								}}</span
							>
							</div>
							<div
								v-if="showRevertRiskFlags && getRevertRiskNotice(change)"
								class="review-changes__revert-risk-notice"
							>
								<CdxIcon
									:icon="
										['low', 'mediumLow'].includes(
											getRevertRiskNotice(change)?.band ?? ''
										)
											? cdxIconSuccess
											: cdxIconAlert
									"
									size="small"
									class="review-changes__revert-risk-notice-icon"
									:class="{
										'review-changes__revert-risk-notice-icon--very-high':
											getRevertRiskNotice(change)?.band === 'high',
										'review-changes__revert-risk-notice-icon--high':
											getRevertRiskNotice(change)?.band === 'mediumHigh',
										'review-changes__revert-risk-notice-icon--low':
											getRevertRiskNotice(change)?.band === 'low',
										'review-changes__revert-risk-notice-icon--medium-low':
											getRevertRiskNotice(change)?.band === 'mediumLow',
									}"
								/>
								<span class="review-changes__revert-risk-notice-text">{{
									getRevertRiskNotice(change)!.text
								}}</span>
							</div>
						</div>
						<div class="review-changes__user-actions-row">
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
									{{ showUsernameAtPrefix ? "@" : "" }}{{ change.user.name }}
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
							<CdxButton
								v-if="showReviewButton"
								:action="isLatestRevision(change) ? 'progressive' : 'default'"
								size="small"
								weight="normal"
								class="review-changes__view-change-btn"
								@click.stop="openDiffInNewTab(change)"
							>
								<CdxIcon :icon="cdxIconEye" size="x-small" />
								{{ isLatestRevision(change) ? "Review" : "View" }}
							</CdxButton>
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
					</component>
				</li>
			</template>
		</ul>
		<div v-if="!isLoading" class="review-changes__view-more">
			View more edits in the
			<a
				target="_blank"
				rel="noopener noreferrer"
				:href="wiki.getPageUrl('Special:RecentChanges')"
				class="review-changes__view-more-link"
				>recent changes page</a
			>.
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
import { CdxButton, CdxIcon, CdxPopover, CdxProgressBar } from "@wikimedia/codex"
import {
	cdxIconAlert,
	cdxIconClock,
	cdxIconEditUndo,
	cdxIconEye,
	cdxIconLightbulb,
	cdxIconSuccess,
	cdxIconUnStar,
	cdxIconUserAvatar,
	cdxIconUserTemporary,
} from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type {
	FWLiftWingPrediction,
	FWPageHistoryRevision,
	FWPredictionByModel,
	FWRevision,
} from "fakewiki/types"
import { computed, onMounted, ref, watch } from "vue"

export type ReviewChangesSource =
	| "recentChanges"
	| "pagesAndUsers"
	| "relatedChanges"
	| "collaborators"
	| "mixed"

export type ItemSource = "recentChanges" | "pagesAndUsers" | "relatedChanges" | "collaborators"

const props = withDefaults(
	defineProps<{
		showRevertRisk: boolean
		/** When true, shows "High revert risk" notice flags on feed items. */
		showRevertRiskFlags?: boolean
		/** When true, flag notices have border and padding (box style). When false, no border/padding. */
		revertRiskFlagsInBox?: boolean
		/** When true, shows verbose flag text ("This change has very high revert risk", "This change was reverted", "Recommended based on X and Y."). When false, shows simple text ("High revert risk", "Reverted", "Based on X and Y."). */
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
		title?: string
		/** When true, hides the "Help keep Wikipedia reliable..." description line. */
		hideDescription?: boolean
		/** When true, shows @ before usernames. */
		showUsernameAtPrefix?: boolean
		/** When true, shows user icon (head and shoulders) to the left of username. */
		showUserIcon?: boolean
		/** When true, edit summaries appear with white bg, border and shadow (cutout style). */
		showSummaryCutout?: boolean
		/** When true, show "No edit summary" when there is no edit summary. When false, hide it (delta still shown if enabled). */
		showEmptyEditSummary?: boolean
		/** When true, shows the outer border around the module (for dashboard embedding). */
		showModuleBorder?: boolean
		/** When true, shows a Review button in addition to the card being a link. */
		showReviewButton?: boolean
		/** When true, shows recommendation reason for Related changes items (e.g. "Recommended based on X and Y." or "Based on X and Y." when verboseFlags is false). */
		showRecommendationFlags?: boolean
	}>(),
	{
		showRevertRiskFlags: false,
		revertRiskFlagsInBox: true,
		verboseFlags: true,
		showRevertedFlag: true,
		showSourceIcons: false,
		showSourceSubtitles: false,
		showUsernameAtPrefix: false,
		showUserIcon: false,
		showDelta: true,
		deltaFormatParentheses: false,
		source: "recentChanges",
		recentChangesRatio: 50,
		pagesAndUsersRatio: 50,
		relatedChangesRatio: 30,
		collaboratorsRatio: 20,
		hideDescription: false,
		showSummaryCutout: true,
		showEmptyEditSummary: true,
		showModuleBorder: true,
		showReviewButton: false,
		showRecommendationFlags: false,
	}
)

const wiki = new FakeWiki()

const userPopoverAnchor = ref<HTMLElement | null>(null)
const showUserPopover = ref(false)

function openUserPopover(event: MouseEvent, _change: FWRevision): void {
	userPopoverAnchor.value = event.currentTarget as HTMLElement
	showUserPopover.value = true
}

function openDiffInNewTab(change: FWRevision): void {
	if (change.pageName) {
		window.open(wiki.getRevisionUrl(change.id, change.pageName), "_blank")
	}
}

/** Check if a revision has been reverted (mw-reverted or reverted tag). */
function isReverted(change: FWRevision): boolean {
	const tags = change.tags
	if (!tags || tags.length === 0) return false
	return tags.includes("mw-reverted") || tags.includes("reverted")
}

/** Whether there is summary content (comment, delta, or empty-edit placeholder) above the flags. */
function hasSummaryAbove(change: FWRevision): boolean {
	return (
		!!(change?.summary?.comment || change?.comment) ||
		props.showDelta ||
		props.showEmptyEditSummary
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

/** Band thresholds for language-agnostic revert risk: above 80% = yellow, above 90% = red; below 25% = green, below 45% = blue */
const REVERT_RISK_THRESHOLDS = {
	lowerTight: 0.25,
	lowerLoose: 0.45,
	upperLoose: 0.8,
	upperTight: 0.9,
} as const

type RevertRiskBand = "high" | "mediumHigh" | "low" | "mediumLow"

function getRiskFromPrediction(pred: FWLiftWingPrediction): number {
	const p = pred.probability?.true
	return typeof p === "number" ? p : 0
}

function getRevertRiskNotice(change: FWRevision): { text: string; band: RevertRiskBand } | null {
	if (isLoadingRevertRisk.value) return null
	const entry = revertRiskByRevId.value.get(change.id)
	if (!entry || ("error" in entry && entry.error)) return null
	const byModel = entry as FWPredictionByModel
	const pred = byModel.revertrisk
	if (!pred) return null
	const risk = getRiskFromPrediction(pred)
	const verbose = props.verboseFlags
	if (risk > REVERT_RISK_THRESHOLDS.upperTight) {
		return {
			text: verbose
				? `This change ${isReverted(change) ? "had" : "has"} very high revert risk.`
				: "High revert risk",
			band: "high",
		}
	}
	if (risk > REVERT_RISK_THRESHOLDS.upperLoose) {
		return {
			text: verbose
				? `This change ${isReverted(change) ? "had" : "has"} high revert risk.`
				: "High revert risk",
			band: "mediumHigh",
		}
	}
	if (risk < REVERT_RISK_THRESHOLDS.lowerTight) {
		return {
			text: verbose
				? `This change ${isReverted(change) ? "had" : "has"} very low revert risk.`
				: "Low revert risk",
			band: "low",
		}
	}
	if (risk < REVERT_RISK_THRESHOLDS.lowerLoose) {
		return {
			text: verbose
				? `This change ${isReverted(change) ? "had" : "has"} low revert risk.`
				: "Low revert risk",
			band: "mediumLow",
		}
	}
	return null
}

function getRecommendationSourcePageNames(
	change: RevisionWithSource
): string[] {
	return (change as { recommendationSourcePageNames?: string[] }).recommendationSourcePageNames ?? []
}

function getRecommendationReason(sourcePageNames: string[]): string {
	if (!sourcePageNames?.length) return ""
	const intro = props.verboseFlags ? "Recommended based on " : "Based on "
	if (sourcePageNames.length === 1) {
		return `${intro}${sourcePageNames[0]}.`
	}
	if (sourcePageNames.length === 2) {
		return `${intro}${sourcePageNames[0]} and ${sourcePageNames[1]}.`
	}
	const last = sourcePageNames[sourcePageNames.length - 1]
	const rest = sourcePageNames.slice(0, -1).join(", ")
	return `${intro}${rest}, and ${last}.`
}

async function fetchRevertRiskForFeed(): Promise<void> {
	const revs = selectedRevisionsForDisplay.value
	if (revs.length === 0) return
	const revIds = revs.map(r => r.id)
	isLoadingRevertRisk.value = true
	revertRiskByRevId.value = new Map()
	try {
		const predictions = await wiki.getRevisionPredictions(revIds, [
			"revertrisk",
			"revertrisk-multilingual",
		])
		const next = new Map<number, FWPredictionByModel | { error: true }>()
		for (const revId of revIds) {
			const byModel = predictions[revId] ?? {}
			next.set(revId, byModel)
		}
		revertRiskByRevId.value = next
	} catch {
		const next = new Map<number, FWPredictionByModel | { error: true }>()
		for (const revId of revIds) {
			next.set(revId, { error: true })
		}
		revertRiskByRevId.value = next
	} finally {
		isLoadingRevertRisk.value = false
	}
}

const allRevisionsData = ref<FWRevision[]>([])
const selectedRevisions = ref<FWRevision[]>([])
/** Cached data for mixed mode; ratio is applied client-side only */
/** Recent changes split into 4 segments across the watchlist time range; we slice from these in parallel when displaying */
const mixedRecentChangesBySegment = ref<FWRevision[][]>([])
const mixedPagesAndUsersData = ref<FWRevision[]>([])
const mixedCollaboratorsData = ref<FWRevision[]>([])
const mixedRelatedChangesData = ref<FWRevision[]>([])

type RevisionWithSource = FWRevision & { itemSource?: ItemSource }

const NUM_RC_SEGMENTS = 4

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
					: props.source === "collaborators"
						? Math.max(0, Math.min(100, props.collaboratorsRatio ?? 20))
						: Math.max(0, Math.min(100, props.relatedChangesRatio ?? 30))
		const count = Math.min(Math.floor((RECENT_CHANGES_LIMIT * ratioPercent) / 100), all.length)
		const toShow = all.slice(0, count)
		return toShow.map(r => ({ ...r, itemSource: props.source as ItemSource }))
	}
	const rcSegments = mixedRecentChangesBySegment.value // RC0, RC1, RC2, RC3
	const wl = mixedPagesAndUsersData.value
	const collaborators = mixedCollaboratorsData.value
	const related = mixedRelatedChangesData.value
	const rcRatioPercent = Math.max(0, Math.min(100, props.recentChangesRatio ?? 50))
	const wlRatioPercent = Math.max(0, Math.min(100, props.pagesAndUsersRatio ?? 50))
	const collaboratorsRatioPercent = Math.max(0, Math.min(100, props.collaboratorsRatio ?? 20))
	const relatedRatioPercent = Math.max(0, Math.min(100, props.relatedChangesRatio ?? 30))

	// 0% all: show nothing
	if (
		rcRatioPercent === 0 &&
		wlRatioPercent === 0 &&
		collaboratorsRatioPercent === 0 &&
		relatedRatioPercent === 0
	)
		return []

	// RC: order segments by newest first (segment whose most recent item is newest overall),
	// then round-robin: newest from each segment, then 2nd newest from each, etc.
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
	const rcCount = Math.min(
		Math.floor((RECENT_CHANGES_LIMIT * rcRatioPercent) / 100),
		rcOrdered.length
	)
	const rcSliced = rcOrdered.slice(0, rcCount)

	const wlCount = Math.min(Math.floor((RECENT_CHANGES_LIMIT * wlRatioPercent) / 100), wl.length)
	const wlSliced = wl.slice(0, wlCount)

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

	// Round-robin across 4 pools: RC, WL, collaborators, relatedChanges
	const pools = [
		rcSliced.map(r => ({ ...r, itemSource: "recentChanges" as const })),
		wlSliced.map(r => ({ ...r, itemSource: "pagesAndUsers" as const })),
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
	if (source === "recentChanges" || source === "relatedChanges") return true
	if (!change.pageName) return false
	const latestMap =
		source === "pagesAndUsers"
			? latestRevIdByPageWatchlist.value
			: latestRevIdByPageCollaborators.value
	return latestMap.get(change.pageName) === change.id
}

const selectedRevisionsForDisplay = computed(() => getSelectedRevisionsForDisplay())

watch(
	() => props.showRevertRisk || props.showRevertRiskFlags,
	enabled => {
		if (enabled && selectedRevisionsForDisplay.value.length > 0) {
			fetchRevertRiskForFeed()
		}
	}
)

let revertRiskDebounceId: ReturnType<typeof setTimeout> | null = null
watch(
	() => [
		selectedRevisionsForDisplay.value.map(r => r.id).join(","),
		props.showRevertRisk || props.showRevertRiskFlags,
	],
	([, enabled]) => {
		if (
			!enabled ||
			props.source !== "mixed" ||
			selectedRevisionsForDisplay.value.length === 0
		) {
			return
		}
		if (revertRiskDebounceId) clearTimeout(revertRiskDebounceId)
		revertRiskDebounceId = setTimeout(() => {
			revertRiskDebounceId = null
			fetchRevertRiskForFeed()
		}, 300)
	}
)

const rccontinue = ref<string | undefined>(undefined)
const useNeedsReviewFilter = ref(true)
const isLoading = ref(false)
const errors = ref<string[]>([])

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
	const { pages: pagesWithScores, changes } = await wiki.getTopRelatedPages(HARDCODED_PAGE_NAMES, {
		percentage: 100,
		limit: 50,
	})
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
	return Promise.all(
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
	)
}

async function loadFeed(append = false): Promise<void> {
	if (!append) {
		isLoading.value = true
		errors.value = []
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
			mixedCollaboratorsData.value = []
			mixedRelatedChangesData.value = []
			isLoading.value = false
			if (props.showRevertRisk || props.showRevertRiskFlags) {
				fetchRevertRiskForFeed()
			}
			return
		}

		if (props.source === "mixed") {
			if (append) {
				isLoading.value = false
				return
			}
			// Fetch watchlist (pages only) and collaborators (users only) separately
			const [pagesRevisions, collaboratorsRevisions] = await Promise.all([
				wiki.getCombinedFeed({
					pageNames: HARDCODED_PAGE_NAMES,
					limit: RECENT_CHANGES_LIMIT,
				}),
				wiki.getCombinedFeed({
					userNames: HARDCODED_USER_NAMES,
					limit: RECENT_CHANGES_LIMIT,
				}),
			])
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
			const results = await Promise.all(
				queries.map(q =>
					wiki.getRecentChanges({
						limit: LIMIT_PER_QUERY,
						onlyNeedsReview: true,
						rcstart: q.rcstart,
						rcend: q.rcend,
					})
				)
			)
			processedBySegment = await Promise.all(results.map(r => processRevisions(r.revisions)))
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
			if (props.showRevertRisk || props.showRevertRiskFlags) {
				fetchRevertRiskForFeed()
			}
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
		// Page history (pagesAndUsers) doesn't include tags; enrich via getRevisionTags
		if (props.source === "pagesAndUsers") {
			processed = await enrichRevisionsWithTags(processed)
		}
		mixedRecentChangesBySegment.value = []
		mixedPagesAndUsersData.value = []
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
		if (props.showRevertRisk || props.showRevertRiskFlags) {
			fetchRevertRiskForFeed()
		}
	} catch (e) {
		isLoading.value = false
		const errorObj = e as Error
		if (!append) {
			errors.value = [errorObj.message]
			allRevisionsData.value = []
			selectedRevisions.value = []
		}
	}
}

function stripLinksFromHtml(html: string): string {
	if (typeof document === "undefined") return html
	const div = document.createElement("div")
	div.innerHTML = html
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
	const source = selectedRevisionsForDisplay.value

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

const sampleRevision = computed(() => selectedRevisionsForDisplay.value[0] ?? null)

const previewRevisions = computed(() => selectedRevisionsForDisplay.value.slice(0, 3))

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
	loadFeed()
})

watch(
	() => props.source,
	() => {
		loadFeed()
	}
)
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
