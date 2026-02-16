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
	[revisionId: number]: {
		damaging?: FWLiftWingPrediction
		goodfaith?: FWLiftWingPrediction
	}
}

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
