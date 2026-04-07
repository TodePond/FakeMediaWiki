<template>
	<main class="recent-change-sources">
		<header class="prototype-header">
			<h1>Recent change sources</h1>
			<p v-if="apiBusyBy" class="api-busy">API busy: {{ apiBusyBy }}</p>
		</header>

		<section class="stage">
			<div class="stage__header">
				<h2>1. Source</h2>
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
					<span>Watchlist latest items: {{ watchlistFetchLimit }}</span>
					<input
						v-model.number="watchlistFetchLimit"
						type="range"
						min="1"
						max="12"
						step="1"
					/>
				</label>
				<label class="source-control">
					<span>Pages I edited items: {{ pagesIEditedFetchLimit }}</span>
					<input
						v-model.number="pagesIEditedFetchLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="source-control">
					<span>Related changes items: {{ relatedChangesFetchLimit }}</span>
					<input
						v-model.number="relatedChangesFetchLimit"
						type="range"
						min="1"
						max="20"
						step="1"
					/>
				</label>
				<label class="source-control">
					<span>Related to edits items: {{ relatedToEditsFetchLimit }}</span>
					<input
						v-model.number="relatedToEditsFetchLimit"
						type="range"
						min="1"
						max="20"
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
				<h2>2. Combine</h2>
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
				<h2>3. Filter</h2>
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
				<h2>4. Enrich</h2>
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
				<h2>5. Prioritize</h2>
			</div>
			<div class="prioritize-controls">
				<label class="prioritize-control">
					<span>Source count weight: {{ sourceCountWeight.toFixed(2) }}</span>
					<input
						v-model.number="sourceCountWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
				<label class="prioritize-control">
					<span
						>Recommendation score weight:
						{{ recommendationScoreWeight.toFixed(2) }}</span
					>
					<input
						v-model.number="recommendationScoreWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
				<label class="prioritize-control">
					<span>Revert risk weight: {{ revertRiskWeight.toFixed(2) }}</span>
					<input
						v-model.number="revertRiskWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
				<label class="prioritize-control">
					<span>Tone probability weight: {{ toneProbabilityWeight.toFixed(2) }}</span>
					<input
						v-model.number="toneProbabilityWeight"
						type="range"
						min="-5"
						max="5"
						step="0.05"
					/>
				</label>
				<label class="prioritize-control">
					<span>Reference delta weight: {{ referenceDeltaWeight.toFixed(2) }}</span>
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
				<h2>6. Select</h2>
			</div>
			<div class="select-controls">
				<label class="select-control">
					<span>Selected items: {{ selectCount }}</span>
					<input v-model.number="selectCount" type="range" min="0" max="20" step="1" />
				</label>
				<div class="select-control">
					<span>Select from sources:</span>
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
				<h2>7. Fill quotas</h2>
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
					<span>Watchlist latest quota: {{ watchlistQuotaTarget }}</span>
					<input
						v-model.number="watchlistQuotaTarget"
						type="range"
						min="0"
						max="8"
						step="1"
					/>
				</label>
				<label class="quota-control">
					<span>Pages I edited quota: {{ pagesIEditedQuotaTarget }}</span>
					<input
						v-model.number="pagesIEditedQuotaTarget"
						type="range"
						min="0"
						max="8"
						step="1"
					/>
				</label>
				<label class="quota-control">
					<span>Related changes quota: {{ relatedChangesQuotaTarget }}</span>
					<input
						v-model.number="relatedChangesQuotaTarget"
						type="range"
						min="0"
						max="8"
						step="1"
					/>
				</label>
				<label class="quota-control">
					<span>Related to edits quota: {{ relatedToEditsQuotaTarget }}</span>
					<input
						v-model.number="relatedToEditsQuotaTarget"
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
				<h2>8. Order</h2>
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
import { FakeWiki, type FWCachedRevision } from "fakewiki"
import { computed, onMounted, ref, watch } from "vue"
import RecentChangeFeed from "./components/RecentChangeFeed.vue"
import { API_BASE_DELAY_MS, runSerialRequest } from "./rateLimit"

type StageStatus = "idle" | "running" | "success" | "error"
type SourceStepId =
	| "recentRisky"
	| "watchlistLatest"
	| "pagesIEditedByOthers"
	| "relatedChanges"
	| "relatedToEdits"

