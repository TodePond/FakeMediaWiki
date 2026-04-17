<template>
	<section class="ve-suggestions">
		<form class="controls" @submit.prevent="runAllSuggestions">
			<CdxLabel input-id="ve-page-title">Page title</CdxLabel>
			<div class="controls-row">
				<CdxTextInput
					id="ve-page-title"
					v-model="pageTitle"
					placeholder="Enter a page title"
					autocomplete="off"
				/>
				<CdxButton type="submit" :disabled="isLoading">Get suggestions</CdxButton>
				<CdxProgressIndicator v-if="isLoading" aria-label="Loading suggestions" />
			</div>
		</form>

		<p v-if="error" class="error">{{ error }}</p>

		<section v-if="hasRun" class="summary">
			<p>Total suggestions: {{ cards.length }}</p>
			<p>Methods completed: {{ completedMethodCount }} / {{ veMethods.length }}</p>
		</section>

		<section v-if="methodErrors.length > 0" class="method-errors">
			<h2>Method errors</h2>
			<ul>
				<li v-for="item in methodErrors" :key="item.methodName">
					<strong>{{ item.methodName }}:</strong> {{ item.message }}
				</li>
			</ul>
		</section>

		<section v-if="cards.length > 0" class="cards">
			<article
				v-for="card in cards"
				:key="card.cardId"
				class="suggestion-card suggestion-card--clickable"
			>
				<a
					class="suggestion-card__overlay-link"
					:href="card.cardLinkUrl"
					target="_blank"
					rel="noreferrer noopener"
					:aria-label="`Open ${card.heading}`"
				/>
				<div class="card-header">
					<div class="card-title-row">
						<p class="card-title">{{ card.heading }}</p>
						<div class="card-icons">
							<CdxIcon
								v-if="hasSeverityIcon(card.severity)"
								class="card-severity-icon"
								:class="`card-severity-icon--${card.severity}`"
								:icon="severityIcons[card.severity]"
							/>
							<img
								class="card-size-icon"
								:class="`card-size-icon--${card.changeSize}`"
								:src="changeSizeIcons[card.changeSize]"
								:alt="`${card.changeSize} change size`"
							/>
						</div>
					</div>
					<p class="card-description" v-html="card.descriptionHtml" />
				</div>
				<div v-if="card.renderedSnippetHtml" class="card-snippet" v-html="card.renderedSnippetHtml" />
			</article>
		</section>

		<p v-else-if="hasRun && !isLoading">No suggestions found for this page.</p>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { cdxIconAlert, cdxIconError } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWVeSuggestionItem, FWVeSuggestionResponse } from "fakewiki/types"
import { computed, onMounted, ref, watch } from "vue"
import difficultyEasyIcon from "./images/difficulty-easy.svg"
import difficultyMediumIcon from "./images/difficulty-medium.svg"
import difficultyHardIcon from "./images/difficulty-hard.svg"

type VeMethodDescriptor = {
	methodName: string
	run: (wiki: FakeWiki, pageTitle: string) => Promise<FWVeSuggestionResponse>
}

type SectionRange = {
	title: string
	startOffset: number
	endOffset: number
}

type SuggestionCard = {
	cardId: string
	suggestionType: string
	heading: string
	descriptionHtml: string
	rawSnippetWikitext: string
	renderedSnippetHtml: string
	severity: FWVeSuggestionItem["severity"] | null
	changeSize: "easy" | "medium" | "hard"
	cardLinkUrl: string
}

const wiki = new FakeWiki()
const STORAGE_KEY = "ve-suggestions-state-v1"

const pageTitle = ref("Wet Leg")
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasRun = ref(false)
const cards = ref<SuggestionCard[]>([])
const completedMethodCount = ref(0)
const methodErrors = ref<Array<{ methodName: string; message: string }>>([])

type StoredState = {
	pageTitle: string
	hasRun: boolean
	cards: SuggestionCard[]
	completedMethodCount: number
	methodErrors: Array<{ methodName: string; message: string }>
}

