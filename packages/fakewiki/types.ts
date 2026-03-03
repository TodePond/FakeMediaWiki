export interface FWRestApiOptions {
	api: "wikimedia" | "mediawiki"
	path: string
	body?: Record<string, unknown> | null
	type?: "json" | "text"
}

export interface FWActionApiOptions {
	api: "action"
	params: Record<string, unknown>
}

export type FWApiOptions = FWRestApiOptions | FWActionApiOptions

export interface FWHistoryOptions {
	limit?: number | string
	older_than?: string
	newer_than?: string
}

export interface FWToolbarComment {
	comment: string | null
	suggestedBy: string | null
	hashtags: string[] | string
	other: string[]
	useThisBot: string | null
	reportBugs: string | null
}

export type FWTimestampFormat =
	| "words"
	| "date"
	| "seconds"
	| "minutes"
	| "hours"
	| "days"
	| "weeks"
	| "months"
	| "years"

export interface FWRelativeTimestampOptions {
	seconds?: FWTimestampFormat
	minutes?: FWTimestampFormat
	hours?: FWTimestampFormat
	days?: FWTimestampFormat
	weeks?: FWTimestampFormat
	months?: FWTimestampFormat
	years?: FWTimestampFormat
}

/** Diff line from MediaWiki REST API revision compare (type: 0=context, 1=add, 2=remove, 3=change, 4|5=move) */
export interface FWDiffLine {
	type: number
	lineNumber?: number
	text: string
	highlightRanges?: Array<{ start: number; length: number; type: number }>
	offset?: { from: number | null; to: number | null }
}

/** Character-level segment for rendering diff highlights */
export interface FWDiffSegment {
	text: string
	type: "add" | "remove" | null
}

export interface FWCompareResponse {
	from: { id: number }
	to: { id: number }
	diff: FWDiffLine[]
}

export interface FWRevision {
	id: number
	timestamp: string
	user: { name: string }
	delta: number | null
	comment: string
	summary?: {
		comment?: string | null
		suggestedBy?: string | null
		hashtags?: string[] | string
		useThisBot?: string | null
		reportBugs?: string | null
	}
	avatarUrl?: string | null
	pageName?: string
	title?: string
	thumbnailUrl?: string | null
	diff?: FWCompareResponse | null
}

/** Revision with link direction for related-changes feeds (outgoing, incoming, or both). */
export type FWRevisionWithLinkType = FWRevision & {
	linkType?: "to" | "from" | "both"
}

/** Score multipliers for top-related filtering (defaults: bidirectional 3, outgoing 2, backlink 1). */
export interface FWTopRelatedScoreMultipliers {
	bidirectional?: number
	outgoing?: number
	backlink?: number
}

/** Options for getTopRelatedChanges / getTopRelatedPages. */
export interface FWTopRelatedOptions {
	/** Keep top N% by score (default 15). */
	percentage?: number
	scoreMultipliers?: FWTopRelatedScoreMultipliers
	limit?: number
	days?: number
	from?: string
}

/** Revision from getTopRelatedChanges: has score and per-link-type feed counts. */
export type FWTopRelatedChange = FWRevisionWithLinkType & {
	score: number
	feedCountBidirectional: number
	feedCountOutgoing: number
	feedCountBacklink: number
	/** All seed pages that have this page in their related changes (same for every revision on the page). */
	sourcePageNames?: string[]
	/** Seed pages that have this page as bidirectional (for expanded-view icons). */
	sourcePageNamesBidirectional?: string[]
	/** Seed pages that have this page as outgoing (for expanded-view icons). */
	sourcePageNamesOutgoing?: string[]
	/** Seed pages that have this page as backlink (for expanded-view icons). */
	sourcePageNamesBacklink?: string[]
}

/** Result from getTopRelatedPages: page title and its score (from first appearance in top changes). */
export interface FWTopRelatedPageWithScore {
	title: string
	score: number
}

/** Full result from getTopRelatedPages: pages with scores plus the changes used for scoring (with sourcePageNames and link-type info). */
export interface FWTopRelatedPagesResult {
	/** Unique page titles in order of first appearance, each with its score. */
	pages: FWTopRelatedPageWithScore[]
	/** The related changes that were retrieved and scored (includes sourcePageNames, linkType, feedCountBidirectional, etc.). */
	changes: FWTopRelatedChange[]
}

/**
 * Standardized result type for prototype data.
 * This provides a consistent structure for storing and managing results across prototypes.
 */
