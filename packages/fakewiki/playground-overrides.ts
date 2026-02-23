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
	getPageHistory: { optionsParamKeys: ["older_than", "newer_than", "limit"] },
	getUserHistory: { optionsParamKeys: ["older_than", "newer_than", "limit"] },
	getUsersHistory: { optionsParamKeys: ["older_than", "newer_than", "limit"] },
	getCombinedFeed: { optionsParamKeys: ["userNames", "pageNames", "limit", "after"] },
	getRelatedChanges: {
		optionsParamKeys: ["showOutgoing", "showIncoming", "limit", "days", "from"],
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
	getPageThumbnail: { resultHint: "image" },
	getPageHero: { resultHint: "image" },
	getUserAvatar: { resultHint: "image" },
	getPageHtml: { resultHint: "code" },
	getPageSource: { resultHint: "code" },
	getPageMobileHtml: { resultHint: "code" },
	getRevisionSource: { resultHint: "code" },
	transformWikitextToHtml: { resultHint: "code" },
	getDamagingPredictions: { resultHint: "json" },
	getGoodFaithPredictions: { resultHint: "json" },
	getRevisionPredictions: { resultHint: "json" },
}
