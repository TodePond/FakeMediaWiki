<template>
	<nav v-if="sectionNavCount > 0" class="rds-endpoint-fab" aria-label="Section headings">
		<CdxButton
			class="rds-endpoint-fab__btn"
			weight="quiet"
			:aria-label="'Previous section heading'"
			:disabled="!sectionsCanStep || atFirstSection"
			@click="scrollToAdjacentSectionHeading('prev')"
		>
			<CdxIcon :icon="cdxIconArrowUp" size="small" />
		</CdxButton>
		<CdxButton
			class="rds-endpoint-fab__btn"
			weight="quiet"
			:aria-label="'Next section heading'"
			:disabled="!sectionsCanStep || atLastSection"
			@click="scrollToAdjacentSectionHeading('next')"
		>
			<CdxIcon :icon="cdxIconArrowDown" size="small" />
		</CdxButton>
	</nav>
	<article ref="articleRef" class="rds-article" aria-label="Wiki signals">
		<h1>Wiki signals</h1>
		<header class="rds-header">
			<nav class="rds-toc" aria-label="Table of contents">
				<div v-for="f in data.files" :key="f.slug" class="rds-toc__group">
					<a :href="`#${f.slug}`" class="rds-toc__file">{{ f.title }}</a>
					<ul>
						<li v-for="sec in f.sections" :key="sec.id">
							<a :href="`#${sec.anchor}`">{{ sec.titleText }}</a>
						</li>
					</ul>
				</div>
			</nav>
		</header>

		<template v-for="f in data.files" :key="f.slug">
			<section :id="f.slug" class="rds-file">
				<div class="rds-h1" v-html="md.render(`# ${f.title}`)" />
				<div v-if="f.preamble" class="rds-md" v-html="md.render(f.preamble)" />

				<template v-for="sec in f.sections" :key="sec.id">
					<section :id="sec.anchor" class="rds-section">
						<div class="rds-h2" v-html="md.render(`${sec.headingLine}\n`)" />
						<template v-for="(seg, si) in sec.segments" :key="`${sec.id}-${si}`">
							<div
								v-if="seg.type === 'markdown'"
								class="rds-md"
								v-html="md.render(seg.content + '\n')"
							/>
							<RunRequestBlock
								v-else
								:request-bash="seg.requestBash"
								:response-json="seg.responseJson"
							/>
						</template>
					</section>
				</template>
			</section>
		</template>
	</article>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon } from "@wikimedia/codex"
import { cdxIconArrowDown, cdxIconArrowUp } from "@wikimedia/codex-icons"
import MarkdownIt from "markdown-it"
import { computed, onMounted, onUpdated, ref } from "vue"
import rawData from "./generated/sections.json"
import RunRequestBlock from "./RunRequestBlock.vue"
import { type SectionsPayload } from "./types"

const data = rawData as SectionsPayload

const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: true })

const articleRef = ref<HTMLElement | null>(null)
const sectionNavCount = ref(0)
const scrollTick = ref(0)

/** One `.rds-h2` per doc section; contains the section `h2` title (same targets as the ToC). */
function getSectionHeadingEls(): HTMLElement[] {
	const root = articleRef.value
	if (!root) return []
	return [...root.querySelectorAll<HTMLElement>(".rds-section .rds-h2")]
}

function recomputeSectionNavCount() {
	sectionNavCount.value = getSectionHeadingEls().length
}

onUpdated(recomputeSectionNavCount)

onMounted(() => {
	recomputeSectionNavCount()
	const bump = () => {
		scrollTick.value++
	}
	window.addEventListener("scroll", bump, { passive: true, capture: true })
	window.addEventListener("resize", bump, { passive: true })
	return () => {
		window.removeEventListener("scroll", bump, { capture: true } as AddEventListenerOptions)
		window.removeEventListener("resize", bump)
	}
})

const sectionsCanStep = computed(() => sectionNavCount.value > 1)

const navEdges = computed(() => {
	scrollTick.value
	const els = getSectionHeadingEls()
	const n = els.length
	if (n === 0) {
		return { atFirst: true, atLast: true }
	}
	const i = currentSectionHeadingIndex(els)
	/* i < 0: viewport is above the first h2; i === 0: on first section */
	return { atFirst: i < 1, atLast: i === n - 1 }
})

const atFirstSection = computed(() => navEdges.value.atFirst)
const atLastSection = computed(() => navEdges.value.atLast)