const veMethods: VeMethodDescriptor[] = [
	{
		methodName: "getVeToneSuggestions",
		run: (client, title) =>
			client.getVeToneSuggestions(title, { threshold: 0.8, maxCandidates: 20 }),
	},
	{
		methodName: "getVeTextMatchSuggestions",
		run: (client, title) => client.getVeTextMatchSuggestions(title),
	},
	{
		methodName: "getVeExternalLinkSuggestions",
		run: (client, title) => client.getVeExternalLinkSuggestions(title),
	},
	{
		methodName: "getVeDuplicateLinkSuggestions",
		run: (client, title) => client.getVeDuplicateLinkSuggestions(title, { scope: "paragraph" }),
	},
	{
		methodName: "getVeDisambiguationSuggestions",
		run: (client, title) => client.getVeDisambiguationSuggestions(title),
	},
	{
		methodName: "getVeAddReferenceSuggestions",
		run: (client, title) => client.getVeAddReferenceSuggestions(title),
	},
	{
		methodName: "getVeImageCaptionSuggestions",
		run: (client, title) => client.getVeImageCaptionSuggestions(title),
	},
	{
		methodName: "getVeYearLinkSuggestions",
		run: (client, title) => client.getVeYearLinkSuggestions(title),
	},
	{
		methodName: "getVeConvertReferenceSuggestions",
		run: (client, title) =>
			client.getVeConvertReferenceSuggestions(title, { strict: "url-only" }),
	},
	{
		methodName: "getVeCitationNeededSuggestions",
		run: (client, title) => client.getVeCitationNeededSuggestions(title),
	},
	{
		methodName: "getVeDoubleBoldSuggestions",
		run: (client, title) => client.getVeDoubleBoldSuggestions(title),
	},
	{
		methodName: "getVeRequiredTemplateParamSuggestions",
		run: (client, title) => client.getVeRequiredTemplateParamSuggestions(title),
	},
	{
		methodName: "getVeRedirectSuggestions",
		run: (client, title) => client.getVeRedirectSuggestions(title),
	},
	{
		methodName: "getVeSuggestedLinkSuggestions",
		run: (client, title) => client.getVeSuggestedLinkSuggestions(title, { threshold: 0.8 }),
	},
	{
		methodName: "getVeFakeHeadingSuggestions",
		run: (client, title) => client.getVeFakeHeadingSuggestions(title),
	},
]

const trimmedPageTitle = computed(() => pageTitle.value.trim())
const severityIcons: Record<"medium" | "high", typeof cdxIconAlert> = {
	medium: cdxIconAlert,
	high: cdxIconError,
}

const changeSizeIcons: Record<"easy" | "medium" | "hard", string> = {
	easy: difficultyEasyIcon,
	medium: difficultyMediumIcon,
	hard: difficultyHardIcon,
}

const changeSizeBySuggestionType: Record<string, "easy" | "medium" | "hard"> = {
	addReference: "medium",
	citationNeeded: "medium",
	convertReference: "easy",
	disambiguation: "easy",
	doubleBold: "easy",
	duplicateLink: "easy",
	externalLink: "easy",
	fakeHeading: "easy",
	imageCaption: "medium",
	redirect: "easy",
	requiredTemplateParam: "medium",
	suggestedLink: "easy",
	textMatch: "hard",
	tone: "hard",
	yearLink: "easy",
}

function hasSeverityIcon(
	severity: FWVeSuggestionItem["severity"] | null
): severity is "medium" | "high" {
	return severity === "medium" || severity === "high"
}
type DescriptionContext = {
	suggestion: FWVeSuggestionItem
	selectedCandidate: {
		id: string
		text?: string
		context?: string
		data?: Record<string, unknown>
	} | null
}

type SuggestionDisplayConfig = {
	heading: string
	description: (context: DescriptionContext) => string
}

