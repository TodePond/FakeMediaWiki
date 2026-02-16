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
import { WikiApi, type MediaItem, type PageSummary } from "../../wiki-api/WikiApi"

const wiki = new WikiApi()

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
const summary = ref<PageSummary | null>(null)
const heroUrl = ref<string | null>(null)
const tabContent = ref<Record<string, string>>({
	overview: "",
	members: "",
	discography: "",
})
const pageMedia = ref<MediaItem[]>([])
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

function getMediaUrl(item: MediaItem): string | null {
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
.wiki-article__hero-wrap {
	position: relative;
	padding-bottom: 1px;
}

.wiki-article__hero {
	display: block;
	width: 100%;
}

.wiki-article__hero-gradient {
	position: absolute;
	inset: 0;
	/* gradient from bottom to halfway up the hero image */
	background: linear-gradient(to top, #fff, transparent 100%);

	pointer-events: none;
}

.wiki-article__content {
	padding: 0 0.75rem 0.75rem;
}

h1 {
	padding-top: 1.5rem;
	padding-bottom: 0.8rem;
	margin-bottom: 1rem;
	border-bottom: 1px solid var(--color-base);
}

.wiki-article__summary {
	margin: 0;
}

.wiki-article__tab-placeholder {
	margin: 0;
	color: var(--color-subtle);
	font-size: 0.875rem;
}

.wiki-article__tab-body {
	margin-top: 0.5rem;
	padding-top: 0.5rem;
}

.wiki-article__tab-body :deep(p) {
	margin: 0 0 0.5rem;
}

.wiki-article__tab-body :deep(ul) {
	margin: 0 0 0.5rem;
	padding-left: 1.25rem;
}

/* Inline images in tab content: force full width (no float/side-by-side) */
.wiki-article__tab-body :deep(figure),
.wiki-article__tab-body :deep(.thumb),
.wiki-article__tab-body :deep(.mw-parser-output > figure) {
	float: none !important;
	width: 100% !important;
	max-width: 100% !important;
	margin-left: 0 !important;
	margin-right: 0 !important;
}

.wiki-article__tab-body :deep(img) {
	display: block !important;
	width: 100% !important;
	max-width: 100% !important;
	height: auto !important;
}

.wiki-article__media-feed {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.wiki-article__media-item {
	display: block;
	width: 100%;
	color: inherit;
	text-decoration: none;
}

.wiki-article__media-img {
	display: block;
	width: 100%;
	max-width: 100%;
	height: auto;
}

.wiki-article__media-caption {
	margin: 0.25rem 0 0;
	font-size: 0.875rem;
	color: var(--color-subtle);
	line-height: 1.4;
}

/* Override Codex tabs for larger touch targets (finger-friendly) */
.wiki-article__tabs :deep(.cdx-tabs__list__item) {
	min-height: 48px;
	padding: 12px 12px;
	font-size: 1rem;
	line-height: 1.4;
}

.wiki-article__tabs :deep(.cdx-tabs__list) {
	min-height: 48px;
}

/* Fatter scroll arrow buttons for touch */
.wiki-article__tabs :deep(.cdx-tabs__prev-scroller),
.wiki-article__tabs :deep(.cdx-tabs__next-scroller) {
	min-width: 48px;
}

.wiki-article__tabs :deep(.cdx-tabs__scroll-button.cdx-button) {
	min-width: 48px;
	min-height: 48px;
	padding: 12px;
}
</style>

<style>
.wiki-article__summary a,
.wiki-article__tab-body a {
	color: var(--color-progressive) !important;
}
</style>
