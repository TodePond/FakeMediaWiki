<template>
	<section class="list-building-view multiple-list-building-view">
		<h1 style="width: 100%">Multiple list building</h1>
		<form @submit.prevent="buildList">
			<div class="form-row">
				<CdxLabel input-id="multiple-list-building-lang">Language code</CdxLabel>
				<CdxTextInput
					id="multiple-list-building-lang"
					v-model="lang"
					placeholder="en"
					autocomplete="off"
				/>
			</div>
			<div class="form-row">
				<CdxLabel input-id="multiple-list-building-titles"
					>Page titles (comma-separated)</CdxLabel
				>
				<CdxTextInput
					id="multiple-list-building-titles"
					v-model="pageTitlesInput"
					autocomplete="off"
				/>
			</div>
			<div class="form-row form-row-weight">
				<CdxLabel input-id="weight-lists">List count weight</CdxLabel>
				<CdxTextInput
					id="weight-lists"
					v-model.number="weightLists"
					input-type="number"
					class="weight-input"
					autocomplete="off"
				/>
				<CdxLabel input-id="weight-position">Position weight</CdxLabel>
				<CdxTextInput
					id="weight-position"
					v-model.number="weightPosition"
					input-type="number"
					class="weight-input"
					autocomplete="off"
				/>
			</div>
			<span class="form-actions">
				<CdxButton>Build list</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading" />
				<span v-if="isLoading && totalToLoad > 0" class="load-progress"
					>({{ loadedCount }}/{{ totalToLoad }})</span
				>
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div
			v-else-if="
				scoredBySource.links.length > 0 ||
				scoredBySource.morelike.length > 0 ||
				scoredBySource.reader.length > 0
			"
			class="three-columns"
		>
			<div class="column">
				<h3 class="column-title">Content</h3>
				<div
					v-if="scoredBySource.links.length === 0 && !isLoading"
					class="no-results no-results-at-top"
				>
					No results.
				</div>
				<div class="results-list">
					<ResultRow
						v-for="(entry, index) in scoredBySource.links"
						:key="`links-${entry.item.qid || entry.item.page_title}-${index}`"
						:item="entry.item"
						:lang="lang"
						:thumbnail="thumbnails[entry.item.page_title]"
						:list-page-titles="entry.pageTitles"
					/>
				</div>
			</div>
			<div class="column">
				<h3 class="column-title">Morelike</h3>
				<div
					v-if="scoredBySource.morelike.length === 0 && !isLoading"
					class="no-results no-results-at-top"
				>
					No results.
				</div>
				<div class="results-list">
					<ResultRow
						v-for="(entry, index) in scoredBySource.morelike"
						:key="`morelike-${entry.item.qid || entry.item.page_title}-${index}`"
						:item="entry.item"
						:lang="lang"
						:thumbnail="thumbnails[entry.item.page_title]"
						:list-page-titles="entry.pageTitles"
					/>
				</div>
			</div>
			<div class="column">
				<h3 class="column-title">Readers</h3>
				<div
					v-if="scoredBySource.reader.length === 0 && !isLoading"
					class="no-results no-results-at-top"
				>
					No results.
				</div>
				<div class="results-list">
					<ResultRow
						v-for="(entry, index) in scoredBySource.reader"
						:key="`reader-${entry.item.qid || entry.item.page_title}-${index}`"
						:item="entry.item"
						:lang="lang"
						:thumbnail="thumbnails[entry.item.page_title]"
						:list-page-titles="entry.pageTitles"
					/>
				</div>
			</div>
		</div>
		<div v-else-if="!isLoading && hasSearched" class="no-results">No results.</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import type { FWListBuildingResult } from "fakewiki/types"
import { computed, onMounted, ref, watch } from "vue"
import ResultRow from "../ListBuilding/ResultRow.vue"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "MultipleListBuilding"

const QUERY_STORAGE_KEY = "multipleListBuildingQuery"
const WEIGHTS_STORAGE_KEY = "multipleListBuildingWeights"
const DEFAULT_QUERY =
	"Wet Leg, Wolf Alice, Jade Thirlwall, Confidence Man (band), PinkPantheress, Rizzle Kicks"

const DEFAULT_WEIGHT_LISTS = 1
const DEFAULT_WEIGHT_POSITION = 1

function loadWeights(): { weightLists: number; weightPosition: number } {
	try {
		const raw = localStorage.getItem(WEIGHTS_STORAGE_KEY)
		if (raw) {
			const parsed = JSON.parse(raw) as { weightLists?: number; weightPosition?: number }
			return {
				weightLists: Number(parsed.weightLists) || DEFAULT_WEIGHT_LISTS,
				weightPosition: Number(parsed.weightPosition) || DEFAULT_WEIGHT_POSITION,
			}
		}
	} catch {
		// ignore
	}
	return { weightLists: DEFAULT_WEIGHT_LISTS, weightPosition: DEFAULT_WEIGHT_POSITION }
}

const langKey = wiki.getStorageKey(PROTOTYPE_NAME, "lang")
const lang = ref(localStorage.getItem(langKey) || "en")
const pageTitlesInput = ref(localStorage.getItem(QUERY_STORAGE_KEY) || DEFAULT_QUERY)
const weights = loadWeights()
const weightLists = ref(weights.weightLists)
const weightPosition = ref(weights.weightPosition)