type SourceRevision = FWCachedRevision & {
	sourceId: SourceStepId
	recommendationScore?: number
	recommendationSourcePageNames?: string[]
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

type SourceStepState = {
	title: string
	status: StageStatus
	items: SourceRevision[]
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

const wiki = new FakeWiki()
const apiBusyBy = ref<string | null>(null)
const sourceVersion = ref(0)
const scoreBasedOnSourceVersion = ref(0)
const sourceCountWeight = ref(0.9)
const recommendationScoreWeight = ref(0.2)
const revertRiskWeight = ref(1)
const toneProbabilityWeight = ref(0.65)
const referenceDeltaWeight = ref(0.6)
const recentRiskyFetchLimit = ref(16)
const watchlistFetchLimit = ref(6)
const pagesIEditedFetchLimit = ref(8)
const relatedChangesFetchLimit = ref(8)
const relatedToEditsFetchLimit = ref(8)
const selectSourcesEnabled = ref<Record<SourceStepId, boolean>>({
	recentRisky: true,
	watchlistLatest: true,
	pagesIEditedByOthers: true,
	relatedChanges: true,
	relatedToEdits: true,
})
const sourceDisplayLabels: Record<SourceStepId, string> = {
	recentRisky: "recent risky",
	watchlistLatest: "watchlist latest",
	pagesIEditedByOthers: "pages I edited",
	relatedChanges: "related changes",
	relatedToEdits: "related to edits",
}
const recentRiskyQuotaTarget = ref(1)
const watchlistQuotaTarget = ref(1)
const pagesIEditedQuotaTarget = ref(1)
const relatedChangesQuotaTarget = ref(1)
const relatedToEditsQuotaTarget = ref(1)

const WATCHLIST_PAGES = [
	"Confidence Man (band)",
	"Algorave",
	"Little Mix",
	"Gorillaz",
	"Jade Thirlwall",
	"Wet Leg",
]
const PAGES_IVE_EDITED_USER = "Todepond"
const selectCount = ref(4)
const RECENT_RISKY_PAGE_SIZE = 10

const STORAGE_PREFIX = "prototype.recent-change-sources.v1"
const SOURCE_KEYS: Record<SourceStepId, string> = {
	recentRisky: `${STORAGE_PREFIX}.source.recentRisky`,
	watchlistLatest: `${STORAGE_PREFIX}.source.watchlistLatest`,
	pagesIEditedByOthers: `${STORAGE_PREFIX}.source.pagesIEditedByOthers`,
	relatedChanges: `${STORAGE_PREFIX}.source.relatedChanges`,
	relatedToEdits: `${STORAGE_PREFIX}.source.relatedToEdits`,
}
const SCORE_KEY = `${STORAGE_PREFIX}.score`
const PRIORITY_WEIGHTS_KEY = `${STORAGE_PREFIX}.priorityWeights`
const SOURCE_FETCH_COUNTS_KEY = `${STORAGE_PREFIX}.sourceFetchCounts`
const QUOTA_TARGETS_KEY = `${STORAGE_PREFIX}.quotaTargets`
const SELECT_CONFIG_KEY = `${STORAGE_PREFIX}.selectConfig`

function createSourceStepState(title: string): SourceStepState {
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

const sourceSteps = ref<Record<SourceStepId, SourceStepState>>({
	recentRisky: createSourceStepState("1.1 Risky changes"),
	watchlistLatest: createSourceStepState("1.2 Watchlist latest"),
	pagesIEditedByOthers: createSourceStepState("1.3 Pages I edited"),
	relatedChanges: createSourceStepState("1.4 Related changes"),
	relatedToEdits: createSourceStepState("1.5 Related to edits"),
})

const sourceStepIds: SourceStepId[] = [
	"recentRisky",
	"watchlistLatest",
	"pagesIEditedByOthers",
	"relatedChanges",
	"relatedToEdits",
]

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
		byId.set(revision.id, {
			...existing,
			...revision,
			sourceIds: [...sourceIds],
			recommendationSourcePageNames: [
				...(existing.recommendationSourcePageNames ?? []),
				...(revision.recommendationSourcePageNames ?? []),
			],
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
		let normalizedTone = score.toneProbability
		if (score.tonePrediction === false && typeof score.toneProbability === "number") {
			// Backward compatibility for older cached snapshots where "no issue" was stored positive.
			normalizedTone = -Math.abs(score.toneProbability)
		}
		const normalizedReference =
			typeof score.referenceNeedBefore === "number" &&
			typeof score.referenceNeedAfter === "number"
				? score.referenceNeedBefore - score.referenceNeedAfter
				: score.referenceNeedDelta
		return {
			...revision,
			...score,
			toneProbability: normalizedTone,
			referenceNeedDelta: normalizedReference,
		}
	})
})

const prioritizedRows = computed(() => {
	return [...scoredRows.value]
		.map(revision => {
			const sourceWeight = revision.sourceIds.length * sourceCountWeight.value
			const recommendationWeight = revision.recommendationScore
				? revision.recommendationScore * recommendationScoreWeight.value
				: 0
			const revertWeight = (revision.revertRisk ?? 0) * revertRiskWeight.value
			const toneWeight = (revision.toneProbability ?? 0) * toneProbabilityWeight.value
			const referenceWeight = (revision.referenceNeedDelta ?? 0) * referenceDeltaWeight.value
			return {
				...revision,
				priorityScore:
					sourceWeight +
					recommendationWeight +
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
	if (sourceId === "watchlistLatest") return Math.max(0, Math.floor(watchlistQuotaTarget.value))
	if (sourceId === "pagesIEditedByOthers")
		return Math.max(0, Math.floor(pagesIEditedQuotaTarget.value))
	if (sourceId === "relatedChanges")
		return Math.max(0, Math.floor(relatedChangesQuotaTarget.value))
	return Math.max(0, Math.floor(relatedToEditsQuotaTarget.value))
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

function resetPrioritizeSliders(): void {
	sourceCountWeight.value = 0.9
	recommendationScoreWeight.value = 0.2
	revertRiskWeight.value = 1
	toneProbabilityWeight.value = 0.65
	referenceDeltaWeight.value = 0.6
}

function setAllPrioritizeWeightsToZero(): void {
	sourceCountWeight.value = 0
	recommendationScoreWeight.value = 0
	revertRiskWeight.value = 0
	toneProbabilityWeight.value = 0
	referenceDeltaWeight.value = 0
}

function resetQuotaTargets(): void {
	recentRiskyQuotaTarget.value = 1
	watchlistQuotaTarget.value = 1
	pagesIEditedQuotaTarget.value = 1
	relatedChangesQuotaTarget.value = 1
	relatedToEditsQuotaTarget.value = 1
}

function setAllQuotaTargetsToZero(): void {
	recentRiskyQuotaTarget.value = 0
	watchlistQuotaTarget.value = 0
	pagesIEditedQuotaTarget.value = 0
	relatedChangesQuotaTarget.value = 0
	relatedToEditsQuotaTarget.value = 0
}

function savePrioritizeWeights(): void {
	const payload = {
		sourceCountWeight: sourceCountWeight.value,
		recommendationScoreWeight: recommendationScoreWeight.value,
		revertRiskWeight: revertRiskWeight.value,
		toneProbabilityWeight: toneProbabilityWeight.value,
		referenceDeltaWeight: referenceDeltaWeight.value,
	}
	localStorage.setItem(PRIORITY_WEIGHTS_KEY, JSON.stringify(payload))
}

function restorePrioritizeWeights(): void {
	const payload = parseStored<{
		sourceCountWeight?: number
		recommendationScoreWeight?: number
		revertRiskWeight?: number
		toneProbabilityWeight?: number
		referenceDeltaWeight?: number
	}>(PRIORITY_WEIGHTS_KEY)
	if (!payload) return
	if (typeof payload.sourceCountWeight === "number") {
		sourceCountWeight.value = payload.sourceCountWeight
	}
	if (typeof payload.recommendationScoreWeight === "number") {
		recommendationScoreWeight.value = payload.recommendationScoreWeight
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

function saveSourceFetchCounts(): void {
	const payload = {
		recentRiskyFetchLimit: recentRiskyFetchLimit.value,
		watchlistFetchLimit: watchlistFetchLimit.value,
		pagesIEditedFetchLimit: pagesIEditedFetchLimit.value,
		relatedChangesFetchLimit: relatedChangesFetchLimit.value,
		relatedToEditsFetchLimit: relatedToEditsFetchLimit.value,
	}
	localStorage.setItem(SOURCE_FETCH_COUNTS_KEY, JSON.stringify(payload))
}

function restoreSourceFetchCounts(): void {
	const payload = parseStored<{
		recentRiskyFetchLimit?: number
		watchlistFetchLimit?: number
		pagesIEditedFetchLimit?: number
		relatedChangesFetchLimit?: number
		relatedToEditsFetchLimit?: number
	}>(SOURCE_FETCH_COUNTS_KEY)
	if (!payload) return
	if (typeof payload.recentRiskyFetchLimit === "number") {
		recentRiskyFetchLimit.value = payload.recentRiskyFetchLimit
	}
	if (typeof payload.watchlistFetchLimit === "number") {
		watchlistFetchLimit.value = payload.watchlistFetchLimit
	}
	if (typeof payload.pagesIEditedFetchLimit === "number") {
		pagesIEditedFetchLimit.value = payload.pagesIEditedFetchLimit
	}
	if (typeof payload.relatedChangesFetchLimit === "number") {
		relatedChangesFetchLimit.value = payload.relatedChangesFetchLimit
	}
	if (typeof payload.relatedToEditsFetchLimit === "number") {
		relatedToEditsFetchLimit.value = payload.relatedToEditsFetchLimit
	}
}

function saveQuotaTargets(): void {
	const payload = {
		recentRiskyQuotaTarget: recentRiskyQuotaTarget.value,
		watchlistQuotaTarget: watchlistQuotaTarget.value,
		pagesIEditedQuotaTarget: pagesIEditedQuotaTarget.value,
		relatedChangesQuotaTarget: relatedChangesQuotaTarget.value,
		relatedToEditsQuotaTarget: relatedToEditsQuotaTarget.value,
	}
	localStorage.setItem(QUOTA_TARGETS_KEY, JSON.stringify(payload))
}

function restoreQuotaTargets(): void {
	const payload = parseStored<{
		recentRiskyQuotaTarget?: number
		watchlistQuotaTarget?: number
		pagesIEditedQuotaTarget?: number
		relatedChangesQuotaTarget?: number
		relatedToEditsQuotaTarget?: number
	}>(QUOTA_TARGETS_KEY)
	if (!payload) return
	if (typeof payload.recentRiskyQuotaTarget === "number") {
		recentRiskyQuotaTarget.value = payload.recentRiskyQuotaTarget
	}
	if (typeof payload.watchlistQuotaTarget === "number") {
		watchlistQuotaTarget.value = payload.watchlistQuotaTarget
	}
	if (typeof payload.pagesIEditedQuotaTarget === "number") {
		pagesIEditedQuotaTarget.value = payload.pagesIEditedQuotaTarget
	}
	if (typeof payload.relatedChangesQuotaTarget === "number") {
		relatedChangesQuotaTarget.value = payload.relatedChangesQuotaTarget
	}
	if (typeof payload.relatedToEditsQuotaTarget === "number") {
		relatedToEditsQuotaTarget.value = payload.relatedToEditsQuotaTarget
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
		sourceCountWeight,
		recommendationScoreWeight,
		revertRiskWeight,
		toneProbabilityWeight,
		referenceDeltaWeight,
	],
	() => {
		savePrioritizeWeights()
	}
)

watch(
	[
		recentRiskyFetchLimit,
		watchlistFetchLimit,
		pagesIEditedFetchLimit,
		relatedChangesFetchLimit,
		relatedToEditsFetchLimit,
	],
	() => {
		saveSourceFetchCounts()
	}
)

watch(
	[
		recentRiskyQuotaTarget,
		watchlistQuotaTarget,
		pagesIEditedQuotaTarget,
		relatedChangesQuotaTarget,
		relatedToEditsQuotaTarget,
	],
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

function appendSourceItem(stepId: SourceStepId, item: Omit<SourceRevision, "sourceId">): void {
	const step = sourceSteps.value[stepId]
	step.items = [...step.items, { ...item, sourceId: stepId }]
	step.processedCount += 1
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

async function runSourceStep(stepId: SourceStepId): Promise<void> {
	const step = sourceSteps.value[stepId]
	step.status = "running"
	step.error = null
	step.currentItem = null
	step.processedCount = 0
	step.totalCount = 0
	step.lastRequestDurationMs = null
	step.requestCount = 0
	step.durationMs = 0
	step.errorCount = 0
	setSourceStepItems(stepId, [])

	const startedAt = performance.now()
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
			} else if (stepId === "watchlistLatest") {
				const selectedPages = WATCHLIST_PAGES.slice(
					0,
					Math.max(1, Math.floor(watchlistFetchLimit.value))
				)
				step.totalCount = selectedPages.length
				for (const pageName of selectedPages) {
					step.currentItem = pageName
					const history = await runSerialRequest(
						`watchlist latest for ${pageName}`,
						() => wiki.getPageHistory(pageName, { limit: 1 }),
						message => pushStepLog(stepId, message),
						durationMs => (step.lastRequestDurationMs = durationMs)
					)
					step.requestCount += 1
					const latest = history.revisions?.[0]
					if (latest) appendSourceItem(stepId, { ...latest, pageName })
					else step.processedCount += 1
				}
			} else if (stepId === "pagesIEditedByOthers") {
				const mine = await runSerialRequest(
					"fetch user feed",
					() =>
						wiki.getCombinedFeed({
							userNames: [PAGES_IVE_EDITED_USER],
							limit: 20,
							perSourceLimit: 20,
						}),
					message => pushStepLog(stepId, message),
					durationMs => (step.lastRequestDurationMs = durationMs)
				)
				step.requestCount += 1
				const pageQueue = [
					...new Set(
						mine
							.map(row => row.pageName)
							.filter((name): name is string => Boolean(name))
					),
				].slice(0, Math.max(1, Math.floor(pagesIEditedFetchLimit.value)))
				step.totalCount = pageQueue.length
				for (const pageName of pageQueue) {
					step.currentItem = pageName
					const history = await runSerialRequest(
						`latest revision for ${pageName}`,
						() => wiki.getPageHistory(pageName, { limit: 1 }),
						message => pushStepLog(stepId, message),
						durationMs => (step.lastRequestDurationMs = durationMs)
					)
					step.requestCount += 1
					const latest = history.revisions?.[0]
					const latestUser = latest?.user.name?.toLowerCase() ?? ""
					if (latest && latestUser !== PAGES_IVE_EDITED_USER.toLowerCase()) {
						appendSourceItem(stepId, { ...latest, pageName })
					} else {
						step.processedCount += 1
					}
				}
			} else if (stepId === "relatedChanges") {
				const related = await runSerialRequest(
					"related page recommendations",
					() => wiki.getTopRelatedPages(WATCHLIST_PAGES, { percentage: 100, limit: 30 }),
					message => pushStepLog(stepId, message),
					durationMs => (step.lastRequestDurationMs = durationMs)
				)
				step.requestCount += 1
				const watchlistKeys = new Set(WATCHLIST_PAGES.map(page => page.toLowerCase()))
				const candidates = related.pages
					.filter(row => !watchlistKeys.has(row.title.toLowerCase()))
					.slice(0, Math.max(1, Math.floor(relatedChangesFetchLimit.value)))
				step.totalCount = candidates.length
				for (const candidate of candidates) {
					step.currentItem = candidate.title
					const history = await runSerialRequest(
						`latest related change for ${candidate.title}`,
						() => wiki.getPageHistory(candidate.title, { limit: 1 }),
						message => pushStepLog(stepId, message),
						durationMs => (step.lastRequestDurationMs = durationMs)
					)
					step.requestCount += 1
					const latest = history.revisions?.[0]
					if (latest) {
						appendSourceItem(stepId, {
							...latest,
							pageName: candidate.title,
							recommendationScore: candidate.score,
							recommendationSourcePageNames: related.changes.find(
								change => change.pageName === candidate.title
							)?.sourcePageNames,
						})
					} else {
						step.processedCount += 1
					}
				}
			} else if (stepId === "relatedToEdits") {
				const seedPages = [
					...new Set(
						sourceSteps.value.pagesIEditedByOthers.items
							.map(item => item.pageName)
							.filter((name): name is string => Boolean(name))
					),
				]
				if (seedPages.length === 0) {
					step.error = "Run 1.3 first to seed related-to-edits pages."
					pushStepLog(stepId, "No seed pages from 1.3")
					return
				}
				const related = await runSerialRequest(
					"related pages for edited pages",
					() =>
						wiki.getTopRelatedPages(seedPages, {
							percentage: 100,
							limit: Math.max(30, relatedToEditsFetchLimit.value * 4),
						}),
					message => pushStepLog(stepId, message),
					durationMs => (step.lastRequestDurationMs = durationMs)
				)
				step.requestCount += 1
				const seedKeys = new Set(seedPages.map(page => page.toLowerCase()))
				const candidates = related.pages
					.filter(row => !seedKeys.has(row.title.toLowerCase()))
					.slice(0, Math.max(1, Math.floor(relatedToEditsFetchLimit.value)))
				step.totalCount = candidates.length
				for (const candidate of candidates) {
					step.currentItem = candidate.title
					const history = await runSerialRequest(
						`latest related-to-edits change for ${candidate.title}`,
						() => wiki.getPageHistory(candidate.title, { limit: 1 }),
						message => pushStepLog(stepId, message),
						durationMs => (step.lastRequestDurationMs = durationMs)
					)
					step.requestCount += 1
					const latest = history.revisions?.[0]
					if (latest) {
						appendSourceItem(stepId, {
							...latest,
							pageName: candidate.title,
							recommendationScore: candidate.score,
							recommendationSourcePageNames: related.changes.find(
								change => change.pageName === candidate.title
							)?.sourcePageNames,
						})
					} else {
						step.processedCount += 1
					}
				}
			}
		})
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
							: beforeScore - next.referenceNeedAfter
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
