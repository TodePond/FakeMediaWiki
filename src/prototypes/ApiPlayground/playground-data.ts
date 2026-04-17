/**
 * Merges fakewiki playground-schema (generated from FakeWiki.ts + TSDoc) with playground-overrides.
 * Single source of truth: method names and param names/descriptions from schema; UI hints from overrides.
 */

import { playgroundSchema } from "fakewiki/playground-schema"
import { playgroundOverrides } from "fakewiki/playground-overrides"

export type ParamType =
	| "string"
	| "number"
	| "boolean"
	| "enum"
	| "date"
	| "json"
	| "stringArray"
	| "numberArray"

export type ParamDescriptor = {
	key: string
	label?: string
	type: ParamType
	default?: string | number | boolean
	options?: string[]
}

export type MethodDescriptor = {
	name: string
	description?: string
	category: string
	params: ParamDescriptor[]
	optionsParamKeys?: string[]
	resultHint?: "table" | "object" | "code" | "image" | "json"
}

const NUMBER_KEYS = new Set([
	"limit",
	"revId",
	"k",
	"days",
	"fromRevId",
	"toRevId",
	"revisionId",
	"ucstart",
	"ucend",
	"type",
	"namespace",
	"offset",
	"backlinkLimit",
	"percentage",
	"highlightCount",
	"delta",
	"count",
	"concurrency",
])
const STRING_ARRAY_KEYS = new Set(["userNames", "pageNames", "pageTitles", "models"])
const NUMBER_ARRAY_KEYS = new Set(["revisionIds"])
const BOOLEAN_KEYS = new Set([
	"showOutgoing",
	"showIncoming",
	"improvedDeltaEnabled",
	"relativeDetailLevelEnabled",
	"smartFilteringEnabled",
	"withSign",
])