const DISPLAY_BY_TYPE: Record<string, SuggestionDisplayConfig> = {
	addReference: {
		heading: "Add reference",
		description: () => "Help explain where this information is coming from.",
	},
	citationNeeded: {
		heading: "Add citation needed",
		description: () => "Flag this statement as needing a source.",
	},
	convertReference: {
		heading: "Convert reference",
		description: () => "Replace this with a formatted reference.",
	},
	disambiguation: {
		heading: "Fix disambiguation link",
		description: context => createTargetDescription("Link to", context),
	},
	doubleBold: {
		heading: "Remove bold formatting",
		description: () => "Avoid extra emphasis in this part of the article.",
	},
	duplicateLink: {
		heading: "Remove duplicate link",
		description: context => createTargetDescription("Link to", context),
	},
	externalLink: {
		heading: "Remove external link",
		description: () => "Keep external links out of body text where possible.",
	},
	fakeHeading: {
		heading: "Convert fake heading",
		description: () => "Use a real section heading format instead.",
	},
	imageCaption: {
		heading: "Improve image caption",
		description: () => "Make the caption more descriptive for readers.",
	},
	redirect: {
		heading: "Replace redirect link",
		description: context => createRedirectDescription(context),
	},
	requiredTemplateParam: {
		heading: "Add missing information",
		description: context => createRequiredTemplateParamDescription(context),
	},
	suggestedLink: {
		heading: "Add link",
		description: context => createTargetDescription("Consider linking to", context),
	},
	textMatch: {
		heading: "Rewrite flagged text",
		description: () => "Replace language that may need improvement.",
	},
	tone: {
		heading: "Adjust tone",
		description: () => "Make this wording more neutral and encyclopedic.",
	},
	yearLink: {
		heading: "Fix year link",
		description: () => "Match the linked year to the intended text.",
	},
}

function saveState(): void {
	const state: StoredState = {
		pageTitle: pageTitle.value,
		hasRun: hasRun.value,
		cards: cards.value,
		completedMethodCount: completedMethodCount.value,
		methodErrors: methodErrors.value,
	}
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	} catch {
		// Ignore storage failures (quota/private mode).
	}
}

function loadState(): void {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return
		const parsed = JSON.parse(raw) as Partial<StoredState>
		pageTitle.value = typeof parsed.pageTitle === "string" ? parsed.pageTitle : pageTitle.value
		hasRun.value = Boolean(parsed.hasRun)
		cards.value = Array.isArray(parsed.cards)
			? parsed.cards.map(card => {
					const value = card as Partial<SuggestionCard>
					return {
						cardId: value.cardId ?? "",
						suggestionType: value.suggestionType ?? "",
						heading: value.heading ?? "Suggestion",
						descriptionHtml: value.descriptionHtml ?? "",
						rawSnippetWikitext: value.rawSnippetWikitext ?? "",
						renderedSnippetHtml:
							value.renderedSnippetHtml ?? value.rawSnippetWikitext ?? "",
						severity:
							value.severity === "low" ||
							value.severity === "medium" ||
							value.severity === "high" ?
								value.severity
							:	null,
						changeSize:
							value.changeSize === "easy" ||
							value.changeSize === "medium" ||
							value.changeSize === "hard" ?
								value.changeSize
							:	"medium",
						cardLinkUrl:
							typeof value.cardLinkUrl === "string" && value.cardLinkUrl ?
								value.cardLinkUrl
							:	wiki.getPageUrl(pageTitle.value),
					}
				})
			: []
		completedMethodCount.value =
			typeof parsed.completedMethodCount === "number" ? parsed.completedMethodCount : 0
		methodErrors.value = Array.isArray(parsed.methodErrors) ? parsed.methodErrors : []
	} catch {
		// Ignore malformed state and keep defaults.
	}
}

