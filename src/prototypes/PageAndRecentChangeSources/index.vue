<template>
	<main class="recent-change-sources">
		<header class="prototype-header">
			<h1>Page and recent change sources</h1>
			<p>
				This is a configurable algorithm for constructing a feed of changes. It's made up of
				two parts:
			</p>
			<p>
				A. Getting page recommendations<br />
				B. Getting change recommendations
			</p>
		</header>

		<!-- <section class="stage stage--act">
			<div class="stage__header">
				<h2>A. Pages</h2>
			</div>
		</section> -->

		<section class="stage">
			<div class="stage__header">
				<h2>A1. Raw pages</h2>
			</div>
			<div class="query-controls">
				<label class="query-control">
					<span>Pages I've edited: {{ pagesIEditedQueryLimit }}</span>
					<input
						v-model.number="pagesIEditedQueryLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="query-control">
					<span>Pages I've discussed: {{ pagesIDiscussedQueryLimit }}</span>
					<input
						v-model.number="pagesIDiscussedQueryLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
			</div>
			<div class="source-grid">
				<article v-for="step in rawPageStepIds" :key="step" class="source-step">
					<div class="source-step__header">
						<h3>{{ querySteps[step].title }}</h3>
						<CdxButton
							v-if="canRunQueryStep(step)"
							:disabled="querySteps[step].status === 'running' || Boolean(apiBusyBy)"
							@click="runQueryStep(step)"
						>
							Run
						</CdxButton>
					</div>
					<p class="meta">{{ getQueryItems(step).length }} selected pages</p>
					<p v-if="querySteps[step].currentItem" class="meta">
						current: {{ querySteps[step].currentItem }}
					</p>
					<p v-if="querySteps[step].lastRequestDurationMs != null" class="meta">
						last request: {{ querySteps[step].lastRequestDurationMs }}ms
					</p>
					<p v-if="querySteps[step].error" class="error">
						{{ querySteps[step].error }}
					</p>
					<ul v-if="querySteps[step].log.length > 0" class="log-list">
						<li
							v-for="(entry, index) in querySteps[step].log"
							:key="`${step}-log-${index}`"
						>
							{{ entry }}
						</li>
					</ul>
					<ol v-if="getQueryItems(step).length > 0" class="query-page-list">
						<li
							v-for="item in getQueryItems(step)"
							:key="`${step}-${item.id}`"
							class="query-page-item"
						>
							<RecentChangePageCard
								:href="wiki.getPageUrl(item.title)"
								:title="item.title"
								:faded="isFilteredQueryPage(item.title)"
								:snippet-html="item.snippet ? `${item.snippet}...` : undefined"
								:info-boxes="getQueryPageInfoBoxes(item, step)"
							/>
						</li>
					</ol>
					<p v-else class="meta">No pages yet.</p>
				</article>
			</div>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>A2. Combine pages</h2>
			</div>
			<div class="source-grid">
				<article v-for="step in combinedPageStepIds" :key="step" class="source-step">
					<div class="source-step__header">
						<h3>{{ querySteps[step].title }}</h3>
					</div>
					<p class="meta">{{ getQueryItems(step).length }} combined pages</p>
					<ol v-if="getQueryItems(step).length > 0" class="query-page-list">
						<li
							v-for="item in getQueryItems(step)"
							:key="`${step}-${item.id}`"
							class="query-page-item"
						>
							<RecentChangePageCard
								:href="wiki.getPageUrl(item.title)"
								:title="item.title"
								:info-boxes="getQueryPageInfoBoxes(item, step)"
							/>
						</li>
					</ol>
					<p v-else class="meta">No combined pages yet.</p>
				</article>
			</div>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>A3. More like</h2>
			</div>
			<div class="query-controls">
				<label class="query-control">
					<span>More like pages I watch: {{ moreLikeWatchQueryLimit }}</span>
					<input
						v-model.number="moreLikeWatchQueryLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="query-control">
					<span>More like pages I've bookmarked: {{ moreLikeBookmarkQueryLimit }}</span>
					<input
						v-model.number="moreLikeBookmarkQueryLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="query-control">
					<span>More like pages I've edited: {{ moreLikeEditedQueryLimit }}</span>
					<input
						v-model.number="moreLikeEditedQueryLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="query-control">
					<span>More like pages I've discussed: {{ moreLikeDiscussedQueryLimit }}</span>
					<input
						v-model.number="moreLikeDiscussedQueryLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="query-control">
					<span
						>More like pages I've interacted with:
						{{ moreLikeInteractedQueryLimit }}</span
					>
					<input
						v-model.number="moreLikeInteractedQueryLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
			</div>
			<div class="source-grid">
				<article v-for="step in moreLikePageStepIds" :key="step" class="source-step">
					<div class="source-step__header">
						<h3>{{ querySteps[step].title }}</h3>
						<CdxButton
							:disabled="querySteps[step].status === 'running' || Boolean(apiBusyBy)"
							@click="runQueryStep(step)"
						>
							Run
						</CdxButton>
					</div>
					<p class="meta">{{ getQueryItems(step).length }} pages</p>
					<p v-if="querySteps[step].currentItem" class="meta">
						current: {{ querySteps[step].currentItem }}
					</p>
					<p v-if="querySteps[step].lastRequestDurationMs != null" class="meta">
						last request: {{ querySteps[step].lastRequestDurationMs }}ms
					</p>
					<p v-if="querySteps[step].error" class="error">
						{{ querySteps[step].error }}
					</p>
					<ul v-if="querySteps[step].log.length > 0" class="log-list">
						<li
							v-for="(entry, index) in querySteps[step].log"
							:key="`${step}-log-${index}`"
						>
							{{ entry }}
						</li>
					</ul>
					<ol v-if="getQueryItems(step).length > 0" class="query-page-list">
						<li
							v-for="item in getQueryItems(step)"
							:key="`${step}-${item.id}`"
							class="query-page-item"
						>
							<RecentChangePageCard
								:href="wiki.getPageUrl(item.title)"
								:title="item.title"
								:faded="isFilteredQueryPage(item.title)"
								:snippet-html="item.snippet ? `${item.snippet}...` : undefined"
								:info-boxes="getQueryPageInfoBoxes(item, step)"
							/>
						</li>
					</ol>
					<p v-else class="meta">No more-like pages yet.</p>
				</article>
			</div>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>A4. Score pages</h2>
			</div>
			<p class="meta">Source membership weights</p>
			<div class="page-score-controls">
				<label
					v-for="stepId in pageScoreWeightStepIds"
					:key="`page-weight-${stepId}`"
					class="page-score-control"
				>
					<span
						>{{ queryDisplayLabels[stepId] }} weight:
						{{ formatWeightLabel(pageScoreWeights[stepId]) }}</span
					>
					<input
						v-model.number="pageScoreWeights[stepId]"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
			</div>
			<p class="meta">Search query rank bonus weights</p>
			<div class="page-score-controls">
				<label
					v-for="stepId in moreLikePageStepIds"
					:key="`page-position-weight-${stepId}`"
					class="page-score-control"
				>
					<span>
						{{ queryDisplayLabels[stepId] }} rank bonus:
						{{ formatWeightLabel(pageScorePositionWeights[stepId]) }}
					</span>
					<input
						v-model.number="pageScorePositionWeights[stepId]"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
			</div>
			<div class="prioritize-actions">
				<CdxButton @click="resetPageScoreControls">Reset</CdxButton>
				<CdxButton @click="setAllPageScoreControlsToZero">Set all to 0</CdxButton>
			</div>
			<p class="meta">{{ scoredPages.length }} scored pages</p>
			<ol v-if="scoredPages.length > 0" class="query-page-list">
				<li
					v-for="item in scoredPages"
					:key="`page-score-${item.title}`"
					class="query-page-item"
				>
					<RecentChangePageCard
						:href="wiki.getPageUrl(item.title)"
						:title="item.title"
						:snippet-html="item.snippet ? `${item.snippet}...` : undefined"
						:info-boxes="getScoredPageInfoBoxes(item)"
					/>
				</li>
			</ol>
			<p v-else class="meta">No scored pages yet.</p>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>A5. Select</h2>
			</div>
			<div class="select-controls">
				<label class="select-control">
					<span>Selected pages: {{ pageSelectCount }}</span>
					<input
						v-model.number="pageSelectCount"
						type="range"
						min="0"
						max="50"
						step="1"
					/>
				</label>
			</div>
			<p class="meta">
				top {{ pageSelectedPages.length }} chosen; unselected entries stay visible and faded
			</p>
			<ol v-if="scoredPages.length > 0" class="query-page-list">
				<li
					v-for="item in scoredPages"
					:key="`page-select-${item.title}`"
					class="query-page-item"
				>
					<RecentChangePageCard
						:href="wiki.getPageUrl(item.title)"
						:title="item.title"
						:faded="!selectedPageTitleSet.has(item.title.trim().toLowerCase())"
						:snippet-html="item.snippet ? `${item.snippet}...` : undefined"
						:info-boxes="getScoredPageInfoBoxes(item)"
					/>
				</li>
			</ol>
			<p v-else class="meta">No pages to select from yet.</p>
		</section>

		<!-- <section class="stage stage--act">
			<div class="stage__header">
				<h2>B. Changes</h2>
			</div>
		</section> -->

		<section class="stage">
			<div class="stage__header">
				<h2>B1. Sources</h2>
			</div>
			<div class="source-controls">
				<label class="source-control">
					<span>Recent risky items: {{ recentRiskyFetchLimit }}</span>
					<input
						v-model.number="recentRiskyFetchLimit"
						type="range"
						min="1"
						max="40"
						step="1"
					/>
				</label>
				<label class="source-control">
					<span
						>Changes from selected pages items: {{ fromSelectedPagesFetchLimit }}</span
					>
					<input
						v-model.number="fromSelectedPagesFetchLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="source-control">
					<span
						>Related changes per selected page:
						{{ relatedToSelectedPagesFetchLimit }}</span
					>
					<input
						v-model.number="relatedToSelectedPagesFetchLimit"
						type="range"
						min="1"
						max="50"
						step="1"
					/>
				</label>
			</div>
			<div class="source-grid">
				<article v-for="step in sourceStepIds" :key="step" class="source-step">
					<div class="source-step__header">
						<h3>{{ sourceSteps[step].title }}</h3>
						<CdxButton
							:disabled="sourceSteps[step].status === 'running' || Boolean(apiBusyBy)"
							@click="runSourceStep(step)"
						>
							Run
						</CdxButton>
					</div>
					<p v-if="sourceSteps[step].currentItem" class="meta">
						current: {{ sourceSteps[step].currentItem }}
					</p>
					<p v-if="sourceSteps[step].lastRequestDurationMs != null" class="meta">
						last request: {{ sourceSteps[step].lastRequestDurationMs }}ms
					</p>
					<p v-if="sourceSteps[step].error" class="error">
						{{ sourceSteps[step].error }}
					</p>
					<ul v-if="sourceSteps[step].log.length > 0" class="log-list">
						<li
							v-for="(entry, index) in sourceSteps[step].log"
							:key="`${step}-log-${index}`"
						>
							{{ entry }}
						</li>
					</ul>
					<RecentChangeFeed
						:items="sourceSteps[step].items"
						:key-prefix="step"
						empty-label="No source revisions yet."
					/>
				</article>
			</div>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>B2. Combine</h2>
			</div>
			<p class="meta">{{ combinedRevisions.length }} revisions (union of source outputs)</p>
			<RecentChangeFeed
				:items="combinedRevisions"
				key-prefix="combine"
				empty-label="No combined revisions yet."
			/>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>B3. Filter</h2>
			</div>
			<p class="meta">
				{{ filteredRevisions.length }} revisions after removing user/talk namespaces, bot
				edits, and non-latest revisions per page
			</p>
			<RecentChangeFeed
				:items="filteredRevisions"
				key-prefix="filter"
				empty-label="No filtered revisions yet."
			/>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>B4. Enrich</h2>
				<CdxButton :disabled="isScoreRunning || Boolean(apiBusyBy)" @click="runScore">
					Run
				</CdxButton>
			</div>
			<p v-if="scoreOutdated" class="meta">outdated</p>
			<p v-if="scoreStatus.currentItem" class="meta">
				current: {{ scoreStatus.currentItem }}
			</p>
			<p v-if="scoreStatus.lastRequestDurationMs != null" class="meta">
				last request: {{ scoreStatus.lastRequestDurationMs }}ms
			</p>
			<br />
			<p v-if="scoreStatus.error" class="error">{{ scoreStatus.error }}</p>
			<ul v-if="scoreStatus.log.length > 0" class="log-list">
				<li v-for="(entry, index) in scoreStatus.log" :key="`score-log-${index}`">
					{{ entry }}
				</li>
			</ul>
			<RecentChangeFeed
				:items="scoredRows"
				key-prefix="score"
				:show-metrics="true"
				empty-label="No enriched revisions yet."
			/>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>B5. Prioritize</h2>
			</div>
			<p class="meta">Page source multipliers</p>
			<div class="prioritize-controls">
				<label
					v-for="stepId in pagePriorityWeightStepIds"
					:key="`priority-page-source-${stepId}`"
					class="prioritize-control"
				>
					<span>
						{{ queryDisplayLabels[stepId] }} multiplier:
						{{ formatWeightLabel(pagePriorityWeights[stepId]) }}
					</span>
					<input
						v-model.number="pagePriorityWeights[stepId]"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
			</div>
			<p class="meta">Change source multipliers</p>
			<div class="prioritize-controls">
				<label
					v-for="sourceId in changeSourceWeightStepIds"
					:key="`priority-change-source-${sourceId}`"
					class="prioritize-control"
				>
					<span>
						{{ sourceDisplayLabels[sourceId] }} multiplier:
						{{ formatWeightLabel(changeSourceWeights[sourceId]) }}
					</span>
					<input
						v-model.number="changeSourceWeights[sourceId]"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
			</div>
			<p class="meta">Link type multipliers</p>
			<div class="prioritize-controls">
				<label
					v-for="linkType in linkTypeWeightStepIds"
					:key="`priority-link-type-${linkType}`"
					class="prioritize-control"
				>
					<span>
						{{ linkTypeDisplayLabels[linkType] }} multiplier:
						{{ formatWeightLabel(linkTypeWeights[linkType]) }}
					</span>
					<input
						v-model.number="linkTypeWeights[linkType]"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
			</div>
			<p class="meta">Search rank multiplier</p>
			<div class="prioritize-controls">
				<label class="prioritize-control">
					<span>
						Search query rank multiplier:
						{{ formatWeightLabel(searchRankWeight) }}
					</span>
					<input
						v-model.number="searchRankWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
			</div>
			<p class="meta">Model score multipliers</p>
			<div class="prioritize-controls">
				<label class="prioritize-control">
					<span>Revert risk multiplier: {{ formatWeightLabel(revertRiskWeight) }}</span>
					<input
						v-model.number="revertRiskWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
				<label class="prioritize-control">
					<span> Tone multiplier: {{ formatWeightLabel(toneProbabilityWeight) }} </span>
					<input
						v-model.number="toneProbabilityWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
				<label class="prioritize-control">
					<span>
						Reference need delta multiplier:
						{{ formatWeightLabel(referenceDeltaWeight) }}
					</span>
					<input
						v-model.number="referenceDeltaWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
			</div>
			<div class="prioritize-actions">
				<CdxButton @click="resetPrioritizeSliders">Reset</CdxButton>
				<CdxButton @click="setAllPrioritizeWeightsToZero">Set all to 0</CdxButton>
			</div>
			<RecentChangeFeed
				:items="prioritizedRows"
				key-prefix="priority"
				:show-metrics="true"
				empty-label="No prioritized revisions yet."
			/>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>B6. Select</h2>
			</div>
			<div class="select-controls">
				<label class="select-control">
					<span>Selected items: {{ selectCount }}</span>
					<input v-model.number="selectCount" type="range" min="0" max="20" step="1" />
				</label>
				<div class="select-control">
					<span>Select from change sources:</span>
					<div class="source-checkboxes">
						<label v-for="sourceId in sourceStepIds" :key="`select-source-${sourceId}`">
							<input v-model="selectSourcesEnabled[sourceId]" type="checkbox" />
							{{ sourceDisplayLabels[sourceId] }}
						</label>
					</div>
				</div>
			</div>
			<p class="meta">
				top {{ selectCount }} chosen; unselected entries stay visible and faded
			</p>
			<RecentChangeFeed
				:items="prioritizedRows"
				key-prefix="select"
				:show-metrics="true"
				:faded-ids="unselectedAfterSelectIds"
				empty-label="No revisions to select from yet."
			/>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>B7. Fill quotas</h2>
			</div>
			<div class="quota-controls">
				<label class="quota-control">
					<span>Recent risky quota: {{ recentRiskyQuotaTarget }}</span>
					<input
						v-model.number="recentRiskyQuotaTarget"
						type="range"
						min="0"
						max="8"
						step="1"
					/>
				</label>
				<label class="quota-control">
					<span
						>Changes from selected pages quota: {{ fromSelectedPagesQuotaTarget }}</span
					>
					<input
						v-model.number="fromSelectedPagesQuotaTarget"
						type="range"
						min="0"
						max="8"
						step="1"
					/>
				</label>
				<label class="quota-control">
					<span
						>Changes related to selected pages quota:
						{{ relatedToSelectedPagesQuotaTarget }}</span
					>
					<input
						v-model.number="relatedToSelectedPagesQuotaTarget"
						type="range"
						min="0"
						max="8"
						step="1"
					/>
				</label>
			</div>
			<div class="quota-actions">
				<CdxButton @click="resetQuotaTargets">Reset</CdxButton>
				<CdxButton @click="setAllQuotaTargetsToZero">Set all to 0</CdxButton>
			</div>
			<RecentChangeFeed
				:items="prioritizedRows"
				key-prefix="quota"
				:show-metrics="true"
				:faded-ids="unselectedAfterQuotaIds"
				empty-label="No revisions to fill quotas from yet."
			/>
		</section>

		<section class="stage">
			<div class="stage__header">
				<h2>B8. Order</h2>
			</div>
			<RecentChangeFeed
				:items="orderedRows"
				key-prefix="ordered"
				:show-metrics="true"
				empty-label="No ordered revisions yet."
			/>
		</section>
	</main>
