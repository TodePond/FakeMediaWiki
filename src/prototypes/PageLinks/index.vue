<template>
	<section>
		<form @submit.prevent="loadLinks">
			<CdxLabel input-id="page-names">Page names (comma-separated)</CdxLabel>
			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="pageNamesInput"
					input-type="search"
					id="page-names"
				/>
				<CdxButton>Load links</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading links" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="sortedLinks.length > 0" class="links-list">
			<hr />
			<br />
			<template v-for="(item, index) in sortedLinks" :key="item.link">
				<template v-if="index > 0 && sortedLinks[index - 1].count !== item.count">
					<br />
					<hr />
					<br />
				</template>
				<div>
					<a :href="wiki.getPageUrl(item.link)" target="_blank" class="main-link">{{
						item.link
					}}</a>
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
							><a :href="wiki.getPageUrl(page)" target="_blank" class="page-link">{{
								page
							}}</a>
						</template>
					</span>
				</div>
			</template>
		</div>
		<div v-else-if="!isLoading && !error" class="no-results">
			Enter page names separated by commas to see their links.
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { computed, onMounted, ref } from "vue"
import { FakeWiki } from "../../fake-wiki/FakeWiki"

const wiki = new FakeWiki()

const pageNamesInput = ref(
	localStorage.getItem("pageLinksQuery") ||
		"Wet Leg, Wolf Alice, Jade Thirlwall, Confidence Man (band), PinkPantheress"
)
const linksMap = ref<Map<string, string[]>>(new Map())
const isLoading = ref(false)
const error = ref<string | null>(null)

// Compute all links sorted by frequency (how many pages they appear in)
const sortedLinks = computed(() => {
	if (linksMap.value.size === 0) {
		return []
	}

	// Track which pages each link appears in
	const linkPages = new Map<string, string[]>()

	for (const [pageName, links] of linksMap.value.entries()) {
		const uniqueLinks = new Set(links)
		for (const link of uniqueLinks) {
			if (!linkPages.has(link)) {
				linkPages.set(link, [])
			}
			linkPages.get(link)!.push(pageName)
		}
	}

	// Convert to array and sort by count (descending), then alphabetically
	return Array.from(linkPages.entries())
		.map(([link, pages]) => ({ link, count: pages.length, pages }))
		.sort((a, b) => {
			// First sort by count (descending)
			if (b.count !== a.count) {
				return b.count - a.count
			}
			// Then sort alphabetically
			return a.link.localeCompare(b.link)
		})
})

const loadLinks = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		// Split by comma and trim whitespace
		const pageNames = pageNamesInput.value
			.split(",")
			.map(name => name.trim())
			.filter(name => name.length > 0)

		if (pageNames.length === 0) {
			linksMap.value = new Map()
			return
		}

		const result = await wiki.getPagesLinks(pageNames)
		linksMap.value = result
		localStorage.setItem("pageLinksQuery", pageNamesInput.value)
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		linksMap.value = new Map()
	} finally {
		isLoading.value = false
	}
}

onMounted(loadLinks)
</script>

<style scoped>
@import "./style.css";
</style>