/** Sensible defaults so "Run" works out of the box. Matches placeholders used in other prototypes (Wet Leg, Wikipedia, Todepond, etc.). */
const SENSIBLE_DEFAULTS: Record<string, string | number | boolean> = {
	pageName: "Wet Leg",
	targetPageName: "Wet Leg",
	pageTitle: "Wet Leg",
	query: "Wet Leg",
	limit: 20,
	userName: "Samwalton9",
	userNames: "Todepond, Samwalton9",
	pageNames: "Wet Leg, Confidence Man (band)",
	pageTitles: "Wet Leg, Confidence Man (band)",
	lang: "en",
	wikitext: "Hello '''world'''",
	summary: "Fix typo",
	revId: 1337619110,
	revisionId: 1337619110,
	fromRevId: 1336311016,
	toRevId: 1337619110,
	k: 10,
	days: 7,
	after: "",
	older_than: "",
	newer_than: "",
	from: "",
	showOutgoing: true,
	showIncoming: true,
	improvedDeltaEnabled: true,
	relativeDetailLevelEnabled: true,
	smartFilteringEnabled: true,
	withSign: true,
	qid: "",
	revisionIds: "1337619110",
	wiki: "",
}
const METHOD_PARAM_DEFAULTS: Record<string, Record<string, string | number | boolean>> = {
	transformWikitextToHtml: { pageTitle: "Main_Page" },
	getRandomPage: { format: "summary" },
	getOnThisDay: { type: "events" },
	getFeaturedPage: { date: "" },
	getAnnouncements: {},
	getTopRelatedChanges: { percentage: 1 },
	getTopRelatedPages: { percentage: 1 },
	getMoreLikePages: { pageTitles: "Wet Leg, Rizzle Kicks, Jade Thirlwall", limit: 10 },
	encode: { slug: "Wet Leg" },
	getCombinedFeed: { limit: 20, after: "{}" },
	getDaysOfActivity: { registrationDate: "2025-02-26T10:30:00Z" },
	getDeltaClass: { delta: 42 },
	getStorageKey: { prototypeName: "PageFeed", keyName: "searchQuery" },
	getStorageKeys: { prototypeName: "PageFeed", keyName: "searchQuery", count: 3 },
	createResults: { count: 3 },
	getTableFromEditSummary: {
		editSummary:
			"Alter: template type, title. Add: journal, authors 1-1. Removed parameters. Some additions/deletions were parameter name changes. | [[User:UcuchaBot|Use this bot]]. [[User talk:Ucucha|Report bugs]]. | Suggested by Abductive | #UCB_toolbar",
	},
	isToday: { timestamp: "2026-02-26T10:30:00Z" },
	parseToolbarEditSummary: {
		editSummary:
			"Alter: template type, title. Add: journal, authors 1-1. Removed parameters. Some additions/deletions were parameter name changes. | [[User:UcuchaBot|Use this bot]]. [[User talk:Ucucha|Report bugs]]. | Suggested by Abductive | #UCB_toolbar",
	},
	preprocessEditSummary: { summary: "/* History */ Fix typo" },
	runWithConcurrency: {
		items: "[1,2,3]",
		concurrency: 2,
		fn: "async (item) => item",
	},
	formatDate: { timestamp: "2026-02-26T10:30:00Z", style: "long" },
	toDateKey: { timestamp: "2026-02-26T10:30:00Z" },
	formatTime: { timestamp: "2026-02-26T10:30:00Z" },
	formatRelativeTimestamp: {
		timestamp: "2026-02-26T10:30:00Z",
		seconds: "words",
		minutes: "minutes",
		hours: "hours",
		days: "days",
		weeks: "weeks",
		months: "months",
		years: "years",
	},
	formatNiceRelativeTimestamp: { timestamp: "2026-02-26T10:30:00Z" },
	formatDelta: { delta: 42 },
	searchUsers: { query: "Samwalton9" },
	searchUsersWithAvatars: { query: "Samwalton9" },
	getRevisionPredictions: { models: "damaging, goodfaith, revertrisk, revertrisk-multilingual" },
	compareRevisions: { fromRevId: 1336311016, toRevId: 1337619110 },
	getRevisionUrl: { id: 1337619110 },
	getAssetUrlFromUploadUrl: {
		uploadUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/File.jpg/640px-File.jpg",
	},
	getRevisionDiff: { pageName: "Corsica Studios", revId: 1337619110 },
	getParentRevisionId: { pageName: "Corsica Studios", revId: 1337619110 },
	getDiffLineSegments: {
		line: '{"type":1,"text":"Example text","highlightRanges":[{"start":0,"length":7,"type":0}]}',
	},
	getStructuredDeltasFromSummary: {
		summary: '{"Sentence":{"change":1},"Punctuation":{"remove":1}}',
	},
	getToneCheckPrediction: {
		originalText: "The band formed in 2020.",
		modifiedText: "The band is the most talented and revolutionary group of our generation.",
		lang: "en",
		pageTitle: "Example band",
	},
	getToneCheckForRevision: {
		pageName: "Corsica Studios",
		revId: 1337619110,
		lang: "en",
		pageTitle: "Corsica Studios",
	},
	getVeToneSuggestions: {
		pageTitle: "Artificial intelligence",
		threshold: 0.8,
		maxCandidates: 20,
	},
	getVeTextMatchSuggestions: {
		pageTitle: "Ips pini",
	},
	getVeExternalLinkSuggestions: {
		pageTitle: "Live coding",
	},
	getVeDuplicateLinkSuggestions: {
		pageTitle: "Little Mix",
		scope: "paragraph",
	},
	getVeDisambiguationSuggestions: {
		pageTitle: "United Kingdom",
	},
	getVeAddReferenceSuggestions: {
		pageTitle: "Wet Leg",
	},
	getVeYearLinkSuggestions: {
		pageTitle: "United States",
	},
	getVeConvertReferenceSuggestions: {
		pageTitle: "Wet Leg",
		strict: "url-only",
	},
	getVeCitationNeededSuggestions: {
		pageTitle: "United Kingdom",
	},
	getVeDoubleBoldSuggestions: {
		pageTitle: "Glossary of mathematics",
	},
	getVeRedirectSuggestions: {
		pageTitle: "Wet Leg",
	},
	getVeSuggestedLinkSuggestions: {
		pageTitle: "Wet Leg",
		threshold: 0.8,
	},
	getVeFakeHeadingSuggestions: {
		pageTitle: "Wet Leg",
	},
	normalizeStructuredDeltaSummary: {
		raw: '{"summary":{"Sentence":{"change":2,"remove":1},"Punctuation":{"remove":1},"Whitespace":{"change":1},"Comment":{"insert":"2"}},"debug":{"traceId":"demo"}}',
	},
	groupRevisionsByDate: {
		revisions:
			'[{"id":1337619110,"timestamp":"2026-02-26T10:30:00Z","user":{"name":"Samwalton9"},"delta":42,"comment":"Example summary","pageName":"Wet Leg"},{"id":1337619100,"timestamp":"2026-02-26T09:15:00Z","user":{"name":"Todepond"},"delta":-5,"comment":"Another example","pageName":"Confidence Man (band)"}]',
	},
}

