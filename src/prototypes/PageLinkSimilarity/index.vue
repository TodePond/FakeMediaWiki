<template>
	<section class="page-link-similarity-view">
		<h1>Page link similarity</h1>
		<form @submit.prevent="load">
			<CdxLabel input-id="page-names">Page names (comma-separated)</CdxLabel>
			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="pageNamesInput"
					input-type="search"
					id="page-names"
				/>
				<span style="display: flex; gap: 0.5rem; flex-wrap: wrap">
					<CdxButton>Load links</CdxButton>
					<CdxButton type="button" action="default" @click.prevent="toggleGraphVisible">
						{{ showGraph ? "Hide graph" : "Show graph" }}
					</CdxButton>
					<CdxProgressIndicator v-if="isLoading" aria-label="Loading" />
				</span>
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-else class="content-with-graph">
			<div
				v-if="graphData && graphData.nodes.length > 0"
				v-show="showGraph"
				class="link-graph-block"
			>
				<LinkGraph
					:graph-data="graphData"
					:query-page-names="loadedQueryNames"
					:is-visible="showGraph"
					@add-to-query="addPageToQuery"
					@remove-from-query="removePageFromQuery"
				/>
			</div>
			<div class="links-section two-columns">
				<div class="column">
					<div v-if="displayedByLinkSimilarity.length > 0" class="links-list">
						<template
							v-for="item in displayedByLinkSimilarity"
							:key="'bi-' + item.link"
						>
							<div class="link-row">
								<a
									:href="wiki.getPageUrl(item.link)"
									target="_blank"
									class="main-link"
									>{{ item.link }}</a
								>
								<span class="link-count">
									&nbsp;
									<span
										><CdxIcon :icon="cdxIconLink" size="x-small" />
										{{ item.count }}</span
									>
									<span
										><CdxIcon :icon="cdxIconArrowUp" size="x-small" />
										{{ item.unidirectionalOutCount }}</span
									>
									<span
										><CdxIcon :icon="cdxIconArrowDown" size="x-small" />
										{{ item.unidirectionalBackCount }}</span
									>
								</span>
								<br />

								<span class="link-pages">
									<template
										v-for="(relation, pageIndex) in item.pageRelations"
										:key="`${relation.kind}-${relation.page}`"
									>
										<a
											:href="wiki.getPageUrl(relation.page)"
											target="_blank"
											class="page-link"
											><CdxIcon
												:icon="getPageKindIcon(relation.kind)"
												size="x-small"
												class="page-kind-icon"
											/>{{ relation.page }}</a
										>
									</template>
								</span>
								<div
									v-if="sharedCountsByPage.get(item.link)?.length"
									class="shared-counts"
								>
									<div>
										<strong
											style="font-size: 1.25rem; color: var(--color-base)"
										>
											{{
												formatPercentage(
													getAverageSharedPercentage(
														sharedCountsByPage.get(item.link) ?? []
													)
												)
											}}
											link similarity</strong
										>
									</div>
									<template
										v-for="entry in sharedCountsByPage.get(item.link)"
										:key="entry.queryPage"
									>
										{{ formatPercentage(entry.count / entry.outOfQueryPage) }}
										{{ entry.queryPage }} ({{ entry.count }} /
										{{ entry.outOfQueryPage }})<br />
									</template>
								</div>
							</div>
						</template>
					</div>
					<div v-else-if="!isLoading" class="no-results">
						Pages that link both ways with these.
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { cdxIconArrowDown, cdxIconArrowUp, cdxIconLink } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import { computed, onMounted, ref } from "vue"
import type { GraphData } from "./LinkGraph.vue"
import LinkGraph from "./LinkGraph.vue"

const wiki = new FakeWiki()

const GRAPH_VISIBLE_STORAGE_KEY = "fakewiki-page-link-similarity-show-graph"
const showGraph = ref(
	typeof localStorage !== "undefined" &&
		localStorage.getItem(GRAPH_VISIBLE_STORAGE_KEY) !== "false"
)

