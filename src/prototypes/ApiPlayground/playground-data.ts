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
	params: ParamDescriptor[]
	optionsParamKeys?: string[]
	resultHint?: "table" | "object" | "code" | "image" | "json"
}

const NUMBER_KEYS = new Set([
	"limit", "revId", "k", "days", "fromRevId", "toRevId", "revisionId", "ucstart", "ucend",
])
const STRING_ARRAY_KEYS = new Set(["userNames", "pageNames", "pageTitles"])
const NUMBER_ARRAY_KEYS = new Set(["revisionIds"])
const BOOLEAN_KEYS = new Set(["showOutgoing", "showIncoming"])

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
	searchUsers: { query: "Samwalton9" },
	searchUsersWithAvatars: { query: "Samwalton9" },
	compareRevisions: { fromRevId: 1336311016, toRevId: 1337619110 },
	getRevisionDiff: { pageName: "Corsica Studios", revId: 1337619110 },
	getParentRevisionId: { pageName: "Corsica Studios", revId: 1337619110 },
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
				out.push({
					key: k,
					label: k.replace(/_/g, " "),
					type,
					default: getSensibleDefault(methodName, k, type, override?.options),
					options: override?.options,
				})
			}
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
			params,
			optionsParamKeys,
			resultHint: over?.resultHint,
		}
	})