watch([weightLists, weightPosition], () => {
	try {
		localStorage.setItem(
			WEIGHTS_STORAGE_KEY,
			JSON.stringify({
				weightLists: weightLists.value,
				weightPosition: weightPosition.value,
			})
		)
	} catch {
		// ignore
	}
})

type ScoredEntry = {
	item: FWListBuildingResult
	listCount: number
	positionScore: number
	score: number
	pageTitles: string[]
}

const aggregated = ref<Map<string, ScoredEntry>>(new Map())
const isLoading = ref(false)
const loadedCount = ref(0)
const totalToLoad = ref(0)
const error = ref<string | null>(null)
const hasSearched = ref(false)
const thumbnails = ref<Record<string, string>>({})

const scoredBySource = computed(() => {
	const wLists = Math.max(0, Number(weightLists.value) || 0)
	const wPos = Math.max(0, Number(weightPosition.value) || 0)
	const entries = Array.from(aggregated.value.values()).map(e => ({
		...e,
		score: wLists * e.listCount + wPos * e.positionScore,
	}))
	entries.sort((a, b) => b.score - a.score)

	const bySource: { links: ScoredEntry[]; morelike: ScoredEntry[]; reader: ScoredEntry[] } = {
		links: [],
		morelike: [],
		reader: [],
	}
	for (const e of entries) {
		const source = e.item.source
		if (source === "links") bySource.links.push(e)
		else if (source === "morelike") bySource.morelike.push(e)
		else if (source === "reader") bySource.reader.push(e)
	}
	return bySource
})

function itemKey(item: FWListBuildingResult): string {
	return item.qid || item.page_title || ""
}

/** Merge one page's list-building response into the shared map and update reactive state. */
function mergeResponseIntoMap(
	map: Map<string, ScoredEntry>,
	seedPageTitle: string,
	data: { results?: FWListBuildingResult[] }
): void {
	const results = data.results ?? []
	const bySource: Record<string, FWListBuildingResult[]> = {
		links: [],
		morelike: [],
		reader: [],
	}
	for (const r of results) {
		if (!bySource[r.source]) bySource[r.source] = []
		bySource[r.source].push(r)
	}
	for (const [source, list] of Object.entries(bySource)) {
		list.forEach((item, i) => {
			const rank = i + 1
			const positionContrib = 1 / rank
			const key = `${source}:${itemKey(item)}`
			const existing = map.get(key)
			if (existing) {
				existing.listCount += 1
				existing.positionScore += positionContrib
				existing.pageTitles.push(seedPageTitle)
			} else {
				map.set(key, {
					item,
					listCount: 1,
					positionScore: positionContrib,
					score: 0,
					pageTitles: [seedPageTitle],
				})
			}
		})
	}
}

/** Run at most `concurrency` requests at a time; merge each response into `map` and update `aggregated` and `loadedCount` as each completes. */
async function loadAndMergeProgressively(
	pageTitles: string[],
	concurrency: number,
	map: Map<string, ScoredEntry>
): Promise<void> {
	let nextIndex = 0
	let completedCount = 0
	async function worker(): Promise<void> {
		while (nextIndex < pageTitles.length) {
			const index = nextIndex++
			const title = pageTitles[index]
			const data = await wiki.getListBuilding(lang.value, { pageTitle: title, k: 10 })
			mergeResponseIntoMap(map, title, data)
			completedCount += 1
			loadedCount.value = completedCount
			aggregated.value = new Map(map)
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(concurrency, pageTitles.length) }, () => worker())
	)
}

async function buildList(): Promise<void> {
	const raw = pageTitlesInput.value
		.trim()
		.split(/\s*,\s*/)
		.map(t => t.trim())
		.filter(Boolean)
	const pageTitles = [...new Set(raw)]

	if (pageTitles.length === 0) {
		error.value = "Enter at least one page title."
		aggregated.value = new Map()
		hasSearched.value = true
		return
	}

	isLoading.value = true
	error.value = null
	hasSearched.value = true

	try {
		localStorage.setItem(langKey, lang.value)
		localStorage.setItem(QUERY_STORAGE_KEY, pageTitlesInput.value)

		totalToLoad.value = pageTitles.length
		loadedCount.value = 0
		const map = new Map<string, ScoredEntry>()
		aggregated.value = map

		// Merge each response as it arrives so the list updates progressively (concurrency 2 to avoid overwhelming the API)
		await loadAndMergeProgressively(pageTitles, 2, map)

		const titles = [
			...new Set(
				Array.from(map.values())
					.filter(e => !e.item.redlink && e.item.page_title !== "-")
					.map(e => e.item.page_title.trim())
					.filter(Boolean)
			),
		]
		wiki.getPageThumbnails(titles, `https://${lang.value}.wikipedia.org/`)
			.then(t => {
				thumbnails.value = t
			})
			.catch(() => {
				// Non-blocking: list already shown; thumbnails stay empty/placeholder
			})
	} catch (err) {
		error.value = (err as Error).message
		aggregated.value = new Map()
	} finally {
		isLoading.value = false
	}
}

onMounted(buildList)
</script>

<style scoped>
@import "./style.css";
</style>