function formatPercentage(value: number): string {
	return (value * 100).toFixed(0) + "%"
}

function getPageKindIcon(kind: "bidirectional" | "link" | "backlink") {
	if (kind === "link") return cdxIconArrowUp
	if (kind === "backlink") return cdxIconArrowDown
	return cdxIconLink
}

function getAverageSharedPercentage(
	sharedCounts: {
		queryPage: string
		count: number
		outOfQueryPage: number
		outOfPage: number
	}[]
): number {
	if (sharedCounts.length === 0) return 0
	return (
		sharedCounts.reduce((acc, curr) => acc + curr.count / curr.outOfQueryPage, 0) /
		sharedCounts.length
	)
}

function toggleGraphVisible(): void {
	showGraph.value = !showGraph.value
	try {
		localStorage.setItem(GRAPH_VISIBLE_STORAGE_KEY, String(showGraph.value))
	} catch {
		// ignore
	}
}

const pageNamesInput = ref(
	localStorage.getItem("pageLinkSimilarityQuery") ||
		"Wet Leg, Wolf Alice, Jade Thirlwall, Confidence Man (band), PinkPantheress, Rizzle Kicks"
)
const linksMap = ref<Map<string, string[]>>(new Map())
const backlinksMap = ref<Map<string, string[]>>(new Map())
/** Outgoing links for each bidirectional page (fetched serially after main load) */
const bidirectionalPageLinks = ref<Map<string, string[]>>(new Map())
/** All fetched outgoing links, keyed by source page (query + extra fetches) */
const knownLinksCache = ref<Map<string, string[]>>(new Map())
/** All fetched backlinks, keyed by target page (query + extra fetches) */
const knownBacklinksCache = ref<Map<string, string[]>>(new Map())
/** Winners are fixed once per load (supports random tie-pool sampling). */
const winningBidirectionalIds = ref<Set<string>>(new Set())
const loadedQueryNames = ref<string[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const latestLoadRequestId = ref(0)

type LinkDirectionStats = {
	link: string
	count: number
	pages: string[]
	pageRelations: { page: string; kind: "bidirectional" | "link" | "backlink" }[]
	unidirectionalOutCount: number
	unidirectionalBackCount: number
	unidirectionalCount: number
	unidirectionalPages: string[]
}

// Per-link per-query breakdown: bidirectional pages and unidirectional pages.
const bidirectionalStats = computed(() => {
	const result = new Map<
		string,
		{
			bidirectionalPages: string[]
			unidirectionalOutPages: string[]
			unidirectionalBackPages: string[]
			unidirectionalPages: string[]
		}
	>()
	const queryPages = loadedQueryNames.value
	const outgoingByQuery = new Map<string, Set<string>>()
	const incomingByQuery = new Map<string, Set<string>>()
	const allCandidateLinks = new Set<string>()

	for (const queryPage of queryPages) {
		const outgoing = new Set(linksMap.value.get(queryPage) ?? [])
		const incoming = new Set(backlinksMap.value.get(queryPage) ?? [])
		outgoingByQuery.set(queryPage, outgoing)
		incomingByQuery.set(queryPage, incoming)
		for (const link of outgoing) allCandidateLinks.add(link)
		for (const link of incoming) allCandidateLinks.add(link)
	}

	for (const link of allCandidateLinks) {
		const bidirectionalPages: string[] = []
		const unidirectionalOutPages: string[] = []
		const unidirectionalBackPages: string[] = []
		const unidirectionalPages: string[] = []
		for (const queryPage of queryPages) {
			const out = outgoingByQuery.get(queryPage)?.has(link) ?? false
			const back = incomingByQuery.get(queryPage)?.has(link) ?? false
			if (out && back) bidirectionalPages.push(queryPage)
			else if (out) {
				unidirectionalOutPages.push(queryPage)
				unidirectionalPages.push(queryPage)
			} else if (back) {
				unidirectionalBackPages.push(queryPage)
				unidirectionalPages.push(queryPage)
			}
		}
		if (bidirectionalPages.length > 0) {
			result.set(link, {
				bidirectionalPages,
				unidirectionalOutPages,
				unidirectionalBackPages,
				unidirectionalPages,
			})
		}
	}
	return result
})

const sortedBidirectional = computed<LinkDirectionStats[]>(() => {
	const result: LinkDirectionStats[] = []
	for (const [link, stats] of bidirectionalStats.value.entries()) {
		const pageRelations: { page: string; kind: "bidirectional" | "link" | "backlink" }[] = []
		for (const page of stats.bidirectionalPages) {
			pageRelations.push({ page, kind: "bidirectional" })
		}
		for (const page of stats.unidirectionalOutPages) {
			pageRelations.push({ page, kind: "link" })
		}
		for (const page of stats.unidirectionalBackPages) {
			pageRelations.push({ page, kind: "backlink" })
		}
		result.push({
			link,
			count: stats.bidirectionalPages.length,
			pages: stats.bidirectionalPages,
			pageRelations,
			unidirectionalOutCount: stats.unidirectionalOutPages.length,
			unidirectionalBackCount: stats.unidirectionalBackPages.length,
			unidirectionalCount: stats.unidirectionalPages.length,
			unidirectionalPages: stats.unidirectionalPages,
		})
	}
	return result.sort((a, b) =>
		b.count !== a.count
			? b.count - a.count
			: b.unidirectionalOutCount !== a.unidirectionalOutCount
				? b.unidirectionalOutCount - a.unidirectionalOutCount
				: b.unidirectionalBackCount !== a.unidirectionalBackCount
					? b.unidirectionalBackCount - a.unidirectionalBackCount
					: a.link.localeCompare(b.link)
	)
})

const BIDIRECTIONAL_TOP = 10

function pickWinningBidirectionalIds(sorted: LinkDirectionStats[], topCap: number): Set<string> {
	if (sorted.length === 0) return new Set()
	if (sorted.length <= topCap) return new Set(sorted.map(item => item.link))

	const cutoff = sorted[topCap - 1]
	// Include:
	// 1) Any higher bidirectional score
	// 2) Same bidirectional score with higher unidirectional outgoing score
	// 3) Same bidirectional + outgoing score with higher unidirectional backlink score
	// 4) Exact ties on all three scores
	const winners = sorted.filter(
		item =>
			item.count > cutoff.count ||
			(item.count === cutoff.count &&
				(item.unidirectionalOutCount > cutoff.unidirectionalOutCount ||
					(item.unidirectionalOutCount === cutoff.unidirectionalOutCount &&
						item.unidirectionalBackCount >= cutoff.unidirectionalBackCount)))
	)
	return new Set(winners.map(item => item.link))
}

// Top 20 by score, but include all pages that tie at the cutoff.
const displayedBidirectional = computed(() => {
	const ids = winningBidirectionalIds.value
	if (ids.size === 0) return []
	return sortedBidirectional.value.filter(item => ids.has(item.link))
})

/** For each bidirectional page, shared link count with each query page */
const sharedCountsByPage = computed(() => {
	const out = new Map<
		string,
		{ queryPage: string; count: number; outOfQueryPage: number; outOfPage: number }[]
	>()
	const pageLinks = bidirectionalPageLinks.value
	const queryNames = loadedQueryNames.value
	const queryLinks = linksMap.value
	for (const pageName of pageLinks.keys()) {
		const links = new Set(pageLinks.get(pageName) ?? [])
		const counts: {
			queryPage: string
			count: number
			outOfQueryPage: number
			outOfPage: number
		}[] = []
		for (const queryPage of queryNames) {
			const qLinks = queryLinks.get(queryPage) ?? []
			const count = qLinks.filter(l => links.has(l)).length
			counts.push({ queryPage, count, outOfQueryPage: qLinks.length, outOfPage: links.size })
		}
		out.set(pageName, counts)
	}
	return out
})

const similarityPercentByPage = computed(() => {
	const out = new Map<string, number>()
	for (const [pageName, counts] of sharedCountsByPage.value.entries()) {
		out.set(pageName, getAverageSharedPercentage(counts))
	}
	return out
})

// Rank only scored items by link similarity. Keep unscored items in baseline order.
const displayedByLinkSimilarity = computed(() => {
	const baseline = displayedBidirectional.value
	const baselineIndex = new Map(baseline.map((item, idx) => [item.link, idx]))
	const scored: LinkDirectionStats[] = []
	const unscored: LinkDirectionStats[] = []
	for (const item of baseline) {
		const isScored = (sharedCountsByPage.value.get(item.link)?.length ?? 0) > 0
		if (isScored) scored.push(item)
		else unscored.push(item)
	}
	scored.sort((a, b) => {
		const scoreA = similarityPercentByPage.value.get(a.link) ?? 0
		const scoreB = similarityPercentByPage.value.get(b.link) ?? 0
		if (scoreB !== scoreA) return scoreB - scoreA
		return (baselineIndex.get(a.link) ?? 0) - (baselineIndex.get(b.link) ?? 0)
	})
	return [...scored, ...unscored]
})

const graphData = computed<GraphData | null>(() => {
	if (linksMap.value.size === 0 && backlinksMap.value.size === 0) return null
	const winningSet = new Set(displayedBidirectional.value.map(item => item.link))
	const querySet = new Set(loadedQueryNames.value)
	const allBidirectionalSet = new Set(sortedBidirectional.value.map(item => item.link))
	const allowedNodeIds = new Set<string>([...querySet, ...allBidirectionalSet])
	const nodeIds = new Set<string>()
	const linkKey = (a: string, b: string) => `${a}\0${b}`
	const seenEdges = new Set<string>()
	const addEdge = (source: string, target: string) => {
		if (!allowedNodeIds.has(source) || !allowedNodeIds.has(target)) return
		nodeIds.add(source)
		nodeIds.add(target)
		const key = linkKey(source, target)
		if (seenEdges.has(key)) return
		seenEdges.add(key)
		links.push({ source, target })
	}
	const links: { source: string; target: string }[] = []

	// Start graph with query + winning nodes only.
	for (const id of querySet) nodeIds.add(id)
	for (const id of winningSet) nodeIds.add(id)

	// Initial edges only between already shown nodes (query/winning).
	for (const [source, targets] of linksMap.value.entries()) {
		for (const t of targets) {
			addEdge(source, t)
		}
	}
	for (const [target, linkers] of backlinksMap.value.entries()) {
		for (const linker of linkers) {
			addEdge(linker, target)
		}
	}

	// Also include any known cached edges (from fetched winning pages), still filtered
	// to query + bidirectional nodes via addEdge().
	for (const [source, targets] of knownLinksCache.value.entries()) {
		for (const target of targets) {
			addEdge(source, target)
		}
	}
	for (const [target, linkers] of knownBacklinksCache.value.entries()) {
		for (const linker of linkers) {
			addEdge(linker, target)
		}
	}
	const similarityNodeIds = new Set<string>()
	for (const id of nodeIds) {
		if (allBidirectionalSet.has(id) && !winningSet.has(id)) {
			similarityNodeIds.add(id)
		}
	}

	const nodes = [...nodeIds].map(id => ({
		id,
		isQuery: querySet.has(id),
		isWinningBidirectional: winningSet.has(id),
		isSimilarityLink: similarityNodeIds.has(id),
		// Start small (0) until a real similarity score is computed, then grow.
		linkSimilarity: querySet.has(id) ? 1 : (similarityPercentByPage.value.get(id) ?? 0),
	}))
	return { nodes, links }
})

function addPageToQuery(pageName: string): void {
	const current = pageNamesInput.value
		.split(",")
		.map(name => name.trim())
		.filter(name => name.length > 0)
	if (current.includes(pageName)) return
	pageNamesInput.value = current.length > 0 ? `${current.join(", ")}, ${pageName}` : pageName
	load()
}

function removePageFromQuery(pageName: string): void {
	const current = pageNamesInput.value
		.split(",")
		.map(name => name.trim())
		.filter(name => name.length > 0)
	const next = current.filter(name => name !== pageName)
	pageNamesInput.value = next.join(", ")
	load()
}

const load = async (): Promise<void> => {
	const requestId = ++latestLoadRequestId.value
	isLoading.value = true
	error.value = null
	const isStale = () => requestId !== latestLoadRequestId.value
	try {
		const pageNames = pageNamesInput.value
			.split(",")
			.map(name => name.trim())
			.filter(name => name.length > 0)

		if (pageNames.length === 0) {
			linksMap.value = new Map()
			backlinksMap.value = new Map()
			bidirectionalPageLinks.value = new Map()
			knownLinksCache.value = new Map()
			knownBacklinksCache.value = new Map()
			winningBidirectionalIds.value = new Set()
			loadedQueryNames.value = []
			return
		}

		const { links: linksResult, backlinks: backlinksResult } =
			await wiki.getPagesLinksAndBacklinks(pageNames)
		if (isStale()) return
		linksMap.value = linksResult
		backlinksMap.value = backlinksResult
		knownLinksCache.value = new Map(linksResult)
		knownBacklinksCache.value = new Map(backlinksResult)
		loadedQueryNames.value = pageNames
		winningBidirectionalIds.value = pickWinningBidirectionalIds(
			sortedBidirectional.value,
			BIDIRECTIONAL_TOP
		)
		localStorage.setItem("pageLinkSimilarityQuery", pageNamesInput.value)

		// Fetch each winning page's links + backlinks serially; cache everything fetched
		bidirectionalPageLinks.value = new Map()
		// Score in list order (top-to-bottom pre-link-scoring order).
		const toFetch = [...displayedBidirectional.value.map(item => item.link)]
		const linksBatch = new Map(knownLinksCache.value)
		const backlinksBatch = new Map(knownBacklinksCache.value)
		const bidirectionalBatch = new Map<string, string[]>()
		let pendingBatchCount = 0
		const BATCH_COMMIT_SIZE = 1
		const commitBatch = async () => {
			if (isStale()) return
			knownLinksCache.value = new Map(linksBatch)
			knownBacklinksCache.value = new Map(backlinksBatch)
			bidirectionalPageLinks.value = new Map(bidirectionalBatch)
			// Yield to browser between heavy graph recomputes to keep UI responsive.
			await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
			if (isStale()) return
		}
		for (const pageName of toFetch) {
			if (isStale()) return
			const pageLinksResult = await wiki.getPagesLinks([pageName])
			const pageBacklinksResult = await wiki.getPagesBacklinks([pageName])
			if (isStale()) return
			const pageLinks = pageLinksResult.get(pageName) ?? []
			const pageBacklinks = pageBacklinksResult.get(pageName) ?? []

			bidirectionalBatch.set(pageName, pageLinks)
			linksBatch.set(pageName, pageLinks)
			backlinksBatch.set(pageName, pageBacklinks)
			pendingBatchCount += 1
			if (pendingBatchCount >= BATCH_COMMIT_SIZE) {
				await commitBatch()
				pendingBatchCount = 0
			}
		}
		if (pendingBatchCount > 0) {
			await commitBatch()
		}
	} catch (err) {
		if (isStale()) return
		error.value = (err as Error).message
		linksMap.value = new Map()
		backlinksMap.value = new Map()
		bidirectionalPageLinks.value = new Map()
		knownLinksCache.value = new Map()
		knownBacklinksCache.value = new Map()
		winningBidirectionalIds.value = new Set()
		loadedQueryNames.value = []
	} finally {
		if (!isStale()) {
			isLoading.value = false
		}
	}
}

onMounted(load)
</script>

<style scoped>
@import "./style.css";
</style>
