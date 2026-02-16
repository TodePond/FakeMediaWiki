<template>
	<article class="wiki-article">
		<div v-if="error" class="wiki-article__content">{{ error }}</div>
		<template v-else-if="summary">
			<div v-if="heroUrl" class="wiki-article__hero-wrap">
				<img class="wiki-article__hero" :src="heroUrl" :alt="summary.title ?? ''" />
				<div class="wiki-article__hero-gradient" aria-hidden="true" />
			</div>
			<div class="wiki-article__content" @click="onContentClick">
				<h1>{{ summary.title }}</h1>
				<div
					v-if="summary.extract_html"
					class="wiki-article__summary"
					v-html="summary.extract_html"
				/>
				<p v-else-if="summary.extract" class="wiki-article__summary">
					{{ summary.extract }}
				</p>
				<div class="wiki-article__tabs">
					<CdxTabs v-model:active="activeTab" :framed="false">
						<CdxTab v-if="tabContent.overview" name="overview" label="Overview">
							<div class="wiki-article__tab-body" v-html="tabContent.overview" />
						</CdxTab>
						<CdxTab v-if="pageMedia.length > 0" name="media" label="Media">
							<div class="wiki-article__tab-body wiki-article__media-feed">
								<a
									v-for="(item, i) in pageMedia"
									:key="i"
									:href="getMediaUrl(item) ?? '#'"
									:aria-label="item.caption?.text ?? item.title ?? 'Media'"
									target="_blank"
									rel="noopener noreferrer"
									class="wiki-article__media-item"
								>
									<img
										v-if="getMediaUrl(item)"
										:src="getMediaUrl(item)!"
										:alt="item.caption?.text ?? item.title ?? ''"
										class="wiki-article__media-img"
									/>
									<p
										v-if="item.caption?.text"
										class="wiki-article__media-caption"
									>
										{{ item.caption.text }}
									</p>
								</a>
							</div>
						</CdxTab>
						<CdxTab v-if="tabContent.members" name="members" label="Members">
							<div class="wiki-article__tab-body" v-html="tabContent.members" />
						</CdxTab>
						<CdxTab
							v-if="tabContent.discography"
							name="discography"
							label="Discography"
						>
							<div class="wiki-article__tab-body" v-html="tabContent.discography" />
						</CdxTab>
					</CdxTabs>
				</div>
			</div>
		</template>
	</article>
</template>

<script setup lang="ts">
import { CdxTab, CdxTabs } from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { FakeWiki } from "fakewiki"
import type { FWMediaItem, FWPageSummary } from "fakewiki/types"

const wiki = new FakeWiki()

/** Split wikitext into sections by level-2 headers (== Title ==). */
function parseSections(wikitext: string): { title: string; wikitext: string }[] {
	const sections: { title: string; wikitext: string }[] = []
	const parts = wikitext.split(/(\n==\s*.+?\s*==\s*$)/gm)
	const lead = parts[0]?.trim() ?? ""
	if (lead) sections.push({ title: "", wikitext: lead })
	for (let i = 1; i < parts.length; i += 2) {
		const headerLine = parts[i]
		const content = parts[i + 1]?.trim() ?? ""
		if (!headerLine) continue
		const match = headerLine.match(/==\s*(.+?)\s*==\s*$/)
		const title = match ? match[1].trim() : ""
		if (title || content) sections.push({ title, wikitext: content })
	}
	return sections
}

/** Remove infobox and reference lists from HTML. */
function stripExtra(html: string): string {
	if (!html.trim()) return html
	try {
		const parser = new DOMParser()
		const doc = parser.parseFromString(html, "text/html")
		doc.querySelectorAll(".infobox, [class*='infobox']").forEach(el => el.remove())
		doc.querySelectorAll(".reflist, ol.references, div.references").forEach(el => el.remove())
		return doc.body?.innerHTML ?? html
	} catch {
		return html
	}
}