function formatSuggestionType(suggestionType: string): string {
	const withSpaces = suggestionType
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim()
	if (!withSpaces) return "Suggestion"
	return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

function toSectionHash(sectionTitle: string): string {
	const normalized = sectionTitle.trim().replaceAll(" ", "_")
	if (!normalized) return ""
	return encodeURIComponent(normalized)
}

function resolveBestEffortCardLink(
	pageTitle: string,
	context: DescriptionContext,
	_suggestionType: string,
	sectionTitleMap: Map<string, string>,
	sectionRanges: SectionRange[],
	pageSource: string,
	rawSnippet: string
): string {
	const baseUrl = wiki.getPageUrl(pageTitle)
	const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
	const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
	const sectionHintRaw =
		(typeof suggestionData?.section === "string" && suggestionData.section) ||
		(typeof candidateData?.section === "string" && candidateData.section) ||
		(typeof suggestionData?.sectionTitle === "string" && suggestionData.sectionTitle) ||
		(typeof candidateData?.sectionTitle === "string" && candidateData.sectionTitle) ||
		""
	const sectionHint = sectionHintRaw.trim()
	if (sectionHint && sectionHint.toLowerCase() !== "lead") {
		const exactSectionTitle = sectionTitleMap.get(sectionHint.toLowerCase()) ?? sectionHint
		const hash = toSectionHash(exactSectionTitle)
		return hash ? `${baseUrl}#${hash}` : baseUrl
	}
	// Fallback: infer nearest section from snippet location in source.
	if (rawSnippet && pageSource && sectionRanges.length > 0) {
		const exactOffset = pageSource.indexOf(rawSnippet)
		if (exactOffset >= 0) {
			const section = sectionRanges.find(
				range => exactOffset >= range.startOffset && exactOffset < range.endOffset
			)
			if (section?.title) {
				const hash = toSectionHash(section.title)
				if (hash) return `${baseUrl}#${hash}`
			}
		}
	}
	// Fuzzy fallback for whitespace-normalized snippets.
	if (rawSnippet && pageSource && sectionRanges.length > 0) {
		const compactSnippet = rawSnippet.replace(/\s+/g, " ").trim()
		if (compactSnippet) {
			const compactSource = pageSource.replace(/\s+/g, " ")
			const compactOffset = compactSource.indexOf(compactSnippet)
			if (compactOffset >= 0 && compactSource.length > 0) {
				const approxOffset = Math.floor((compactOffset / compactSource.length) * pageSource.length)
				const section = sectionRanges.find(
					range => approxOffset >= range.startOffset && approxOffset < range.endOffset
				)
				if (section?.title) {
					const hash = toSectionHash(section.title)
					if (hash) return `${baseUrl}#${hash}`
				}
			}
		}
	}
	const hash = ""
	return hash ? `${baseUrl}#${hash}` : baseUrl
}

function getTargetLabel(context: DescriptionContext): string | null {
	const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
	const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
	const target =
		(typeof suggestionData?.target === "string" && suggestionData.target) ||
		(typeof candidateData?.target === "string" && candidateData.target) ||
		null
	return target?.trim() || null
}

function createTargetDescription(prefix: string, context: DescriptionContext): string {
	const targetLabel = getTargetLabel(context)
	if (!targetLabel) return `${prefix} related article.`
	const href = escapeHtml(wiki.getPageUrl(targetLabel))
	const text = escapeHtml(targetLabel)
	return `${prefix} <a href="${href}" target="_blank" rel="noreferrer noopener">${text}</a>.`
}

function createRedirectDescription(context: DescriptionContext): string {
	const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
	const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
	const fromTarget =
		(typeof suggestionData?.target === "string" && suggestionData.target.trim()) ||
		(typeof candidateData?.target === "string" && candidateData.target.trim()) ||
		"this link"
	const toTarget =
		(typeof suggestionData?.finalTarget === "string" && suggestionData.finalTarget.trim()) || ""
	const fromHref = escapeHtml(wiki.getPageUrl(fromTarget))
	const fromText = escapeHtml(fromTarget)
	if (!toTarget) {
		return `Change link from <a href="${fromHref}" target="_blank" rel="noreferrer noopener">${fromText}</a>.`
	}
	const toHref = escapeHtml(wiki.getPageUrl(toTarget))
	const toText = escapeHtml(toTarget)
	return `Change link from <a href="${fromHref}" target="_blank" rel="noreferrer noopener">${fromText}</a> to <a href="${toHref}" target="_blank" rel="noreferrer noopener">${toText}</a>.`
}

function createRequiredTemplateParamDescription(context: DescriptionContext): string {
	const suggestionData = context.suggestion.data as Record<string, unknown> | undefined
	const templateRaw = typeof suggestionData?.template === "string" ? suggestionData.template.trim() : ""
	const templateCore = templateRaw.replace(/^Template:/i, "").trim()
	const templatePageTitle = templateCore ? `Template:${templateCore}` : ""
	const templateHref =
		templatePageTitle ? escapeHtml(wiki.getPageUrl(templatePageTitle)) : ""
	const templateLabel = escapeHtml(templateCore || templateRaw || "this template")
	const emptyNamedParams =
		Array.isArray(suggestionData?.emptyNamedParams) ?
			suggestionData.emptyNamedParams
				.filter((value): value is string => typeof value === "string")
				.map(value => value.trim())
				.filter(Boolean)
		:	[]
	const allowedFieldNames = new Set(["website"])
	const allowedMissingFields = emptyNamedParams.filter(field =>
		allowedFieldNames.has(field.toLowerCase())
	)
	const fieldSummary =
		allowedMissingFields.length === 1 ?
			`the missing ${escapeHtml(allowedMissingFields[0] ?? "")} field`
		:	emptyNamedParams.length === 0 ?
			"a missing field"
		:	emptyNamedParams.length === 1 ?
			"a missing field"
		:	"missing fields"
	if (!templateHref) {
		return `Complete the ${templateLabel} template by adding ${fieldSummary}.`
	}
	return `Complete the <a href="${templateHref}" target="_blank" rel="noreferrer noopener">${templateLabel}</a> template by adding ${fieldSummary}.`
}

function getTemplateTitleSnippet(context: DescriptionContext): string | null {
	const candidateData = context.selectedCandidate?.data as Record<string, unknown> | undefined
	const invocation = typeof candidateData?.invocation === "string" ? candidateData.invocation : ""
	if (!invocation) return null
	const match = invocation.match(/\|\s*title\s*=\s*([^|}]+)/i)
	const title = (match?.[1] ?? "").trim()
	return title || null
}