export interface FWResult<T = FWRevision> {
	data: T[]
	loading: boolean
	error: string | null
}

export interface FWUserSearchResult {
	key?: string
	title?: string
	username: string
	description?: string | null
	avatar?: { url: string } | null
}

export interface FWUserInfo {
	userid?: number
	name: string
	editcount?: number
	registration?: string
	tempexpired?: boolean | null
	invalid?: boolean
	missing?: boolean
}

/** User experience category used by watchlist-like prototypes */
export type FWUserCategory = "unregistered" | "newcomer" | "learner" | "experienced"

/** Display config (icon + color) for a user category in watchlist-style UIs. */
export interface FWUserTypeConfig {
	icon: import("@wikimedia/codex-icons").Icon | null
	color: string
}

/** User contribution entry from Action API list=usercontribs */
export interface FWUserContrib {
	revid: number
	timestamp: string
	minor?: boolean
	size?: number
	comment?: string
	userid?: number
	user?: string
	sizediff?: number
	title: string
	pageid: number
}

export interface FWPageSearchResult {
	key?: string
	title: string
	description?: string | null
	excerpt?: string | null
	thumbnail?: { url: string } | null
}

export interface FWRandomPageSummary {
	title?: string
	description?: string
	extract?: string
	thumbnail?: { source?: string }
}

export type FWRandomPageResult = string | FWRandomPageSummary

export interface FWPageMetadata {
	id: number
	key: string
	title: string
	latest: {
		id: number
		timestamp: string | null
	}
	content_model: string
	license: {
		url: string
		title: string
	}
	source: string
	page_id?: number
	rev?: number
	tid?: string
	namespace?: number
	user_id?: number
}

export interface FWMediaItem {
	title?: string
	type?: "image" | "video" | "audio"
	section_id?: number
	showInGallery?: boolean
	srcset?: Array<{ src: string }>
	caption?: {
		html?: string
		text?: string
	}
	original?: {
		source?: string
		mime?: string
	}
}

export interface FWPageMediaResponse {
	items?: FWMediaItem[]
	revision?: string
	tid?: string
}

export interface FWPageHistoryRevision {
	id: number
	timestamp: string
	minor: boolean
	size: number
	comment: string
	user: { name: string }
	delta: number | null
}

export type FWCachedRevision = FWPageHistoryRevision & { pageName?: string }

export interface FWPageHistoryResponse {
	revisions?: FWPageHistoryRevision[]
	latest?: string
	older?: string
	newer?: string
}

export interface FWHistoryCoverageEntry {
	older_than?: string
	newer_than?: string
	limit: number
	resultCount: number
	earliestTimestamp?: string
	latestTimestamp?: string
	complete: boolean
}

export interface FWHistoryCacheEntitySnapshot {
	cachedCount: number
	newestTimestamp?: string
	oldestTimestamp?: string
	coverage: FWHistoryCoverageEntry[]
}

export interface FWHistoryCacheSnapshot {
	pages: Record<string, FWHistoryCacheEntitySnapshot>
	users: Record<string, FWHistoryCacheEntitySnapshot>
}

export interface FWOnThisDayEvent {
	text: string
	type: "event"
	year?: number
	pages?: Array<{ title: string }>
}

export interface FWOnThisDayHoliday {
	text: string
	type: "holiday"
	pages?: Array<{ title: string }>
}

export type FWOnThisDayItem = FWOnThisDayEvent | FWOnThisDayHoliday

/** Lift Wing API prediction score */
export interface FWLiftWingPrediction {
	prediction: boolean | string
	probability: {
		true?: number
		false?: number
		[key: string]: number | undefined
	}
}

/** Supported Lift Wing prediction model slugs used by watchlist prototypes. */
export type FWPredictionModel =
	| "damaging"
	| "goodfaith"
	| "revertrisk"
	| "revertrisk-multilingual"

/** Prediction shape keyed by model slug (allows partial data per revision). */
export type FWPredictionByModel = Partial<Record<FWPredictionModel, FWLiftWingPrediction>>

/** Lift Wing API response structure */
export interface FWLiftWingResponse {
	[wiki: string]: {
		models?: {
			[modelName: string]: {
				version: string
			}
		}
		scores: {
			[revisionId: string]: {
				[modelName: string]: {
					score: FWLiftWingPrediction
				}
			}
		}
	}
}

/** Map of revision ID to prediction score */
export interface FWRevisionPredictions {
	[revisionId: number]: FWPredictionByModel
}