</template>

<script setup lang="ts">
import { CdxButton } from "@wikimedia/codex"
import { FakeWiki, type FWCachedRevision, type FWRevisionWithLinkType } from "fakewiki"
import { computed, onMounted, ref, watch } from "vue"
import RecentChangeFeed from "./components/RecentChangeFeed.vue"
import RecentChangePageCard from "./components/RecentChangePageCard.vue"
import { API_BASE_DELAY_MS, runSerialRequest } from "./rateLimit"

type StageStatus = "idle" | "running" | "success" | "error"
type QueryStepId =
	| "pagesIWatch"
	| "pagesIBookmark"
	| "pagesIEdited"
	| "pagesIDiscussed"
	| "pagesIInteractWith"
	| "moreLikeWatchPages"
	| "moreLikeBookmarkPages"
	| "moreLikeEditedPages"
	| "moreLikeDiscussedPages"
	| "moreLikeInteractedPages"
type MoreLikeQueryStepId =
	| "moreLikeWatchPages"
	| "moreLikeBookmarkPages"
	| "moreLikeEditedPages"
	| "moreLikeDiscussedPages"
	| "moreLikeInteractedPages"
type SourceStepId = "recentRisky" | "fromSelectedPages" | "relatedToSelectedPages"
type LinkTypeWeightId = NonNullable<FWRevisionWithLinkType["linkType"]>

type QueryPage = {
	id: number
	title: string
	snippet?: string
	recommendationSourcePageNames: string[]
	sourceStepIds?: QueryStepId[]
	moreLikeRanks?: Partial<Record<MoreLikeQueryStepId, number>>
}

type ScoredPage = QueryPage & {
	pageScore: number
	sourceStepIds: QueryStepId[]
}

type RelatedSeedLink = {
	pageName: string
	linkType: NonNullable<FWRevisionWithLinkType["linkType"]>
}

type SourceRevision = FWCachedRevision & {
	sourceId: SourceStepId
	recommendationScore?: number
	recommendationSourcePageNames?: string[]
	relatedSeedLinks?: RelatedSeedLink[]
	pageSourceLabels?: string[]
	pageSourceStepIds?: QueryStepId[]
	pageScore?: number
	moreLikeRanks?: Partial<Record<MoreLikeQueryStepId, number>>
}

type RevisionRecord = SourceRevision & {
	sourceIds: SourceStepId[]
}

type ScoreRow = {
	revertRisk?: number | null
	toneProbability?: number | null
	tonePrediction?: boolean | null
	referenceNeedBefore?: number | null
	referenceNeedAfter?: number | null
	referenceNeedDelta?: number | null
}

type StepState<T> = {
	title: string
	status: StageStatus
	items: T[]
	error: string | null
	currentItem: string | null
	processedCount: number
	totalCount: number
	lastRequestDurationMs: number | null
	lastSuccessAt: string | null
	requestCount: number
	durationMs: number
	errorCount: number
	log: string[]
}
type QueryStepState = StepState<QueryPage>
type SourceStepState = StepState<SourceRevision>

