<template>
	<section>
		<form @submit.prevent="loadBacklinks">
			<CdxLabel input-id="page-names">Page names (comma-separated)</CdxLabel>
			<span>
				<CdxTextInput
					autocomplete="off"
					v-model="pageNamesInput"
					input-type="search"
					id="page-names"
				/>
				<CdxButton>Load backlinks</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading backlinks" />
			</span>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="sortedBacklinks.length > 0" class="links-list">
			<hr />
			<br />
			<template v-for="(item, index) in sortedBacklinks" :key="item.link">
				<template v-if="index > 0 && sortedBacklinks[index - 1].count !== item.count">
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
			Enter page names separated by commas to see which pages link to them (backlinks).
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { computed, onMounted, ref } from "vue"
import { FakeWiki } from "fakewiki"

const wiki = new FakeWiki()

const pageNamesInput = ref(
	localStorage.getItem("pageBacklinksQuery") ||
		"Wet Leg, Wolf Alice, Jade Thirlwall, Confidence Man (band), PinkPantheress"
)
const backlinksMap = ref<Map<string, string[]>>(new Map())
const isLoading = ref(false)
const error = ref<string | null>(null)

// Invert: target -> linkers[]  into  linker -> targets[]; then sort by count (how many target pages each linker links to)
const sortedBacklinks = computed(() => {
	if (backlinksMap.value.size === 0) {
		return []
	}

	const linkerToTargets = new Map<string, string[]>()

	for (const [targetPage, linkers] of backlinksMap.value.entries()) {
		const uniqueLinkers = new Set(linkers)
		for (const linker of uniqueLinkers) {
			if (!linkerToTargets.has(linker)) {
				linkerToTargets.set(linker, [])
			}
			linkerToTargets.get(linker)!.push(targetPage)
		}
	}

	return Array.from(linkerToTargets.entries())
		.map(([link, pages]) => ({ link, count: pages.length, pages }))
		.sort((a, b) => {
			if (b.count !== a.count) {
				return b.count - a.count
			}
			return a.link.localeCompare(b.link)
		})
})

const loadBacklinks = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const pageNames = pageNamesInput.value
			.split(",")
			.map(name => name.trim())
			.filter(name => name.length > 0)

		if (pageNames.length === 0) {
			backlinksMap.value = new Map()
			return
		}

		const result = await wiki.getPagesBacklinks(pageNames)
		backlinksMap.value = result
		localStorage.setItem("pageBacklinksQuery", pageNamesInput.value)
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		backlinksMap.value = new Map()
	} finally {
		isLoading.value = false
	}
}

onMounted(loadBacklinks)
</script>

<style scoped>
@import "./style.css";
</style>