const METHOD_CATEGORY_OVERRIDES: Record<string, string> = {
	getAnnouncements: "Pages and content",
	getCombinedFeed: "Revisions and diffs",
	getRecentChanges: "Revisions and diffs",
	getDaysOfActivity: "Users",
	getDeltaClass: "Revisions and diffs",
	getEditSummaryHtml: "Formatting",
	getShortDescription: "Pages and content",
	getToneCheckPrediction: "Predictions",
	getToneCheckForRevision: "Predictions",
	getVeToneSuggestions: "Suggestions",
	getVeTextMatchSuggestions: "Suggestions",
	getVeExternalLinkSuggestions: "Suggestions",
	getVeDuplicateLinkSuggestions: "Suggestions",
	getVeDisambiguationSuggestions: "Suggestions",
	getVeAddReferenceSuggestions: "Suggestions",
	getVeImageCaptionSuggestions: "Suggestions",
	getVeYearLinkSuggestions: "Suggestions",
	getVeConvertReferenceSuggestions: "Suggestions",
	getVeCitationNeededSuggestions: "Suggestions",
	getVeDoubleBoldSuggestions: "Suggestions",
	getVeRequiredTemplateParamSuggestions: "Suggestions",
	getVeRedirectSuggestions: "Suggestions",
	getVeSuggestedLinkSuggestions: "Suggestions",
	getVeFakeHeadingSuggestions: "Suggestions",
	getMediawikiBase: "URLs",
	getOnThisDay: "Pages and content",
	getTableFromEditSummary: "Formatting",
	getWikimediaBase: "URLs",
	isIPAddress: "Users",
	isTemporaryAccount: "Users",
	isToday: "Formatting",
	parseToolbarEditSummary: "Formatting",
	preprocessEditSummary: "Formatting",
	searchTitles: "Search",
	encode: "URLs",
	createResult: "Requests",
	createResults: "Requests",
	getStorageKey: "Persistence",
	getStorageKeys: "Persistence",
	runWithConcurrency: "Requests",
}

function inferType(key: string, override?: { inputType?: string; options?: string[] }): ParamType {
	if (override?.inputType) {
		if (override.inputType === "enum" && override.options?.length) return "enum"
		return override.inputType as ParamType
	}
	if (NUMBER_KEYS.has(key)) return "number"
	if (STRING_ARRAY_KEYS.has(key)) return "stringArray"
	if (NUMBER_ARRAY_KEYS.has(key)) return "numberArray"
	if (BOOLEAN_KEYS.has(key)) return "boolean"
	return "string"
}

