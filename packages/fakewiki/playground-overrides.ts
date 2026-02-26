/**
 * UI-only overrides for the API Playground. Do not duplicate param names, types, or descriptions
 * (those come from FakeWiki.ts + TSDoc via the generated schema).
 */

export type PlaygroundMethodOverride = {
	hide?: boolean
	resultHint?: "table" | "object" | "code" | "image" | "json"
	/** Param keys to collect into the options object (last argument). */
	optionsParamKeys?: string[]
	/** Input type overrides per param key (e.g. "date", "stringArray", "numberArray", "enum"). */
	paramOverrides?: Record<string, { inputType?: string; options?: string[] }>
}

export const playgroundOverrides: Record<string, PlaygroundMethodOverride> = {
	request: { hide: true },
	inspectHistoryCache: { optionsParamKeys: ["pageNames", "userNames"] },
	getPageHistory: { optionsParamKeys: ["older_than", "newer_than", "limit"] },
	getUserHistory: { optionsParamKeys: ["older_than", "newer_than", "limit"] },
	getUsersHistory: { optionsParamKeys: ["older_than", "newer_than", "limit"] },
	getCombinedFeed: {
		optionsParamKeys: ["userNames", "pageNames", "limit", "after"],
		paramOverrides: { after: { inputType: "json" } },
	},
	getPagesLinks: { optionsParamKeys: ["namespace"] },
	getPagesLinksAndBacklinks: { optionsParamKeys: ["namespace", "backlinkLimit"] },
	getPagesBacklinks: { optionsParamKeys: ["namespace", "limit"] },
	getRelatedChanges: {
		optionsParamKeys: ["showOutgoing", "showIncoming", "limit", "days", "from"],
	},
	getTopRelatedChanges: {
		optionsParamKeys: ["percentage", "scoreMultipliers", "limit", "days", "from"],
	},
	getTopRelatedPages: {
		optionsParamKeys: ["percentage", "scoreMultipliers", "limit", "days", "from"],
	},
	getListBuilding: { optionsParamKeys: ["pageTitle", "qid", "k"] },
	getMultiPageListBuilding: { optionsParamKeys: ["k"] },
	getRandomPage: { paramOverrides: { format: { inputType: "enum", options: ["summary", "html", "title"] } } },
	getOnThisDay: {
		paramOverrides: {
			type: { inputType: "enum", options: ["events", "births", "deaths", "holidays", "selected"] },
			date: { inputType: "date" },
		},
	},
	getFeaturedPage: { paramOverrides: { date: { inputType: "date" } } },
	formatRelativeTimestamp: {
		optionsParamKeys: ["seconds", "minutes", "hours", "days", "weeks", "months", "years"],
		paramOverrides: {
			seconds: {
				inputType: "enum",
				options: ["words", "date", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
			},
			minutes: {
				inputType: "enum",
				options: ["words", "date", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
			},
			hours: {
				inputType: "enum",
				options: ["words", "date", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
			},
			days: {
				inputType: "enum",
				options: ["words", "date", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
			},
			weeks: {
				inputType: "enum",
				options: ["words", "date", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
			},
			months: {
				inputType: "enum",
				options: ["words", "date", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
			},
			years: {
				inputType: "enum",
				options: ["words", "date", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
			},
		},
	},
	getPageThumbnail: { resultHint: "image" },
	getPageHero: { resultHint: "image" },
	getUserAvatar: { resultHint: "image" },
	getPageHtml: { resultHint: "code" },
	getPageSource: { resultHint: "code" },
	getPageMobileHtml: { resultHint: "code" },
	getRevisionSource: { resultHint: "code" },
	transformWikitextToHtml: { resultHint: "code" },
	getDiffLineSegments: { paramOverrides: { line: { inputType: "json" } } },
	groupRevisionsByDate: { paramOverrides: { revisions: { inputType: "json" } } },
	getDamagingPredictions: { resultHint: "json" },
	getGoodFaithPredictions: { resultHint: "json" },
	getRevisionPredictions: { resultHint: "json" },
	getRevisionPredictionsFromOres: { resultHint: "json" },
	getEditTypesSummary: { resultHint: "json", optionsParamKeys: ["lang", "content_type"] },
	getEditTypesDetails: { resultHint: "json", optionsParamKeys: ["lang", "content_type"] },
	getEditTypesDebug: { resultHint: "json", optionsParamKeys: ["lang", "content_type"] },
	getStructuredDeltasFromSummary: {
		resultHint: "json",
		paramOverrides: {
			summary: { inputType: "json" },
		},
		optionsParamKeys: [
			"highlightCount",
			"improvedDeltaEnabled",
			"relativeDetailLevelEnabled",
			"smartFilteringEnabled",
		],
	},
	getStructuredDeltasFromRevision: {
		resultHint: "json",
		optionsParamKeys: [
			"lang",
			"content_type",
			"highlightCount",
			"improvedDeltaEnabled",
			"relativeDetailLevelEnabled",
			"smartFilteringEnabled",
		],
	},
	normalizeStructuredDeltaSummary: {
		resultHint: "json",
		paramOverrides: {
			raw: { inputType: "json" },
		},
	},
	runWithConcurrency: {
		paramOverrides: {
			items: { inputType: "json" },
		},
	},
}