const ALIGN_TOP_PX = 100

/**
 * Last section whose heading is at/above the fold line, or -1 if the viewport is still above
 * all section h2s (e.g. at page top: h1/ToC push the first h2 below `ALIGN_TOP_PX`).
 */
function currentSectionHeadingIndex(els: HTMLElement[]): number {
	let cur = -1
	for (let j = 0; j < els.length; j++) {
		const t = els[j]!.getBoundingClientRect().top
		if (t <= ALIGN_TOP_PX) {
			cur = j
		}
	}
	return cur
}

function scrollToAdjacentSectionHeading(dir: "prev" | "next") {
	const els = getSectionHeadingEls()
	if (els.length === 0) return
	const i = currentSectionHeadingIndex(els)
	if (i < 0) {
		if (dir === "next") {
			els[0]?.scrollIntoView({ behavior: "auto", block: "start" })
		}
		return
	}
	const nextIndex =
		dir === "next" ? Math.min(els.length - 1, i + 1) : Math.max(0, i - 1)
	els[nextIndex]?.scrollIntoView({ behavior: "auto", block: "start" })
}
</script>

<style scoped>
.rds-endpoint-fab {
	position: fixed;
	top: 0.5rem;
	right: 0.5rem;
	z-index: 2;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	padding: 0.25rem;
	border-radius: var(--border-radius-base, 2px);
	background-color: var(--background-color-subtle, #f8f9fa);
	border: 1px solid var(--border-color-muted, #dadde3);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.rds-endpoint-fab__btn {
	min-width: 2.25rem;
	min-height: 2.25rem;
	padding: 0.25rem;
}
.rds-article {
	box-sizing: border-box;
	width: 100%;
	max-width: min(1000px, 100%);
	margin: 0 auto;
	min-width: 0;
	padding-inline: clamp(0.5rem, 4vw, var(--spacing-150, 1.5rem));
	padding-block: var(--spacing-150, 1.5rem);
}
.rds-header {
	margin-bottom: 1.5rem;
}
.rds-toc {
	margin-top: 1rem;
}
.rds-toc__file {
	font-weight: 600;
}
.rds-toc__group {
	margin-bottom: 0.75rem;
}
.rds-toc ul {
	margin: 0.25rem 0 0 1.25rem;
}
.rds-file {
	margin-bottom: 2.5rem;
}
.rds-section {
	margin: 1.5rem 0 2rem;
	scroll-margin-top: 0.5rem;
}
/* Prose: long inline `` `...` `` URLs must wrap; wiki `load.css` can leave code unbounded. */
.rds-md {
	min-width: 0;
	overflow-x: auto;
}
/* Section copy often ends with markdown `---`; it becomes <hr> and reads as a rule between h2 blocks. */
:deep(.rds-md) hr {
	display: none;
}
:deep(.rds-md p) {
	margin: 0.5em 0;
}
:deep(.rds-md code) {
	display: inline-block;
	max-width: 100%;
	box-sizing: border-box;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	word-break: break-word;
	vertical-align: bottom;
}
:deep(.rds-md ul),
:deep(.rds-h2 li) {
	margin: 0.35em 0 0.35em 1.25em;
}
:deep(.rds-h1) h1,
.rds-h1 {
	font-size: var(--font-size-xxxlarge, 1.75rem);
	margin: 0 0 0.5em;
}
:deep(.rds-h2) h2,
.rds-h2 {
	font-size: var(--font-size-xlarge, 1.3rem);
	margin: 0 0 0.5em;
	scroll-margin-top: 0.5rem;
}
/* Match RunRequestBlock: one box for fenced blocks, not wiki `code` on every line. */
:deep(.rds-md pre) {
	box-sizing: border-box;
	display: block;
	white-space: pre;
	tab-size: 4;
	width: 100%;
	max-width: 100%;
	min-width: 0;
	max-height: min(50vh, 28rem);
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	padding: 1em;
	font-family: monospace, monospace;
	font-size: 0.92em;
	line-height: 1.4;
}
:deep(.rds-md pre code) {
	display: block;
	margin: 0;
	padding: 0;
	background: none !important;
	border: none !important;
	border-radius: 0 !important;
	max-width: none;
	white-space: pre;
	overflow-wrap: normal;
	word-break: normal;
	font-family: inherit;
	font-size: inherit;
}
</style>