async function buildCard(
	methodName: string,
	pageTitle: string,
	response: FWVeSuggestionResponse,
	suggestion: FWVeSuggestionItem,
	index: number,
	sectionTitleMap: Map<string, string>,
	sectionRanges: SectionRange[],
	pageSource: string
): Promise<SuggestionCard> {
	const selectedCandidate =
		response.candidates.find(candidate => candidate.id === suggestion.id) ??
		response.candidates[0] ??
		null
	console.log("[EditSuggestions] chosen suggestion", {
		methodName,
		suggestionType: response.suggestionType,
		suggestion,
	})
	console.log("[EditSuggestions] selected candidate", {
		methodName,
		suggestionType: response.suggestionType,
		candidate: selectedCandidate,
	})
	const display = DISPLAY_BY_TYPE[response.suggestionType] ?? {
		heading: formatSuggestionType(response.suggestionType),
		description: () => "Help explain where this information is coming from.",
	}
	const context = { suggestion, selectedCandidate }
	const rawSnippet =
		response.suggestionType === "requiredTemplateParam" ?
			getTemplateTitleSnippet(context)
		:	(selectedCandidate?.text?.trim() || suggestion.message || "Snippet unavailable.")
	let renderedSnippetHtml = ""
	if (rawSnippet) {
		renderedSnippetHtml = rawSnippet
		try {
			renderedSnippetHtml = await wiki.transformWikitextToHtml(rawSnippet, pageTitle)
		} catch {
			renderedSnippetHtml = rawSnippet
		}
	}
	return {
		cardId: `${methodName}-${suggestion.id}-${index}`,
		suggestionType: response.suggestionType,
		heading: display.heading,
		descriptionHtml: display.description(context),
		rawSnippetWikitext: rawSnippet ?? "",
		renderedSnippetHtml,
		severity: suggestion.severity ?? null,
		changeSize: changeSizeBySuggestionType[response.suggestionType] ?? "medium",
		cardLinkUrl: resolveBestEffortCardLink(
			pageTitle,
			context,
			response.suggestionType,
			sectionTitleMap,
			sectionRanges,
			pageSource,
			rawSnippet ?? ""
		),
	}
}

