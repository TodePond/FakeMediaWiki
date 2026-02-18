<template>
	<section class="page-links-view">
		<form @submit.prevent="load">
			<CdxLabel input-id="page-names">Page names (comma-separated)</CdxLabel>
			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="pageNamesInput"
					input-type="search"
					id="page-names"
				/>
				<CdxButton>Load links & backlinks</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-else class="three-columns">
			<div class="column">
				<h3 class="column-title">Outgoing links</h3>
				<div v-if="sortedLinks.length > 0" class="links-list">
					<template v-for="(item, index) in sortedLinks" :key="'link-' + item.link">
						<template v-if="index > 0 && sortedLinks[index - 1].count !== item.count">
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
					<template v-for="(item, index) in sortedBidirectional" :key="'bi-' + item.link">
						<template
							v-if="index > 0 && sortedBidirectional[index - 1].count !== item.count"
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
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { FakeWiki } from "fakewiki"
import { computed, onMounted, ref } from "vue"

const wiki = new FakeWiki()

const pageNamesInput = ref(
	localStorage.getItem("pageLinksQuery") ||
		"Wet Leg, Wolf Alice, Jade Thirlwall, Confidence Man (band), PinkPantheress"
)
const linksMap = ref<Map<string, string[]>>(new Map())
const backlinksMap = ref<Map<string, string[]>>(new Map())
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
			return
		}

		const [linksResult, backlinksResult] = await Promise.all([
			wiki.getPagesLinks(pageNames),
			wiki.getPagesBacklinks(pageNames),
		])
		linksMap.value = linksResult
		backlinksMap.value = backlinksResult
		localStorage.setItem("pageLinksQuery", pageNamesInput.value)
	} catch (err) {
		error.value = (err as Error).message
		linksMap.value = new Map()
		backlinksMap.value = new Map()
	} finally {
		isLoading.value = false
	}
}

onMounted(load)
</script>

<style scoped>
@import "./style.css";
</style>
