<template>
	<section class="page-link-similarity-view">
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
					<h3 class="column-title">By link similarity</h3>
					<div v-if="displayedBySimilarity.length > 0" class="links-list">
						<template
							v-for="(item, index) in displayedBySimilarity"
							:key="'sim-' + item.link"
						>
							<template
								v-if="
									index > 0 &&
									getAverageSharedPercentage(
										sharedCountsByPage.get(
											displayedBySimilarity[index - 1].link
										) ?? []
									) !==
										getAverageSharedPercentage(
											sharedCountsByPage.get(item.link) ?? []
										)
								"
							>
							</template>
							<div class="link-row">
								<a
									:href="wiki.getPageUrl(item.link)"
									target="_blank"
									class="main-link"
									>{{ item.link }}</a
								>
								<span class="link-count"> ({{ item.count }})</span>
								<span class="link-pages">
									—
									<template v-for="(page, pageIndex) in item.pages" :key="page">
										<a
											v-if="pageIndex > 0"
											:href="wiki.getPageUrl(page)"
											target="_blank"
											class="page-link"
											>, </a
										><a
											:href="wiki.getPageUrl(page)"
											target="_blank"
											class="page-link"
											>{{ page }}</a
										>
									</template>
								</span>
								<div
									v-if="sharedCountsByPage.get(item.link)?.length"
									class="shared-counts"
								>
									<div>
										<strong style="font-size: 1.25rem">
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
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
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
		"Wet Leg, Wolf Alice, Jade Thirlwall, Confidence Man (band), PinkPantheress, Rizzle Kicks, Jools Holland"
)
const linksMap = ref<Map<string, string[]>>(new Map())
const backlinksMap = ref<Map<string, string[]>>(new Map())
/** Outgoing links for each bidirectional page (fetched serially after main load) */
const bidirectionalPageLinks = ref<Map<string, string[]>>(new Map())
/** All fetched outgoing links, keyed by source page (query + extra fetches) */
const knownLinksCache = ref<Map<string, string[]>>(new Map())
/** All fetched backlinks, keyed by target page (query + extra fetches) */
const knownBacklinksCache = ref<Map<string, string[]>>(new Map())
const loadedQueryNames = ref<string[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const latestLoadRequestId = ref(0)

const sortedLinks = computed(() => {
	if (linksMap.value.size === 0) return []
	const linkPages = new Map<string, string[]>()
	for (const [pageName, links] of linksMap.value.entries()) {
		for (const link of new Set(links)) {
			if (!linkPages.has(link)) linkPages.set(link, [])
			linkPages.get(link)!.push(pageName)
		}
	}
	return Array.from(linkPages.entries())
		.map(([link, pages]) => ({ link, count: pages.length, pages }))
		.sort((a, b) => (b.count !== a.count ? b.count - a.count : a.link.localeCompare(b.link)))
})

const sortedBacklinks = computed(() => {
	if (backlinksMap.value.size === 0) return []
	const linkerToTargets = new Map<string, string[]>()
	for (const [targetPage, linkers] of backlinksMap.value.entries()) {
		for (const linker of new Set(linkers)) {
			if (!linkerToTargets.has(linker)) linkerToTargets.set(linker, [])
			linkerToTargets.get(linker)!.push(targetPage)
		}
	}
	return Array.from(linkerToTargets.entries())
		.map(([link, pages]) => ({ link, count: pages.length, pages }))
		.sort((a, b) => (b.count !== a.count ? b.count - a.count : a.link.localeCompare(b.link)))
})

// Pages that appear in both outgoing and backlinks: at least one of our pages has a bidirectional link
const sortedBidirectional = computed(() => {
	const outgoing = new Map(sortedLinks.value.map(({ link, pages }) => [link, new Set(pages)]))
	const backlink = new Map(sortedBacklinks.value.map(({ link, pages }) => [link, new Set(pages)]))
	const result: { link: string; count: number; pages: string[] }[] = []
	for (const link of outgoing.keys()) {
		if (!backlink.has(link)) continue
		const outPages = outgoing.get(link)!
		const backPages = backlink.get(link)!
		const bidirectionalPages = [...outPages].filter(p => backPages.has(p))
		if (bidirectionalPages.length > 0) {
			result.push({
				link,
				count: bidirectionalPages.length,
				pages: bidirectionalPages,
			})
		}
	}
	return result.sort((a, b) =>
		b.count !== a.count ? b.count - a.count : a.link.localeCompare(b.link)
	)
})

const BIDIRECTIONAL_TOP = 20

// Top 20 by score, but include all pages that tie at the cutoff.
const displayedBidirectional = computed(() => {
	const sorted = sortedBidirectional.value
	if (sorted.length === 0) return []
	const top = sorted.slice(0, BIDIRECTIONAL_TOP)
	const minCountAtCutoff = top[top.length - 1].count
	return sorted.filter(item => item.count >= minCountAtCutoff)
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

/** Same items as displayedBidirectional but sorted by link similarity score (highest first) */
const displayedBySimilarity = computed(() => {
	const items = displayedBidirectional.value
	const shared = sharedCountsByPage.value
	return [...items].sort((a, b) => {
		const scoreA = shared.get(a.link) ? getAverageSharedPercentage(shared.get(a.link)!) : -1
		const scoreB = shared.get(b.link) ? getAverageSharedPercentage(shared.get(b.link)!) : -1
		if (scoreB !== scoreA) return scoreB - scoreA
		return a.link.localeCompare(b.link)
	})
})

const similarityPercentByPage = computed(() => {
	const out = new Map<string, number>()
	for (const [pageName, counts] of sharedCountsByPage.value.entries()) {
		out.set(pageName, getAverageSharedPercentage(counts))
	}
	return out
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
			loadedQueryNames.value = []
			return
		}

		const [linksResult, backlinksResult] = await Promise.all([
			wiki.getPagesLinks(pageNames),
			wiki.getPagesBacklinks(pageNames),
		])
		if (isStale()) return
		linksMap.value = linksResult
		backlinksMap.value = backlinksResult
		knownLinksCache.value = new Map(linksResult)
		knownBacklinksCache.value = new Map(backlinksResult)
		loadedQueryNames.value = pageNames
		localStorage.setItem("pageLinkSimilarityQuery", pageNamesInput.value)

		// Fetch each winning page's links + backlinks serially; cache everything fetched
		bidirectionalPageLinks.value = new Map()
		const toFetch = displayedBidirectional.value.map(item => item.link)
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