function buildSectionTitleMap(source: string): Map<string, string> {
	const out = new Map<string, string>()
	const headingRegex = /^==+\s*(.*?)\s*==+\s*$/gm
	let match: RegExpExecArray | null
	while ((match = headingRegex.exec(source)) !== null) {
		const exactTitle = (match[1] ?? "").trim()
		if (!exactTitle) continue
		out.set(exactTitle.toLowerCase(), exactTitle)
	}
	return out
}

function buildSectionRanges(source: string): SectionRange[] {
	const headings: Array<{ title: string; offset: number }> = []
	const headingRegex = /^==+\s*(.*?)\s*==+\s*$/gm
	let match: RegExpExecArray | null
	while ((match = headingRegex.exec(source)) !== null) {
		const title = (match[1] ?? "").trim()
		if (!title) continue
		headings.push({ title, offset: match.index })
	}
	if (headings.length === 0) return []
	const out: SectionRange[] = [
		{
			title: "",
			startOffset: 0,
			endOffset: headings[0]?.offset ?? source.length,
		},
	]
	for (let i = 0; i < headings.length; i++) {
		const current = headings[i]
		if (!current) continue
		const next = headings[i + 1]
		out.push({
			title: current.title,
			startOffset: current.offset,
			endOffset: next?.offset ?? source.length,
		})
	}
	return out
}

async function runAllSuggestions(): Promise<void> {
	if (!trimmedPageTitle.value) {
		error.value = "Please enter a page title."
		return
	}
	isLoading.value = true
	error.value = null
	hasRun.value = false
	cards.value = []
	methodErrors.value = []
	completedMethodCount.value = 0
	try {
		let sectionTitleMap = new Map<string, string>()
		let sectionRanges: SectionRange[] = []
		let pageSource = ""
		try {
			pageSource = await wiki.getPageSource(trimmedPageTitle.value)
			sectionTitleMap = buildSectionTitleMap(pageSource)
			sectionRanges = buildSectionRanges(pageSource)
		} catch {
			sectionTitleMap = new Map<string, string>()
			sectionRanges = []
			pageSource = ""
		}
		for (const method of veMethods) {
			try {
				const response = await method.run(wiki, trimmedPageTitle.value)
				const methodCards: SuggestionCard[] = []
				for (let index = 0; index < response.suggestions.length; index++) {
					const suggestion = response.suggestions[index]
					if (!suggestion) continue
					const card = await buildCard(
						method.methodName,
						trimmedPageTitle.value,
						response,
						suggestion,
						index,
						sectionTitleMap,
						sectionRanges,
						pageSource
					)
					methodCards.push(card)
				}
				cards.value.push(...methodCards)
			} catch (caught) {
				const message = caught instanceof Error ? caught.message : String(caught)
				methodErrors.value.push({ methodName: method.methodName, message })
			}
			completedMethodCount.value += 1
		}
		const severityRank: Record<"high" | "medium" | "low", number> = {
			high: 3,
			medium: 2,
			low: 1,
		}
		cards.value = cards.value
			.map((card, index) => ({ card, index }))
			.sort((a, b) => {
				const rankA = a.card.severity ? (severityRank[a.card.severity] ?? 0) : 0
				const rankB = b.card.severity ? (severityRank[b.card.severity] ?? 0) : 0
				if (rankA !== rankB) return rankB - rankA
				return a.index - b.index
			})
			.map(item => item.card)
		hasRun.value = true
		saveState()
	} catch (caught) {
		error.value = caught instanceof Error ? caught.message : String(caught)
	} finally {
		isLoading.value = false
		saveState()
	}
}

onMounted(() => {
	loadState()
})

watch(pageTitle, () => {
	saveState()
})
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