/** Edit-types API: simple diff summary (counts per change type per action, e.g. Template: { change: 1 }, Wikilink: { insert: 1 }). */
export type FWEditTypesDiffSummary = Record<string, Record<string, number>>

/** Edit-types API: optional content type for diff-summary/details/debug. */
export type FWEditTypesContentType = "wikitext" | "html"

/** Options for getEditTypesSummary, getEditTypesDetails, getEditTypesDebug. */
export interface FWEditTypesOptions {
	/** Language code (e.g. "en"). If not set, derived from FakeWiki base URL. */
	lang?: string
	/** Content type for the revision (default "wikitext"). */
	content_type?: FWEditTypesContentType
}

/** Edit-types API: structured diff details (context, node-edits, text-edits). Shape may be refined from API responses. */
export interface FWEditTypesDiffDetails {
	context?: unknown[]
	"node-edits"?: unknown[]
	"text-edits"?: unknown[]
	[key: string]: unknown
}

/** Edit-types API: debug response (full diff, tree diff, simple diff for comparison). */
export type FWEditTypesDiffDebug = Record<string, unknown>

/** Structured-delta candidate action type. */
export type FWStructuredDeltaKind = "insert" | "remove" | "change"

/** Canonical change types used for significance ranking in structured deltas. */
export type FWStructuredDeltaCanonicalType =
	| "Section"
	| "Table"
	| "Paragraph"
	| "Sentence"
	| "Heading"
	| "Word"
	| "Reference"
	| "Comment"
	| "List"
	| "Wikilink"
	| "ExternalLink"
	| "Media"
	| "Template"
	| "Punctuation"
	| "Text Formatting"
	| "Whitespace"

/** User-configurable settings for structured-delta display behavior. */
export interface FWStructuredDeltaSettings {
	/** Number of significance levels to include in inline labels. */
	highlightCount: number
	/** Whether to use structured-delta labels instead of raw byte delta fallback. */
	improvedDeltaEnabled: boolean
	/** Whether highlightCount applies to relative levels present in a revision. */
	relativeDetailLevelEnabled: boolean
	/** Whether to filter implied top-level change labels. */
	smartFilteringEnabled: boolean
}

/** One inline text segment rendered in the delta label with an associated CSS class. */
export interface FWStructuredDeltaSegment {
	text: string
	deltaClass: string
}

/** Intermediate structured-delta candidate before final highlighting/filtering. */
export interface FWStructuredDeltaCandidate {
	text: string
	deltaClass: string
	kind: FWStructuredDeltaKind
	count: number
	canonicalType: FWStructuredDeltaCanonicalType
}

/** Computed structured-delta output for a revision. */
export interface FWStructuredDeltaResult {
	segments: FWStructuredDeltaSegment[]
	candidates: FWStructuredDeltaCandidate[]
	/** Highlighted candidates (subset that produced segments), for snippet lookup. */
	highlightedCandidates?: FWStructuredDeltaCandidate[]
}

/** Options for computing structured-delta labels from edit-types summaries. */
export type FWStructuredDeltasOptions = Partial<FWStructuredDeltaSettings>

/** Options for computing structured-delta output directly from a revision ID. */
export interface FWStructuredDeltaRevisionOptions
	extends FWEditTypesOptions, Partial<FWStructuredDeltaSettings> {}

export interface FWPageSummary {
	title?: string
	description?: string
	extract?: string
	extract_html?: string
	thumbnail?: { source?: string }
	content_urls?: {
		desktop?: { page?: string }
		mobile?: { page?: string }
	}
	pageid?: number
	lang?: string
	dir?: string
	timestamp?: string
}

export interface FWFeaturedPage {
	tfa?: {
		title: string
		description?: string
		extract?: string
		thumbnail?: { source?: string }
	}
}

/** Single result from the list-building (serpentine) API. */
export interface FWListBuildingResult {
	page_title: string
	qid: string | null
	source: string
	redlink: boolean
	description?: string
}

/** Response from the list-building API (list-building.toolforge.org/api/serpentine). */
export interface FWListBuildingResponse {
	results: FWListBuildingResult[]
	qid?: string
}

/** Aggregated entry from multi-page list building (one item across multiple seed pages). */
export interface FWMultiPageListBuildingEntry {
	item: FWListBuildingResult
	listCount: number
	positionScore: number
	pageTitles: string[]
}

/** Result from getMultiPageListBuilding: aggregated entries and number of seed pages completed. */
export interface FWMultiPageListBuildingResult {
	entries: FWMultiPageListBuildingEntry[]
	completedCount: number
}