const pageName = ref("Wet Leg")
const activeTab = ref("overview")
const summary = ref<FWPageSummary | null>(null)
const heroUrl = ref<string | null>(null)
const tabContent = ref<Record<string, string>>({
	overview: "",
	members: "",
	discography: "",
})
const pageMedia = ref<FWMediaItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

function sectionMatches(sectionTitle: string, tabKey: string): boolean {
	const t = sectionTitle.toLowerCase()
	switch (tabKey) {
		case "overview":
			return sectionTitle === ""
		case "members":
			return t === "members" || t.includes("member") || t === "personnel"
		case "discography":
			return (
				t === "discography" ||
				t.includes("discography") ||
				t.includes("album") ||
				t === "releases"
			)
		default:
			return false
	}
}

function getMediaUrl(item: FWMediaItem): string | null {
	return item.srcset?.[0]?.src ?? item.original?.source ?? null
}

/** Parse a wiki page title from an internal link href. Handles app routes like /Mobile/Indie_rock and wiki paths like /wiki/Indie_rock. */
function parsePageTitleFromWikiUrl(href: string): string | null {
	try {
		const url = new URL(href, window.location.origin)
		const pathname = url.pathname
		// App route: /Mobile/Page_Title or /Component/Page_Title etc.
		const appMatch = pathname.match(
			/^\/(?:Mobile|Component|Fullscreen|Special)\/([^/]+)(?:\/|$)/
		)
		if (appMatch) {
			const encoded = appMatch[1]
			const decoded = decodeURIComponent(encoded.replace(/\+/g, " "))
			return decoded.replace(/_/g, " ").trim() || null
		}
		// Wikipedia-style: same origin /wiki/Page_Title
		const baseUrl = new URL(wiki.getPageUrl(""))
		if (url.origin === baseUrl.origin) {
			const wikiMatch = pathname.match(/^\/wiki\/(.+)$/)
			if (wikiMatch) {
				const encoded = wikiMatch[1]
				const decoded = decodeURIComponent(encoded.replace(/\+/g, " "))
				return decoded.replace(/_/g, " ").trim() || null
			}
		}
		return null
	} catch {
		return null
	}
}

function onContentClick(event: MouseEvent): void {
	const a = (event.target as Element).closest("a[href]")
	if (!a || !(a instanceof HTMLAnchorElement) || !a.href) return
	const title = parsePageTitleFromWikiUrl(a.href)
	if (title) {
		event.preventDefault()
		pageName.value = title
		loadPage(title)
	}
}

async function loadPage(name?: string): Promise<void> {
	const targetPage = name ?? pageName.value
	isLoading.value = true
	error.value = null
	summary.value = null
	heroUrl.value = null
	tabContent.value = { overview: "", members: "", discography: "" }
	pageMedia.value = []
	try {
		const [summaryData, hero, source, mediaResponse] = await Promise.all([
			wiki.getPageSummary(targetPage),
			wiki.getPageHero(targetPage),
			wiki.getPageSource(targetPage),
			wiki.getPageMedia(targetPage),
		])
		summary.value = summaryData
		heroUrl.value = hero
		pageMedia.value = mediaResponse.items ?? []

		const sections = parseSections(source)
		const keys: ("overview" | "members" | "discography")[] = [
			"overview",
			"members",
			"discography",
		]
		for (const key of keys) {
			const section = sections.find(s => sectionMatches(s.title, key))
			if (section?.wikitext) {
				const html = await wiki.transformWikitextToHtml(section.wikitext, targetPage)
				tabContent.value[key] = stripExtra(html)
			}
		}
		pageName.value = targetPage
		// Activate first tab that has content
		const tabOrder = ["overview", "media", "members", "discography"] as const
		const hasContent = (t: (typeof tabOrder)[number]) =>
			t === "overview"
				? !!tabContent.value.overview
				: t === "media"
					? pageMedia.value.length > 0
					: t === "members"
						? !!tabContent.value.members
						: !!tabContent.value.discography
		activeTab.value = tabOrder.find(hasContent) ?? "overview"
	} catch (err) {
		error.value = (err as Error).message
	} finally {
		isLoading.value = false
	}
}

onMounted(() => loadPage())
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