const wiki = new FakeWiki()
const apiBusyBy = ref<string | null>(null)
const sourceVersion = ref(0)
const scoreBasedOnSourceVersion = ref(0)
const moreLikeWatchQueryLimit = ref(8)
const moreLikeBookmarkQueryLimit = ref(8)
const moreLikeEditedQueryLimit = ref(8)
const moreLikeDiscussedQueryLimit = ref(8)
const moreLikeInteractedQueryLimit = ref(8)
const pagesIEditedQueryLimit = ref(8)
const pagesIDiscussedQueryLimit = ref(8)
const recentRiskyFetchLimit = ref(16)
const fromSelectedPagesFetchLimit = ref(8)
const relatedToSelectedPagesFetchLimit = ref(2)
const selectSourcesEnabled = ref<Record<SourceStepId, boolean>>({
	recentRisky: true,
	fromSelectedPages: true,
	relatedToSelectedPages: true,
})
const sourceDisplayLabels: Record<SourceStepId, string> = {
	recentRisky: "recent risky",
	fromSelectedPages: "changes from selected pages",
	relatedToSelectedPages: "changes related to selected pages",
}
const linkTypeDisplayLabels: Record<LinkTypeWeightId, string> = {
	both: "bidirectional link",
	to: "outlink",
	from: "backlink",
}
const queryDisplayLabels: Record<QueryStepId, string> = {
	pagesIWatch: "pages I watch",
	pagesIBookmark: "pages I've bookmarked",
	pagesIEdited: "pages I've edited",
	pagesIDiscussed: "pages I've discussed",
	pagesIInteractWith: "pages I've interacted with",
	moreLikeWatchPages: "more like pages I watch",
	moreLikeBookmarkPages: "more like pages I've bookmarked",
	moreLikeEditedPages: "more like pages I've edited",
	moreLikeDiscussedPages: "more like pages I've discussed",
	moreLikeInteractedPages: "more like pages I've interacted with",
}
const recentRiskyQuotaTarget = ref(1)
const fromSelectedPagesQuotaTarget = ref(1)
const relatedToSelectedPagesQuotaTarget = ref(1)

const WATCHLIST_PAGES = [
	"Confidence Man (band)",
	"Algorave",
	"Little Mix",
	"Gorillaz",
	"Jade Thirlwall",
	"Wet Leg",
]
const BOOKMARKED_PAGES = ["Half-Life (series)", "Wet Leg", "Dada", "Surrealism"]
const PAGES_IVE_EDITED_USER = "Todepond"
const pageSelectCount = ref(20)
const selectCount = ref(4)
const RECENT_RISKY_PAGE_SIZE = 10

const STORAGE_PREFIX = "prototype.page-and-recent-change-sources.v8"
const QUERY_KEYS: Record<QueryStepId, string> = {
	pagesIWatch: `${STORAGE_PREFIX}.query.pagesIWatch`,
	pagesIBookmark: `${STORAGE_PREFIX}.query.pagesIBookmark`,
	pagesIDiscussed: `${STORAGE_PREFIX}.query.pagesIDiscussed`,
	pagesIInteractWith: `${STORAGE_PREFIX}.query.pagesIInteractWith`,
	moreLikeWatchPages: `${STORAGE_PREFIX}.query.moreLikeWatchPages`,
	moreLikeBookmarkPages: `${STORAGE_PREFIX}.query.moreLikeBookmarkPages`,
	moreLikeEditedPages: `${STORAGE_PREFIX}.query.moreLikeEditedPages`,
	moreLikeDiscussedPages: `${STORAGE_PREFIX}.query.moreLikeDiscussedPages`,
	moreLikeInteractedPages: `${STORAGE_PREFIX}.query.moreLikeInteractedPages`,
	pagesIEdited: `${STORAGE_PREFIX}.query.pagesIEdited`,
}
const SOURCE_KEYS: Record<SourceStepId, string> = {
	recentRisky: `${STORAGE_PREFIX}.source.recentRisky`,
	fromSelectedPages: `${STORAGE_PREFIX}.source.fromSelectedPages`,
	relatedToSelectedPages: `${STORAGE_PREFIX}.source.relatedToSelectedPages`,
}
const SCORE_KEY = `${STORAGE_PREFIX}.score`
const PRIORITY_WEIGHTS_KEY = `${STORAGE_PREFIX}.priorityWeights`
const PAGE_SCORE_WEIGHTS_KEY = `${STORAGE_PREFIX}.pageScoreWeights`
const PAGE_POSITION_WEIGHTS_KEY = `${STORAGE_PREFIX}.pagePositionWeights`
const PAGE_SELECT_CONFIG_KEY = `${STORAGE_PREFIX}.pageSelectConfig`
const SOURCE_FETCH_COUNTS_KEY = `${STORAGE_PREFIX}.sourceFetchCounts`
const QUOTA_TARGETS_KEY = `${STORAGE_PREFIX}.quotaTargets`
const SELECT_CONFIG_KEY = `${STORAGE_PREFIX}.selectConfig`

function createStepState<T>(title: string): StepState<T> {
	return {
		title,
		status: "idle",
		items: [],
		error: null,
		currentItem: null,
		processedCount: 0,
		totalCount: 0,
		lastRequestDurationMs: null,
		lastSuccessAt: null,
		requestCount: 0,
		durationMs: 0,
		errorCount: 0,
		log: [],
	}
}

const querySteps = ref<Record<QueryStepId, QueryStepState>>({
	pagesIWatch: {
		...createStepState("A1.1 Pages I watch"),
		status: "success",
		items: WATCHLIST_PAGES.map((title, index) => ({
			id: -(index + 1),
			title,
			recommendationSourcePageNames: [],
		})),
		processedCount: WATCHLIST_PAGES.length,
		totalCount: WATCHLIST_PAGES.length,
	},
	pagesIBookmark: {
		...createStepState("A1.2 Pages I've bookmarked"),
		status: "success",
		items: BOOKMARKED_PAGES.map((title, index) => ({
			id: -(100 + index + 1),
			title,
			recommendationSourcePageNames: [],
		})),
		processedCount: BOOKMARKED_PAGES.length,
		totalCount: BOOKMARKED_PAGES.length,
	},
	pagesIEdited: createStepState("A1.3 Pages I've edited"),
	pagesIDiscussed: createStepState("A1.4 Pages I've discussed"),
	pagesIInteractWith: {
		...createStepState("A2.1 Pages I've interacted with"),
		status: "success",
	},
	moreLikeWatchPages: createStepState("A3.1 More like pages I watch"),
	moreLikeBookmarkPages: createStepState("A3.2 More like pages I've bookmarked"),
	moreLikeEditedPages: createStepState("A3.3 More like pages I've edited"),
	moreLikeDiscussedPages: createStepState("A3.4 More like pages I've discussed"),
	moreLikeInteractedPages: createStepState("A3.5 More like pages I've interacted with"),
})
const queryStepIds: QueryStepId[] = [
	"pagesIWatch",
	"pagesIBookmark",
	"pagesIEdited",
	"pagesIDiscussed",
	"pagesIInteractWith",
	"moreLikeWatchPages",
	"moreLikeBookmarkPages",
	"moreLikeEditedPages",
	"moreLikeDiscussedPages",
	"moreLikeInteractedPages",
]
const rawPageStepIds: QueryStepId[] = [
	"pagesIWatch",
	"pagesIBookmark",
	"pagesIEdited",
	"pagesIDiscussed",
]
const combinedPageStepIds: QueryStepId[] = ["pagesIInteractWith"]
const moreLikePageStepIds: MoreLikeQueryStepId[] = [
	"moreLikeWatchPages",
	"moreLikeBookmarkPages",
	"moreLikeEditedPages",
	"moreLikeDiscussedPages",
	"moreLikeInteractedPages",
]
const pageScoreWeightStepIds: QueryStepId[] = [
	"pagesIWatch",
	"pagesIBookmark",
	"pagesIEdited",
	"pagesIDiscussed",
	"pagesIInteractWith",
	"moreLikeWatchPages",
	"moreLikeBookmarkPages",
	"moreLikeEditedPages",
	"moreLikeDiscussedPages",
	"moreLikeInteractedPages",
]
const DEFAULT_CHANGE_SOURCE_WEIGHTS: Record<SourceStepId, number> = {
	recentRisky: 0.9,
	fromSelectedPages: 0.9,
	relatedToSelectedPages: 0.9,
}
const DEFAULT_PAGE_PRIORITY_WEIGHTS: Record<QueryStepId, number> = {
	pagesIWatch: 0,
	pagesIBookmark: 0,
	pagesIEdited: 0,
	pagesIDiscussed: 0,
	pagesIInteractWith: 0,
	moreLikeWatchPages: 0,
	moreLikeBookmarkPages: 0,
	moreLikeEditedPages: 0,
	moreLikeDiscussedPages: 0,
	moreLikeInteractedPages: 0,
}
const DEFAULT_LINK_TYPE_WEIGHTS: Record<LinkTypeWeightId, number> = {
	both: 4,
	to: 2,
	from: 1,
}
const DEFAULT_SEARCH_RANK_WEIGHT = 1
const DEFAULT_REVERT_RISK_WEIGHT = 1
const DEFAULT_TONE_PROBABILITY_WEIGHT = 0.65
const DEFAULT_REFERENCE_DELTA_WEIGHT = 0.6
const DEFAULT_PAGE_SCORE_WEIGHTS: Record<QueryStepId, number> = {
	pagesIWatch: 1,
	pagesIBookmark: 1,
	pagesIEdited: 1,
	pagesIDiscussed: 1,
	pagesIInteractWith: 1,
	moreLikeWatchPages: 0,
	moreLikeBookmarkPages: 0,
	moreLikeEditedPages: 0,
	moreLikeDiscussedPages: 0,
	moreLikeInteractedPages: 0,
}
const pageScoreWeights = ref<Record<QueryStepId, number>>({ ...DEFAULT_PAGE_SCORE_WEIGHTS })
const DEFAULT_PAGE_POSITION_WEIGHTS: Record<MoreLikeQueryStepId, number> = {
	moreLikeWatchPages: 1,
	moreLikeBookmarkPages: 1,
	moreLikeEditedPages: 1,
	moreLikeDiscussedPages: 1,
	moreLikeInteractedPages: 1,
}
const pageScorePositionWeights = ref<Record<MoreLikeQueryStepId, number>>({
	...DEFAULT_PAGE_POSITION_WEIGHTS,
})

const sourceSteps = ref<Record<SourceStepId, SourceStepState>>({
	recentRisky: createStepState("1.1 Risky changes"),
	fromSelectedPages: createStepState("1.2 Changes from selected pages"),
	relatedToSelectedPages: createStepState("1.3 Changes related to selected pages"),
})

