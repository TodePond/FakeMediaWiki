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
					@add-to-query="addPageToQuery"
					@remove-from-query="removePageFromQuery"
				/>
			</div>
			<div class="three-columns">
				<div class="column">
					<h3 class="column-title">Outgoing links</h3>
					<div v-if="sortedLinks.length > 0" class="links-list">
						<template v-for="(item, index) in sortedLinks" :key="'link-' + item.link">
							<template
								v-if="index > 0 && sortedLinks[index - 1].count !== item.count"
							>
								<hr />
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
							</div>
						</template>
					</div>
					<div v-else-if="!isLoading" class="no-results">Pages these link to.</div>
				</div>
				<div class="column">
					<h3 class="column-title">Backlinks</h3>
					<div v-if="sortedBacklinks.length > 0" class="links-list">
						<template v-for="(item, index) in sortedBacklinks" :key="'bl-' + item.link">
							<template
								v-if="index > 0 && sortedBacklinks[index - 1].count !== item.count"
							>
								<hr />
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
							</div>
						</template>
					</div>
					<div v-else-if="!isLoading" class="no-results">Pages that link to these.</div>
				</div>
				<div class="column">
					<h3 class="column-title">Bidirectional</h3>
					<div v-if="sortedBidirectional.length > 0" class="links-list">
						<template
							v-for="(item, index) in sortedBidirectional"
							:key="'bi-' + item.link"
						>
							<template
								v-if="
									index > 0 && sortedBidirectional[index - 1].count !== item.count
								"
							>
								<hr />
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
const loadedQueryNames = ref<string[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

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
			result.push({ link, count: bidirectionalPages.length, pages: bidirectionalPages })
		}
	}
	return result.sort((a, b) =>
		b.count !== a.count ? b.count - a.count : a.link.localeCompare(b.link)
	)
})

const graphData = computed<GraphData | null>(() => {
	if (linksMap.value.size === 0 && backlinksMap.value.size === 0) return null
	const nodeIds = new Set<string>()
	const links: { source: string; target: string }[] = []
	for (const [source, targets] of linksMap.value.entries()) {
		nodeIds.add(source)
		for (const t of targets) {
			nodeIds.add(t)
			links.push({ source, target: t })
		}
	}
	for (const [target, linkers] of backlinksMap.value.entries()) {
		nodeIds.add(target)
		for (const linker of linkers) {
			nodeIds.add(linker)
			links.push({ source: linker, target })
		}
	}
	const querySet = new Set(loadedQueryNames.value)
	const nodes = [...nodeIds].map(id => ({ id, isQuery: querySet.has(id) }))
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
	isLoading.value = true
	error.value = null
	try {
		const pageNames = pageNamesInput.value
			.split(",")
			.map(name => name.trim())
			.filter(name => name.length > 0)

		if (pageNames.length === 0) {
			linksMap.value = new Map()
			backlinksMap.value = new Map()
			loadedQueryNames.value = []
			return
		}

		const [linksResult, backlinksResult] = await Promise.all([
			wiki.getPagesLinks(pageNames),
			wiki.getPagesBacklinks(pageNames),
		])
		linksMap.value = linksResult
		backlinksMap.value = backlinksResult
		loadedQueryNames.value = pageNames
		localStorage.setItem("pageLinkSimilarityQuery", pageNamesInput.value)
	} catch (err) {
		error.value = (err as Error).message
		linksMap.value = new Map()
		backlinksMap.value = new Map()
		loadedQueryNames.value = []
	} finally {
		isLoading.value = false
	}
}

onMounted(load)
</script>

<style scoped>
@import "./style.css";
</style>