function getSensibleDefault(
	methodName: string,
	key: string,
	type: ParamType,
	options?: string[]
): string | number | boolean {
	const methodOverrides = METHOD_PARAM_DEFAULTS[methodName]
	if (methodOverrides && key in methodOverrides) return methodOverrides[key]
	if (key in SENSIBLE_DEFAULTS) return SENSIBLE_DEFAULTS[key]
	if (type === "number") return 0
	if (type === "boolean") return false
	if (type === "enum" && options?.length) return options[0] ?? ""
	if (type === "stringArray" || type === "numberArray") return ""
	return ""
}

function buildParams(
	methodName: string,
	schemaParams: { key: string; description?: string }[],
	optionKeys: string[] | undefined,
	paramOverrides: Record<string, { inputType?: string; options?: string[] }> | undefined
): ParamDescriptor[] {
	const out: ParamDescriptor[] = []
	for (const p of schemaParams) {
		if (p.key === "options" && optionKeys?.length) {
			for (const k of optionKeys) {
				const override = paramOverrides?.[k]
				const type = inferType(k, override)
				const methodOverrides = METHOD_PARAM_DEFAULTS[methodName]
				const hasExplicitMethodDefault = Boolean(methodOverrides && k in methodOverrides)
				const defaultValue =
					// Keep optional numeric options unset by default so they can be omitted.
					type === "number" && !hasExplicitMethodDefault
						? ""
						: getSensibleDefault(methodName, k, type, override?.options)
				out.push({
					key: k,
					label: k.replace(/_/g, " "),
					type,
					default: defaultValue,
					options: override?.options,
				})
			}
		} else if (p.key === "options") {
			// Never render a raw object textbox for options; use explicit option fields via overrides.
			continue
		} else {
			const override = paramOverrides?.[p.key]
			const type = inferType(p.key, override)
			out.push({
				key: p.key,
				label: p.description ?? p.key.replace(/_/g, " "),
				type,
				default: getSensibleDefault(methodName, p.key, type, override?.options),
				options: override?.options,
			})
		}
	}
	return out
}

function inferCategoryFromMethodName(methodName: string): string {
	const explicitCategory = METHOD_CATEGORY_OVERRIDES[methodName]
	if (explicitCategory) return explicitCategory
	const lowerMethodName = methodName.toLowerCase()
	if (lowerMethodName.includes("cache")) return "Cache and diagnostics"
	if (lowerMethodName.includes("structureddelta") || lowerMethodName.includes("edittypes"))
		return "Structured deltas"
	if (lowerMethodName.includes("url")) return "URLs"
	if (lowerMethodName.includes("prediction")) return "Predictions"
	if (lowerMethodName.includes("related") || lowerMethodName.includes("listbuilding"))
		return "Recommendations"
	if (lowerMethodName.includes("search")) return "Search"
	if (lowerMethodName.includes("user")) return "Users"
	if (lowerMethodName.includes("revision") || lowerMethodName.includes("diff"))
		return "Revisions and diffs"
	if (lowerMethodName.includes("page") || lowerMethodName.includes("wikitext"))
		return "Pages and content"
	if (
		lowerMethodName.includes("format") ||
		lowerMethodName.startsWith("todate") ||
		lowerMethodName.startsWith("group")
	)
		return "Formatting"
	return "Prototyping"
}

export const playgroundMethods: MethodDescriptor[] = playgroundSchema
	.filter((m) => !playgroundOverrides[m.name]?.hide)
	.map((m) => {
		const over = playgroundOverrides[m.name]
		const optionsParamKeys = over?.optionsParamKeys
		const paramOverrides = over?.paramOverrides
		const params = buildParams(m.name, m.params, optionsParamKeys, paramOverrides)
		return {
			name: m.name,
			description: m.description,
			category: m.category ?? inferCategoryFromMethodName(m.name),
			params,
			optionsParamKeys,
			resultHint: over?.resultHint,
		}
	})
	.sort((a, b) => a.name.localeCompare(b.name))