const sourceStepIds: SourceStepId[] = ["recentRisky", "fromSelectedPages", "relatedToSelectedPages"]
const changeSourceWeightStepIds: SourceStepId[] = [...sourceStepIds]
const pagePriorityWeightStepIds: QueryStepId[] = [...pageScoreWeightStepIds]
const linkTypeWeightStepIds: LinkTypeWeightId[] = ["both", "to", "from"]
const changeSourceWeights = ref<Record<SourceStepId, number>>({ ...DEFAULT_CHANGE_SOURCE_WEIGHTS })
const pagePriorityWeights = ref<Record<QueryStepId, number>>({ ...DEFAULT_PAGE_PRIORITY_WEIGHTS })
const linkTypeWeights = ref<Record<LinkTypeWeightId, number>>({ ...DEFAULT_LINK_TYPE_WEIGHTS })
const searchRankWeight = ref(DEFAULT_SEARCH_RANK_WEIGHT)
const revertRiskWeight = ref(DEFAULT_REVERT_RISK_WEIGHT)
const toneProbabilityWeight = ref(DEFAULT_TONE_PROBABILITY_WEIGHT)
const referenceDeltaWeight = ref(DEFAULT_REFERENCE_DELTA_WEIGHT)

const scoreStatus = ref({
	status: "idle" as StageStatus,
	error: null as string | null,
	currentItem: null as string | null,
	processedCount: 0,
	totalCount: 0,
	lastRequestDurationMs: null as number | null,
	lastSuccessAt: null as string | null,
	log: [] as string[],
})

const scoredByRevisionId = ref<Record<number, ScoreRow>>({})

const combinedRevisions = computed<SourceRevision[]>(() => {
	return sourceStepIds.flatMap(stepId => sourceSteps.value[stepId].items)
})

const interactedPages = computed<QueryPage[]>(() => {
	const orderedSources: QueryStepId[] = [
		"pagesIWatch",
		"pagesIBookmark",
		"pagesIEdited",
		"pagesIDiscussed",
	]
	const byTitle = new Map<string, QueryPage>()
	for (const sourceStepId of orderedSources) {
		for (const page of querySteps.value[sourceStepId].items) {
			if (isFilteredQueryPage(page.title)) continue
			const normalizedTitle = page.title.trim().toLowerCase()
			const existing = byTitle.get(normalizedTitle)
			if (!existing) {
				byTitle.set(normalizedTitle, {
					...page,
					sourceStepIds: [sourceStepId],
				})
				continue
			}
			const sourceStepIds = new Set([...(existing.sourceStepIds ?? []), sourceStepId])
			byTitle.set(normalizedTitle, {
				...existing,
				sourceStepIds: [...sourceStepIds],
			})
		}
	}
	return [...byTitle.values()]
})

const scoredPages = computed<ScoredPage[]>(() => {
	const byTitle = new Map<string, ScoredPage>()
	for (const stepId of pageScoreWeightStepIds) {
		const items = getQueryItems(stepId).filter(page => !isFilteredQueryPage(page.title))
		for (const [index, page] of items.entries()) {
			const normalizedTitle = page.title.trim().toLowerCase()
			const sourceContribution = pageScoreWeights.value[stepId]
			const rank = page.moreLikeRanks?.[stepId] ?? index + 1
			const positionContribution = isMoreLikeQueryStepId(stepId)
				? pageScorePositionWeights.value[stepId] * (1 / rank)
				: 0
			const contribution = sourceContribution + positionContribution
			const existing = byTitle.get(normalizedTitle)
			if (!existing) {
				byTitle.set(normalizedTitle, {
					...page,
					pageScore: contribution,
					sourceStepIds: [stepId],
				})
				continue
			}
			const sourceStepIds = new Set([...(existing.sourceStepIds ?? []), stepId])
			const moreLikeRanks = {
				...(existing.moreLikeRanks ?? {}),
				...(page.moreLikeRanks ?? {}),
			}
			byTitle.set(normalizedTitle, {
				...existing,
				snippet: existing.snippet ?? page.snippet,
				pageScore: existing.pageScore + contribution,
				sourceStepIds: [...sourceStepIds],
				moreLikeRanks,
			})
		}
	}
	return [...byTitle.values()].sort((a, b) => b.pageScore - a.pageScore)
})
const pageSelectedPages = computed(() =>
	scoredPages.value.slice(0, Math.max(0, Math.floor(pageSelectCount.value)))
)
const selectedPageTitleSet = computed(
	() => new Set(pageSelectedPages.value.map(page => page.title.trim().toLowerCase()))
)

const normalizedRevisions = computed<RevisionRecord[]>(() => {
	const byId = new Map<number, RevisionRecord>()
	for (const revision of combinedRevisions.value) {
		const existing = byId.get(revision.id)
		if (!existing) {
			byId.set(revision.id, {
				...revision,
				sourceIds: [revision.sourceId],
			})
			continue
		}
		const sourceIds = new Set<SourceStepId>([...existing.sourceIds, revision.sourceId])
		const relatedSeedLinks = new Map<string, RelatedSeedLink>()
		const pageSourceLabels = new Set([
			...(existing.pageSourceLabels ?? []),
			...(revision.pageSourceLabels ?? []),
		])
		const pageSourceStepIds = new Set<QueryStepId>([
			...(existing.pageSourceStepIds ?? []),
			...(revision.pageSourceStepIds ?? []),
		])
		const pageScore = (existing.pageScore ?? 0) + (revision.pageScore ?? 0)
		const moreLikeRanks: Partial<Record<MoreLikeQueryStepId, number>> = {
			...(existing.moreLikeRanks ?? {}),
		}
		for (const [stepId, rank] of Object.entries(revision.moreLikeRanks ?? {}) as Array<
			[MoreLikeQueryStepId, number]
		>) {
			const existingRank = moreLikeRanks[stepId]
			moreLikeRanks[stepId] =
				typeof existingRank === "number" ? Math.min(existingRank, rank) : rank
		}
		for (const link of [
			...(existing.relatedSeedLinks ?? []),
			...(revision.relatedSeedLinks ?? []),
		]) {
			relatedSeedLinks.set(`${link.pageName.trim().toLowerCase()}\t${link.linkType}`, link)
		}
		byId.set(revision.id, {
			...existing,
			...revision,
			sourceIds: [...sourceIds],
			recommendationSourcePageNames: [
				...(existing.recommendationSourcePageNames ?? []),
				...(revision.recommendationSourcePageNames ?? []),
			],
			relatedSeedLinks: [...relatedSeedLinks.values()],
			pageSourceLabels: [...pageSourceLabels],
			pageSourceStepIds: [...pageSourceStepIds],
			pageScore,
			moreLikeRanks,
		})
	}
	return [...byId.values()]
})

const filteredRevisions = computed<RevisionRecord[]>(() => {
	const namespaceFiltered = normalizedRevisions.value.filter(rev => {
		const pageName = rev.pageName?.toLowerCase() ?? ""
		if (
			pageName.startsWith("user:") ||
			pageName.startsWith("talk:") ||
			pageName.startsWith("user talk:") ||
			pageName.startsWith("wikipedia:")
		) {
			return false
		}
		const username = rev.user.name.toLowerCase()
		if (username.includes("bot") || rev.tags?.includes("bot")) return false
		return true
	})
	const sorted = [...namespaceFiltered].sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	)
	const latestByPage = new Set<string>()
	const onlyLatest: RevisionRecord[] = []
	for (const revision of sorted) {
		const pageKey = revision.pageName?.toLowerCase() ?? `rev-${revision.id}`
		if (latestByPage.has(pageKey)) continue
		latestByPage.add(pageKey)
		onlyLatest.push(revision)
	}
	return onlyLatest
})

const scoredRows = computed(() => {
	return filteredRevisions.value.map(revision => {
		const score = scoredByRevisionId.value[revision.id] ?? {}
		const recommendationScore =
			getRecommendationScoreFromRelatedSeedLinks(revision.relatedSeedLinks) ??
			revision.recommendationScore
		let normalizedTone = score.toneProbability
		if (score.tonePrediction === false && typeof score.toneProbability === "number") {
			// Backward compatibility for older cached snapshots where "no issue" was stored positive.
			normalizedTone = -Math.abs(score.toneProbability)
		}
		const normalizedReference =
			typeof score.referenceNeedBefore === "number" &&
			typeof score.referenceNeedAfter === "number"
				? score.referenceNeedAfter - score.referenceNeedBefore
				: score.referenceNeedDelta
		return {
			...revision,
			...score,
			recommendationScore,
			toneProbability: normalizedTone,
			referenceNeedDelta: normalizedReference,
		}
	})
})

const prioritizedRows = computed(() => {
	return [...scoredRows.value]
		.map(revision => {
			const changeSourceWeight = revision.sourceIds.reduce(
				(total, sourceId) => total + changeSourceWeights.value[sourceId],
				0
			)
			const pageSourceWeight = (revision.pageSourceStepIds ?? []).reduce(
				(total, stepId) => total + pagePriorityWeights.value[stepId],
				0
			)
			const linkTypeCounts = getRelatedLinkTypeCounts(revision.relatedSeedLinks)
			const linkTypeWeight = linkTypeWeightStepIds.reduce(
				(total, linkType) =>
					total + linkTypeCounts[linkType] * linkTypeWeights.value[linkType],
				0
			)
			const searchRankContribution = Object.values(revision.moreLikeRanks ?? {}).reduce(
				(total, rank) => total + 1 / rank,
				0
			)
			const searchRankWeightContribution = searchRankContribution * searchRankWeight.value
			const revertWeight = (revision.revertRisk ?? 0) * revertRiskWeight.value
			const toneWeight = (revision.toneProbability ?? 0) * toneProbabilityWeight.value
			const referenceWeight = (revision.referenceNeedDelta ?? 0) * referenceDeltaWeight.value
			return {
				...revision,
				priorityScore:
					changeSourceWeight +
					pageSourceWeight +
					linkTypeWeight +
					searchRankWeightContribution +
					revertWeight +
					toneWeight +
					referenceWeight,
			}
		})
		.sort((a, b) => b.priorityScore - a.priorityScore)
})

const selectedCandidateRows = computed(() =>
	prioritizedRows.value.filter(row =>
		row.sourceIds.some(sourceId => selectSourcesEnabled.value[sourceId])
	)
)

const selectedRows = computed(() =>
	selectedCandidateRows.value.slice(0, Math.max(0, Math.floor(selectCount.value)))
)
const selectedIdSet = computed(() => new Set(selectedRows.value.map(row => row.id)))
const unselectedAfterSelectIds = computed(() =>
	prioritizedRows.value.filter(row => !selectedIdSet.value.has(row.id)).map(row => row.id)
)

function getQuotaTarget(sourceId: SourceStepId): number {
	if (sourceId === "recentRisky") return Math.max(0, Math.floor(recentRiskyQuotaTarget.value))
	if (sourceId === "fromSelectedPages")
		return Math.max(0, Math.floor(fromSelectedPagesQuotaTarget.value))
	return Math.max(0, Math.floor(relatedToSelectedPagesQuotaTarget.value))
}

