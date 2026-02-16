export interface RestApiOptions {
	api: "wikimedia" | "mediawiki"
	path: string
	body?: Record<string, unknown> | null
	type?: "json" | "text"
}

export interface ActionApiOptions {
	api: "action"
	params: Record<string, unknown>
}

export type ApiOptions = RestApiOptions | ActionApiOptions

export interface HistoryOptions {
	limit?: number | string
	older_than?: string
	newer_than?: string
}

export interface ToolbarComment {
	comment: string | null
	suggestedBy: string | null
	hashtags: string[] | string
	other: string[]
	useThisBot: string | null
	reportBugs: string | null
}

export type TimestampFormat =
	| "words"
	| "date"
	| "seconds"
	| "minutes"
	| "hours"
	| "days"
	| "weeks"
	| "months"
	| "years"

export interface RelativeTimestampOptions {
	seconds?: TimestampFormat
	minutes?: TimestampFormat
	hours?: TimestampFormat
	days?: TimestampFormat
	weeks?: TimestampFormat
	months?: TimestampFormat
	years?: TimestampFormat
}

/** Diff line from MediaWiki REST API revision compare (type: 0=context, 1=add, 2=remove, 3=change, 4|5=move) */
export interface DiffLine {
	type: number
	lineNumber?: number
	text: string
	highlightRanges?: Array<{ start: number; length: number; type: number }>
	offset?: { from: number | null; to: number | null }
}

export interface CompareResponse {
	from: { id: number }
	to: { id: number }
	diff: DiffLine[]
}

export interface Revision {
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
	diff?: CompareResponse | null
}

/**
 * Standardized result type for prototype data.
 * This provides a consistent structure for storing and managing results across prototypes.
 */
export interface Result<T = Revision> {
	data: T[]
	loading: boolean
	error: string | null
}

export interface UserSearchResult {
	key?: string
	title?: string
	username: string
	description?: string | null
	avatar?: { url: string } | null
}

export interface UserInfo {
	userid?: number
	name: string
	editcount?: number
	registration?: string
	tempexpired?: boolean | null
	invalid?: boolean
	missing?: boolean
}

export interface PageSearchResult {
	key?: string
	title: string
	description?: string | null
	excerpt?: string | null
	thumbnail?: { url: string } | null
}

export interface RandomPageSummary {
	title?: string
	description?: string
	extract?: string
	thumbnail?: { source?: string }
}

export type RandomPageResult = string | RandomPageSummary

export interface PageMetadata {
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

export interface MediaItem {
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

export interface PageMediaResponse {
	items?: MediaItem[]
	revision?: string
	tid?: string
}

export interface PageHistoryRevision {
	id: number
	timestamp: string
	minor: boolean
	size: number
	comment: string
	user: { name: string }
	delta: number | null
}

export type CachedRevision = PageHistoryRevision & { pageName?: string }

export interface PageHistoryResponse {
	revisions?: PageHistoryRevision[]
	latest?: string
	older?: string
	newer?: string
}

export interface OnThisDayEvent {
	text: string
	type: "event"
	year?: number
	pages?: Array<{ title: string }>
}

export interface OnThisDayHoliday {
	text: string
	type: "holiday"
	pages?: Array<{ title: string }>
}

export type OnThisDayItem = OnThisDayEvent | OnThisDayHoliday

/** Lift Wing API prediction score */
export interface LiftWingPrediction {
	prediction: boolean | string
	probability: {
		true?: number
		false?: number
		[key: string]: number | undefined
	}
}

/** Lift Wing API response structure */
export interface LiftWingResponse {
	[wiki: string]: {
		models?: {
			[modelName: string]: {
				version: string
			}
		}
		scores: {
			[revisionId: string]: {
				[modelName: string]: {
					score: LiftWingPrediction
				}
			}
		}
	}
}

/** Map of revision ID to prediction score */
export interface RevisionPredictions {
	[revisionId: number]: {
		damaging?: LiftWingPrediction
		goodfaith?: LiftWingPrediction
	}
}

export interface PageSummary {
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

export interface FeaturedPage {
	tfa?: {
		title: string
		description?: string
		extract?: string
		thumbnail?: { source?: string }
	}
}