const quotaFilledRows = computed(() => {
	const chosen = [...selectedRows.value]
	const chosenIds = new Set(chosen.map(row => row.id))
	for (const sourceId of sourceStepIds) {
		const quotaTarget = getQuotaTarget(sourceId)
		if (quotaTarget <= 0) continue
		let countFromSource = chosen.filter(row => row.sourceIds.includes(sourceId)).length
		if (countFromSource >= quotaTarget) continue
		for (const row of prioritizedRows.value) {
			if (chosenIds.has(row.id) || !row.sourceIds.includes(sourceId)) continue
			chosen.push(row)
			chosenIds.add(row.id)
			countFromSource += 1
			if (countFromSource >= quotaTarget) break
		}
	}
	return chosen
})
const quotaFilledIdSet = computed(() => new Set(quotaFilledRows.value.map(row => row.id)))
const unselectedAfterQuotaIds = computed(() =>
	prioritizedRows.value.filter(row => !quotaFilledIdSet.value.has(row.id)).map(row => row.id)
)

const orderedRows = computed(() => {
	return [...quotaFilledRows.value].sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	)
})

const scoreOutdated = computed(() => scoreBasedOnSourceVersion.value < sourceVersion.value)
const isScoreRunning = computed(() => scoreStatus.value.status === "running")

function canRunQueryStep(stepId: QueryStepId): boolean {
	return !["pagesIWatch", "pagesIBookmark", "pagesIInteractWith"].includes(stepId)
}

function isMoreLikeQueryStepId(stepId: QueryStepId): stepId is MoreLikeQueryStepId {
	return moreLikePageStepIds.includes(stepId as MoreLikeQueryStepId)
}

function formatWeightLabel(weight: number): string {
	return `${weight.toFixed(2)}x`
}

function resetPageScoreControls(): void {
	pageScoreWeights.value = { ...DEFAULT_PAGE_SCORE_WEIGHTS }
	pageScorePositionWeights.value = { ...DEFAULT_PAGE_POSITION_WEIGHTS }
}

function setAllPageScoreControlsToZero(): void {
	pageScoreWeights.value = Object.fromEntries(
		pageScoreWeightStepIds.map(stepId => [stepId, 0])
	) as Record<QueryStepId, number>
	pageScorePositionWeights.value = Object.fromEntries(
		moreLikePageStepIds.map(stepId => [stepId, 0])
	) as Record<MoreLikeQueryStepId, number>
}

function resetPrioritizeSliders(): void {
	changeSourceWeights.value = { ...DEFAULT_CHANGE_SOURCE_WEIGHTS }
	pagePriorityWeights.value = { ...DEFAULT_PAGE_PRIORITY_WEIGHTS }
	linkTypeWeights.value = { ...DEFAULT_LINK_TYPE_WEIGHTS }
	searchRankWeight.value = DEFAULT_SEARCH_RANK_WEIGHT
	revertRiskWeight.value = DEFAULT_REVERT_RISK_WEIGHT
	toneProbabilityWeight.value = DEFAULT_TONE_PROBABILITY_WEIGHT
	referenceDeltaWeight.value = DEFAULT_REFERENCE_DELTA_WEIGHT
}

function setAllPrioritizeWeightsToZero(): void {
	changeSourceWeights.value = Object.fromEntries(
		changeSourceWeightStepIds.map(stepId => [stepId, 0])
	) as Record<SourceStepId, number>
	pagePriorityWeights.value = Object.fromEntries(
		pagePriorityWeightStepIds.map(stepId => [stepId, 0])
	) as Record<QueryStepId, number>
	linkTypeWeights.value = Object.fromEntries(
		linkTypeWeightStepIds.map(linkType => [linkType, 0])
	) as Record<LinkTypeWeightId, number>
	searchRankWeight.value = 0
	revertRiskWeight.value = 0
	toneProbabilityWeight.value = 0
	referenceDeltaWeight.value = 0
}

function resetQuotaTargets(): void {
	recentRiskyQuotaTarget.value = 1
	fromSelectedPagesQuotaTarget.value = 1
	relatedToSelectedPagesQuotaTarget.value = 1
}

function setAllQuotaTargetsToZero(): void {
	recentRiskyQuotaTarget.value = 0
	fromSelectedPagesQuotaTarget.value = 0
	relatedToSelectedPagesQuotaTarget.value = 0
}

function savePrioritizeWeights(): void {
	const payload = {
		changeSourceWeights: changeSourceWeights.value,
		pagePriorityWeights: pagePriorityWeights.value,
		linkTypeWeights: linkTypeWeights.value,
		searchRankWeight: searchRankWeight.value,
		revertRiskWeight: revertRiskWeight.value,
		toneProbabilityWeight: toneProbabilityWeight.value,
		referenceDeltaWeight: referenceDeltaWeight.value,
	}
	localStorage.setItem(PRIORITY_WEIGHTS_KEY, JSON.stringify(payload))
}

function savePageScoreWeights(): void {
	localStorage.setItem(PAGE_SCORE_WEIGHTS_KEY, JSON.stringify(pageScoreWeights.value))
}

function savePagePositionWeights(): void {
	localStorage.setItem(PAGE_POSITION_WEIGHTS_KEY, JSON.stringify(pageScorePositionWeights.value))
}

function savePageSelectConfig(): void {
	localStorage.setItem(
		PAGE_SELECT_CONFIG_KEY,
		JSON.stringify({
			pageSelectCount: pageSelectCount.value,
		})
	)
}

function restorePrioritizeWeights(): void {
	const payload = parseStored<{
		changeSourceWeights?: Partial<Record<SourceStepId, number>>
		pagePriorityWeights?: Partial<Record<QueryStepId, number>>
		linkTypeWeights?: Partial<Record<LinkTypeWeightId, number>>
		searchRankWeight?: number
		revertRiskWeight?: number
		toneProbabilityWeight?: number
		referenceDeltaWeight?: number
	}>(PRIORITY_WEIGHTS_KEY)
	if (!payload) return
	if (payload.changeSourceWeights) {
		changeSourceWeights.value = {
			...changeSourceWeights.value,
			...payload.changeSourceWeights,
		}
	}
	if (payload.pagePriorityWeights) {
		pagePriorityWeights.value = {
			...pagePriorityWeights.value,
			...payload.pagePriorityWeights,
		}
	}
	if (payload.linkTypeWeights) {
		linkTypeWeights.value = {
			...linkTypeWeights.value,
			...payload.linkTypeWeights,
		}
	}
	if (typeof payload.searchRankWeight === "number") {
		searchRankWeight.value = payload.searchRankWeight
	}
	if (typeof payload.revertRiskWeight === "number") {
		revertRiskWeight.value = payload.revertRiskWeight
	}
	if (typeof payload.toneProbabilityWeight === "number") {
		toneProbabilityWeight.value = payload.toneProbabilityWeight
	}
	if (typeof payload.referenceDeltaWeight === "number") {
		referenceDeltaWeight.value = payload.referenceDeltaWeight
	}
}

function restorePageScoreWeights(): void {
	const payload = parseStored<Partial<Record<QueryStepId, number>>>(PAGE_SCORE_WEIGHTS_KEY)
	if (!payload) return
	pageScoreWeights.value = {
		...pageScoreWeights.value,
		...payload,
	}
}

function restorePagePositionWeights(): void {
	const payload =
		parseStored<Partial<Record<MoreLikeQueryStepId, number>>>(PAGE_POSITION_WEIGHTS_KEY)
	if (!payload) return
	pageScorePositionWeights.value = {
		...pageScorePositionWeights.value,
		...payload,
	}
}

function restorePageSelectConfig(): void {
	const payload = parseStored<{
		pageSelectCount?: number
	}>(PAGE_SELECT_CONFIG_KEY)
	if (!payload) return
	if (typeof payload.pageSelectCount === "number") {
		pageSelectCount.value = payload.pageSelectCount
	}
}

function saveSourceFetchCounts(): void {
	const payload = {
		moreLikeWatchQueryLimit: moreLikeWatchQueryLimit.value,
		moreLikeBookmarkQueryLimit: moreLikeBookmarkQueryLimit.value,
		moreLikeEditedQueryLimit: moreLikeEditedQueryLimit.value,
		moreLikeDiscussedQueryLimit: moreLikeDiscussedQueryLimit.value,
		moreLikeInteractedQueryLimit: moreLikeInteractedQueryLimit.value,
		pagesIEditedQueryLimit: pagesIEditedQueryLimit.value,
		pagesIDiscussedQueryLimit: pagesIDiscussedQueryLimit.value,
		recentRiskyFetchLimit: recentRiskyFetchLimit.value,
		fromSelectedPagesFetchLimit: fromSelectedPagesFetchLimit.value,
		relatedToSelectedPagesFetchLimit: relatedToSelectedPagesFetchLimit.value,
	}
	localStorage.setItem(SOURCE_FETCH_COUNTS_KEY, JSON.stringify(payload))
}

function restoreSourceFetchCounts(): void {
	const payload = parseStored<{
		moreLikeWatchQueryLimit?: number
		moreLikeBookmarkQueryLimit?: number
		moreLikeEditedQueryLimit?: number
		moreLikeDiscussedQueryLimit?: number
		moreLikeInteractedQueryLimit?: number
		pagesIEditedQueryLimit?: number
		pagesIDiscussedQueryLimit?: number
		recentRiskyFetchLimit?: number
		fromSelectedPagesFetchLimit?: number
		relatedToSelectedPagesFetchLimit?: number
	}>(SOURCE_FETCH_COUNTS_KEY)
	if (!payload) return
	if (typeof payload.moreLikeWatchQueryLimit === "number") {
		moreLikeWatchQueryLimit.value = payload.moreLikeWatchQueryLimit
	}
	if (typeof payload.moreLikeBookmarkQueryLimit === "number") {
		moreLikeBookmarkQueryLimit.value = payload.moreLikeBookmarkQueryLimit
	}
	if (typeof payload.moreLikeEditedQueryLimit === "number") {
		moreLikeEditedQueryLimit.value = payload.moreLikeEditedQueryLimit
	}
	if (typeof payload.moreLikeDiscussedQueryLimit === "number") {
		moreLikeDiscussedQueryLimit.value = payload.moreLikeDiscussedQueryLimit
	}
	if (typeof payload.moreLikeInteractedQueryLimit === "number") {
		moreLikeInteractedQueryLimit.value = payload.moreLikeInteractedQueryLimit
	}
	if (typeof payload.pagesIEditedQueryLimit === "number") {
		pagesIEditedQueryLimit.value = payload.pagesIEditedQueryLimit
	}
	if (typeof payload.pagesIDiscussedQueryLimit === "number") {
		pagesIDiscussedQueryLimit.value = payload.pagesIDiscussedQueryLimit
	}
	if (typeof payload.recentRiskyFetchLimit === "number") {
		recentRiskyFetchLimit.value = payload.recentRiskyFetchLimit
	}
	if (typeof payload.fromSelectedPagesFetchLimit === "number") {
		fromSelectedPagesFetchLimit.value = payload.fromSelectedPagesFetchLimit
	}
	if (typeof payload.relatedToSelectedPagesFetchLimit === "number") {
		relatedToSelectedPagesFetchLimit.value = payload.relatedToSelectedPagesFetchLimit
	}
}

function saveQuotaTargets(): void {
	const payload = {
		recentRiskyQuotaTarget: recentRiskyQuotaTarget.value,
		fromSelectedPagesQuotaTarget: fromSelectedPagesQuotaTarget.value,
		relatedToSelectedPagesQuotaTarget: relatedToSelectedPagesQuotaTarget.value,
	}
	localStorage.setItem(QUOTA_TARGETS_KEY, JSON.stringify(payload))
}

function restoreQuotaTargets(): void {
	const payload = parseStored<{
		recentRiskyQuotaTarget?: number
		fromSelectedPagesQuotaTarget?: number
		relatedToSelectedPagesQuotaTarget?: number
	}>(QUOTA_TARGETS_KEY)
	if (!payload) return
	if (typeof payload.recentRiskyQuotaTarget === "number") {
		recentRiskyQuotaTarget.value = payload.recentRiskyQuotaTarget
	}
	if (typeof payload.fromSelectedPagesQuotaTarget === "number") {
		fromSelectedPagesQuotaTarget.value = payload.fromSelectedPagesQuotaTarget
	}
	if (typeof payload.relatedToSelectedPagesQuotaTarget === "number") {
		relatedToSelectedPagesQuotaTarget.value = payload.relatedToSelectedPagesQuotaTarget
	}
}

function saveSelectConfig(): void {
	const payload = {
		selectCount: selectCount.value,
		selectSourcesEnabled: selectSourcesEnabled.value,
	}
	localStorage.setItem(SELECT_CONFIG_KEY, JSON.stringify(payload))
}

function restoreSelectConfig(): void {
	const payload = parseStored<{
		selectCount?: number
		selectSourcesEnabled?: Partial<Record<SourceStepId, boolean>>
	}>(SELECT_CONFIG_KEY)
	if (!payload) return
	if (typeof payload.selectCount === "number") {
		selectCount.value = payload.selectCount
	}
	if (payload.selectSourcesEnabled) {
		selectSourcesEnabled.value = {
			...selectSourcesEnabled.value,
			...payload.selectSourcesEnabled,
		}
	}
}

watch(
	[
		changeSourceWeights,
		pagePriorityWeights,
		linkTypeWeights,
		searchRankWeight,
		revertRiskWeight,
		toneProbabilityWeight,
		referenceDeltaWeight,
	],
	() => {
		savePrioritizeWeights()
	},
	{ deep: true }
)

watch(
	pageScoreWeights,
	() => {
		savePageScoreWeights()
	},
	{ deep: true }
)

watch(
	pageScorePositionWeights,
	() => {
		savePagePositionWeights()
	},
	{ deep: true }
)

watch(pageSelectCount, () => {
	savePageSelectConfig()
})

watch(
	[
		moreLikeWatchQueryLimit,
		moreLikeBookmarkQueryLimit,
		moreLikeEditedQueryLimit,
		moreLikeDiscussedQueryLimit,
		moreLikeInteractedQueryLimit,
		pagesIEditedQueryLimit,
		pagesIDiscussedQueryLimit,
		recentRiskyFetchLimit,
		fromSelectedPagesFetchLimit,
		relatedToSelectedPagesFetchLimit,
	],
	() => {
		saveSourceFetchCounts()
	}
)

watch(
	[recentRiskyQuotaTarget, fromSelectedPagesQuotaTarget, relatedToSelectedPagesQuotaTarget],
	() => {
		saveQuotaTargets()
	}
)

watch(
	[selectCount, selectSourcesEnabled],
	() => {
		saveSelectConfig()
	},
	{ deep: true }
)

function setSourceStepItems(stepId: SourceStepId, items: SourceRevision[]): void {
	sourceSteps.value[stepId].items = items
}

function setQueryStepItems(stepId: QueryStepId, items: QueryPage[]): void {
	querySteps.value[stepId].items = items
}

function appendSourceItem(stepId: SourceStepId, item: Omit<SourceRevision, "sourceId">): void {
	const step = sourceSteps.value[stepId]
	step.items = [...step.items, { ...item, sourceId: stepId }]
	step.processedCount += 1
}

function pushQueryLog(stepId: QueryStepId, message: string): void {
	const step = querySteps.value[stepId]
	step.log = [message, ...step.log].slice(0, 12)
}

function pushStepLog(stepId: SourceStepId, message: string): void {
	const step = sourceSteps.value[stepId]
	step.log = [message, ...step.log].slice(0, 12)
}

function pushScoreLog(message: string): void {
	scoreStatus.value.log = [message, ...scoreStatus.value.log].slice(0, 20)
}

async function lockApi<T>(name: string, fn: () => Promise<T>): Promise<T> {
	if (apiBusyBy.value) {
		throw new Error(`Another API stage is running (${apiBusyBy.value})`)
	}
	apiBusyBy.value = name
	try {
		return await fn()
	} finally {
		apiBusyBy.value = null
	}
}

function parseStored<T>(key: string): T | null {
	const raw = localStorage.getItem(key)
	if (!raw) return null
	try {
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

function getEditedSeedPages(): string[] {
	return querySteps.value.pagesIEdited.items
		.map(item => item.title)
		.filter(pageName => !isFilteredQueryPage(pageName))
}

function getWatchSeedPages(): string[] {
	return querySteps.value.pagesIWatch.items.map(item => item.title)
}

function getBookmarkSeedPages(): string[] {
	return querySteps.value.pagesIBookmark.items
		.map(item => item.title)
		.filter(pageName => !isFilteredQueryPage(pageName))
}

function getDiscussedSeedPages(): string[] {
	return querySteps.value.pagesIDiscussed.items
		.map(item => item.title)
		.filter(pageName => !isFilteredQueryPage(pageName))
}

function getInteractedSeedPages(): string[] {
	return interactedPages.value.map(item => item.title)
}

function getQueryItems(stepId: QueryStepId): QueryPage[] {
	return stepId === "pagesIInteractWith" ? interactedPages.value : querySteps.value[stepId].items
}

function getQueryTargetCount(stepId: QueryStepId): number {
	if (stepId === "pagesIDiscussed") {
		return Math.max(1, Math.floor(pagesIDiscussedQueryLimit.value))
	}
	if (stepId === "moreLikeWatchPages") {
		return Math.max(1, Math.floor(moreLikeWatchQueryLimit.value))
	}
	if (stepId === "moreLikeBookmarkPages") {
		return Math.max(1, Math.floor(moreLikeBookmarkQueryLimit.value))
	}
	if (stepId === "moreLikeEditedPages") {
		return Math.max(1, Math.floor(moreLikeEditedQueryLimit.value))
	}
	if (stepId === "moreLikeDiscussedPages") {
		return Math.max(1, Math.floor(moreLikeDiscussedQueryLimit.value))
	}
	if (stepId === "moreLikeInteractedPages") {
		return Math.max(1, Math.floor(moreLikeInteractedQueryLimit.value))
	}
	return Math.max(1, Math.floor(pagesIEditedQueryLimit.value))
}

function getMoreLikeSeedPages(stepId: QueryStepId): string[] {
	if (stepId === "moreLikeWatchPages") return getWatchSeedPages()
	if (stepId === "moreLikeBookmarkPages") return getBookmarkSeedPages()
	if (stepId === "moreLikeEditedPages") return getEditedSeedPages()
	if (stepId === "moreLikeDiscussedPages") return getDiscussedSeedPages()
	if (stepId === "moreLikeInteractedPages") return getInteractedSeedPages()
	return []
}

function getMoreLikePrerequisite(stepId: QueryStepId): { stage: string; label: string } | null {
	if (stepId === "moreLikeWatchPages") return { stage: "A1.1", label: "pages I watch" }
	if (stepId === "moreLikeBookmarkPages") {
		return { stage: "A1.2", label: "pages I've bookmarked" }
	}
	if (stepId === "moreLikeEditedPages") return { stage: "A1.3", label: "pages I've edited" }
	if (stepId === "moreLikeDiscussedPages") {
		return { stage: "A1.4", label: "pages I've discussed" }
	}
	if (stepId === "moreLikeInteractedPages") {
		return { stage: "A2.1", label: "pages I've interacted with" }
	}
	return null
}

function getQuerySourceLabels(sourceStepIds: QueryStepId[]): string[] {
	return sourceStepIds.map(sourceStepId => queryDisplayLabels[sourceStepId] ?? sourceStepId)
}

function getPageSourceInfoBoxes(
	sourceStepIds?: QueryStepId[],
	fallbackSourceStepId?: QueryStepId
): string[] {
	const effectiveSourceStepIds = sourceStepIds?.length
		? sourceStepIds
		: fallbackSourceStepId
			? [fallbackSourceStepId]
			: []
	if (!effectiveSourceStepIds.length) return []
	return [`page sources: ${getQuerySourceLabels(effectiveSourceStepIds).join(", ")}`]
}

function getQueryPageInfoBoxes(page: QueryPage, fallbackSourceStepId?: QueryStepId): string[] {
	const infoBoxes = getPageSourceInfoBoxes(page.sourceStepIds, fallbackSourceStepId)
	infoBoxes.push(...getSearchQueryRankInfoBoxes(page))
	return infoBoxes
}

function getScoredPageInfoBoxes(page: ScoredPage): string[] {
	return [
		`page score: ${page.pageScore.toFixed(2)}`,
		...getPageSourceInfoBoxes(page.sourceStepIds),
		...getSearchQueryRankInfoBoxes(page),
	]
}

function getSearchQueryRankInfoBoxes(page: QueryPage): string[] {
	const entries = Object.entries(page.moreLikeRanks ?? {}) as Array<[MoreLikeQueryStepId, number]>
	if (entries.length === 0) return []
	if (entries.length === 1) {
		const [, rank] = entries[0]
		return [`search query rank: #${rank}`]
	}
	return [
		`search query ranks: ${entries
			.map(([stepId, rank]) => `${queryDisplayLabels[stepId]} #${rank}`)
			.join(", ")}`,
	]
}

function isFilteredQueryPage(pageName?: string): boolean {
	const normalizedPageName = pageName?.toLowerCase().trim() ?? ""
	return (
		normalizedPageName.startsWith("talk:") ||
		normalizedPageName.startsWith("user:") ||
		normalizedPageName.startsWith("user talk:") ||
		normalizedPageName.startsWith("wikipedia:") ||
		normalizedPageName.startsWith("wikipedia talk:") ||
		normalizedPageName.startsWith("template:") ||
		normalizedPageName.startsWith("template talk:")
	)
}

function getTalkSubjectTitle(pageName?: string): string | null {
	const rawPageName = pageName?.trim() ?? ""
	if (!rawPageName.startsWith("Talk:")) return null
	const subjectTitle = rawPageName.slice("Talk:".length).trim()
	return subjectTitle || null
}

function getRelatedChangeKey(change: {
	pageName?: string | null
	timestamp: string
	user: { name: string }
}): string {
	return `${(change.pageName ?? "").toLowerCase()}\t${change.timestamp}\t${change.user.name}`
}

function isExcludedRelatedPage(pageName?: string | null): boolean {
	const normalizedPageName = pageName?.trim() ?? ""
	return normalizedPageName.startsWith("Module:") || normalizedPageName.startsWith("Category:")
}

function getRelatedLinkTypeCounts(
	relatedSeedLinks?: RelatedSeedLink[]
): Record<LinkTypeWeightId, number> {
	const counts: Record<LinkTypeWeightId, number> = {
		both: 0,
		to: 0,
		from: 0,
	}
	for (const link of relatedSeedLinks ?? []) {
		counts[link.linkType] += 1
	}
	return counts
}

function getRecommendationScoreFromRelatedSeedLinks(
	relatedSeedLinks?: RelatedSeedLink[]
): number | undefined {
	if (!relatedSeedLinks || relatedSeedLinks.length === 0) return undefined
	let bidirectional = 0
	let outgoing = 0
	let backlink = 0
	const linkTypesBySeed = new Map<string, RelatedSeedLink["linkType"]>()
	for (const link of relatedSeedLinks) {
		const normalizedSeed = link.pageName.trim().toLowerCase()
		if (!normalizedSeed) continue
		linkTypesBySeed.set(normalizedSeed, link.linkType)
	}
	for (const linkType of linkTypesBySeed.values()) {
		if (linkType === "both") bidirectional += 1
		else if (linkType === "to") outgoing += 1
		else backlink += 1
	}
	return bidirectional * 4 + outgoing * 2 + backlink
}

function getDirectEditedPages(items: Array<{ id: number; pageName?: string }>): QueryPage[] {
	return items
		.filter((row): row is { id: number; pageName: string } => Boolean(row.pageName))
		.reduce<QueryPage[]>((pages, row) => {
			if (pages.some(page => page.title === row.pageName)) return pages
			pages.push({
				id: row.id,
				title: row.pageName,
				recommendationSourcePageNames: [],
			})
			return pages
		}, [])
}

function getDiscussedPages(items: Array<{ id: number; pageName?: string }>): QueryPage[] {
	return items
		.filter((row): row is { id: number; pageName: string } => Boolean(row.pageName))
		.reduce<QueryPage[]>((pages, row) => {
			const talkSubjectTitle = getTalkSubjectTitle(row.pageName)
			if (!talkSubjectTitle || pages.some(page => page.title === talkSubjectTitle)) {
				return pages
			}
			pages.push({
				id: -row.id,
				title: talkSubjectTitle,
				recommendationSourcePageNames: [],
			})
			return pages
		}, [])
}

function resetStepState<T>(step: StepState<T>): void {
	step.status = "running"
	step.error = null
	step.currentItem = null
	step.processedCount = 0
	step.totalCount = 0
	step.lastRequestDurationMs = null
	step.requestCount = 0
	step.durationMs = 0
	step.errorCount = 0
	step.log = []
	step.items = []
}

function saveQuerySnapshot(stepId: QueryStepId): void {
	const step = querySteps.value[stepId]
	const payload = {
		schemaVersion: 1,
		savedAt: new Date().toISOString(),
		items: step.items,
		meta: {
			requestCount: step.requestCount,
			durationMs: step.durationMs,
			errorCount: step.errorCount,
		},
	}
	localStorage.setItem(QUERY_KEYS[stepId], JSON.stringify(payload))
}

function saveSourceSnapshot(stepId: SourceStepId): void {
	const step = sourceSteps.value[stepId]
	const payload = {
		schemaVersion: 1,
		savedAt: new Date().toISOString(),
		items: step.items,
		meta: {
			requestCount: step.requestCount,
			durationMs: step.durationMs,
			errorCount: step.errorCount,
		},
	}
	localStorage.setItem(SOURCE_KEYS[stepId], JSON.stringify(payload))
}

function saveScoreSnapshot(): void {
	const payload = {
		schemaVersion: 1,
		savedAt: new Date().toISOString(),
		scoredByRevisionId: scoredByRevisionId.value,
		scoreBasedOnSourceVersion: scoreBasedOnSourceVersion.value,
	}
	localStorage.setItem(SCORE_KEY, JSON.stringify(payload))
}

function restoreSnapshots(): void {
	for (const stepId of queryStepIds) {
		const payload = parseStored<{ items?: QueryPage[]; savedAt?: string }>(QUERY_KEYS[stepId])
		if (!payload?.items) continue
		setQueryStepItems(stepId, payload.items)
		querySteps.value[stepId].status = "success"
		querySteps.value[stepId].lastSuccessAt = payload.savedAt ?? null
	}
	for (const stepId of sourceStepIds) {
		const payload = parseStored<{ items?: SourceRevision[]; savedAt?: string }>(
			SOURCE_KEYS[stepId]
		)
		if (!payload?.items) continue
		setSourceStepItems(
			stepId,
			payload.items.map(item => ({ ...item, sourceId: stepId }))
		)
		sourceSteps.value[stepId].status = "success"
		sourceSteps.value[stepId].lastSuccessAt = payload.savedAt ?? null
	}
	const scorePayload = parseStored<{
		scoredByRevisionId?: Record<number, ScoreRow>
		scoreBasedOnSourceVersion?: number
		savedAt?: string
	}>(SCORE_KEY)
	if (scorePayload?.scoredByRevisionId) {
		scoredByRevisionId.value = scorePayload.scoredByRevisionId
		scoreBasedOnSourceVersion.value = scorePayload.scoreBasedOnSourceVersion ?? 0
		scoreStatus.value.status = "success"
		scoreStatus.value.lastSuccessAt = scorePayload.savedAt ?? null
	}
}

async function runQueryStep(stepId: QueryStepId): Promise<void> {
	const step = querySteps.value[stepId]
	resetStepState(step)

	const startedAt = performance.now()
	let blockedByPrerequisite = false
	try {
		await lockApi(`query:${stepId}`, async () => {
			const targetCount = getQueryTargetCount(stepId)
			if (stepId === "pagesIEdited") {
				step.totalCount = targetCount
				step.currentItem = PAGES_IVE_EDITED_USER
				const mine = await runSerialRequest(
					"fetch edited pages",
					() =>
						wiki.getCombinedFeed({
							userNames: [PAGES_IVE_EDITED_USER],
							limit: Math.max(20, targetCount * 3),
							perSourceLimit: Math.max(20, targetCount * 3),
						}),
					message => pushQueryLog(stepId, message),
					durationMs => (step.lastRequestDurationMs = durationMs)
				)
				step.requestCount += 1
				const items = getDirectEditedPages(mine).slice(0, targetCount)
				setQueryStepItems(stepId, items)
				step.processedCount = items.length
				step.currentItem = null
				return
			}
			if (stepId === "pagesIDiscussed") {
				step.totalCount = targetCount
				step.currentItem = PAGES_IVE_EDITED_USER
				const mine = await runSerialRequest(
					"fetch discussed pages",
					() =>
						wiki.getCombinedFeed({
							userNames: [PAGES_IVE_EDITED_USER],
							limit: Math.max(20, targetCount * 3),
							perSourceLimit: Math.max(20, targetCount * 3),
						}),
					message => pushQueryLog(stepId, message),
					durationMs => (step.lastRequestDurationMs = durationMs)
				)
				step.requestCount += 1
				const items = getDiscussedPages(mine).slice(0, targetCount)
				setQueryStepItems(stepId, items)
				step.processedCount = items.length
				step.currentItem = null
				return
			}
			const seedPages = getMoreLikeSeedPages(stepId)
			const prerequisite = getMoreLikePrerequisite(stepId)
			if (seedPages.length === 0 && prerequisite) {
				blockedByPrerequisite = true
				step.error = `Run ${prerequisite.stage} first to seed ${querySteps.value[stepId].title.toLowerCase()}.`
				pushQueryLog(
					stepId,
					`No seed pages from ${prerequisite.stage} (${prerequisite.label})`
				)
				return
			}
			step.totalCount = targetCount
			step.currentItem = `querying ${seedPages.length} seed pages`
			const result = await runSerialRequest(
				queryDisplayLabels[stepId],
				() =>
					wiki.getMoreLikePages(seedPages, {
						limit: Math.max(targetCount * 3, 20),
					}),
				message => pushQueryLog(stepId, message),
				durationMs => (step.lastRequestDurationMs = durationMs)
			)
			step.requestCount += 1
			const seedKeys = new Set(seedPages.map(page => page.toLowerCase()))
			const items = result.pages
				.filter(page => !seedKeys.has(page.title.toLowerCase()))
				.slice(0, targetCount)
				.map((page, index) => ({
					id: page.pageid,
					title: page.title,
					snippet: page.snippet,
					recommendationSourcePageNames: [...seedPages],
					moreLikeRanks: { [stepId as MoreLikeQueryStepId]: index + 1 },
				}))
			setQueryStepItems(stepId, items)
			step.processedCount = items.length
			step.currentItem = null
		})
		if (blockedByPrerequisite) {
			step.status = "error"
			step.currentItem = null
			step.errorCount += 1
			return
		}
		step.durationMs = Math.round(performance.now() - startedAt)
		step.lastSuccessAt = new Date().toISOString()
		step.status = "success"
		step.currentItem = null
		saveQuerySnapshot(stepId)
	} catch (error) {
		step.status = "error"
		step.error = (error as Error).message
		step.errorCount += 1
	}
}

async function runSourceStep(stepId: SourceStepId): Promise<void> {
	const step = sourceSteps.value[stepId]
	resetStepState(step)

	const startedAt = performance.now()
	let blockedByPrerequisite = false
	try {
		await lockApi(`source:${stepId}`, async () => {
			if (stepId === "recentRisky") {
				let rccontinue: string | undefined
				const targetCount = Math.max(1, Math.floor(recentRiskyFetchLimit.value))
				step.totalCount = targetCount
				let requestCount = 0
				while (step.items.length < targetCount) {
					requestCount += 1
					step.currentItem = `request ${requestCount}`
					const remaining = targetCount - step.items.length
					const result = await runSerialRequest(
						"recent risky changes",
						() =>
							wiki.getRecentChanges({
								limit: Math.max(1, Math.min(RECENT_RISKY_PAGE_SIZE, remaining)),
								onlyNeedsReview: true,
								rccontinue,
							}),
						message => pushStepLog(stepId, message),
						durationMs => (step.lastRequestDurationMs = durationMs)
					)
					step.requestCount += 1
					rccontinue = result.rccontinue
					for (const revision of result.revisions) {
						appendSourceItem(stepId, revision)
						if (step.items.length >= targetCount) break
					}
					if (!rccontinue) break
				}
			} else if (stepId === "fromSelectedPages") {
				const selectedPages = pageSelectedPages.value.slice(
					0,
					Math.max(1, Math.floor(fromSelectedPagesFetchLimit.value))
				)
				if (selectedPages.length === 0) {
					blockedByPrerequisite = true
					step.error = "Select some pages in A5 first."
					pushStepLog(stepId, "No selected pages from A5")
					return
				}
				step.totalCount = selectedPages.length
				for (const selectedPage of selectedPages) {
					step.currentItem = selectedPage.title
					const history = await runSerialRequest(
						`latest change for selected page ${selectedPage.title}`,
						() => wiki.getPageHistory(selectedPage.title, { limit: 1 }),
						message => pushStepLog(stepId, message),
						durationMs => (step.lastRequestDurationMs = durationMs)
					)
					step.requestCount += 1
					const latest = history.revisions?.[0]
					if (latest) {
						appendSourceItem(stepId, {
							...latest,
							pageName: selectedPage.title,
							pageSourceLabels: getQuerySourceLabels(selectedPage.sourceStepIds),
							pageSourceStepIds: selectedPage.sourceStepIds,
							pageScore: selectedPage.pageScore,
							moreLikeRanks: selectedPage.moreLikeRanks,
						})
					} else {
						step.processedCount += 1
					}
				}
			} else if (stepId === "relatedToSelectedPages") {
				const selectedPages = pageSelectedPages.value
				const seedPages = selectedPages.map(page => page.title)
				if (seedPages.length === 0) {
					blockedByPrerequisite = true
					step.error = "Select some pages in A5 first."
					pushStepLog(stepId, "No selected pages from A5")
					return
				}
				const seedKeys = new Set(seedPages.map(page => page.toLowerCase()))
				const targetCount = Math.max(1, Math.floor(relatedToSelectedPagesFetchLimit.value))
				const dedupedChanges = new Map<
					string,
					{
						revision: FWRevisionWithLinkType
						relatedSeedLinks: Map<string, RelatedSeedLink>
						pageSourceLabels: Set<string>
						pageSourceStepIds: Set<QueryStepId>
						pageScore: number
						moreLikeRanks: Partial<Record<MoreLikeQueryStepId, number>>
					}
				>()
				for (const selectedPage of selectedPages) {
					const seedPage = selectedPage.title
					step.currentItem = seedPage
					const relatedChanges = await runSerialRequest(
						`related changes for ${seedPage}`,
						() =>
							wiki.getRelatedChanges(seedPage, {
								showOutgoing: true,
								showIncoming: true,
								limit: targetCount,
							}),
						message => pushStepLog(stepId, message),
						durationMs => (step.lastRequestDurationMs = durationMs)
					)
					step.requestCount += 1
					for (const change of relatedChanges.slice(0, targetCount)) {
						if (isExcludedRelatedPage(change.pageName)) continue
						const normalizedPageName = change.pageName?.trim().toLowerCase() ?? ""
						if (seedKeys.has(normalizedPageName)) continue
						const changeKey = getRelatedChangeKey(change)
						const existing = dedupedChanges.get(changeKey)
						const relatedSeedLink: RelatedSeedLink = {
							pageName: seedPage,
							linkType: change.linkType ?? "to",
						}
						if (existing) {
							existing.relatedSeedLinks.set(
								seedPage.trim().toLowerCase(),
								relatedSeedLink
							)
							for (const label of getQuerySourceLabels(selectedPage.sourceStepIds)) {
								existing.pageSourceLabels.add(label)
							}
							for (const stepId of selectedPage.sourceStepIds) {
								existing.pageSourceStepIds.add(stepId)
							}
							existing.pageScore += selectedPage.pageScore
							for (const [stepId, rank] of Object.entries(
								selectedPage.moreLikeRanks ?? {}
							) as Array<[MoreLikeQueryStepId, number]>) {
								const existingRank = existing.moreLikeRanks[stepId]
								existing.moreLikeRanks[stepId] =
									typeof existingRank === "number"
										? Math.min(existingRank, rank)
										: rank
							}
							continue
						}
						dedupedChanges.set(changeKey, {
							revision: change,
							relatedSeedLinks: new Map([
								[seedPage.trim().toLowerCase(), relatedSeedLink],
							]),
							pageSourceLabels: new Set(
								getQuerySourceLabels(selectedPage.sourceStepIds)
							),
							pageSourceStepIds: new Set(selectedPage.sourceStepIds),
							pageScore: selectedPage.pageScore,
							moreLikeRanks: { ...(selectedPage.moreLikeRanks ?? {}) },
						})
					}
				}
				const changes = [...dedupedChanges.values()].sort(
					(a, b) =>
						new Date(b.revision.timestamp).getTime() -
						new Date(a.revision.timestamp).getTime()
				)
				step.totalCount = changes.length
				for (const {
					revision,
					relatedSeedLinks,
					pageSourceLabels,
					pageSourceStepIds,
					pageScore,
					moreLikeRanks,
				} of changes) {
					appendSourceItem(stepId, {
						...revision,
						minor: false,
						size: 0,
						pageName: revision.pageName,
						recommendationSourcePageNames: [...relatedSeedLinks.values()].map(
							link => link.pageName
						),
						relatedSeedLinks: [...relatedSeedLinks.values()],
						pageSourceLabels: [...pageSourceLabels],
						pageSourceStepIds: [...pageSourceStepIds],
						pageScore,
						moreLikeRanks,
					})
				}
			}
		})
		if (blockedByPrerequisite) {
			step.status = "error"
			step.currentItem = null
			step.errorCount += 1
			return
		}
		step.durationMs = Math.round(performance.now() - startedAt)
		step.lastSuccessAt = new Date().toISOString()
		step.status = "success"
		step.currentItem = null
		saveSourceSnapshot(stepId)
		sourceVersion.value += 1
	} catch (error) {
		step.status = "error"
		step.error = (error as Error).message
		step.errorCount += 1
	}
}

async function runScore(): Promise<void> {
	scoreStatus.value.status = "running"
	scoreStatus.value.error = null
	scoreStatus.value.currentItem = null
	scoreStatus.value.processedCount = 0
	scoreStatus.value.totalCount = filteredRevisions.value.length
	scoreStatus.value.lastRequestDurationMs = null
	scoreStatus.value.log = []

	try {
		await lockApi("enrich", async () => {
			for (const revision of filteredRevisions.value) {
				scoreStatus.value.currentItem = `${revision.pageName || "(no page)"} #${revision.id}`
				const current = scoredByRevisionId.value[revision.id] ?? {}
				const next: ScoreRow = { ...current }

				if (next.revertRisk === undefined) {
					const predictions = await runSerialRequest(
						`revert risk for ${revision.id}`,
						() => wiki.getRevisionPredictions([revision.id], ["revertrisk"]),
						pushScoreLog,
						durationMs => (scoreStatus.value.lastRequestDurationMs = durationMs)
					)
					next.revertRisk =
						predictions[revision.id]?.revertrisk?.probability?.true ?? null
					pushScoreLog(`revert risk fetched for ${revision.id}`)
				} else {
					pushScoreLog(`revert risk skipped for ${revision.id}`)
				}

				if (next.toneProbability === undefined && revision.pageName) {
					const tone = await runSerialRequest(
						`tone check for ${revision.id}`,
						() => wiki.getToneCheckForRevision(revision.pageName || "", revision.id),
						pushScoreLog,
						durationMs => (scoreStatus.value.lastRequestDurationMs = durationMs)
					)
					next.toneProbability = tone?.probability ?? null
					next.tonePrediction = tone?.prediction ?? null
					if (typeof next.toneProbability === "number") {
						next.toneProbability = next.tonePrediction
							? Math.abs(next.toneProbability)
							: -Math.abs(next.toneProbability)
					}
					pushScoreLog(`tone check fetched for ${revision.id}`)
				} else {
					pushScoreLog(`tone check skipped for ${revision.id}`)
				}

				if (next.referenceNeedDelta === undefined && revision.pageName) {
					const after = await runSerialRequest(
						`reference need after for ${revision.id}`,
						() => wiki.getReferenceNeedPrediction(revision.id),
						pushScoreLog,
						durationMs => (scoreStatus.value.lastRequestDurationMs = durationMs)
					)
					const parentId = await runSerialRequest(
						`parent revision for ${revision.id}`,
						() => wiki.getParentRevisionId(revision.pageName || "", revision.id),
						pushScoreLog,
						durationMs => (scoreStatus.value.lastRequestDurationMs = durationMs)
					)
					let beforeScore = 0
					if (parentId) {
						const before = await runSerialRequest(
							`reference need before for ${revision.id}`,
							() => wiki.getReferenceNeedPrediction(parentId),
							pushScoreLog,
							durationMs => (scoreStatus.value.lastRequestDurationMs = durationMs)
						)
						beforeScore = before?.rn_score ?? 0
					}
					next.referenceNeedAfter = after?.rn_score ?? null
					next.referenceNeedBefore = beforeScore
					next.referenceNeedDelta =
						next.referenceNeedAfter == null
							? null
							: next.referenceNeedAfter - beforeScore
					pushScoreLog(`reference need delta fetched for ${revision.id}`)
				} else {
					pushScoreLog(`reference need skipped for ${revision.id}`)
				}

				scoredByRevisionId.value = {
					...scoredByRevisionId.value,
					[revision.id]: next,
				}
				scoreStatus.value.processedCount += 1
			}
		})
		scoreStatus.value.status = "success"
		scoreStatus.value.currentItem = null
		scoreStatus.value.lastSuccessAt = new Date().toISOString()
		scoreBasedOnSourceVersion.value = sourceVersion.value
		saveScoreSnapshot()
	} catch (error) {
		scoreStatus.value.status = "error"
		scoreStatus.value.error = (error as Error).message
	}
}

onMounted(() => {
	restorePrioritizeWeights()
	restorePageScoreWeights()
	restorePagePositionWeights()
	restorePageSelectConfig()
	restoreSourceFetchCounts()
	restoreQuotaTargets()
	restoreSelectConfig()
	restoreSnapshots()
	pushScoreLog(`serial API delay: ${API_BASE_DELAY_MS}ms`)
})
</script>

<style scoped>
@import "./style.css";
</style>
