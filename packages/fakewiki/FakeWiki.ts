import type {
	FWActionApiOptions,
	FWAddReferenceSuggestionResponse,
	FWApiOptions,
	FWCachedRevision,
	FWCitationNeededSuggestionResponse,
	FWCompareResponse,
	FWConvertReferenceSuggestionResponse,
	FWDiffLine,
	FWDiffSegment,
	FWDisambiguationSuggestionResponse,
	FWDoubleBoldSuggestionResponse,
	FWDuplicateLinkSuggestionResponse,
	FWEditTypesDiffDebug,
	FWEditTypesDiffDetails,
	FWEditTypesDiffSummary,
	FWExternalLinkSuggestionResponse,
	FWFakeHeadingSuggestionResponse,
	FWFeaturedPage,
	FWHistoryCacheEntitySnapshot,
	FWHistoryCacheSnapshot,
	FWHistoryCoverageEntry,
	FWHistoryOptions,
	FWImageCaptionSuggestionResponse,
	FWLiftWingPrediction,
	FWLiftWingResponse,
	FWListBuildingResponse,
	FWMoreLikeOptions,
	FWMoreLikeResponse,
	FWMoreLikeSearchResult,
	FWMultiPageListBuildingEntry,
	FWMultiPageListBuildingResult,
	FWOnThisDayItem,
	FWPageHistoryResponse,
	FWPageHistoryRevision,
	FWPageMediaResponse,
	FWPageMetadata,
	FWPageSearchResult,
	FWPageSummary,
	FWPredictionModel,
	FWRandomPageResult,
	FWRandomPageSummary,
	FWRecentChangesResult,
	FWRedirectSuggestionResponse,
	FWReferenceNeedPrediction,
	FWRelativeTimestampOptions,
	FWRequiredTemplateParamSuggestionResponse,
	FWRestApiOptions,
	FWResult,
	FWRevision,
	FWRevisionPredictions,
	FWRevisionWithLinkType,
	FWStructuredDeltaCandidate,
	FWStructuredDeltaCanonicalType,
	FWStructuredDeltaKind,
	FWStructuredDeltaResult,
	FWStructuredDeltaRevisionOptions,
	FWStructuredDeltaSettings,
	FWStructuredDeltasOptions,
	FWSuggestedLinkSuggestionResponse,
	FWTextMatchSuggestionResponse,
	FWToneCheckPrediction,
	FWToneSuggestionResponse,
	FWToolbarComment,
	FWTopRelatedChange,
	FWTopRelatedOptions,
	FWTopRelatedPageWithScore,
	FWTopRelatedPagesResult,
	FWUserCategory,
	FWUserContrib,
	FWUserInfo,
	FWUserSearchResult,
	FWUserTypeConfig,
	FWVeSuggestionCandidate,
	FWVeSuggestionDiagnostics,
	FWVeSuggestionItem,
	FWVeSuggestionResponse,
	FWYearLinkSuggestionResponse,
} from "./types"

import { FakeWikiHttpError } from "./httpError"

import type { Icon } from "@wikimedia/codex-icons"
import { cdxIconHeart, cdxIconUnStar } from "@wikimedia/codex-icons"

/** MediaWiki REST API page history returns this many revisions per request; used as default and max for getPageHistory and getCombinedFeed. */
const PAGE_HISTORY_REVISIONS_PER_REQUEST = 20

/** Max concurrent REST page-history / user-history fetches in getCombinedFeed (Wikimedia: ≤3 concurrent requests). */
const COMBINED_FEED_HISTORY_CONCURRENCY = 3

/** Max concurrent Lift Wing prediction requests per model in getRevisionPredictions. */
const LIFT_WING_REVISION_CONCURRENCY = 3

/** Max concurrent ORES chunk requests (ORES guidance: ≤4 parallel). */
const ORES_CHUNK_CONCURRENCY = 4

/** Default limit for search endpoints (searchTitles, searchPages, searchUsers). */
const DEFAULT_SEARCH_LIMIT = 20

/** Default result limit for Cirrus morelike search. */
const DEFAULT_MORELIKE_LIMIT = 10

/** Max srlimit used by this client for Action API search. */
const MAX_MORELIKE_LIMIT = 50

/** Default limit for user contribution history (Action API usercontribs). */
const DEFAULT_USER_CONTRIBS_LIMIT = 20

/** Maximum limit we allow for user contribution history (Action API supports up to 500). */
const USER_CONTRIBS_MAX_LIMIT = 500

/** Default Api-User-Agent sent to Wikimedia/Lift Wing APIs. Override via constructor options to test or identify your client. */
const DEFAULT_API_USER_AGENT = "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)"

/**
 * Helper for interacting with Wikimedia and MediaWiki REST APIs.
 */
export class FakeWiki {
	/**
	 * Base URL for the API
	 */
	base: string

	/**
	 * Optional custom Api-User-Agent for external APIs (e.g. Lift Wing). If not set, DEFAULT_API_USER_AGENT is used.
	 */
	private apiUserAgent: string | undefined

	/**
	 * Cache for user information
	 */
	private userInfoCache: Map<string, FWUserInfo | null>

	/**
	 * Cache for derived user categories
	 */
	private userCategoryCache: Map<string, FWUserCategory>

	/**
	 * Display config (icon + color) per user category for watchlist-style UIs.
	 * Set via constructor options or use built-in default.
	 */
	/**
	 * Default display config (icon + color) per user category. Override per call via getCachedUserCategoryDisplay(userName, { userTypeConfig }) or getUserCategoryDisplay(userName, { userTypeConfig }).
	 */
	private readonly defaultUserTypeConfig: Record<FWUserCategory, FWUserTypeConfig>

	/**
	 * Cache for page histories
	 * key = pageName, value = sorted array of revisions (newest first)
	 */
	private pageHistoryCache = new Map<string, FWPageHistoryRevision[]>()
	private pageHistoryCoverage = new Map<string, FWHistoryCoverageEntry[]>()

	/**
	 * Cache for user histories
	 * key = userName, value = sorted array of revisions (newest first)
	 */
	private userHistoryCache = new Map<string, (FWPageHistoryRevision & { pageName: string })[]>()
	private userHistoryCoverage = new Map<string, FWHistoryCoverageEntry[]>()

	/**
	 * Cache for list-building API results (key = lang:pageTitle:qid:k).
	 */
	private listBuildingCache = new Map<string, FWListBuildingResponse>()

	/**
	 * Cache for getTopRelatedChanges full merged list (before percentage filter).
	 * Key: cache key from (sorted page names, limit, days, from, score multipliers).
	 * Value: full merged FWTopRelatedChange[] (sorted by timestamp desc).
	 */
	private topRelatedChangesCache = new Map<string, FWTopRelatedChange[]>()

	/**
	 * Cache for revision HTML by page and revision id.
	 * key = `${pageName}|${revId}`, value = HTML string
	 */
	private revisionHtmlCache = new Map<string, string>()

	/**
	 * In-flight MediaWiki REST revision compare requests; same (from,to) pair shares one HTTP call.
	 */
	private compareInFlight = new Map<string, Promise<FWCompareResponse>>()

	/**
	 * Cache for short descriptions by page name.
	 * key = pageName, value = description string or null if none
	 */
	private shortDescriptionCache = new Map<string, string | null>()

	/** Base URL for the edit-types API (edit-types.wmcloud.org). */
	private readonly editTypesBase = "https://edit-types.wmcloud.org"

	/** Significance levels used for structured delta ranking (most significant first). */
	private readonly STRUCTURED_DELTA_SIGNIFICANCE_LEVELS: readonly (readonly FWStructuredDeltaCanonicalType[])[] =
		[
			["Section"],
			["Table"],
			["Paragraph"],
			["Sentence"],
			["Heading"],
			["Word", "Reference", "Comment"],
			["List"],
			["Template"],
			["Wikilink", "ExternalLink", "Media"],
			["Punctuation"],
			["Text Formatting"],
			["Whitespace"],
		]

	/** Structured-delta labels for inline display. */
	private readonly STRUCTURED_DELTA_DISPLAY_LABELS: Record<string, string> = {
		ExternalLink: "link",
		Wikilink: "wikilink",
		Reference: "reference",
		Template: "template",
		Paragraph: "paragraph",
		Section: "section",
		Heading: "heading",
		Sentence: "sentence",
		List: "list",
		Table: "table",
		Word: "word",
		"Text Formatting": "formatting",
		TextFormatting: "formatting",
		Whitespace: "whitespace",
		Punctuation: "punctuation",
		Comment: "comment",
		Media: "media",
	}

	/** Default settings for structured-delta computation. */
	readonly DEFAULT_STRUCTURED_DELTA_SETTINGS: FWStructuredDeltaSettings = {
		highlightCount: 1,
		improvedDeltaEnabled: true,
		relativeDetailLevelEnabled: true,
		smartFilteringEnabled: true,
	}

	/** Maximum allowed highlightCount for structured-delta settings. */
	readonly STRUCTURED_DELTA_MAX_HIGHLIGHT_COUNT = this.STRUCTURED_DELTA_SIGNIFICANCE_LEVELS.length

	/**
	 * Max parallel history fetches in getCombinedFeed / getUsersHistory (default: COMBINED_FEED_HISTORY_CONCURRENCY).
	 */
	private readonly historyFetchConcurrency: number

	/**
	 * Max parallel Lift Wing calls per model in getRevisionPredictions (default: LIFT_WING_REVISION_CONCURRENCY).
	 */
	private readonly liftWingRevisionConcurrency: number

	/**
	 * Create a new FakeWiki instance
	 * @param base - Base URL for the API
	 * @param options - Optional settings; use `apiUserAgent` to override the identifier sent to Lift Wing / Wikimedia APIs (e.g. for testing).
	 * Use `historyFetchConcurrency` / `liftWingRevisionConcurrency` to cap parallelism (e.g. serialize with 1 for rate-sensitive prototypes).
	 */
	constructor(
		base = "https://en.wikipedia.org/",
		options?: {
			apiUserAgent?: string
			historyFetchConcurrency?: number
			liftWingRevisionConcurrency?: number
		}
	) {
		this.base = base
		this.apiUserAgent = options?.apiUserAgent
		this.historyFetchConcurrency = Math.max(
			1,
			Math.floor(options?.historyFetchConcurrency ?? COMBINED_FEED_HISTORY_CONCURRENCY)
		)
		this.liftWingRevisionConcurrency = Math.max(
			1,
			Math.floor(options?.liftWingRevisionConcurrency ?? LIFT_WING_REVISION_CONCURRENCY)
		)
		this.userInfoCache = new Map()
		this.userCategoryCache = new Map()
		this.defaultUserTypeConfig = {
			unregistered: { icon: null as Icon | null, color: "var(--color-subtle)" },
			newcomer: { icon: cdxIconHeart, color: "var(--green400)" },
			learner: { icon: null as Icon | null, color: "var(--yellow400)" },
			experienced: { icon: cdxIconUnStar, color: "var(--yellow400)" },
		}
	}

	/**
	 * Parse and clamp a limit option (number or string) for history requests.
	 * @param limit - Raw limit from options
	 * @param fallback - Value when limit is missing or invalid
	 * @param max - Maximum allowed value (e.g. PAGE_HISTORY_REVISIONS_PER_REQUEST)
	 * @returns Clamped integer between 1 and max, or fallback
	 */
	private normalizeLimit(
		limit: number | string | undefined,
		fallback = PAGE_HISTORY_REVISIONS_PER_REQUEST,
		max = PAGE_HISTORY_REVISIONS_PER_REQUEST
	): number {
		const parsed =
			typeof limit === "number"
				? limit
				: typeof limit === "string"
					? parseInt(limit, 10)
					: fallback
		if (!Number.isFinite(parsed) || parsed < 1) return fallback
		return Math.min(Math.floor(parsed), max)
	}

	/**
	 * Filter revisions to those strictly older than older_than and/or strictly newer than newer_than.
	 * older_than/newer_than can be a revision ID (numeric string) or an ISO timestamp.
	 * @param revisions - Sorted array (newest first)
	 * @param older_than - Optional cursor: keep only rev.id < this or rev.timestamp < this
	 * @param newer_than - Optional cursor: keep only rev.id > this or rev.timestamp > this
	 * @returns Filtered array (same order)
	 */
	private filterHistoryByCriteria<T extends { id: number; timestamp: string }>(
		revisions: T[],
		older_than?: string,
		newer_than?: string
	): T[] {
		let filtered = revisions
		if (older_than) {
			const olderThanId = /^\d+$/.test(older_than) ? parseInt(older_than, 10) : null
			if (olderThanId !== null) {
				filtered = filtered.filter(rev => rev.id < olderThanId)
			} else {
				const olderThanTime = new Date(older_than).getTime()
				filtered = filtered.filter(rev => new Date(rev.timestamp).getTime() < olderThanTime)
			}
		}
		if (newer_than) {
			const newerThanId = /^\d+$/.test(newer_than) ? parseInt(newer_than, 10) : null
			if (newerThanId !== null) {
				filtered = filtered.filter(rev => rev.id > newerThanId)
			} else {
				const newerThanTime = new Date(newer_than).getTime()
				filtered = filtered.filter(rev => new Date(rev.timestamp).getTime() > newerThanTime)
			}
		}
		return filtered
	}

	/**
	 * Merge incoming revisions into existing cache: deduplicate by revision ID and sort newest first.
	 * @param existing - Current cached revisions (newest first)
	 * @param incoming - New revisions from API
	 * @returns Merged, deduplicated array sorted by timestamp descending
	 */
	private mergeHistoryByRevisionId<T extends { id: number; timestamp: string }>(
		existing: T[],
		incoming: T[]
	): T[] {
		return [...existing, ...incoming]
			.filter((rev, index, self) => index === self.findIndex(r => r.id === rev.id))
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
	}

	/**
	 * Record or update a coverage entry for a given cache key (page or user).
	 * If an entry for the same older_than/newer_than exists, it is updated with max counts and merged timestamps.
	 * @param coverageMap - pageHistoryCoverage or userHistoryCoverage
	 * @param key - Page name or user name
	 * @param entry - New coverage entry from the last fetch
	 */
	private recordCoverage(
		coverageMap: Map<string, FWHistoryCoverageEntry[]>,
		key: string,
		entry: FWHistoryCoverageEntry
	): void {
		const entries = coverageMap.get(key) || []
		const existingIndex = entries.findIndex(
			e => e.older_than === entry.older_than && e.newer_than === entry.newer_than
		)
		if (existingIndex === -1) {
			entries.push(entry)
		} else {
			const existing = entries[existingIndex]
			if (existing) {
				entries[existingIndex] = {
					...existing,
					limit: Math.max(existing.limit, entry.limit),
					resultCount: Math.max(existing.resultCount, entry.resultCount),
					earliestTimestamp: entry.earliestTimestamp || existing.earliestTimestamp,
					latestTimestamp: entry.latestTimestamp || existing.latestTimestamp,
					complete: existing.complete || entry.complete,
				}
			}
		}
		coverageMap.set(key, entries)
	}

	/**
	 * Decide whether we can satisfy a history request from cache without fetching.
	 * Returns true if we have at least `limit` cached results for the range, or we have a
	 * recorded complete fetch for the exact same older_than/newer_than (so no more results exist).
	 * @param coverageMap - pageHistoryCoverage or userHistoryCoverage
	 * @param key - Page name or user name
	 * @param older_than - Request cursor (or undefined)
	 * @param newer_than - Request cursor (or undefined)
	 * @param limit - Requested limit
	 * @param cachedCount - Number of revisions in cache matching the range
	 * @returns true if cache is sufficient to return without an API call
	 */
	private hasSufficientCacheCoverage(
		coverageMap: Map<string, FWHistoryCoverageEntry[]>,
		key: string,
		older_than: string | undefined,
		newer_than: string | undefined,
		limit: number,
		cachedCount: number
	): boolean {
		if (cachedCount >= limit) return true
		const entries = coverageMap.get(key) || []
		const matching = entries.find(
			e => e.older_than === older_than && e.newer_than === newer_than
		)
		if (!matching) return false
		return matching.complete
	}

	/**
	 * Build a snapshot for one page or user: cached count, timestamp range, and coverage entries.
	 * Used by inspectHistoryCache to expose cache state without leaking revision arrays.
	 * @param cached - Sorted revisions (newest first)
	 * @param coverage - Recorded coverage entries for this key
	 * @returns Snapshot object (coverage entries are shallow-copied)
	 */
	private buildHistoryCacheEntitySnapshot<T extends { timestamp: string }>(
		cached: T[],
		coverage: FWHistoryCoverageEntry[]
	): FWHistoryCacheEntitySnapshot {
		return {
			cachedCount: cached.length,
			newestTimestamp: cached[0]?.timestamp,
			oldestTimestamp: cached[cached.length - 1]?.timestamp,
			coverage: coverage.map(entry => ({ ...entry })),
		}
	}

	/**
	 * Inspect cached history revisions and coverage metadata.
	 * Useful for debugging pagination and cache behavior in prototypes.
	 * @param options - Optional filters for specific page/user keys
	 * @returns Snapshot of page and user history cache state
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.inspectHistoryCache({ pageNames: ["Cat"] })
	 * ```
	 */
	inspectHistoryCache(options?: {
		pageNames?: string[]
		userNames?: string[]
	}): FWHistoryCacheSnapshot {
		const pages: Record<string, FWHistoryCacheEntitySnapshot> = {}
		const users: Record<string, FWHistoryCacheEntitySnapshot> = {}

		const pageKeys = options?.pageNames ?? Array.from(this.pageHistoryCache.keys())
		for (const pageName of pageKeys) {
			const cached = this.pageHistoryCache.get(pageName) || []
			const coverage = this.pageHistoryCoverage.get(pageName) || []
			pages[pageName] = this.buildHistoryCacheEntitySnapshot(cached, coverage)
		}

		const userKeys = options?.userNames ?? Array.from(this.userHistoryCache.keys())
		for (const userName of userKeys) {
			const cached = this.userHistoryCache.get(userName) || []
			const coverage = this.userHistoryCoverage.get(userName) || []
			users[userName] = this.buildHistoryCacheEntitySnapshot(cached, coverage)
		}

		return { pages, users }
	}

	/**
	 * Get the base URL for the Wikimedia REST API
	 * @returns Wikimedia base URL
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getWikimediaBase()
	 * ```
	 */
	getWikimediaBase(): string {
		return `${this.base}api/rest_v1/`
	}

	/**
	 * Get the base URL for the MediaWiki REST API
	 * @returns MediaWiki base URL
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getMediawikiBase()
	 * ```
	 */
	getMediawikiBase(): string {
		return `${this.base}w/rest.php/v1/`
	}

	/**
	 * Make a request to Wikimedia REST API, MediaWiki REST API, or MediaWiki Action API
	 * @param options - Request options
	 * @returns JSON or text response
	 */
	async request(options: FWApiOptions): Promise<unknown> {
		const { api } = options

		if (api === "action") {
			return this._handleActionApiRequest(options as FWActionApiOptions)
		} else if (api === "wikimedia" || api === "mediawiki") {
			return this._handleRestApiRequest(options as FWRestApiOptions)
		} else {
			throw new Error('API type must be "wikimedia", "mediawiki", or "action"')
		}
	}

	/**
	 * Short label for Action API URLs (origin + path + key query params).
	 */
	private summarizeActionApiUrl(requestUrl: string): string {
		try {
			const u = new URL(requestUrl)
			const action = u.searchParams.get("action")
			const list = u.searchParams.get("list")
			const meta = u.searchParams.get("meta")
			const prop = u.searchParams.get("prop")
			const parts: string[] = [`${u.origin}${u.pathname}`]
			if (action) parts.push(`action=${action}`)
			if (list) parts.push(`list=${list}`)
			if (meta) parts.push(`meta=${meta}`)
			if (prop) parts.push(`prop=${prop}`)
			return parts.join(" ")
		} catch {
			return requestUrl.length > 180 ? `${requestUrl.slice(0, 177)}…` : requestUrl
		}
	}

	private summarizeGenericUrl(requestUrl: string): string {
		try {
			const u = new URL(requestUrl)
			const path = u.pathname + u.search
			const full = `${u.origin}${path}`
			return full.length > 200 ? `${full.slice(0, 197)}…` : full
		} catch {
			return requestUrl.length > 180 ? `${requestUrl.slice(0, 177)}…` : requestUrl
		}
	}

	private formatRetryAfterSecondsForMessage(seconds: number): string {
		if (seconds < 60) return ` Retry after ${seconds}s.`
		const totalMins = Math.max(1, Math.round(seconds / 60))
		const hrs = Math.floor(totalMins / 60)
		const remMins = totalMins % 60
		let human: string
		if (hrs >= 1) {
			human = hrs === 1 ? "~1 hour" : `~${hrs} hours`
			if (remMins > 0) human += ` ${remMins} min`
		} else {
			human = `~${totalMins} minute${totalMins === 1 ? "" : "s"}`
		}
		return ` Retry after ${human} (${seconds}s).`
	}

	private formatRetryAfterForMessage(header: string | null): string {
		if (!header?.trim()) return ""
		const s = header.trim()
		const asNum = parseInt(s, 10)
		if (!Number.isNaN(asNum) && String(asNum) === s) {
			return this.formatRetryAfterSecondsForMessage(asNum)
		}
		return ` Retry after: ${s}.`
	}

	/**
	 * Throw FakeWikiHttpError for a failed fetch with a user-visible message and endpoint context.
	 */
	private async throwHttpErrorFromResponse(
		response: Response,
		requestUrl: string,
		context: {
			api?: "action" | "mediawiki" | "wikimedia"
			restPath?: string
		}
	): Promise<never> {
		const status = response.status
		const finalUrl = response.url || requestUrl

		let endpointSummary: string
		if (context.api === "action" || finalUrl.includes("/w/api.php")) {
			endpointSummary = this.summarizeActionApiUrl(finalUrl)
		} else if (context.restPath && context.api) {
			const pathBase = context.restPath.split("?")[0]
			endpointSummary = `${context.api} REST: ${pathBase}`
		} else {
			endpointSummary = this.summarizeGenericUrl(finalUrl)
		}

		let bodyHint = ""
		try {
			const text = await response.clone().text()
			const trimmed = text?.trim() ?? ""
			if (trimmed.length > 0 && trimmed.length <= 800) {
				try {
					const j = trimmed
						? (JSON.parse(trimmed) as { error?: { info?: string } })
						: null
					const info = j?.error?.info
					if (typeof info === "string" && info.trim()) bodyHint = info.trim()
				} catch {
					bodyHint = trimmed.replace(/\s+/g, " ").slice(0, 200)
				}
			} else if (trimmed.length > 800) {
				try {
					const j = JSON.parse(trimmed.slice(0, 500)) as { error?: { info?: string } }
					const info = j?.error?.info
					if (typeof info === "string" && info.trim()) bodyHint = info.trim()
				} catch {
					bodyHint = trimmed.replace(/\s+/g, " ").slice(0, 200)
				}
			}
		} catch {
			// ignore body read errors
		}

		const retryAfterHeader = status === 429 ? response.headers.get("Retry-After") : null
		const retryAfterFromHeader =
			status === 429 ? this.formatRetryAfterForMessage(retryAfterHeader) : ""
		/** Wikimedia: honour Retry-After when present; otherwise wait ≥5s per rate-limits guidance. */
		const retryGuidance =
			status === 429
				? retryAfterFromHeader || " Wait at least 5 seconds before trying again."
				: ""

		let message: string
		if (status === 429) {
			message = `Rate limited (HTTP 429) by ${endpointSummary}.${retryGuidance}`
		} else {
			message = `Request failed (HTTP ${status}) at ${endpointSummary}.`
			if (bodyHint) message += ` ${bodyHint}`
		}

		throw new FakeWikiHttpError(message.trim(), status, finalUrl, endpointSummary)
	}

	/**
	 * Handle REST API requests (Wikimedia or MediaWiki)
	 * @param options - REST API options
	 * @returns JSON or text response
	 * @private
	 */
	async _handleRestApiRequest({
		api,
		path,
		body = null,
		type = "json",
	}: FWRestApiOptions): Promise<unknown> {
		const base = api === "wikimedia" ? this.getWikimediaBase() : this.getMediawikiBase()
		const containsQuery = path.includes("?")
		const separator = containsQuery ? "&" : "?"

		const url = `${base}${path}${separator}origin=*`
		const headers = {
			"Content-Type": "application/json",
			"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
		}

		try {
			const response = await fetch(url, {
				headers,
				method: body ? "POST" : "GET",
				body: body ? JSON.stringify(body) : undefined,
			})

			if (!response.ok) {
				await this.throwHttpErrorFromResponse(response, url, { api, restPath: path })
			}

			return type === "json" ? await response.json() : await response.text()
		} catch (error) {
			console.error(
				`Request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					path,
					api,
					url,
				}
			)
			throw error
		}
	}

	/**
	 * Handle Action API requests
	 * @param options - Action API options
	 * @returns JSON response from Action API
	 * @private
	 */
	async _handleActionApiRequest({ params }: FWActionApiOptions): Promise<unknown> {
		const searchParams = new URLSearchParams()

		// Add all parameters to the URL
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null) {
				if (Array.isArray(value)) {
					// Handle array values (some Action API params accept multiple values)
					value.forEach(v => searchParams.append(key, String(v)))
				} else {
					searchParams.append(key, String(value))
				}
			}
		}

		// Ensure format is JSON (default for Action API)
		if (!searchParams.has("format")) {
			searchParams.append("format", "json")
		}

		// Use formatversion 2 for cleaner response structure
		if (!searchParams.has("formatversion")) {
			searchParams.append("formatversion", "2")
		}

		const url = `${this.base}w/api.php?${searchParams.toString()}&origin=*`
		const headers = {
			"Content-Type": "application/json",
			"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
		}

		try {
			const response = await fetch(url, { headers })

			if (!response.ok) {
				await this.throwHttpErrorFromResponse(response, url, { api: "action" })
			}

			const data = (await response.json()) as {
				error?: { info?: string; code?: string }
				warnings?: unknown
			}

			// Check for Action API errors
			if (data.error) {
				throw new Error(data.error.info || data.error.code || "Unknown error")
			}

			// Check for warnings (non-fatal, but log them)
			if (data.warnings) {
				console.warn("Action API warnings:", data.warnings)
			}

			return data
		} catch (error) {
			console.error(
				`Action API request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					params,
					url,
				}
			)
			throw error
		}
	}

	/**
	 * Encode a page title for URL usage
	 * @param slug - Page title
	 * @returns URL-encoded title
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.encodeForUrl("My article")
	 * ```
	 */
	encodeForUrl(slug: string): string {
		return encodeURIComponent(slug.replace(/ /g, "_"))
	}

	/**
	 * Get a page summary (extract, thumbnail, etc.)
	 * @param pageName - Page title
	 * @returns Page summary
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageSummary("Cat")
	 * ```
	 */
	async getPageSummary(pageName: string): Promise<FWPageSummary> {
		return (await this.request({
			api: "wikimedia",
			path: `page/summary/${this.encodeForUrl(pageName)}`,
		})) as FWPageSummary
	}

	/**
	 * Get the short description for a page (from template or Wikidata).
	 * Uses the page summary API; results are cached to avoid repeated requests.
	 * @param pageName - Page title
	 * @returns Short description string, or null if none or on error
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getShortDescription("Cat")
	 * ```
	 */
	async getShortDescription(pageName: string): Promise<string | null> {
		const cached = this.shortDescriptionCache.get(pageName)
		if (cached !== undefined) return cached
		try {
			const summary = await this.getPageSummary(pageName)
			const desc = summary.description ?? null
			this.shortDescriptionCache.set(pageName, desc)
			return desc
		} catch {
			this.shortDescriptionCache.set(pageName, null)
			return null
		}
	}

	/**
	 * Get page content as HTML
	 * @param pageName - Page title
	 * @returns HTML content
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageHtml("Cat")
	 * ```
	 */
	async getPageHtml(pageName: string): Promise<string> {
		return (await this.request({
			api: "mediawiki",
			path: `page/${this.encodeForUrl(pageName)}/html`,
			type: "text",
		})) as string
	}

	/**
	 * Get HTML for a specific revision.
	 * Uses the MediaWiki REST API endpoint: GET revision/{id}/html.
	 * Falls back to the Wikimedia REST API page/html/{title}/{revision} if needed.
	 * Uses caching to avoid re-fetching the same revision.
	 * @param pageName - Page title (used for Wikimedia fallback and for API compatibility)
	 * @param revId - Revision ID
	 * @returns HTML content for that revision
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRevisionHtml("Cat", 12345)
	 * ```
	 */
	async getRevisionHtml(pageName: string, revId: number): Promise<string> {
		const key = String(revId)
		const cached = this.revisionHtmlCache.get(key)
		if (cached !== undefined) return cached
		try {
			const html = (await this.request({
				api: "mediawiki",
				path: `revision/${revId}/html`,
				type: "text",
			})) as string
			this.revisionHtmlCache.set(key, html)
			return html
		} catch {
			console.error(
				"Failed to get revision HTML from MediaWiki REST API, falling back to Wikimedia REST API",
				{
					pageName,
					revId,
				}
			)
			// Fallback: Wikimedia REST API page/html/{title}/{revision} (same Parsoid HTML)
			const html = (await this.request({
				api: "wikimedia",
				path: `page/html/${this.encodeForUrl(pageName)}/${revId}`,
				type: "text",
			})) as string
			this.revisionHtmlCache.set(key, html)
			return html
		}
	}

	/**
	 * Get page content as wikitext source
	 * @param pageName - Page title
	 * @returns Wikitext source
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageSource("Cat")
	 * ```
	 */
	async getPageSource(pageName: string): Promise<string> {
		const page = (await this.request({
			api: "mediawiki",
			path: `page/${this.encodeForUrl(pageName)}`,
		})) as { source: string }
		return page.source
	}

	/**
	 * Get full page metadata and latest revision
	 * @param pageName - Page title
	 * @returns Page metadata with source content
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPage("Cat")
	 * ```
	 */
	async getPage(pageName: string): Promise<FWPageMetadata> {
		return (await this.request({
			api: "mediawiki",
			path: `page/${this.encodeForUrl(pageName)}`,
		})) as FWPageMetadata
	}

	/**
	 * Search for pages by title (autocomplete-style)
	 * @param query - Search query
	 * @param limit - Maximum results (default: DEFAULT_SEARCH_LIMIT)
	 * @returns Search results with pages array
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.searchTitles("test", 10)
	 * ```
	 */
	async searchTitles(
		query: string,
		limit = DEFAULT_SEARCH_LIMIT
	): Promise<{ pages?: FWPageSearchResult[] }> {
		return (await this.request({
			api: "mediawiki",
			path: `search/title?q=${encodeURIComponent(query)}&limit=${limit}`,
		})) as { pages?: FWPageSearchResult[] }
	}

	/**
	 * Full-text search across page titles and content
	 * @param query - Search query
	 * @param limit - Maximum results (default: DEFAULT_SEARCH_LIMIT)
	 * @returns Search results with pages array
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.searchPages("test", 10)
	 * ```
	 */
	async searchPages(
		query: string,
		limit = DEFAULT_SEARCH_LIMIT
	): Promise<{ pages?: FWPageSearchResult[] }> {
		return (await this.request({
			api: "mediawiki",
			path: `search/page?q=${encodeURIComponent(query)}&limit=${limit}`,
		})) as { pages?: FWPageSearchResult[] }
	}

	/**
	 * Find pages related to one or more seed pages using CirrusSearch `morelike:`.
	 * Uses Action API search (`action=query&list=search`) with `srsearch=morelike:...`.
	 * @param pageTitles - Seed page titles used to construct the morelike query
	 * @param options - Optional search options (limit, offset, and namespace)
	 * @returns Related pages with total hits and pagination metadata
	 * @category Search
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getMoreLikePages(["Cat"], { limit: 5 })
	 * ```
	 */
	async getMoreLikePages(
		pageTitles: string[],
		options?: FWMoreLikeOptions
	): Promise<FWMoreLikeResponse> {
		const seeds = [...new Set(pageTitles.map(title => title.trim()).filter(Boolean))].map(
			title => title.replace(/ /g, "_")
		)
		const offset = Math.max(0, Math.floor(options?.offset ?? 0))

		if (seeds.length === 0) {
			return {
				pages: [],
				totalHits: 0,
				offset,
				seeds: [],
				query: "",
			}
		}

		const limit = Math.min(
			MAX_MORELIKE_LIMIT,
			Math.max(1, Math.floor(options?.limit ?? DEFAULT_MORELIKE_LIMIT))
		)
		const query = `morelike:${seeds.join("|")}`
		const params: Record<string, string | number> = {
			action: "query",
			list: "search",
			srsearch: query,
			srwhat: "text",
			srlimit: limit,
			sroffset: offset,
		}
		if (typeof options?.namespace === "number" && Number.isFinite(options.namespace)) {
			params.srnamespace = Math.floor(options.namespace)
		}

		const data = (await this.request({
			api: "action",
			params,
		})) as {
			query?: {
				search?: FWMoreLikeSearchResult[]
				searchinfo?: { totalhits?: number }
			}
			continue?: { sroffset?: number | string }
		}
		const nextOffsetRaw = data.continue?.sroffset
		const nextOffsetNumber = Number(nextOffsetRaw)
		return {
			pages: data.query?.search ?? [],
			totalHits: data.query?.searchinfo?.totalhits ?? 0,
			offset,
			nextOffset:
				nextOffsetRaw !== undefined && Number.isFinite(nextOffsetNumber)
					? nextOffsetNumber
					: undefined,
			seeds,
			query,
		}
	}

	/**
	 * Search for users by username (without avatars).
	 * @param query - Search query (username or part of username)
	 * @param limit - Maximum results (default: DEFAULT_SEARCH_LIMIT)
	 * @returns Array of user objects with username and page metadata (no avatar)
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.searchUsers("Alice", 10)
	 * ```
	 */
	async searchUsers(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<FWUserSearchResult[]> {
		// Search for users by prefixing with "User:" if not already present
		const cleanQuery = query.trim()
		const searchQuery = cleanQuery.startsWith("User:") ? cleanQuery : `User:${cleanQuery}`

		// Search for titles matching the query
		const data = (await this.searchTitles(searchQuery, limit * 2)) as {
			pages?: Array<{ title: string }>
		}

		// Filter to only User namespace pages (exclude subpages like User:Name/Talk)
		const userPages = (data.pages || []).filter(
			page =>
				page.title.startsWith("User:") &&
				!page.title.includes("/") &&
				page.title !== "User:"
		)

		// Limit results after filtering
		const limitedPages = userPages.slice(0, limit)

		return limitedPages.map(page => ({
			...page,
			username: page.title.replace(/^User:/, ""),
		}))
	}

	/**
	 * Search for users by username and fetch their avatars.
	 * @param query - Search query (username or part of username)
	 * @param limit - Maximum results (default: DEFAULT_SEARCH_LIMIT)
	 * @returns Array of user objects with username, avatar, and page metadata
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.searchUsersWithAvatars("Bob", 5)
	 * ```
	 */
	async searchUsersWithAvatars(
		query: string,
		limit = DEFAULT_SEARCH_LIMIT
	): Promise<FWUserSearchResult[]> {
		const users = await this.searchUsers(query, limit)
		return Promise.all(
			users.map(async user => {
				const avatar = await this.getUserAvatar(user.username)
				return {
					...user,
					avatar: avatar ? { url: avatar } : null,
				}
			})
		)
	}

	/**
	 * Get page revision history
	 * Uses caching to avoid fetching the same data twice.
	 * Uses older_than/newer_than cursors for pagination and filtering.
	 * @param pageName - Page title
	 * @param options - Options
	 * @param options.older_than - Revision ID or timestamp - for explicit pagination
	 * @param options.newer_than - Revision ID or timestamp - for explicit pagination
	 * @param options.limit - Maximum results to return (default and max: PAGE_HISTORY_REVISIONS_PER_REQUEST)
	 * @returns Revision history with revisions array
	 * @note The MediaWiki REST API returns PAGE_HISTORY_REVISIONS_PER_REQUEST revisions per request.
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageHistory("Cat", { limit: 10 })
	 * ```
	 */
	async getPageHistory(
		pageName: string,
		options: FWHistoryOptions = {}
	): Promise<FWPageHistoryResponse> {
		const cached = this.pageHistoryCache.get(pageName) || []
		const older_than = options.older_than
		const newer_than = options.newer_than
		const limit = this.normalizeLimit(
			options.limit,
			PAGE_HISTORY_REVISIONS_PER_REQUEST,
			PAGE_HISTORY_REVISIONS_PER_REQUEST
		)

		const cachedFiltered = this.filterHistoryByCriteria(cached, older_than, newer_than)
		if (
			this.hasSufficientCacheCoverage(
				this.pageHistoryCoverage,
				pageName,
				older_than,
				newer_than,
				limit,
				cachedFiltered.length
			)
		) {
			return { revisions: cachedFiltered.slice(0, limit) }
		}

		const params = new URLSearchParams()
		if (older_than) params.append("older_than", older_than)
		if (newer_than) params.append("newer_than", newer_than)

		const query = params.toString()
		const path = `page/${this.encodeForUrl(pageName)}/history${query ? `?${query}` : ""}`
		const response = (await this.request({
			api: "mediawiki",
			path,
		})) as FWPageHistoryResponse

		const newRevisions = response.revisions || []
		const merged = this.mergeHistoryByRevisionId(cached, newRevisions)
		this.pageHistoryCache.set(pageName, merged)

		const filtered = this.filterHistoryByCriteria(merged, older_than, newer_than)
		const returned = filtered.slice(0, limit)
		const earliestTimestamp =
			filtered.length > 0 ? filtered[filtered.length - 1]?.timestamp : undefined
		const latestTimestamp = filtered.length > 0 ? filtered[0]?.timestamp : undefined

		this.recordCoverage(this.pageHistoryCoverage, pageName, {
			older_than,
			newer_than,
			limit,
			resultCount: filtered.length,
			earliestTimestamp,
			latestTimestamp,
			complete: newRevisions.length < PAGE_HISTORY_REVISIONS_PER_REQUEST,
		})

		return { ...response, revisions: returned }
	}

	/**
	 * Get user contribution history (revisions made by a user)
	 * Uses caching to avoid fetching the same data twice.
	 * Uses older_than/newer_than cursors for pagination and filtering.
	 * @param userName - Username
	 * @param options - Options
	 * @param options.limit - Limit (default: DEFAULT_USER_CONTRIBS_LIMIT, max: USER_CONTRIBS_MAX_LIMIT)
	 * @param options.older_than - Timestamp - for explicit pagination
	 * @param options.newer_than - Timestamp - for explicit pagination
	 * @returns User revision history with same structure as getPageHistory
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getUserHistory("Example", { limit: 10 })
	 * ```
	 */
	async getUserHistory(
		userName: string,
		options: FWHistoryOptions = {}
	): Promise<FWPageHistoryResponse> {
		const cached = this.userHistoryCache.get(userName) || []
		const older_than = options.older_than
		const newer_than = options.newer_than
		const limit = this.normalizeLimit(
			options.limit,
			DEFAULT_USER_CONTRIBS_LIMIT,
			USER_CONTRIBS_MAX_LIMIT
		)

		const cachedFiltered = this.filterHistoryByCriteria(cached, older_than, newer_than)
		if (
			this.hasSufficientCacheCoverage(
				this.userHistoryCoverage,
				userName,
				older_than,
				newer_than,
				limit,
				cachedFiltered.length
			)
		) {
			return { revisions: cachedFiltered.slice(0, limit) }
		}

		const fetched = await this._getUserHistory(userName, {
			limit,
			older_than,
			newer_than,
		})
		const newRevisions = (fetched.revisions || []).map(
			rev => rev as FWPageHistoryRevision & { pageName: string }
		)
		const merged = this.mergeHistoryByRevisionId(cached, newRevisions)
		this.userHistoryCache.set(userName, merged)

		const filtered = this.filterHistoryByCriteria(merged, older_than, newer_than)
		const returned = filtered.slice(0, limit)
		const earliestTimestamp =
			filtered.length > 0 ? filtered[filtered.length - 1]?.timestamp : undefined
		const latestTimestamp = filtered.length > 0 ? filtered[0]?.timestamp : undefined

		this.recordCoverage(this.userHistoryCoverage, userName, {
			older_than,
			newer_than,
			limit,
			resultCount: filtered.length,
			earliestTimestamp,
			latestTimestamp,
			complete: newRevisions.length < limit,
		})

		return { ...fetched, revisions: returned }
	}

	/**
	 * Get user contributions using the Action API
	 * @param userName - Username
	 * @param options - Options (limit, etc.)
	 * @returns User revision history
	 */
	async _getUserHistory(
		userName: string,
		options: FWHistoryOptions = {}
	): Promise<FWPageHistoryResponse> {
		const limit = options.limit || DEFAULT_USER_CONTRIBS_LIMIT
		const ucstart = options.older_than || undefined
		const ucend = options.newer_than || undefined

		const params: Record<string, unknown> = {
			action: "query",
			list: "usercontribs",
			ucuser: userName,
			uclimit: limit,
			ucprop: "ids|title|timestamp|comment|size|sizediff|flags|tags",
		}

		if (ucstart) params.ucstart = ucstart
		if (ucend) params.ucend = ucend

		const data = (await this.request({
			api: "action",
			params,
		})) as {
			query?: {
				usercontribs?: FWUserContrib[]
			}
		}

		// Transform Action API response to match REST API format
		const contributions = data.query?.usercontribs || []
		const revisions = contributions.map(contrib => ({
			id: contrib.revid,
			timestamp: contrib.timestamp,
			minor: contrib.minor === true,
			size: contrib.size || 0,
			comment: contrib.comment || null,
			user: {
				id: contrib.userid || null,
				name: contrib.user || userName,
			},
			delta: contrib.sizediff || null,
			pageName: contrib.title,
			pageId: contrib.pageid,
			...(Array.isArray(contrib.tags) && contrib.tags.length > 0 && { tags: contrib.tags }),
		}))

		return {
			revisions: revisions as FWPageHistoryRevision[],
		}
	}

	/**
	 * Get contributions for multiple users by calling getUserHistory for each.
	 * Uses caching to avoid fetching the same data twice.
	 * Uses bounded concurrency (same as getCombinedFeed user branch; Wikimedia: few concurrent Action requests).
	 * @param userNames - Array of usernames
	 * @param options - Options
	 * @param options.limit - Limit per user (default: DEFAULT_USER_CONTRIBS_LIMIT)
	 * @param options.older_than - Timestamp - for explicit pagination
	 * @param options.newer_than - Timestamp - for explicit pagination
	 * @returns Map of username to their revision history
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getUsersHistory({ userNames: ["A", "B"], limit: 10 })
	 * ```
	 */
	async getUsersHistory(
		userNames: string[],
		options: FWHistoryOptions = {}
	): Promise<Map<string, FWPageHistoryResponse>> {
		if (userNames.length === 0) {
			return new Map()
		}

		const userResults = await this.runWithConcurrency(
			userNames,
			this.historyFetchConcurrency,
			async userName => {
				try {
					const history = await this.getUserHistory(userName, options)
					return { userName, history }
				} catch {
					return { userName, history: { revisions: [] } as FWPageHistoryResponse }
				}
			}
		)
		const allResults = new Map<string, FWPageHistoryResponse>()

		for (const { userName, history } of userResults) {
			allResults.set(userName, history)
		}

		return allResults
	}

	/**
	 * Get a combined feed of revisions from multiple users and/or pages.
	 * Returns revisions that match ANY of the provided users OR pages, deduplicated and sorted by timestamp.
	 * Caching is handled internally by getUserHistory and getPageHistory.
	 * @param options - Configuration object
	 * @param options.userNames - Array of usernames to include
	 * @param options.pageNames - Array of page titles to include
	 * @param options.limit - Maximum total number of revisions to return (default and max: PAGE_HISTORY_REVISIONS_PER_REQUEST)
	 * @param options.perSourceLimit - Maximum revisions to request per page/user history source before merge
	 * @param options.after - Map of source (page name or user name) → revision ID to fetch revisions older than (per source). Ensures every page/user keeps paginating.
	 * @returns Array of revisions sorted by timestamp (newest first), deduplicated by revision ID
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getCombinedFeed({ pageNames: ["Cat"], userNames: [], limit: 10 })
	 * ```
	 */
	async getCombinedFeed(options: {
		userNames?: string[]
		pageNames?: string[]
		limit?: number
		perSourceLimit?: number
		after?: Record<string, string>
	}): Promise<FWCachedRevision[]> {
		const {
			userNames = [],
			pageNames = [],
			limit = PAGE_HISTORY_REVISIONS_PER_REQUEST,
			perSourceLimit,
			after: afterMap,
		} = options
		const totalLimit = Math.min(Math.max(limit, 1), PAGE_HISTORY_REVISIONS_PER_REQUEST)
		const sourceLimit = Math.min(
			Math.max(perSourceLimit ?? totalLimit, 1),
			PAGE_HISTORY_REVISIONS_PER_REQUEST
		)
		const allRevisions: FWCachedRevision[] = []
		const seenIds = new Set<number>()

		// Fetch user contributions - per-user cursor from afterMap (look up rev id in cache for timestamp).
		if (userNames.length > 0) {
			const userResults = await this.runWithConcurrency(
				userNames,
				this.historyFetchConcurrency,
				async userName => {
					let userOptions: FWHistoryOptions = {
						limit: sourceLimit,
					}
					const afterRevId = afterMap?.[userName]
					if (afterRevId) {
						const cached = this.userHistoryCache.get(userName) || []
						const rev = cached.find(r => r.id === parseInt(afterRevId, 10))
						if (rev) {
							userOptions.older_than = rev.timestamp
						}
					}
					const history = await this.getUserHistory(userName, userOptions)
					return { userName, history }
				}
			)
			for (const { history } of userResults) {
				if (history.revisions) {
					for (const rev of history.revisions) {
						if (rev.id && !seenIds.has(rev.id)) {
							seenIds.add(rev.id)
							allRevisions.push(rev as FWCachedRevision)
						}
					}
				}
			}
		}

		// Fetch page histories - per-page cursor from afterMap.
		if (pageNames.length > 0) {
			const pageResults = await this.runWithConcurrency(
				pageNames,
				this.historyFetchConcurrency,
				async pageName => {
					try {
						const options: FWHistoryOptions = { limit: sourceLimit }
						const pageAfter = afterMap?.[pageName]
						if (pageAfter) {
							options.older_than = pageAfter
						}
						const history = await this.getPageHistory(pageName, options)
						return { pageName, revisions: history.revisions || [] }
					} catch {
						return { pageName, revisions: [] }
					}
				}
			)
			for (const { pageName, revisions } of pageResults) {
				for (const rev of revisions) {
					if (rev.id && !seenIds.has(rev.id)) {
						seenIds.add(rev.id)
						allRevisions.push({ ...rev, pageName } as FWCachedRevision)
					}
				}
			}
		}

		// Sort by timestamp (newest first), then limit
		return allRevisions
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, totalLimit)
	}

	/**
	 * Get global recent changes from the wiki (any pages) via Action API list=recentchanges.
	 * Optionally restrict to changes that "need review" (high revert risk) with rcshow=oresreview.
	 * Uses rctoponly so only the latest revision of each page is returned.
	 * @param options - Configuration object
	 * @param options.limit - Maximum number of changes to return (default 50, max 500)
	 * @param options.rccontinue - Continuation token from a previous response for pagination
	 * @param options.onlyNeedsReview - If true, pass rcshow=oresreview so the server returns only high revert risk / "needs review" edits (default false)
	 * @param options.rcstart - Timestamp to start enumerating from (with rcdir=older, must be later than rcend)
	 * @param options.rcend - Timestamp to end enumerating (with rcdir=older, must be earlier than rcstart)
	 * @returns Revisions (revision-like) and optional rccontinue for pagination
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRecentChanges({ limit: 20 })
	 * ```
	 */
	async getRecentChanges(
		options: {
			limit?: number
			rccontinue?: string
			onlyNeedsReview?: boolean
			rcstart?: string
			rcend?: string
		} = {}
	): Promise<FWRecentChangesResult> {
		const { limit = 50, rccontinue, onlyNeedsReview = false, rcstart, rcend } = options
		const rclimit = Math.min(Math.max(limit, 1), 500)

		const params: Record<string, unknown> = {
			action: "query",
			list: "recentchanges",
			rcprop: "title|timestamp|ids|user|comment|sizes|oresscores|tags",
			rclimit,
			rctype: "edit|new",
			rctoponly: 1,
		}
		if (onlyNeedsReview) {
			params.rcshow = "oresreview"
		}
		if (rccontinue) {
			params.rccontinue = rccontinue
		}
		if (rcstart) {
			params.rcstart = rcstart
		}
		if (rcend) {
			params.rcend = rcend
		}

		const data = (await this.request({
			api: "action",
			params,
		})) as {
			query?: {
				recentchanges?: Array<{
					revid?: number
					title?: string
					user?: string
					timestamp?: string
					comment?: string
					oldlen?: number
					newlen?: number
					oresscores?: Record<string, unknown>
					tags?: string[]
				}>
			}
			continue?: { rccontinue?: string }
		}

		const entries = data.query?.recentchanges ?? []
		const revisions: FWCachedRevision[] = entries.map(rc => {
			const rev: FWCachedRevision = {
				id: rc.revid ?? 0,
				timestamp: rc.timestamp ?? "",
				comment: rc.comment ?? "",
				user: { name: rc.user ?? "" },
				delta: (rc.newlen ?? 0) - (rc.oldlen ?? 0),
				pageName: rc.title,
				minor: false,
				size: rc.newlen ?? 0,
			}
			if (rc.oresscores) {
				;(rev as FWCachedRevision & { oresscores?: Record<string, unknown> }).oresscores =
					rc.oresscores
			}
			if (Array.isArray(rc.tags) && rc.tags.length > 0) {
				rev.tags = rc.tags
			}
			return rev
		})

		return {
			revisions,
			rccontinue: data.continue?.rccontinue,
		}
	}

	/**
	 * Fetch edit tags for given revision IDs via Action API.
	 * Use for revisions from sources that don't include tags (e.g. page history, related changes).
	 * @param revIds - Revision IDs to fetch tags for
	 * @returns Map of revision ID to tags array
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRevisionTags([12345, 12346])
	 * ```
	 */
	async getRevisionTags(revIds: number[]): Promise<Map<number, string[]>> {
		const result = new Map<number, string[]>()
		const unique = [...new Set(revIds)].filter(id => id > 0)
		if (unique.length === 0) return result

		const REVIDS_PER_REQUEST = 50
		for (let i = 0; i < unique.length; i += REVIDS_PER_REQUEST) {
			const chunk = unique.slice(i, i + REVIDS_PER_REQUEST)
			const revidsParam = chunk.join("|")

			const data = (await this.request({
				api: "action",
				params: {
					action: "query",
					prop: "revisions",
					revids: revidsParam,
					rvprop: "ids|tags",
				},
			})) as {
				query?: {
					pages?: Record<
						string,
						{ revisions?: Array<{ revid: number; tags?: string[] }> }
					>
				}
			}

			const pages = data.query?.pages ?? {}
			for (const page of Object.values(pages)) {
				for (const rev of page.revisions ?? []) {
					if (Array.isArray(rev.tags) && rev.tags.length > 0) {
						result.set(rev.revid, rev.tags)
					}
				}
			}
		}
		return result
	}

	/**
	 * Get reference need prediction for a revision from Lift Wing.
	 * Predicts the proportion of uncited sentences that need citations (0–1).
	 * Use for surfacing "needs reference check" flags when tags are unavailable.
	 * @param revId - Revision ID
	 * @param lang - Language code (e.g. "en"). If not provided, derived from base URL
	 * @returns Reference need score or null on error
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getReferenceNeedPrediction("Some paragraph text to score.", { lang: "en" })
	 * ```
	 */
	async getReferenceNeedPrediction(
		revId: number,
		lang?: string
	): Promise<FWReferenceNeedPrediction | null> {
		const langCode = lang ?? this.getEditTypesLang()
		const url =
			"https://api.wikimedia.org/service/lw/inference/v1/models/reference-need:predict"

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Api-User-Agent": this.apiUserAgent ?? DEFAULT_API_USER_AGENT,
				},
				body: JSON.stringify({ rev_id: revId, lang: langCode }),
			})

			if (!response.ok) {
				if (response.status === 422) return null
				const message = await this.getPredictionApiErrorMessage(response)
				console.warn(
					`Reference need prediction unavailable for revision ${revId}: ${message}`
				)
				return null
			}

			const data = (await response.json()) as {
				rn_score?: number
				reference_need_score?: number
			}
			const score = data.rn_score ?? data.reference_need_score
			if (typeof score === "number") {
				return { rn_score: score }
			}
			return null
		} catch (error) {
			console.error(`Failed to get reference need prediction for revision ${revId}:`, error)
			return null
		}
	}

	/**
	 * Get Tone Check prediction from Lift Wing edit-check model.
	 * Detects promotional, derogatory, or subjective language in text.
	 * @param originalText - Text before the edit
	 * @param modifiedText - Text after the edit (the new content to check)
	 * @param options - Optional lang (default from wiki) and pageTitle (default "")
	 * @returns Tone Check prediction or null on error
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getToneCheckPrediction("Some wikitext for tone.", { lang: "en" })
	 * ```
	 */
	async getToneCheckPrediction(
		originalText: string,
		modifiedText: string,
		options?: { lang?: string; pageTitle?: string }
	): Promise<FWToneCheckPrediction | null> {
		const lang = options?.lang ?? this.getEditTypesLang()
		const pageTitle = options?.pageTitle ?? ""
		const url = "https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict"

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Api-User-Agent": this.apiUserAgent ?? DEFAULT_API_USER_AGENT,
				},
				body: JSON.stringify({
					instances: [
						{
							lang,
							check_type: "tone",
							page_title: pageTitle,
							original_text: originalText,
							modified_text: modifiedText,
						},
					],
				}),
			})

			if (!response.ok) {
				const message = await this.getPredictionApiErrorMessage(response)
				console.warn(`Tone Check prediction unavailable: ${message}`)
				return null
			}

			const data = (await response.json()) as { predictions?: FWToneCheckPrediction[] }
			const pred = data.predictions?.[0]
			if (
				pred &&
				typeof pred.prediction === "boolean" &&
				typeof pred.probability === "number"
			) {
				return pred
			}
			return null
		} catch (error) {
			console.error("Failed to get Tone Check prediction:", error)
			return null
		}
	}

	/**
	 * Extract before/after text from diff lines, excluding context.
	 * Only includes add (1), remove (2), and change (3) lines.
	 * For change lines, uses highlightRanges to get just the changed segments.
	 * @param diff - Diff lines from compare API
	 * @returns { originalText, modifiedText } suitable for tone check
	 */
	private extractChangedSnippetsFromDiff(diff: FWDiffLine[]): {
		originalText: string
		modifiedText: string
	} {
		const originalParts: string[] = []
		const modifiedParts: string[] = []

		for (const line of diff ?? []) {
			const text = line.text ?? ""
			switch (line.type) {
				case 1: // add
					modifiedParts.push(text)
					break
				case 2: // remove
					originalParts.push(text)
					break
				case 3: // change (and 4, 5 move)
				case 4:
				case 5: {
					const segments = this.getDiffLineSegments(line)
					const oldParts: string[] = []
					const newParts: string[] = []
					for (const seg of segments) {
						if (seg.type === "remove") oldParts.push(seg.text)
						else if (seg.type === "add") newParts.push(seg.text)
						// null = context, exclude
					}
					const oldStr = oldParts.join("")
					const newStr = newParts.join("")
					if (oldStr || newStr) {
						originalParts.push(oldStr)
						modifiedParts.push(newStr)
					} else if (text) {
						// No highlightRanges: treat whole line as new (we lack old)
						modifiedParts.push(text)
						originalParts.push("")
					}
					break
				}
				default:
					// type 0 = context, skip
					break
			}
		}

		return {
			originalText: originalParts.join("\n"),
			modifiedText: modifiedParts.join("\n"),
		}
	}

	/**
	 * Get Tone Check prediction for a revision by comparing it with its parent.
	 * Fetches the diff, extracts only changed lines (no context), and runs tone check.
	 * @param pageName - Page title
	 * @param revId - Revision ID to check
	 * @param options - Optional lang (default from wiki) and pageTitle (default pageName)
	 * @returns Tone Check prediction or null when no changes, no parent, or on error
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getToneCheckForRevision(12345, { pageTitle: "Cat" })
	 * ```
	 */
	async getToneCheckForRevision(
		pageName: string,
		revId: number,
		options?: { lang?: string; pageTitle?: string }
	): Promise<FWToneCheckPrediction | null> {
		const diff = await this.getDiffSource(pageName, revId)
		const { originalText, modifiedText } = this.extractChangedSnippetsFromDiff(diff.diff ?? [])

		if (!originalText && !modifiedText) {
			return null
		}

		return this.getToneCheckPrediction(originalText, modifiedText, {
			lang: options?.lang,
			pageTitle: options?.pageTitle ?? pageName,
		})
	}

	/**
	 * Clear the page history cache for a page (or all pages if no name given).
	 * Use when you need fresh data, e.g. when opening the inline history view.
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.clearPageHistoryCache()
	 * ```
	 */
	clearPageHistoryCache(pageName?: string): void {
		if (pageName) {
			this.pageHistoryCache.delete(pageName)
			this.pageHistoryCoverage.delete(pageName)
		} else {
			this.pageHistoryCache.clear()
			this.pageHistoryCoverage.clear()
		}
	}

	/**
	 * Get the parent (previous) revision ID for a revision on a page from cache only.
	 * Does not trigger any network request.
	 * @param pageName - Page title
	 * @param revId - Revision ID to look up in the cached page history
	 * @returns Parent revision ID, null if this is oldest cached revision, or undefined if revId is not cached
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getParentRevisionIdFromCache("Cat", 12345)
	 * ```
	 */
	getParentRevisionIdFromCache(pageName: string, revId: number): number | null | undefined {
		const revisions = this.pageHistoryCache.get(pageName)
		if (!revisions || revisions.length === 0) return undefined
		const index = revisions.findIndex(rev => rev.id === revId)
		if (index === -1) return undefined
		const parent = revisions[index + 1]
		return parent?.id ?? null
	}

	/**
	 * Get the parent (previous) revision ID for a revision on a page.
	 * @param pageName - Page title
	 * @param revId - Revision ID (we want the revision immediately older than this)
	 * @returns Parent revision ID, or null if none (e.g. first revision)
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getParentRevisionId("Cat", 12345)
	 * ```
	 */
	async getParentRevisionId(pageName: string, revId: number): Promise<number | null> {
		const history = await this.getPageHistory(pageName, {
			older_than: String(revId),
		})
		const parent = history.revisions?.[0]
		return parent?.id ?? null
	}

	/**
	 * Compare two revisions via REST API and return source/line diff data.
	 * @param fromRevId - Source revision ID (older)
	 * @param toRevId - Target revision ID (newer)
	 * @returns Source diff between revisions
	 */
	private async getDiffSourceBetweenRevisions(
		fromRevId: number,
		toRevId: number
	): Promise<FWCompareResponse> {
		const key = `${fromRevId}:${toRevId}`
		const existing = this.compareInFlight.get(key)
		if (existing) return existing

		const promise = this.request({
			api: "mediawiki",
			path: `revision/${fromRevId}/compare/${toRevId}`,
		}) as Promise<FWCompareResponse>

		this.compareInFlight.set(key, promise)
		void promise.finally(() => {
			this.compareInFlight.delete(key)
		})
		return promise
	}

	/**
	 * Get wikitext source for a revision by ID.
	 * @param revId - Revision ID
	 * @returns Revision source (e.g. wikitext)
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRevisionSource(12345)
	 * ```
	 */
	async getRevisionSource(revId: number): Promise<string> {
		const revision = (await this.request({
			api: "mediawiki",
			path: `revision/${revId}`,
		})) as { source: string }
		return revision.source
	}

	/**
	 * Get source diff for a revision by comparing it with its parent (previous) revision.
	 * When there is no parent (e.g. first revision), returns a synthetic diff where
	 * every line is shown as added.
	 * @param pageName - Page title
	 * @param revId - Revision ID to diff
	 * @returns Source diff from parent to this revision, or a full-content "all added" diff when there is no parent
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getDiffSource("Cat", 12345)
	 * ```
	 */
	async getDiffSource(pageName: string, revId: number): Promise<FWCompareResponse> {
		const parentId = await this.getParentRevisionId(pageName, revId)
		if (parentId != null) return this.getDiffSourceBetweenRevisions(parentId, revId)
		// No parent: treat as first revision and show entire content as added.
		const source = await this.getRevisionSource(revId)
		const lines = source.split(/\n/)
		const diff: FWDiffLine[] = lines.map((text, i) => ({
			type: 1, // add
			lineNumber: i + 1,
			text: text || "",
		}))
		return {
			from: { id: 0 },
			to: { id: revId },
			diff,
		}
	}

	/**
	 * @deprecated Use getDiffSource(pageName, revId) instead.
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRevisionDiff("Cat", 12345)
	 * ```
	 */
	async getRevisionDiff(pageName: string, revId: number): Promise<FWCompareResponse> {
		return this.getDiffSource(pageName, revId)
	}

	/**
	 * Convert a UTF-8 byte offset to a JavaScript string character index.
	 * Used for mapping REST API highlight byte ranges onto codepoint-safe slice indices.
	 * @param str - Source text
	 * @param byteOffset - UTF-8 byte offset into str
	 * @returns Character index suitable for String.prototype.slice
	 */
	private byteOffsetToCharIndex(str: string, byteOffset: number): number {
		let bytes = 0
		let i = 0
		while (i < str.length) {
			const c = str.codePointAt(i) ?? 0
			if (c <= 0x7f) bytes += 1
			else if (c <= 0x7ff) bytes += 2
			else if (c <= 0xffff) bytes += 3
			else bytes += 4
			if (bytes > byteOffset) return i
			i += c > 0xffff ? 2 : 1
		}
		return str.length
	}

	/**
	 * Split a diff line into character-level highlight segments.
	 * Converts API byte-based highlight ranges into string segments that can be rendered with add/remove styles.
	 * @param line - Diff line from compare API
	 * @returns Ordered segments covering the entire line text
	 
	 * @example
	 * ```ts
	 * import type { FWDiffLine } from "fakewiki/types"
	 * const wiki = new FakeWiki()
	 * const line = { type: 0, text: "Hello" } as FWDiffLine
	 * wiki.getDiffLineSegments(line)
	 * ```
	 */
	getDiffLineSegments(line: FWDiffLine): FWDiffSegment[] {
		const text = line.text ?? ""
		const ranges = line.highlightRanges ?? []
		if (ranges.length === 0) {
			return [{ text, type: null }]
		}
		const sorted = [...ranges].sort((a, b) => a.start - b.start)
		const segments: FWDiffSegment[] = []
		let pos = 0
		for (const range of sorted) {
			const { start, length, type } = range
			const charStart = this.byteOffsetToCharIndex(text, start)
			const charEnd = this.byteOffsetToCharIndex(text, start + length)
			if (charStart > pos) {
				segments.push({ text: text.slice(pos, charStart), type: null })
			}
			segments.push({
				text: text.slice(charStart, charEnd),
				type: type === 0 ? "add" : type === 1 ? "remove" : null,
			})
			pos = charEnd
		}
		if (pos < text.length) {
			segments.push({ text: text.slice(pos), type: null })
		}
		return segments
	}

	/**
	 * Map compare API diff line type to a CSS class name.
	 * @param type - Diff line type (0=context, 1=add, 2=remove, 3/4/5=change)
	 * @returns CSS class for styling the line
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getDiffLineClass(0)
	 * ```
	 */
	getDiffLineClass(type: number): string {
		switch (type) {
			case 0:
				return "diff-line-context"
			case 1:
				return "diff-line-add"
			case 2:
				return "diff-line-remove"
			case 3:
			case 4:
			case 5:
				return "diff-line-change"
			default:
				return "diff-line-context"
		}
	}

	/**
	 * Get a random page
	 * @param format - Format: 'summary', 'html', or 'title' (default: 'summary')
	 * @returns Random page content - string for 'title' format, RandomPageSummary for 'summary' or 'html' format
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRandomPage()
	 * ```
	 */
	async getRandomPage(
		format: "summary" | "html" | "title" = "summary"
	): Promise<FWRandomPageResult> {
		if (format === "title") {
			// For title-only, use MediaWiki API
			const result = (await this.request({
				api: "mediawiki",
				path: "page/random",
			})) as { title: string }
			return result.title
		}
		return (await this.request({
			api: "wikimedia",
			path: `page/random/${format}`,
		})) as FWRandomPageSummary
	}

	/**
	 * Get featured page for a specific date
	 * @param date - Date object or YYYY/MM/DD string (leave blank for today's featured page)
	 * @returns Featured page data
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getFeaturedPage()
	 * ```
	 */
	async getFeaturedPage(date: Date | string = new Date()): Promise<FWFeaturedPage> {
		const dateStr =
			date instanceof Date
				? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
				: date
		return (await this.request({
			api: "wikimedia",
			path: `feed/featured/${dateStr}`,
		})) as FWFeaturedPage
	}

	/**
	 * Get "On This Day" content for a given type
	 * @param type - Type: 'events', 'births', 'deaths', 'holidays', 'selected'
	 * @param date - Date object or MM/DD string
	 * @returns Array of on-this-day items for the requested type
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getOnThisDay()
	 * ```
	 */
	async getOnThisDay(
		type: "events" | "births" | "deaths" | "holidays" | "selected" = "events",
		date: Date | string = new Date()
	): Promise<FWOnThisDayItem[]> {
		const dateStr =
			date instanceof Date
				? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
				: date
		const response = (await this.request({
			api: "wikimedia",
			path: `feed/onthisday/${type}/${dateStr}`,
		})) as Record<string, FWOnThisDayItem[] | undefined>
		return response[type] ?? []
	}

	/**
	 * Get current announcements
	 * @returns Announcements
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getAnnouncements()
	 * ```
	 */
	async getAnnouncements(): Promise<unknown> {
		return this.request({
			api: "wikimedia",
			path: "feed/announcements",
		})
	}

	/**
	 * Get page media (images, audio, etc.)
	 * @param pageName - Page title
	 * @returns Media files associated with the page
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageMedia("Cat")
	 * ```
	 */
	async getPageMedia(pageName: string): Promise<FWPageMediaResponse> {
		return (await this.request({
			api: "wikimedia",
			path: `page/media-list/${this.encodeForUrl(pageName)}`,
		})) as FWPageMediaResponse
	}

	/**
	 * Get outgoing wikilinks for multiple pages (intra-language links)
	 * Automatically handles pagination to fetch all links.
	 * @param pageNames - Array of page titles
	 * @param options - Options
	 * @param options.namespace - Filter by namespace (e.g., 0 for main namespace)
	 * @returns Map of page title to array of linked page titles
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPagesLinks(["Cat", "Dog"], 50)
	 * ```
	 */
	async getPagesLinks(
		pageNames: string[],
		options: { namespace?: number } = {}
	): Promise<Map<string, string[]>> {
		if (pageNames.length === 0) {
			return new Map()
		}

		const { namespace } = options
		const result = new Map<string, string[]>()

		// Initialize result map with empty arrays
		for (const pageName of pageNames) {
			result.set(pageName, [])
		}

		// Join page titles with pipe separator
		const titles = pageNames.join("|")

		let plcontinue: string | undefined = undefined

		do {
			const params: Record<string, unknown> = {
				action: "query",
				prop: "links",
				titles,
				pllimit: 500, // Maximum per request
			}

			if (namespace !== undefined) {
				params.plnamespace = namespace
			}

			if (plcontinue) {
				params.plcontinue = plcontinue
			}

			const data = (await this.request({
				api: "action",
				params,
			})) as {
				query?: {
					pages?: {
						[pageId: string]: {
							title: string
							links?: Array<{ title: string }>
						}
					}
				}
				continue?: {
					plcontinue?: string
				}
			}

			const pages = data.query?.pages

			if (pages) {
				for (const page of Object.values(pages)) {
					if (page.title && page.links) {
						const existingLinks = result.get(page.title) || []
						result.set(page.title, [
							...existingLinks,
							...page.links.map(link => link.title),
						])
					}
				}
			}

			// Check for continuation token (at root level, not under query)
			plcontinue = data.continue?.plcontinue
		} while (plcontinue)

		return result
	}

	/**
	 * Get outgoing links and backlinks for the given pages in one call.
	 * Convenience that runs getPagesLinks and getPagesBacklinks in parallel.
	 * @param pageNames - Array of page titles
	 * @param options - Options (namespace for both; backlinkLimit for backlinks only)
	 * @returns Object with links and backlinks maps
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPagesLinksAndBacklinks(["Cat"], 50)
	 * ```
	 */
	async getPagesLinksAndBacklinks(
		pageNames: string[],
		options: { namespace?: number; backlinkLimit?: number } = {}
	): Promise<{ links: Map<string, string[]>; backlinks: Map<string, string[]> }> {
		const { namespace, backlinkLimit } = options
		const [links, backlinks] = await Promise.all([
			this.getPagesLinks(pageNames, { namespace }),
			this.getPagesBacklinks(pageNames, { namespace, limit: backlinkLimit }),
		])
		return { links, backlinks }
	}

	/**
	 * Get pages that link to the given page(s) (backlinks / "What links here")
	 * Uses MediaWiki Action API prop=linkshere.
	 * @param pageNames - Array of page titles to find backlinks for
	 * @param options - Options
	 * @param options.namespace - Filter by namespace (e.g., 0 for main namespace)
	 * @param options.limit - Max backlinks per page (default 500)
	 * @returns Map of target page title to array of page titles that link to it
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPagesBacklinks(["Cat"], 50)
	 * ```
	 */
	async getPagesBacklinks(
		pageNames: string[],
		options: { namespace?: number; limit?: number } = {}
	): Promise<Map<string, string[]>> {
		if (pageNames.length === 0) {
			return new Map()
		}

		const { namespace, limit = 500 } = options
		const result = new Map<string, string[]>()

		for (const pageName of pageNames) {
			result.set(pageName, [])
		}

		const titles = pageNames.join("|")
		let lhcontinue: string | undefined = undefined

		do {
			const params: Record<string, unknown> = {
				action: "query",
				prop: "linkshere",
				titles,
				lhlimit: Math.min(limit, 500),
			}

			if (namespace !== undefined) {
				params.lhnamespace = namespace
			}

			if (lhcontinue) {
				params.lhcontinue = lhcontinue
			}

			const data = (await this.request({
				api: "action",
				params,
			})) as {
				query?: {
					pages?: {
						[pageId: string]: {
							title: string
							linkshere?: Array<{ title: string }>
						}
					}
				}
				continue?: {
					lhcontinue?: string
				}
			}

			const pages = data.query?.pages

			if (pages) {
				for (const page of Object.values(pages)) {
					if (page.title && page.linkshere) {
						const existing = result.get(page.title) || []
						result.set(page.title, [...existing, ...page.linkshere.map(lh => lh.title)])
					}
				}
			}

			lhcontinue = data.continue?.lhcontinue
		} while (lhcontinue)

		return result
	}

	/**
	 * Get related changes using the Action API feedrecentchanges (1–2 requests total).
	 * Returns recent edits on pages linked from the target (outgoing) and/or pages that link to the target (incoming).
	 * @param targetPageName - Page title to get related changes for
	 * @param options - showOutgoing: changes on pages the target links to (default true); showIncoming: changes on pages that link to the target (default true); limit: max items per direction 1–50 (default 50); days: 1–30 (default 7); from: optional lower-bound timestamp; to: optional upper-bound timestamp (useful for older-page pagination)
	 * @returns Array of revision-like items with linkType, sorted by timestamp newest first
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRelatedChanges("Cat", { limit: 20, days: 7 })
	 * ```
	 */
	async getRelatedChanges(
		targetPageName: string,
		options: {
			showOutgoing?: boolean
			showIncoming?: boolean
			limit?: number
			days?: number
			from?: string
		} = {}
	): Promise<FWRevisionWithLinkType[]> {
		const { showOutgoing = true, showIncoming = true, limit = 50, days = 7, from } = options
		const target = targetPageName.trim()
		if (!target) return []

		const params = (showLinkedTo: boolean) => {
			// feedformat: "atom" | "rss" (API supports both; we parse Atom only below)
			const p: Record<string, string> = {
				action: "feedrecentchanges",
				feedformat: "atom",
				target,
				limit: String(limit),
				days: String(days),
			}
			if (showLinkedTo) p.showlinkedto = "1"
			if (from) p.from = from
			return p
		}

		const fetchFeed = async (showLinkedTo: boolean): Promise<Document> => {
			const searchParams = new URLSearchParams(params(showLinkedTo))
			const url = `${this.base}w/api.php?${searchParams.toString()}&origin=*`
			const response = await fetch(url, {
				headers: {
					"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
				},
			})
			if (!response.ok) {
				await this.throwHttpErrorFromResponse(response, url, { api: "action" })
			}
			const text = await response.text()
			// console.log("text", text)
			const parser = new DOMParser()
			const doc = parser.parseFromString(text, "application/xml")
			const parseError = doc.querySelector("parsererror")
			if (parseError) throw new Error("Failed to parse related changes feed")
			return doc
		}

		const parseAtomEntries = <T extends "to" | "from">(
			doc: Document,
			linkType: T
		): (FWRevision & { linkType: T })[] => {
			const ns = "http://www.w3.org/2005/Atom"
			const entries = doc.getElementsByTagNameNS(ns, "entry")
			const list: (FWRevision & { linkType: T })[] = []
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i]
				if (!entry) continue
				const titleEl = entry.getElementsByTagNameNS(ns, "title").item(0)
				const title = titleEl?.textContent?.trim() ?? ""
				const linkEl = entry.getElementsByTagNameNS(ns, "link").item(0)
				const href = linkEl?.getAttribute("href") ?? ""
				const updatedEl = entry.getElementsByTagNameNS(ns, "updated").item(0)
				const updated = updatedEl?.textContent?.trim() ?? ""
				const authorEl = entry.getElementsByTagNameNS(ns, "author").item(0)
				const nameEl = authorEl?.getElementsByTagNameNS(ns, "name").item(0)
				const userName = nameEl?.textContent?.trim() ?? ""
				const summaryEl = entry.getElementsByTagNameNS(ns, "summary").item(0)
				const summary = summaryEl?.textContent?.trim() ?? ""
				let comment = ""
				if (summary) {
					const summaryDoc = new DOMParser().parseFromString(summary, "text/html")
					const firstParagraph = summaryDoc.querySelector("p")
					comment = (
						firstParagraph?.textContent ??
						summaryDoc.body?.textContent ??
						""
					).trim()
				}
				let id = 0
				if (href) {
					const diffMatch = href.match(/[?&]diff=(\d+)/)
					if (diffMatch) id = parseInt(diffMatch[1], 10)
				}
				list.push({
					id,
					timestamp: updated || new Date().toISOString(),
					user: { name: userName },
					delta: null,
					comment,
					pageName: title,
					linkType: linkType as T,
				})
			}
			return list
		}

		const promises: Promise<Document>[] = []
		if (showOutgoing) promises.push(fetchFeed(false))
		if (showIncoming) promises.push(fetchFeed(true))
		const docs = await Promise.all(promises)

		const outgoing = showOutgoing && docs[0] ? parseAtomEntries(docs[0], "to") : []
		const incoming = showIncoming ? parseAtomEntries(docs[showOutgoing ? 1 : 0], "from") : []

		const byKey = new Map<string, FWRevisionWithLinkType>()
		for (const r of outgoing) {
			const key = `${(r.pageName ?? "").toLowerCase()}\t${r.timestamp}\t${r.user.name}`
			byKey.set(key, { ...r })
		}
		for (const r of incoming) {
			const key = `${(r.pageName ?? "").toLowerCase()}\t${r.timestamp}\t${r.user.name}`
			const existing = byKey.get(key)
			if (existing) existing.linkType = "both"
			else byKey.set(key, { ...r })
		}
		const merged = [...byKey.values()].sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)
		return merged
	}

	/**
	 * Get related changes from multiple seed pages, merged and filtered to the top N% by score.
	 * Counts and score are per-page: "which feeds this page appears in" (any revision). Same
	 * feedCountBidirectional/Outgoing/Backlink and score are shown on every revision of that page.
	 * Uses scoreMultipliers (default bidirectional×4, outgoing×2, backlink×1). No extra API calls.
	 * Order is preserved (by timestamp desc); no extra sorting after filtering.
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getTopRelatedChanges(["Cat", "Dog"], { limit: 20, days: 7, percentage: 10 })
	 * ```
	 */
	async getTopRelatedChanges(
		pageNames: string[],
		options: FWTopRelatedOptions = {}
	): Promise<FWTopRelatedChange[]> {
		const { percentage = 10, scoreMultipliers = {}, limit = 50, days = 7, from } = options
		const bidir = scoreMultipliers.bidirectional ?? 4
		const out = scoreMultipliers.outgoing ?? 2
		const back = scoreMultipliers.backlink ?? 1
		const trimmed = pageNames.map(p => p.trim()).filter(Boolean)
		const seeds = [...new Set(trimmed)].sort()
		if (seeds.length === 0) return []

		const isModulePage = (name: string | null | undefined) =>
			(name ?? "").trim().startsWith("Module:")
		const isCategoryPage = (name: string | null | undefined) =>
			(name ?? "").trim().startsWith("Category:")
		const isExcludedRelatedPage = (name: string | null | undefined) =>
			isModulePage(name) || isCategoryPage(name)

		const cacheKey = JSON.stringify([seeds, limit, days, from ?? "", bidir, out, back])
		const cachedFull = this.topRelatedChangesCache.get(cacheKey)
		if (cachedFull !== undefined) {
			const filtered = cachedFull.filter(r => !isExcludedRelatedPage(r.pageName))
			const keepFraction = Math.max(0, Math.min(1, percentage / 100))
			const scores = filtered.map(r => r.score).sort((a, b) => b - a)
			const keepCount = Math.max(1, Math.ceil(scores.length * keepFraction))
			const threshold = scores[keepCount - 1] ?? 0
			return filtered.filter(r => r.score >= threshold)
		}

		function score(
			countBidirectional: number,
			countOutgoing: number,
			countBacklink: number
		): number {
			return countBidirectional * bidir + countOutgoing * out + countBacklink * back
		}

		const getRelatedOpts = { showOutgoing: true, showIncoming: true, limit, days, from }
		const revKey = (r: {
			pageName?: string | null
			timestamp: string
			user: { name: string }
		}) => `${(r.pageName ?? "").toLowerCase()}\t${r.timestamp}\t${r.user.name}`

		if (seeds.length === 1) {
			const revisions = await this.getRelatedChanges(seeds[0]!, getRelatedOpts)
			const filteredRevisions = revisions.filter(r => !isExcludedRelatedPage(r.pageName))
			const withScore: FWTopRelatedChange[] = filteredRevisions.map(r => ({
				...r,
				feedCountBidirectional: 0,
				feedCountOutgoing: 0,
				feedCountBacklink: 0,
				score: 0,
				sourcePageNames: [seeds[0]!],
			}))
			withScore.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)
			// Page-level counts: does this page appear in the (single) feed? 0 or 1 per link type; same on every revision
			const pageKeyOne = (name: string | null | undefined) =>
				(name ?? "").trim().toLowerCase()
			const pageHasBidir = new Map<string, boolean>()
			const pageHasOut = new Map<string, boolean>()
			const pageHasBack = new Map<string, boolean>()
			for (const r of withScore) {
				const key = pageKeyOne(r.pageName)
				const t = r.linkType ?? "to"
				if (!pageHasBidir.has(key)) {
					pageHasBidir.set(key, false)
					pageHasOut.set(key, false)
					pageHasBack.set(key, false)
				}
				if (t === "both") pageHasBidir.set(key, true)
				else if (t === "to") pageHasOut.set(key, true)
				else pageHasBack.set(key, true)
			}
			const seedName = seeds[0]!
			for (const r of withScore) {
				const key = pageKeyOne(r.pageName)
				const hasBidir = pageHasBidir.get(key) ?? false
				const hasOut = pageHasOut.get(key) ?? false
				const hasBack = pageHasBack.get(key) ?? false
				// Bidirectional if feed said "both" or if we saw both outgoing and backlink (treat as bidir)
				const isBidir = hasBidir || (hasOut && hasBack)
				const cb = isBidir ? 1 : 0
				const co = isBidir ? 0 : hasOut ? 1 : 0
				const cl = isBidir ? 0 : hasBack ? 1 : 0
				r.feedCountBidirectional = cb
				r.feedCountOutgoing = co
				r.feedCountBacklink = cl
				r.score = score(cb, co, cl)
				r.sourcePageNamesBidirectional = cb ? [seedName] : []
				r.sourcePageNamesOutgoing = co ? [seedName] : []
				r.sourcePageNamesBacklink = cl ? [seedName] : []
			}
			this.topRelatedChangesCache.set(cacheKey, withScore)
			const keepFraction = Math.max(0, Math.min(1, percentage / 100))
			const scores = withScore.map(r => r.score).sort((a, b) => b - a)
			const keepCount = Math.max(1, Math.ceil(scores.length * keepFraction))
			const threshold = scores[keepCount - 1] ?? 0
			return withScore.filter(r => r.score >= threshold)
		}

		const results = await Promise.all(
			seeds.map(name => this.getRelatedChanges(name, getRelatedOpts))
		)
		type SeedLinkType = "to" | "from" | "both"
		const byKey = new Map<
			string,
			{
				rev: FWRevisionWithLinkType
				seedToType: Map<string, SeedLinkType>
			}
		>()
		for (let i = 0; i < seeds.length; i++) {
			const sourcePage = seeds[i]!
			const revisions = results[i] ?? []
			for (const r of revisions) {
				if (isExcludedRelatedPage(r.pageName)) continue
				const key = revKey(r)
				const t: SeedLinkType = (r.linkType ?? "to") as SeedLinkType
				const existing = byKey.get(key)
				if (existing) {
					existing.seedToType.set(sourcePage, t)
				} else {
					byKey.set(key, {
						rev: r,
						seedToType: new Map([[sourcePage, t]]),
					})
				}
			}
		}

		const merged: (FWTopRelatedChange & { seedToType?: Map<string, SeedLinkType> })[] = [
			...byKey.values(),
		].map(({ rev, seedToType }) => ({
			...rev,
			feedCountBidirectional: 0,
			feedCountOutgoing: 0,
			feedCountBacklink: 0,
			score: 0,
			sourcePageNames: [...seedToType.keys()],
			seedToType,
		}))
		merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		// Page-level counts and score: which feeds this page appears in (any revision); same counts on every revision
		const pageKey = (name: string | null | undefined) => (name ?? "").trim().toLowerCase()
		const pageSeedsBidir = new Map<string, Set<string>>()
		const pageSeedsOut = new Map<string, Set<string>>()
		const pageSeedsBack = new Map<string, Set<string>>()
		for (const r of merged) {
			const key = pageKey(r.pageName)
			const seedToType = r.seedToType
			if (!seedToType) continue
			if (!pageSeedsBidir.has(key)) {
				pageSeedsBidir.set(key, new Set())
				pageSeedsOut.set(key, new Set())
				pageSeedsBack.set(key, new Set())
			}
			for (const [s, type] of seedToType) {
				if (type === "both") pageSeedsBidir.get(key)!.add(s)
				else if (type === "to") pageSeedsOut.get(key)!.add(s)
				else pageSeedsBack.get(key)!.add(s)
			}
		}
		// Seeds that appear in both outgoing and backlink → treat as bidirectional
		const allPageKeys = new Set([
			...pageSeedsBidir.keys(),
			...pageSeedsOut.keys(),
			...pageSeedsBack.keys(),
		])
		for (const key of allPageKeys) {
			const bidirSet = pageSeedsBidir.get(key)
			const outSet = pageSeedsOut.get(key)
			const backSet = pageSeedsBack.get(key)
			if (!outSet || !backSet) continue
			for (const s of outSet) {
				if (backSet.has(s)) {
					bidirSet?.add(s)
					outSet.delete(s)
					backSet.delete(s)
				}
			}
		}
		// If a seed has the page as bidirectional, count it only as bidir (don't also count as outgoing/backlink)
		for (const [key, bidirSet] of pageSeedsBidir) {
			const outSet = pageSeedsOut.get(key)
			const backSet = pageSeedsBack.get(key)
			if (outSet) for (const s of bidirSet) outSet.delete(s)
			if (backSet) for (const s of bidirSet) backSet.delete(s)
		}
		const pageSourceNames = new Map<string, string[]>()
		const pageSourceNamesBidir = new Map<string, string[]>()
		const pageSourceNamesOut = new Map<string, string[]>()
		const pageSourceNamesBack = new Map<string, string[]>()
		for (const key of new Set([
			...pageSeedsBidir.keys(),
			...pageSeedsOut.keys(),
			...pageSeedsBack.keys(),
		])) {
			const bidir = pageSeedsBidir.get(key) ?? new Set<string>()
			const out = pageSeedsOut.get(key) ?? new Set<string>()
			const back = pageSeedsBack.get(key) ?? new Set<string>()
			const union = new Set<string>([...bidir, ...out, ...back])
			pageSourceNames.set(key, [...union].sort())
			pageSourceNamesBidir.set(key, [...bidir].sort())
			pageSourceNamesOut.set(key, [...out].sort())
			pageSourceNamesBack.set(key, [...back].sort())
		}
		for (const r of merged) {
			const key = pageKey(r.pageName)
			const cb = pageSeedsBidir.get(key)?.size ?? 0
			const co = pageSeedsOut.get(key)?.size ?? 0
			const cl = pageSeedsBack.get(key)?.size ?? 0
			r.feedCountBidirectional = cb
			r.feedCountOutgoing = co
			r.feedCountBacklink = cl
			r.score = score(cb, co, cl)
			r.sourcePageNames = pageSourceNames.get(key) ?? []
			r.sourcePageNamesBidirectional = pageSourceNamesBidir.get(key) ?? []
			r.sourcePageNamesOutgoing = pageSourceNamesOut.get(key) ?? []
			r.sourcePageNamesBacklink = pageSourceNamesBack.get(key) ?? []
			delete (r as { seedToType?: Map<string, SeedLinkType> }).seedToType
		}

		this.topRelatedChangesCache.set(cacheKey, merged)

		const keepFraction = Math.max(0, Math.min(1, percentage / 100))
		const scores = merged.map(r => r.score).sort((a, b) => b - a)
		const keepCount = Math.max(1, Math.ceil(scores.length * keepFraction))
		const threshold = scores[keepCount - 1] ?? 0
		return merged.filter(r => r.score >= threshold)
	}

	/**
	 * Get the list of page titles that appear in the top N% of related changes by score.
	 * Same options as getTopRelatedChanges; returns unique page names in order of first appearance,
	 * each with the score from the first change that introduced that page (static per page),
	 * plus the changes that were retrieved as part of the scoring process (with sourcePageNames and link-type info).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getTopRelatedPages(["Cat"], { limit: 20, days: 7, percentage: 15 })
	 * ```
	 */
	async getTopRelatedPages(
		pageNames: string[],
		options: FWTopRelatedOptions = {}
	): Promise<FWTopRelatedPagesResult> {
		const changes = await this.getTopRelatedChanges(pageNames, options)
		const seen = new Set<string>()
		const order: FWTopRelatedPageWithScore[] = []
		for (const r of changes) {
			const name = r.pageName?.trim()
			if (name && !seen.has(name.toLowerCase())) {
				seen.add(name.toLowerCase())
				order.push({ title: name, score: r.score })
			}
		}
		return { pages: order, changes }
	}

	/**
	 * Get thumbnail image for a page.
	 * Uses the lead image (page summary) when available; otherwise falls back to the
	 * first image on the page (e.g. infobox image).
	 * @param pageName - Page title
	 * @returns Thumbnail URL or null
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageThumbnail("Cat")
	 * ```
	 */
	async getPageThumbnail(pageName: string): Promise<string | null> {
		try {
			// For User talk pages, get the user avatar instead
			if (pageName.startsWith("User talk:")) {
				return null
			}

			// For User pages, get the user avatar instead
			if (pageName.startsWith("User:")) {
				return null
			}

			// For Talk pages, get the thumbnail from the main page
			let targetPageName = pageName
			if (pageName.startsWith("Talk:")) {
				targetPageName = pageName.substring(5) // Remove "Talk:" prefix
			}

			const summary = await this.getPageSummary(targetPageName)
			if (summary.thumbnail?.source) {
				return summary.thumbnail.source
			}

			// Fallback: first image on the page (e.g. infobox image)
			// const firstImageUrl = await this.getFirstPageImageThumbnail(targetPageName)
			// return firstImageUrl
			return null
		} catch (error) {
			console.error("Failed to get thumbnail:", error)
			return null
		}
	}

	/**
	 * Get thumbnail URL for the first image embedded on a page (e.g. infobox).
	 * Uses Action API prop=images then imageinfo for the thumbnail.
	 * @param pageName - Page title
	 * @returns Thumbnail URL or null
	 * @private
	 */
	private async getFirstPageImageThumbnail(pageName: string): Promise<string | null> {
		return this.getFirstPageImageThumbnailWithBase(pageName, this.base)
	}

	/**
	 * Get thumbnail URL for the first image on a page, using a specific wiki base URL.
	 * Prefers the image from the page's infobox (table.infobox); falls back to the
	 * first image on the page if there is no infobox or no image in it.
	 * @param pageName - Page title
	 * @param base - Wiki base URL (e.g. https://en.wikipedia.org/)
	 * @returns Thumbnail URL or null
	 * @private
	 */
	private async getFirstPageImageThumbnailWithBase(
		pageName: string,
		base: string
	): Promise<string | null> {
		const infoboxUrl = await this.getInfoboxImageFromParsedPage(pageName, base)
		if (infoboxUrl && !this.isDisallowedFallbackThumbnailUrl(infoboxUrl)) {
			return infoboxUrl
		}
		return null
	}

	/**
	 * Whether a URL should be rejected as a page-thumbnail fallback.
	 * We never want map tile snapshots from maps.wikimedia.org as article thumbnails.
	 */
	private isDisallowedFallbackThumbnailUrl(url: string): boolean {
		try {
			const parsed = new URL(url)
			return parsed.hostname === "maps.wikimedia.org"
		} catch {
			return false
		}
	}

	/**
	 * Get the first image from a page's infobox (table.infobox) by parsing the page HTML.
	 * @param pageName - Page title
	 * @param base - Wiki base URL
	 * @returns Image URL or null
	 * @private
	 */
	private async getInfoboxImageFromParsedPage(
		pageName: string,
		base: string
	): Promise<string | null> {
		try {
			const parseParams = new URLSearchParams({
				action: "parse",
				page: pageName,
				prop: "text",
				format: "json",
				formatversion: "2",
				origin: "*",
			})
			const parseRes = await fetch(`${base}w/api.php?${parseParams.toString()}`, {
				headers: {
					"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
				},
			})
			if (!parseRes.ok) return null
			const parseData = (await parseRes.json()) as {
				parse?: { text?: string }
			}
			const html = parseData.parse?.text
			if (!html || typeof html !== "string") return null

			const doc = new DOMParser().parseFromString(html, "text/html")
			// Target the main infobox (Wikipedia uses table.infobox or table.wikitable.infobox)
			const infobox = doc.querySelector("table.infobox")
			const img = infobox?.querySelector("img[src]")
			const src = img?.getAttribute("src")
			if (!src) return null

			// Resolve relative or protocol-relative URLs
			if (src.startsWith("//")) return `https:${src}`
			if (src.startsWith("/")) {
				const origin = base.replace(/\/$/, "")
				return `${origin}${src}`
			}
			return src
		} catch {
			return null
		}
	}

	/**
	 * Get thumbnail URLs for multiple pages (lead image from each page).
	 * Uses the Action API pageimages in batches of 50.
	 * @param pageNames - Page titles
	 * @param baseUrl - Wiki base URL (e.g. https://en.wikipedia.org/). Defaults to this.base
	 * @returns Map of page title to thumbnail URL (only entries that have a thumbnail)
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageThumbnails(["Cat", "Dog"])
	 * ```
	 */
	async getPageThumbnails(
		pageNames: string[],
		baseUrl?: string
	): Promise<Record<string, string>> {
		const out: Record<string, string> = {}
		if (pageNames.length === 0) return out
		const base = baseUrl?.trim() ? baseUrl : this.base
		const headers = {
			"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
		}
		const chunkSize = 50
		for (let i = 0; i < pageNames.length; i += chunkSize) {
			const chunk = pageNames.slice(i, i + chunkSize)
			const params = new URLSearchParams({
				action: "query",
				prop: "pageimages",
				pithumbsize: "80",
				pilimit: String(chunkSize),
				titles: chunk.join("|"),
				format: "json",
				formatversion: "2",
				origin: "*",
			})
			try {
				const res = await fetch(`${base}w/api.php?${params.toString()}`, { headers })
				if (!res.ok) continue
				const json = (await res.json()) as {
					query?: { pages?: Array<{ title: string; thumbnail?: { source: string } }> }
				}
				for (const p of json.query?.pages ?? []) {
					if (p.thumbnail?.source) out[p.title] = p.thumbnail.source
				}
			} catch {
				// ignore per-chunk errors
			}
		}
		// Fallback: for pages without a lead image, use first image on page (e.g. infobox)
		const missing = pageNames.filter(t => !out[t])
		if (missing.length > 0) {
			const fallbacks = await Promise.allSettled(
				missing.map(async title => {
					const url = await this.getFirstPageImageThumbnailWithBase(title, base)
					return { title, url } as const
				})
			)
			for (const result of fallbacks) {
				if (result.status === "fulfilled" && result.value.url) {
					out[result.value.title] = result.value.url
				}
			}
		}
		return out
	}

	/** Base URL for the list-building API (Toolforge). */
	private readonly LIST_BUILDING_API = "https://list-building.toolforge.org/api/serpentine"

	/**
	 * Get a list of articles related to a seed page from the list-building API.
	 * Combines results from readers, content (links), and morelike models (serpentine order).
	 * @param lang - Language code (e.g. "en")
	 * @param options - Optional page title (seed), QID, and per-source result count (default 10)
	 * @returns Serpentine results and optional seed QID
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getListBuilding("en", { pageTitle: "Cat", qid: "Q146", k: 4 })
	 * ```
	 */
	async getListBuilding(
		lang: string,
		options?: { pageTitle?: string; qid?: string; k?: number }
	): Promise<FWListBuildingResponse> {
		const k = Math.min(100, Math.max(1, options?.k ?? 10))
		const pageTitle = options?.pageTitle?.trim() ?? ""
		const qid = options?.qid ?? ""
		const cacheKey = `listBuilding:${lang}:${pageTitle}:${qid}:${k}`

		const cached = this.listBuildingCache.get(cacheKey)
		if (cached !== undefined) {
			return cached
		}

		const params = new URLSearchParams({
			lang,
			"k-reader": String(k),
			"k-links": String(k),
			"k-morelike": String(k),
		})
		if (pageTitle) {
			params.set("page_title", pageTitle)
		}
		if (qid) {
			params.set("qid", qid)
		}
		const url = `${this.LIST_BUILDING_API}?${params.toString()}`
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
			},
		})
		if (!res.ok) {
			throw new Error(`List-building API error: ${res.status} ${res.statusText}`)
		}
		const data = (await res.json()) as FWListBuildingResponse
		const result = { results: data.results ?? [], qid: data.qid }
		this.listBuildingCache.set(cacheKey, result)
		return result
	}

	/**
	 * Clear the list-building cache so the next getListBuilding / getMultiPageListBuilding
	 * calls re-fetch from the API. Use when the user explicitly requests fresh recommendations.
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.clearListBuildingCache()
	 * ```
	 */
	clearListBuildingCache(): void {
		this.listBuildingCache.clear()
	}

	/**
	 * Merge one page's list-building response into the aggregation map.
	 * Key is source:itemKey(item); existing entries get listCount and positionScore accumulated.
	 */
	private mergeListBuildingResponseIntoMap(
		map: Map<string, FWMultiPageListBuildingEntry>,
		seedPageTitle: string,
		data: FWListBuildingResponse
	): void {
		const results = data.results ?? []
		const bySource: Record<string, typeof results> = {
			links: [],
			morelike: [],
			reader: [],
		}
		for (const r of results) {
			if (!bySource[r.source]) bySource[r.source] = []
			bySource[r.source].push(r)
		}
		for (const [source, list] of Object.entries(bySource)) {
			list.forEach((item, i) => {
				const rank = i + 1
				const positionContrib = 1 / rank
				// Use a unique key per item so entries from different seeds don't collapse when itemKey is empty
				const itemKey = item.qid || item.page_title?.trim() || ""
				const key = itemKey ? `${source}:${itemKey}` : `${source}:${seedPageTitle}-${i}`
				const existing = map.get(key)
				if (existing) {
					existing.listCount += 1
					existing.positionScore += positionContrib
					existing.pageTitles.push(seedPageTitle)
				} else {
					map.set(key, {
						item,
						listCount: 1,
						positionScore: positionContrib,
						pageTitles: [seedPageTitle],
					})
				}
			})
		}
	}

	/**
	 * Dedupe entries by recommended page (item.page_title), merge scores, filter invalid,
	 * and sort by quality (positionScore + listCount descending).
	 */
	private dedupeAndSortListBuildingEntries(
		entries: FWMultiPageListBuildingEntry[]
	): FWMultiPageListBuildingEntry[] {
		const byPage = new Map<string, FWMultiPageListBuildingEntry>()
		for (const e of entries) {
			const title = e.item.page_title?.trim()
			if (!title || title === "-" || e.item.redlink) continue
			const existing = byPage.get(title)
			if (existing) {
				existing.listCount += e.listCount
				existing.positionScore += e.positionScore
				for (const t of e.pageTitles) existing.pageTitles.push(t)
			} else {
				byPage.set(title, {
					item: e.item,
					listCount: e.listCount,
					positionScore: e.positionScore,
					pageTitles: [...e.pageTitles],
				})
			}
		}
		const result = [...byPage.values()]
		result.sort((a, b) => {
			const scoreA = a.positionScore + a.listCount
			const scoreB = b.positionScore + b.listCount
			return scoreB - scoreA
		})
		return result
	}

	/**
	 * Get list-building results for multiple seed pages. Returns the final aggregated list
	 * deduped by recommended page and sorted by quality (best first). Optionally pass onLoad
	 * to receive progressively complete lists (each call is the full current list, same shape).
	 * @param lang - Language code (e.g. "en")
	 * @param pageTitles - Seed page titles (deduplicated; empty titles skipped)
	 * @param options - Optional k and onLoad callback (always processes one seed page at a time)
	 * @returns Final { entries, completedCount } with entries deduped and sorted
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getMultiPageListBuilding("en", ["Cat", "Dog"], { k: 4 })
	 * ```
	 */
	async getMultiPageListBuilding(
		lang: string,
		pageTitles: string[],
		options?: {
			k?: number
			onLoad?: (_data: FWMultiPageListBuildingResult) => void
		}
	): Promise<FWMultiPageListBuildingResult> {
		const titles = [...new Set(pageTitles)].filter(t => t.trim().length > 0)
		const k = Math.min(100, Math.max(1, options?.k ?? 10))
		const onLoad = options?.onLoad
		const map = new Map<string, FWMultiPageListBuildingEntry>()
		const state = { completedCount: 0 }

		if (titles.length === 0) {
			const empty = { entries: [], completedCount: 0 }
			onLoad?.(empty)
			return empty
		}

		// Process pages sequentially so every seed is merged into the combined map.
		for (const title of titles) {
			const data = await this.getListBuilding(lang, { pageTitle: title, k })
			this.mergeListBuildingResponseIntoMap(map, title, data)
			state.completedCount += 1
			const deduped = this.dedupeAndSortListBuildingEntries([...map.values()])
			const payload: FWMultiPageListBuildingResult = {
				entries: deduped,
				completedCount: state.completedCount,
			}
			onLoad?.(payload)
		}

		const deduped = this.dedupeAndSortListBuildingEntries([...map.values()])
		return {
			entries: deduped,
			completedCount: state.completedCount,
		}
	}

	/**
	 * Get page hero image: thumbnail if present, otherwise the first media image.
	 * @param pageName - Page title
	 * @returns Hero image URL or null
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageHero("Cat")
	 * ```
	 */
	async getPageHero(pageName: string): Promise<string | null> {
		try {
			const summary = await this.getPageSummary(pageName)
			if (summary.thumbnail?.source) {
				return summary.thumbnail.source
			}
			const media = await this.getPageMedia(pageName)
			const firstImage = media.items?.find(item => !item.type || item.type === "image")
			if (firstImage) {
				return firstImage.srcset?.[0]?.src ?? firstImage.original?.source ?? null
			}
			return null
		} catch {
			return null
		}
	}

	/**
	 * Transform wikitext to HTML
	 * @param wikitext - Wikitext content
	 * @param pageTitle - Page title for context (optional)
	 * @returns HTML content
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.transformWikitextToHtml("'''Hi'''", "Sandbox")
	 * ```
	 */
	async transformWikitextToHtml(wikitext: string, pageTitle = "Main_Page"): Promise<string> {
		const html = (await this.request({
			api: "mediawiki",
			path: `transform/wikitext/to/html/${this.encodeForUrl(pageTitle)}`,
			body: { wikitext },
			type: "text",
		})) as string
		// Transform API often returns leading/trailing newlines; trim so inline use doesn’t get line breaks
		return html.trim()
	}

	/**
	 * Get page categories
	 * @param pageName - Page title
	 * @returns Page categories (array of category titles, e.g. "Category:British rock music groups")
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageCategories("Cat")
	 * ```
	 */
	async getPageCategories(pageName: string): Promise<{ categories: string[] }> {
		const data = (await this.request({
			api: "action",
			params: {
				action: "query",
				prop: "categories",
				titles: pageName,
				cllimit: "500",
				formatversion: "2",
			},
		})) as {
			query?: { pages?: Array<{ categories?: Array<{ title: string }>; missing?: boolean }> }
		}
		const pages = data.query?.pages ?? []
		const page = pages[0]
		if (!page || "missing" in page) {
			throw new Error("404: Page not found")
		}
		const categories = (page.categories ?? []).map(c => c.title)
		return { categories }
	}

	/**
	 * Get page mobile-optimized HTML
	 * @param pageName - Page title
	 * @returns Mobile HTML
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getPageMobileHtml("Cat")
	 * ```
	 */
	async getPageMobileHtml(pageName: string): Promise<string> {
		return (await this.request({
			api: "wikimedia",
			path: `page/mobile-html/${this.encodeForUrl(pageName)}`,
			type: "text",
		})) as string
	}

	/**
	 * Infer a user avatar image from their user page
	 * @param userName - Username
	 * @returns Avatar image URL or null
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getUserAvatar("Example")
	 * ```
	 */
	async getUserAvatar(userName: string): Promise<string | null> {
		// Get media from the user's user page
		try {
			const media = await this.getPageMedia(`User:${userName}`)
			if (media.items && media.items.length > 0) {
				// Look for the first item in the section 1, to avoid notices at the top of the page
				// Resort to the notices if no item is found in section 1
				const leadItem = media.items.find(item => item.section_id === 1) ?? media.items[0]
				if (leadItem) {
					return (
						leadItem.srcset?.[0]?.src ??
						"https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg"
					)
				}
			}
			return null
			// return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg"
		} catch {
			// If no image found, use the default
			return null
			// return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg"
		}
	}

	/**
	 * Get user information including edit count, registration date, and account type
	 * Results are cached in memory to avoid repeated API calls for the same user.
	 * @param userName - Username or IP address
	 * @returns User information including edit count, registration date, and account status
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getUserInfo("Example")
	 * ```
	 */
	async getUserInfo(userName: string): Promise<FWUserInfo | null> {
		// Check cache first
		if (this.userInfoCache.has(userName)) {
			return this.userInfoCache.get(userName) ?? null
		}

		try {
			const data = (await this.request({
				api: "action",
				params: {
					action: "query",
					list: "users",
					ususers: userName,
					usprop: "editcount|registration|tempexpired",
				},
			})) as {
				query?: {
					users?: Array<{
						userid?: number
						name: string
						editcount?: number
						registration?: string
						tempexpired?: boolean | null
						invalid?: boolean
						missing?: boolean
					}>
				}
			}

			const users = data.query?.users
			if (!users || users.length === 0) {
				this.userInfoCache.set(userName, null)
				return null
			}

			const user = users[0]
			if (!user) {
				this.userInfoCache.set(userName, null)
				return null
			}

			const userInfo: FWUserInfo = {
				userid: user.userid,
				name: user.name,
				editcount: user.editcount,
				registration: user.registration,
				tempexpired: user.tempexpired,
				invalid: user.invalid,
				missing: user.missing,
			}

			// Store in cache
			this.userInfoCache.set(userName, userInfo)
			return userInfo
		} catch (error) {
			console.error("Failed to get user info:", error)
			// Cache null result to avoid retrying failed requests
			this.userInfoCache.set(userName, null)
			return null
		}
	}

	/**
	 * Check if a username is a temporary account (starts with ~)
	 * @param userName - Username to check
	 * @returns True if the username is a temporary account
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.isTemporaryAccount("~20241")
	 * ```
	 */
	isTemporaryAccount(userName: string): boolean {
		return userName.startsWith("~")
	}

	/**
	 * Check if a username is an IP address
	 * @param userName - Username to check
	 * @returns True if the username appears to be an IP address
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.isIPAddress("192.0.2.0")
	 * ```
	 */
	isIPAddress(userName: string): boolean {
		// Simple check: IP addresses contain dots and/or colons (for IPv6)
		// More sophisticated regex could be used, but this covers most cases
		return /^[\d.:]+$/.test(userName) && (userName.includes(".") || userName.includes(":"))
	}

	/**
	 * Calculate days of activity from registration date
	 * @param registrationDate - ISO timestamp string (e.g., "2007-06-07T16:36:03Z")
	 * @returns Number of days since registration, or null if date is invalid
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getDaysOfActivity("2020-01-15T00:00:00Z")
	 * ```
	 */
	getDaysOfActivity(registrationDate: string | undefined): number | null {
		if (!registrationDate) {
			return null
		}

		try {
			const registration = new Date(registrationDate)
			const now = new Date()
			const diffMs = now.getTime() - registration.getTime()
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
			return diffDays >= 0 ? diffDays : null
		} catch {
			return null
		}
	}

	/**
	 * Determine user category from user info data.
	 * Internal helper; external callers should use getUserCategory(userName).
	 * @param userInfo - User info object (or null when unavailable)
	 * @returns Derived user category
	 */
	private getUserCategoryFromInfo(userInfo: FWUserInfo | null): FWUserCategory {
		if (!userInfo) {
			return "unregistered"
		}

		// Unregistered: invalid, missing, or IP address
		if (userInfo.invalid || userInfo.missing || this.isIPAddress(userInfo.name)) {
			return "unregistered"
		}

		// Temporary accounts are also considered unregistered for filtering purposes
		if (this.isTemporaryAccount(userInfo.name)) {
			return "unregistered"
		}

		// Must have userid to be registered
		if (!userInfo.userid) {
			return "unregistered"
		}

		// Registered users: categorize by edit count and days of activity
		const editCount = userInfo.editcount ?? 0
		const daysOfActivity = this.getDaysOfActivity(userInfo.registration) ?? 0

		// Experienced: more than 500 edits AND more than 30 days
		if (editCount > 500 && daysOfActivity > 30) {
			return "experienced"
		}

		// Newcomer: fewer than 10 edits OR fewer than 4 days
		if (editCount < 10 || daysOfActivity < 4) {
			return "newcomer"
		}

		// Learner: between newcomer and experienced thresholds
		return "learner"
	}

	/**
	 * Get a user's category (cache-aware main entry point).
	 * Reads from category cache when available; otherwise fetches user info and caches the result.
	 * @param userName - Username to classify
	 * @returns User category
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getUserCategory("Example")
	 * ```
	 */
	async getUserCategory(userName: string): Promise<FWUserCategory> {
		const cachedCategory = this.getUserCategoryFromCache(userName)
		if (cachedCategory) {
			return cachedCategory
		}
		const userInfo = await this.getUserInfo(userName)
		const category = this.getUserCategoryFromInfo(userInfo)
		this.userCategoryCache.set(userName, category)
		return category
	}

	/**
	 * Read a previously fetched user category from cache.
	 * Internal helper; returns null when no cached category exists.
	 * @param userName - Username key for cached category lookup
	 * @returns Cached user category or null
	 */
	private getUserCategoryFromCache(userName: string): FWUserCategory | null {
		return this.userCategoryCache.get(userName) ?? null
	}

	/**
	 * Return display config (icon + color) for a user's category from cache only.
	 * Returns null if the user is not in the cache. Use in templates when the feed has already
	 * populated the cache (e.g. via getUserCategory in feed hooks). For on-demand fetch use
	 * getUserCategoryDisplay instead.
	 * @param userName - Username to look up
	 * @param options - Optional overrides; `userTypeConfig` merges with the default per-category display config
	 * @returns Icon and color for the user's category, or null if not cached
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getCachedUserCategoryDisplay("Example", {})
	 * ```
	 */
	getCachedUserCategoryDisplay(
		userName: string,
		options?: { userTypeConfig?: Partial<Record<FWUserCategory, FWUserTypeConfig>> }
	): FWUserTypeConfig | null {
		const category = this.getUserCategoryFromCache(userName)
		if (!category) return null
		const config = options?.userTypeConfig
			? { ...this.defaultUserTypeConfig, ...options.userTypeConfig }
			: this.defaultUserTypeConfig
		return config[category]
	}

	/**
	 * Return display config (icon + color) for a user's category. Uses cache when available;
	 * otherwise fetches user info and caches the category, then returns the display config.
	 * @param userName - Username to look up
	 * @param options - Optional overrides; `userTypeConfig` merges with the default per-category display config
	 * @returns Icon and color for the user's category
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getUserCategoryDisplay("Example")
	 * ```
	 */
	async getUserCategoryDisplay(
		userName: string,
		options?: { userTypeConfig?: Partial<Record<FWUserCategory, FWUserTypeConfig>> }
	): Promise<FWUserTypeConfig | null> {
		const cached = this.getCachedUserCategoryDisplay(userName, options)
		if (cached !== null) return cached
		await this.getUserCategory(userName)
		return this.getCachedUserCategoryDisplay(userName, options)
	}

	/**
	 * Read a user's category from cache (for UI keys/test ids). Returns null if not yet loaded.
	 * @param userName - Username to look up
	 * @returns Cached category or null
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getCachedUserCategory("Example")
	 * ```
	 */
	getCachedUserCategory(userName: string): FWUserCategory | null {
		return this.getUserCategoryFromCache(userName)
	}

	/**
	 * Parse a toolbar-style edit summary into a table of contents
	 * @param editSummary - Edit summary to parse
	 * @returns Table of contents
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getTableFromEditSummary("(toolbar) | section | comment")
	 * ```
	 */
	getTableFromEditSummary(editSummary: string): string {
		const toolbar = this.parseToolbarEditSummary(editSummary)

		if (toolbar === null) {
			return editSummary
		}

		// Keep main comment and toolbar hashtags (e.g. #UCB_toolbar) inline so the full comment
		// displays as one line; only Suggested by / Use this bot / Report bugs go in the table.
		let fullComment = (toolbar.comment ?? "").trim()
		if (Array.isArray(toolbar.hashtags) && toolbar.hashtags.length > 0) {
			fullComment += " " + toolbar.hashtags.join(" ")
		}
		const toolbarMarkerOther = toolbar.other.filter(part => /^#\w+\)?$/.test(part.trim()))
		const restOther = toolbar.other.filter(part => !/^#\w+\)?$/.test(part.trim()))
		toolbarMarkerOther.forEach(m => {
			fullComment += " " + m.replace(/\)$/, "")
		})
		fullComment = fullComment.trim()

		let table = `(${fullComment})\n{| class="wikitable" class="wikitable"\n|-\n`
		if (toolbar.suggestedBy) {
			table += `| Suggested by [[User:${toolbar.suggestedBy}|${toolbar.suggestedBy}]]\n|-\n`
		}
		if (toolbar.useThisBot && toolbar.reportBugs) {
			table += `| ${toolbar.useThisBot}. ${toolbar.reportBugs}\n|-\n`
		}
		if (restOther.length > 0) {
			table += `| ${restOther.join("\n|-\n|")}\n|-\n`
		}

		table += `\n|}`

		return table
	}

	/**
	 * Parse a toolbar edit summary into structured parts
	 * @param editSummary - Edit summary to parse
	 * @returns Parsed toolbar comment or null if not a toolbar comment
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.parseToolbarEditSummary("...")
	 * ```
	 */
	parseToolbarEditSummary(editSummary: string): FWToolbarComment | null {
		let parts = editSummary.split(" | ")
		parts = parts.filter(part => part.trim().length > 0)
		if (parts.length <= 1) {
			return null
		}

		const [head] = parts
		const suggestedByPart = parts.find(part => part.startsWith("Suggested by "))
		const botPart = parts.find(part => part.includes("Use this bot]]."))
		const hashtagParts = parts.filter(part => part.startsWith("#"))

		const [useThisBot, reportBugs] = botPart ? botPart.split(". ") : [null, null]

		const commentPart =
			head && head !== suggestedByPart && head !== botPart && !hashtagParts.includes(head)
				? head
				: null

		const otherParts = parts.filter(
			part =>
				part !== commentPart &&
				part !== suggestedByPart &&
				part !== botPart &&
				!hashtagParts.includes(part)
		)

		return {
			comment: commentPart ?? null,
			suggestedBy: suggestedByPart ? suggestedByPart.replace("Suggested by ", "") : null,
			hashtags: hashtagParts,
			other: otherParts,
			useThisBot: useThisBot ?? null,
			reportBugs: reportBugs ?? null,
		}
	}

	/**
	 * Preprocess an edit summary's special wikitext variant to get it ready for transformation.
	 * @param summary - Edit summary to preprocess
	 * @param pageName - Page name
	 * @returns Preprocessed edit summary
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.preprocessEditSummary("| Lead | minor copyedit", "Cat")
	 * ```
	 */
	preprocessEditSummary(summary: string, pageName: string): string {
		summary = summary.replace(/^\/\* (.*) \*\//, `[[${pageName}#$1|→$1]]`)
		summary = summary.replaceAll("[[Category:", "[[:Category:")
		if (summary.includes("#IABot")) {
			summary = `(${summary})`
		}
		return summary
	}

	/**
	 * Get the HTML representation of an edit summary
	 * @param summary - Edit summary to get the HTML representation of
	 * @param pageName - Page name
	 * @returns HTML representation of the edit summary
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getEditSummaryHtml("fix typo", "Cat")
	 * ```
	 */
	async getEditSummaryHtml(summary: string, pageName: string): Promise<string> {
		summary = this.preprocessEditSummary(summary, pageName)
		const toolbar = this.parseToolbarEditSummary(summary)
		let wrapped: string
		if (toolbar === null) {
			wrapped = "(" + summary + ")"
		} else {
			let text = (toolbar.comment ?? "").trim()
			if (toolbar.suggestedBy) {
				text +=
					" Suggested by [[User:" + toolbar.suggestedBy + "|" + toolbar.suggestedBy + "]]"
			}
			wrapped = "(" + text + ")"
		}
		return await this.transformWikitextToHtml(wrapped)
	}

	private toValidDate(input: string | number | Date): Date | null {
		const date = input instanceof Date ? input : new Date(input)
		return Number.isNaN(date.getTime()) ? null : date
	}

	/** Format date as "DD Month YYYY" or "DD.MM.YY".
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.formatDate("2020-01-15T10:00:00Z", "long")
	 * ```
	 */
	formatDate(timestamp: string | number | Date, style: "long" | "short" = "long"): string {
		const d = this.toValidDate(timestamp)
		if (!d) return "Invalid date"
		if (style === "short") {
			const day = d.getDate().toString().padStart(2, "0")
			const month = (d.getMonth() + 1).toString().padStart(2, "0")
			const year = d.getFullYear().toString().slice(-2)
			return `${day}.${month}.${year}`
		}
		const day = d.getDate()
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		]
		const month = monthNames[d.getMonth()]
		const year = d.getFullYear()
		return `${day} ${month} ${year}`
	}

	/** Convert timestamp to YYYY-MM-DD key for grouping.
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.toDateKey("2020-01-15T10:00:00Z")
	 * ```
	 */
	toDateKey(timestamp: string | number | Date): string {
		const d = this.toValidDate(timestamp)
		if (!d) return "Invalid date"
		const year = d.getFullYear()
		const month = (d.getMonth() + 1).toString().padStart(2, "0")
		const day = d.getDate().toString().padStart(2, "0")
		return `${year}-${month}-${day}`
	}

	/** Format time as HH:MM.
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.formatTime("2020-01-15T10:00:00Z")
	 * ```
	 */
	formatTime(timestamp: string | number | Date): string {
		const d = this.toValidDate(timestamp)
		if (!d) return "Invalid date"
		const hours = d.getHours()
		const minutes = d.getMinutes()
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
	}

	/** Check whether a timestamp falls on today in local time.
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.isToday(Date.now())
	 * ```
	 */
	isToday(timestamp: string | number | Date): boolean {
		const d = this.toValidDate(timestamp)
		if (!d) return false
		const today = new Date()
		return (
			d.getDate() === today.getDate() &&
			d.getMonth() === today.getMonth() &&
			d.getFullYear() === today.getFullYear()
		)
	}

	/**
	 * Format relative time (e.g. "2 minutes ago", "3 days ago").
	 * @param timestamp - ISO timestamp string, Date, or epoch
	 * @param options - Formatting options for different time periods
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.formatRelativeTimestamp("2020-01-15T10:00:00Z", "long")
	 * ```
	 */
	formatRelativeTimestamp(
		timestamp: string | number | Date,
		options: FWRelativeTimestampOptions
	): string {
		const now = new Date()
		const past = this.toValidDate(timestamp)

		if (!past) {
			return "Invalid date"
		}

		const diffMs = now.getTime() - past.getTime()
		if (diffMs < 0) {
			return "Just now"
		}

		const diffSeconds = Math.floor(diffMs / 1000)
		const diffMinutes = Math.floor(diffMs / (1000 * 60))
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

		const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const pastDate = new Date(past.getFullYear(), past.getMonth(), past.getDate())
		const diffDays = Math.floor(
			(nowDate.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24)
		)

		const diffWeeks = Math.floor(diffDays / 7)
		const diffMonths = Math.floor(diffDays / 30)
		const diffYears = Math.floor(diffDays / 365)

		const formatDateWithoutCurrentYear = (date: Date): string => {
			const currentYear = now.getFullYear()
			const dateYear = date.getFullYear()
			const includeYear = dateYear !== currentYear
			return date.toLocaleDateString("en-GB", {
				year: includeYear ? "numeric" : undefined,
				month: "long",
				day: "numeric",
			})
		}

		const formatUnit = (value: number, unit: string): string => {
			const unitNames: Record<string, { singular: string; plural: string }> = {
				seconds: { singular: "second", plural: "seconds" },
				minutes: { singular: "minute", plural: "minutes" },
				hours: { singular: "hour", plural: "hours" },
				days: { singular: "day", plural: "days" },
				weeks: { singular: "week", plural: "weeks" },
				months: { singular: "month", plural: "months" },
				years: { singular: "year", plural: "years" },
			}
			const names = unitNames[unit]
			if (!names) return `${value} ${unit} ago`
			return `${value} ${value === 1 ? names.singular : names.plural} ago`
		}

		const getFormat = (period: string): string | undefined => {
			return options[period as keyof FWRelativeTimestampOptions] as string | undefined
		}

		let currentPeriod: string
		let currentValue: number
		if (diffSeconds < 60) {
			currentPeriod = "seconds"
			currentValue = diffSeconds
		} else if (diffMinutes < 60) {
			currentPeriod = "minutes"
			currentValue = diffMinutes
		} else if (diffHours < 24) {
			currentPeriod = "hours"
			currentValue = diffHours
		} else if (diffDays < 7) {
			currentPeriod = "days"
			currentValue = diffDays
		} else if (diffDays < 30) {
			currentPeriod = "weeks"
			currentValue = diffWeeks
		} else if (diffDays < 365) {
			currentPeriod = "months"
			currentValue = diffMonths
		} else {
			currentPeriod = "years"
			currentValue = diffYears
		}

		const format = getFormat(currentPeriod)
		if (format === "date") {
			return formatDateWithoutCurrentYear(past)
		}
		if (format === "words") {
			if (currentPeriod === "seconds") return "Just now"
			if (currentPeriod === "minutes") return "Minutes ago"
			if (currentPeriod === "hours") return "Hours ago"
			if (currentPeriod === "days") return "Days ago"
			if (currentPeriod === "weeks") return "Weeks ago"
			if (currentPeriod === "months") return "Months ago"
			if (currentPeriod === "years") return "A long time ago"
		}

		if (
			format &&
			["seconds", "minutes", "hours", "days", "weeks", "months", "years"].includes(format)
		) {
			let forcedValue: number
			if (format === "seconds") {
				forcedValue = diffSeconds
			} else if (format === "minutes") {
				forcedValue = diffMinutes
			} else if (format === "hours") {
				forcedValue = diffHours
			} else if (format === "days") {
				forcedValue = diffDays
			} else if (format === "weeks") {
				forcedValue = diffWeeks
			} else if (format === "months") {
				forcedValue = diffMonths
			} else if (format === "years") {
				forcedValue = diffYears
			} else {
				forcedValue = 0
			}
			return formatUnit(forcedValue, format)
		}

		return currentPeriod === "seconds" ? "Just now" : formatUnit(currentValue, currentPeriod)
	}

	/**
	 * Format relative time using the standard watchlist display preset.
	 *
	 * This is a convenience wrapper around `formatRelativeTimestamp()` with
	 * period-specific options tuned for watchlist UIs.
	 *
	 * @param timestamp - ISO timestamp, epoch milliseconds, or Date instance
	 * @returns Human-readable relative text (e.g. "Just now", "2 hours ago")
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.formatNiceRelativeTimestamp("2020-01-15T10:00:00Z")
	 * ```
	 */
	formatNiceRelativeTimestamp(timestamp: string | number | Date): string {
		return this.formatRelativeTimestamp(timestamp, {
			seconds: "words",
			minutes: "minutes",
			hours: "hours",
			days: "days",
			weeks: "weeks",
			months: "months",
			years: "years",
		})
	}

	/**
	 * Group revisions by calendar date for watchlist-style rendering.
	 *
	 * Output is sorted by date descending (newest day first), while revision
	 * order inside each day is preserved from the input array.
	 *
	 * @param revisions - Revisions to group (typically already newest-first)
	 * @returns Date groups with stable `dateKey`, human `dateLabel`, and revisions
	 
	 * @example
	 * ```ts
	 * import type { FWPageHistoryRevision } from "fakewiki/types"
	 * const wiki = new FakeWiki()
	 * const revs: FWPageHistoryRevision[] = []
	 * wiki.groupRevisionsByDate(revs)
	 * ```
	 */
	groupRevisionsByDate(
		revisions: FWRevision[]
	): Array<{ dateKey: string; dateLabel: string; revisions: FWRevision[] }> {
		const grouped = new Map<string, { dateLabel: string; revisions: FWRevision[] }>()
		revisions.forEach(revision => {
			const dateKey = this.toDateKey(revision.timestamp)
			const dateLabel = this.formatDate(revision.timestamp, "long")
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, { dateLabel, revisions: [] })
			}
			grouped.get(dateKey)!.revisions.push(revision)
		})
		return Array.from(grouped.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([dateKey, data]) => ({
				dateKey,
				dateLabel: data.dateLabel,
				revisions: data.revisions,
			}))
	}

	/**
	 * Format a revision size delta using watchlist notation.
	 *
	 * @param delta - Byte delta for a revision; null/NaN are treated as zero
	 * @returns Signed delta wrapped in parentheses (e.g. "(+120)", "(-4)", "(0)")
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.formatDelta(3)
	 * ```
	 */
	formatDelta(delta: number | null): string {
		const n = delta != null ? Number(delta) : 0
		if (Number.isNaN(n)) return "(0)"
		const sign = n >= 0 ? "+" : ""
		return `(${sign}${n})`
	}

	/**
	 * Get URL for a user page
	 * @param userName - Username
	 * @returns URL to user page
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getUserUrl("Example")
	 * ```
	 */
	getUserUrl(userName: string): string {
		return `${this.base}wiki/User:${encodeURIComponent(userName)}`
	}

	/**
	 * Get URL for viewing a revision diff
	 * @param id - Revision ID
	 * @param pageName - Page title
	 * @returns URL to revision diff
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getRevisionUrl(123, "Cat")
	 * ```
	 */
	getRevisionUrl(id: number, pageName: string): string {
		return `${this.base}w/index.php?title=${this.encodeForUrl(pageName)}&diff=${id}`
	}

	/**
	 * Get URL for viewing a specific revision (page content at that revision).
	 * Uses oldid= which shows the revision's content (not the diff).
	 * @param id - Revision ID
	 * @param pageName - Page title
	 * @returns URL to view this revision
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getRevisionViewUrl(123, "Cat")
	 * ```
	 */
	getRevisionViewUrl(id: number, pageName: string): string {
		return `${this.base}w/index.php?title=${this.encodeForUrl(pageName)}&oldid=${id}`
	}

	/**
	 * Get URL for a page
	 * @param pageName - Page title
	 * @returns URL to page
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getPageUrl("Cat")
	 * ```
	 */
	getPageUrl(pageName: string): string {
		return `${this.base}wiki/${this.encodeForUrl(pageName)}`
	}

	/**
	 * Get URL for page history
	 * @param pageName - Page title
	 * @returns URL to page history
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getHistoryUrl("Cat")
	 * ```
	 */
	getHistoryUrl(pageName: string): string {
		return `${this.base}w/index.php?title=${this.encodeForUrl(pageName)}&action=history`
	}

	/**
	 * Get URL for user talk page
	 * @param userName - Username
	 * @returns URL to user talk page
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getUserTalkUrl("Example")
	 * ```
	 */
	getUserTalkUrl(userName: string): string {
		return `${this.base}wiki/User_talk:${encodeURIComponent(userName)}`
	}

	/**
	 * Get URL for user contributions
	 * @param userName - Username
	 * @returns URL to Special:Contributions
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getUserContribsUrl("Example")
	 * ```
	 */
	getUserContribsUrl(userName: string): string {
		return `${this.base}wiki/Special:Contributions/${encodeURIComponent(userName)}`
	}

	/**
	 * Get URL for editing a page
	 * @param pageName - Page title
	 * @param sectionTitle - Optional section name (e.g. from edit summary like \/* Section *\/); appended as fragment #Section_title so the editor can open at that section
	 * @returns URL to edit page
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getEditUrl("Cat", "Lead")
	 * ```
	 */
	getEditUrl(pageName: string, sectionTitle?: string): string {
		const url = `${this.base}w/index.php?title=${this.encodeForUrl(pageName)}&action=edit`
		if (sectionTitle?.trim()) {
			// MediaWiki-style section fragment: heading "Foo bar" -> #Foo_bar
			const fragment = sectionTitle.trim().replace(/\s+/g, "_")
			return `${url}#${encodeURIComponent(fragment)}`
		}
		return url
	}

	/**
	 * Get URL for thanking a user for a revision
	 * @param id - Revision ID
	 * @returns URL to thank page
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getThankUrl(12345)
	 * ```
	 */
	getThankUrl(id: number): string {
		return `${this.base}wiki/Special:Thanks/${id}`
	}

	/**
	 * Get file page URL from an upload URL
	 * Extracts the filename from a Wikimedia Commons upload URL and returns a link to the file page
	 * @param uploadUrl - Upload URL
	 * @param pageName - Page name where the file is used
	 * @returns URL to the file page with media fragment (e.g., https://en.wikipedia.org/wiki/Page#/media/File:File.jpg)
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getAssetUrlFromUploadUrl("https://upload.wikimedia.org/wikipedia/commons/a/aa/Cat.png", "File:Cat.png")
	 * ```
	 */
	getAssetUrlFromUploadUrl(uploadUrl: string, pageName: string): string {
		const parts = uploadUrl.split("/")
		const fileName = parts[parts.length - 2]
		return `${this.getPageUrl(pageName)}#/media/File:${fileName}`
	}

	/**
	 * Generate a storage key for a prototype
	 * @param prototypeName - Name of the prototype (e.g., "PageFeed", "CustomPageFeed")
	 * @param keyName - Name of the key (e.g., "searchQuery", "pageName")
	 * @returns A unique storage key string
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getStorageKey("p", "k")
	 * ```
	 */
	getStorageKey(prototypeName: string, keyName: string): string {
		return `${prototypeName}_${keyName}`
	}

	/**
	 * Generate multiple storage keys for a prototype
	 * @param prototypeName - Name of the prototype
	 * @param keyName - Base name of the key
	 * @param count - Number of keys to generate
	 * @returns Array of storage keys
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getStorageKeys("p", "k", 3)
	 * ```
	 */
	getStorageKeys(prototypeName: string, keyName: string, count: number): string[] {
		return Array.from({ length: count }, (_, i) =>
			this.getStorageKey(prototypeName, `${keyName}${i + 1}`)
		)
	}

	/**
	 * Create a new Result instance with default values
	 * @returns Result instance with empty data, loading false, and no error
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.createResult()
	 * ```
	 */
	createResult<T = FWRevision>(): FWResult<T> {
		return {
			data: [],
			loading: false,
			error: null,
		}
	}

	/**
	 * Create multiple Result instances
	 * @param count - Number of results to create
	 * @returns Array of Result instances
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.createResults(3)
	 * ```
	 */
	createResults<T = FWRevision>(count: number): FWResult<T>[] {
		return Array.from({ length: count }, () => this.createResult<T>())
	}

	/**
	 * Get CSS class name for delta (change size) indicator
	 * @param delta - Change size (positive, negative, or zero)
	 * @returns CSS class name: "positive", "negative", or "neutral"
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getDeltaClass(5)
	 * ```
	 */
	getDeltaClass(delta: number, withSign = true): string {
		if (withSign) {
			return delta > 0
				? "positive delta-sign"
				: delta < 0
					? "negative delta-sign"
					: "neutral delta-sign"
		}
		return delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"
	}

	/**
	 * Get wiki code from base URL (e.g., "en.wikipedia.org" -> "enwiki")
	 * @param baseUrl - Base URL (defaults to this.base)
	 * @returns Wiki code string
	 */
	private getWikiCode(baseUrl?: string): string {
		const url = baseUrl || this.base
		// Extract domain from URL (e.g., "en.wikipedia.org" or "https://en.wikipedia.org/")
		const match = url.match(/(?:https?:\/\/)?([^.]+)\.wikipedia\.org/)
		if (match && match[1]) {
			return `${match[1]}wiki`
		}
		// Default to enwiki if we can't determine
		return "enwiki"
	}

	/**
	 * Read error message from a prediction API (Lift Wing / ORES) error response body.
	 * @param response - Failed fetch response
	 * @param apiName - Optional label (e.g. "ORES") for fallback message
	 * @returns Error message string to throw
	 */
	private async getPredictionApiErrorMessage(
		response: Response,
		apiName = "Lift Wing"
	): Promise<string> {
		const fallback = `${apiName} API error: ${response.status}`
		try {
			const text = await response.text()
			const body = text ? (JSON.parse(text) as { error?: string; detail?: string }) : null
			if (body && typeof body.error === "string" && body.error.trim()) {
				return body.error.trim()
			}
			if (body && typeof body.detail === "string" && body.detail.trim()) {
				return body.detail.trim()
			}
		} catch {
			// ignore parse errors
		}
		return fallback
	}

	/**
	 * Normalize prediction model names for Lift Wing endpoint URLs.
	 */
	private normalizePredictionModel(model: FWPredictionModel): FWPredictionModel {
		return model.toLowerCase() as FWPredictionModel
	}

	private getPredictionEndpointModel(model: FWPredictionModel): string {
		const normalizedModel = this.normalizePredictionModel(model)
		if (normalizedModel === "revertrisk") {
			return "revertrisk-language-agnostic"
		}
		if (normalizedModel === "revertrisk-multilingual") {
			return "revertrisk-multilingual"
		}
		return normalizedModel
	}

	/**
	 * Fetch a single Lift Wing prediction for one revision + model.
	 */
	private async fetchRevisionPrediction(
		revisionId: number,
		model: FWPredictionModel,
		wiki?: string
	): Promise<FWLiftWingPrediction | null> {
		const wikiCode = wiki || this.getWikiCode()
		const normalizedModel = this.normalizePredictionModel(model)
		const endpointModel = this.getPredictionEndpointModel(normalizedModel)
		const modelName = endpointModel.startsWith("revertrisk-")
			? endpointModel
			: `${wikiCode}-${endpointModel}`
		const requestBody: Record<string, unknown> = { rev_id: revisionId }
		if (endpointModel.startsWith("revertrisk-")) {
			requestBody.lang = this.getEditTypesLang(wikiCode)
		}
		const url = `https://api.wikimedia.org/service/lw/inference/v1/models/${modelName}:predict`

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Api-User-Agent": this.apiUserAgent ?? DEFAULT_API_USER_AGENT,
				},
				body: JSON.stringify(requestBody),
			})

			if (!response.ok) {
				const message = await this.getPredictionApiErrorMessage(response)
				// Revertrisk can return 422 for revisions without a usable parent revision.
				// Treat it as unavailable prediction rather than noisy console warning.
				if (response.status === 422) {
					return null
				}
				console.warn(
					`Lift Wing ${normalizedModel} prediction unavailable for revision ${revisionId}: ${message}`
				)
				return null
			}

			const data = (await response.json()) as
				| FWLiftWingResponse
				| {
						output?: {
							prediction?: boolean | string
							probabilities?: Record<string, number | undefined>
						}
				  }
			const wikiData = data[wikiCode]
			const scoreEntry =
				wikiData?.scores?.[String(revisionId)]?.[endpointModel] ??
				wikiData?.scores?.[String(revisionId)]?.[normalizedModel] ??
				wikiData?.scores?.[String(revisionId)]?.[model]
			if (scoreEntry?.score) {
				return scoreEntry.score
			}
			const output = (
				data as {
					output?: {
						prediction?: boolean | string
						probabilities?: Record<string, number | undefined>
					}
				}
			).output
			if (output?.prediction !== undefined && output.probabilities) {
				return {
					prediction: output.prediction,
					probability: output.probabilities,
				}
			}
			return null
		} catch (error) {
			console.error(
				`Failed to get ${normalizedModel} prediction for revision ${revisionId}:`,
				error
			)
			return null
		}
	}

	/**
	 * Get predictions for multiple revisions and one/many Lift Wing models.
	 * @param revisionIds - Array of revision IDs
	 * @param models - Lift Wing model slug(s). Defaults to damaging+goodfaith.
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Map of revision ID to predictions keyed by model
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRevisionPredictions([123, 456], ["damaging", "goodfaith"])
	 * ```
	 */
	async getRevisionPredictions(
		revisionIds: number[],
		models: FWPredictionModel[] = ["damaging", "goodfaith"],
		wiki?: string
	): Promise<FWRevisionPredictions> {
		const combined: FWRevisionPredictions = {}
		const normalizedModels = [
			...new Set(models.map(model => this.normalizePredictionModel(model))),
		]
		if (revisionIds.length === 0 || normalizedModels.length === 0) {
			return combined
		}

		for (const model of normalizedModels) {
			const byRevision = await this.runWithConcurrency(
				revisionIds,
				this.liftWingRevisionConcurrency,
				async revId => ({
					revId,
					prediction: await this.fetchRevisionPrediction(revId, model, wiki),
				})
			)
			for (const { revId, prediction } of byRevision) {
				if (!prediction) continue
				if (!combined[revId]) combined[revId] = {}
				combined[revId][model] = prediction
			}
		}

		return combined
	}

	/**
	 * Get damaging prediction for a single revision from Lift Wing API
	 * @param revisionId - Revision ID
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Prediction score with probability
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getDamagingPrediction(12345)
	 * ```
	 */
	async getDamagingPrediction(
		revisionId: number,
		wiki?: string
	): Promise<FWLiftWingPrediction | null> {
		const predictions = await this.getRevisionPredictions([revisionId], ["damaging"], wiki)
		return predictions[revisionId]?.damaging ?? null
	}

	/**
	 * Get goodfaith prediction for a single revision from Lift Wing API
	 * @param revisionId - Revision ID
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Prediction score with probability
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getGoodfaithPrediction(12345)
	 * ```
	 */
	async getGoodfaithPrediction(
		revisionId: number,
		wiki?: string
	): Promise<FWLiftWingPrediction | null> {
		const predictions = await this.getRevisionPredictions([revisionId], ["goodfaith"], wiki)
		return predictions[revisionId]?.goodfaith ?? null
	}

	/**
	 * Get damaging predictions for multiple revisions in parallel
	 * @param revisionIds - Array of revision IDs
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Map of revision ID to prediction score
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getDamagingPredictions([1, 2, 3])
	 * ```
	 */
	async getDamagingPredictions(
		revisionIds: number[],
		wiki?: string
	): Promise<Map<number, FWLiftWingPrediction>> {
		const predictions = await this.getRevisionPredictions(revisionIds, ["damaging"], wiki)
		const results = new Map<number, FWLiftWingPrediction>()
		for (const revId of revisionIds) {
			const prediction = predictions[revId]?.damaging
			if (prediction) results.set(revId, prediction)
		}
		return results
	}

	/**
	 * Get goodfaith predictions for multiple revisions in parallel
	 * @param revisionIds - Array of revision IDs
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Map of revision ID to prediction score
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getGoodFaithPredictions([1, 2, 3])
	 * ```
	 */
	async getGoodFaithPredictions(
		revisionIds: number[],
		wiki?: string
	): Promise<Map<number, FWLiftWingPrediction>> {
		const predictions = await this.getRevisionPredictions(revisionIds, ["goodfaith"], wiki)
		const results = new Map<number, FWLiftWingPrediction>()
		for (const revId of revisionIds) {
			const prediction = predictions[revId]?.goodfaith
			if (prediction) results.set(revId, prediction)
		}
		return results
	}

	/**
	 * Get damaging and goodfaith predictions from ORES (single request per batch).
	 * ORES is a scoring aggregator; one call returns both models. Prefer this when
	 * Lift Wing is unavailable or for lower latency on batch requests.
	 * @see https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/Usage
	 * @see https://www.mediawiki.org/wiki/ORES
	 * @param revisionIds - Array of revision IDs (batched internally; ORES recommends ≤20 per request, ≤4 parallel)
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Map of revision ID to both prediction scores (same shape as getRevisionPredictions)
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getRevisionPredictionsFromOres([1, 2, 3])
	 * ```
	 */
	async getRevisionPredictionsFromOres(
		revisionIds: number[],
		wiki?: string
	): Promise<FWRevisionPredictions> {
		const wikiCode = wiki || this.getWikiCode()
		const combined: FWRevisionPredictions = {}
		if (revisionIds.length === 0) return combined

		const ORES_BATCH_SIZE = 20
		const chunks: number[][] = []
		for (let i = 0; i < revisionIds.length; i += ORES_BATCH_SIZE) {
			chunks.push(revisionIds.slice(i, i + ORES_BATCH_SIZE))
		}

		const userAgent = this.apiUserAgent ?? DEFAULT_API_USER_AGENT

		const results = await this.runWithConcurrency(
			chunks,
			ORES_CHUNK_CONCURRENCY,
			async chunk => {
				const revids = chunk.join("|")
				const url = `https://ores.wikimedia.org/v3/scores/${wikiCode}/?models=damaging|goodfaith&revids=${encodeURIComponent(revids)}`
				try {
					const response = await fetch(url, {
						method: "GET",
						headers: {
							"Api-User-Agent": userAgent,
						},
					})
					if (!response.ok) {
						const message = await this.getPredictionApiErrorMessage(response, "ORES")
						throw new Error(message)
					}
					return (await response.json()) as FWLiftWingResponse
				} catch (error) {
					if (error instanceof Error) throw error
					console.error(`ORES request failed for revids ${revids}:`, error)
					return null
				}
			}
		)

		for (const data of results) {
			if (!data?.[wikiCode]?.scores) continue
			const scores = data[wikiCode].scores
			for (const revIdStr of Object.keys(scores)) {
				const revId = Number(revIdStr)
				if (Number.isNaN(revId)) continue
				combined[revId] = {}
				const entry = scores[revIdStr]
				if (entry.damaging?.score) {
					combined[revId].damaging = entry.damaging.score
				}
				if (entry.goodfaith?.score) {
					combined[revId].goodfaith = entry.goodfaith.score
				}
			}
		}

		return combined
	}

	/**
	 * Get language code for edit-types API (e.g. "enwiki" -> "en").
	 * @param wiki - Wiki code from getWikiCode(); if not provided, uses this instance base URL
	 */
	private getEditTypesLang(wiki?: string): string {
		const wikiCode = wiki || this.getWikiCode()
		return wikiCode.replace(/wiki$/, "") || "en"
	}

	/**
	 * Request edit-types API and return JSON or throw on error.
	 */
	private async requestEditTypes<T>(
		endpoint: string,
		params: { lang: string; revid: number; content_type?: string }
	): Promise<T> {
		const url = new URL(endpoint, this.editTypesBase)
		url.searchParams.set("lang", params.lang)
		url.searchParams.set("revid", String(params.revid))
		if (params.content_type) {
			url.searchParams.set("content_type", params.content_type)
		}
		const response = await fetch(url.toString(), {
			method: "GET",
			headers: {
				"Api-User-Agent": this.apiUserAgent ?? DEFAULT_API_USER_AGENT,
			},
		})
		if (!response.ok) {
			let message = `Edit-types API error: ${response.status}`
			try {
				const text = await response.text()
				const body = text ? (JSON.parse(text) as { detail?: string }) : null
				if (body?.detail && typeof body.detail === "string") {
					message = body.detail
				}
			} catch {
				// ignore
			}
			throw new Error(message)
		}
		return response.json() as Promise<T>
	}

	/**
	 * Get simple diff summary from edit-types API (counts per change type per action).
	 * @category Structured deltas
	 * @param revisionId - Revision ID
	 * @param options - Optional lang and content_type (default wikitext)
	 * @returns Summary e.g. { Template: { change: 1 }, Wikilink: { insert: 1 } }
	 * @see https://edit-types.wmcloud.org/docs
	 * @see https://github.com/geohci/edit-types
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getEditTypesSummary(12345, { lang: "en" })
	 * ```
	 */
	async getEditTypesSummary(
		revisionId: number,
		options?: { lang?: string; content_type?: "wikitext" | "html" }
	): Promise<FWEditTypesDiffSummary> {
		const lang = options?.lang ?? this.getEditTypesLang()
		return this.requestEditTypes<FWEditTypesDiffSummary>("/diff-summary", {
			lang,
			revid: revisionId,
			content_type: options?.content_type,
		})
	}

	/**
	 * Get computed structured-delta output for a revision ID in one call.
	 * Fetches edit-types summary, then computes inline segments with configurable settings.
	 * @category Structured deltas
	 *
	 * @param revisionId - Revision ID
	 * @param options - Optional edit-types API options (`lang`, `content_type`) and structured-delta settings
	 * @returns Structured delta result (segments + candidates), or null if no summary output
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getStructuredDeltasFromRevision(12345, { lang: "en" })
	 * ```
	 */
	async getStructuredDeltasFromRevision(
		revisionId: number,
		options?: FWStructuredDeltaRevisionOptions
	): Promise<FWStructuredDeltaResult | null> {
		const summary = await this.getEditTypesSummary(revisionId, {
			lang: options?.lang,
			content_type: options?.content_type,
		})
		const defaults = this.DEFAULT_STRUCTURED_DELTA_SETTINGS
		return this.getStructuredDeltasFromSummary(summary, {
			highlightCount: options?.highlightCount ?? defaults.highlightCount,
			improvedDeltaEnabled: options?.improvedDeltaEnabled ?? defaults.improvedDeltaEnabled,
			relativeDetailLevelEnabled:
				options?.relativeDetailLevelEnabled ?? defaults.relativeDetailLevelEnabled,
			smartFilteringEnabled: options?.smartFilteringEnabled ?? defaults.smartFilteringEnabled,
		})
	}

	/**
	 * Get structured diff details from edit-types API (context, node-edits, text-edits).
	 * @category Structured deltas
	 * @param revisionId - Revision ID
	 * @param options - Optional lang and content_type (default wikitext)
	 * @returns Structured details
	 * @see https://edit-types.wmcloud.org/docs
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getEditTypesDetails(12345, { lang: "en" })
	 * ```
	 */
	async getEditTypesDetails(
		revisionId: number,
		options?: { lang?: string; content_type?: "wikitext" | "html" }
	): Promise<FWEditTypesDiffDetails> {
		const lang = options?.lang ?? this.getEditTypesLang()
		return this.requestEditTypes<FWEditTypesDiffDetails>("/diff-details", {
			lang,
			revid: revisionId,
			content_type: options?.content_type,
		})
	}

	/**
	 * Get diff debug payload from edit-types API (full diff, tree diff, simple diff for comparison).
	 * @category Structured deltas
	 * @param revisionId - Revision ID
	 * @param options - Optional lang and content_type (default wikitext)
	 * @returns Debug payload
	 * @see https://edit-types.wmcloud.org/docs
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getEditTypesDebug(12345, { lang: "en" })
	 * ```
	 */
	async getEditTypesDebug(
		revisionId: number,
		options?: { lang?: string; content_type?: "wikitext" | "html" }
	): Promise<FWEditTypesDiffDebug> {
		const lang = options?.lang ?? this.getEditTypesLang()
		return this.requestEditTypes<FWEditTypesDiffDebug>("/diff-debug", {
			lang,
			revid: revisionId,
			content_type: options?.content_type,
		})
	}

	/**
	 * Normalize edit-types response into summary shape used for structured-delta computation.
	 * Accepts either root summary object or payload containing a `summary` property.
	 * @category Structured deltas
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.normalizeStructuredDeltaSummary({ Paragraph: { add: 1, remove: 0 } })
	 * ```
	 */
	normalizeStructuredDeltaSummary(
		raw: Record<string, unknown> | null | undefined
	): FWEditTypesDiffSummary | null {
		if (!raw || typeof raw !== "object") return null
		const nested = (raw as { summary?: unknown }).summary
		if (nested && typeof nested === "object" && !Array.isArray(nested)) {
			const nestedObj = nested as Record<string, unknown>
			const normalizedNested = this.normalizeStructuredDeltaSummary(nestedObj)
			if (normalizedNested) return normalizedNested
		}
		const result: FWEditTypesDiffSummary = {}
		for (const [typeName, value] of Object.entries(raw)) {
			if (!value || typeof value !== "object" || Array.isArray(value)) continue
			const entries = Object.entries(value as Record<string, unknown>).filter(
				([, count]) => typeof count === "number"
			)
			if (entries.length === 0) continue
			result[typeName] = Object.fromEntries(entries) as Record<string, number>
		}
		return Object.keys(result).length > 0 ? result : null
	}

	/**
	 * Compute structured-delta output (segments + candidates) from a normalized summary.
	 * Returns null when summary is empty or disabled via `improvedDeltaEnabled`.
	 * @category Structured deltas
	 *
	 * @param summary - Pre-normalized summary (type -> action -> count)
	 * @param options - Optional structured-delta settings overrides
	 
	 * @example
	 * ```ts
	 * import type { FWEditTypesDiffSummary } from "fakewiki/types"
	 * const wiki = new FakeWiki()
	 * const s = { Paragraph: { add: 1, remove: 0 } } as FWEditTypesDiffSummary
	 * wiki.getStructuredDeltasFromSummary(s)
	 * ```
	 */
	getStructuredDeltasFromSummary(
		summary: FWEditTypesDiffSummary,
		options?: FWStructuredDeltasOptions
	): FWStructuredDeltaResult | null {
		const normalizedSummary = this.normalizeStructuredDeltaSummary(
			summary as Record<string, unknown>
		)
		if (!normalizedSummary) return null
		const settings = {
			...this.DEFAULT_STRUCTURED_DELTA_SETTINGS,
			...options,
		}
		if (!settings.improvedDeltaEnabled) return null

		const maxHighlightCount = this.STRUCTURED_DELTA_MAX_HIGHLIGHT_COUNT
		const highlightCount = Math.max(
			1,
			Math.min(maxHighlightCount, Math.round(settings.highlightCount))
		)
		const candidates = this.getStructuredDeltaCandidates(normalizedSummary)
		if (candidates.length === 0) return null

		const postProcessedCandidates = settings.smartFilteringEnabled
			? this.filterStructuredDeltaImpliedTopCandidates(candidates)
			: candidates
		if (postProcessedCandidates.length === 0) return null

		const highlightedCandidates = this.getStructuredDeltaHighlightedCandidates(
			postProcessedCandidates,
			{
				highlightCount,
				relativeDetailLevelEnabled: settings.relativeDetailLevelEnabled,
			}
		)
		return {
			segments: highlightedCandidates.map(candidate => ({
				text: candidate.text,
				deltaClass: candidate.deltaClass,
			})),
			candidates: postProcessedCandidates,
			highlightedCandidates,
		}
	}

	private getStructuredDeltaCandidates(
		summary: FWEditTypesDiffSummary
	): FWStructuredDeltaCandidate[] {
		const candidates: FWStructuredDeltaCandidate[] = []
		const deltaClasses = {
			insert: "change-types-delta-add",
			remove: "change-types-delta-remove",
			change: "change-types-delta-change",
		}
		const actionSymbols = { insert: "+", remove: "-", change: "↻" }
		for (const level of this.STRUCTURED_DELTA_SIGNIFICANCE_LEVELS) {
			for (const canonical of level) {
				const typeKey = this.getStructuredDeltaMatchingTypeKey(summary, canonical)
				if (!typeKey) continue
				const actions = summary[typeKey]
				if (!actions || typeof actions !== "object") continue
				let insertCount = 0
				let removeCount = 0
				let changeCount = 0
				for (const [action, count] of Object.entries(actions)) {
					if (typeof count !== "number" || count <= 0) continue
					const lower = action.toLowerCase()
					if (lower === "insert" || lower === "add") insertCount += count
					else if (lower === "remove" || lower === "delete") removeCount += count
					else if (lower === "change" || lower === "move") changeCount += count
				}
				const total = insertCount + removeCount + changeCount
				if (total === 0) continue
				if (insertCount > 0) {
					candidates.push({
						text: this.formatStructuredDeltaInlineMetric(
							typeKey,
							actionSymbols.insert,
							insertCount
						),
						deltaClass: deltaClasses.insert,
						kind: "insert",
						count: insertCount,
						canonicalType: canonical,
					})
				}
				if (removeCount > 0) {
					candidates.push({
						text: this.formatStructuredDeltaInlineMetric(
							typeKey,
							actionSymbols.remove,
							removeCount
						),
						deltaClass: deltaClasses.remove,
						kind: "remove",
						count: removeCount,
						canonicalType: canonical,
					})
				}
				if (changeCount > 0) {
					candidates.push({
						text: this.formatStructuredDeltaInlineMetric(
							typeKey,
							actionSymbols.change,
							changeCount
						),
						deltaClass: deltaClasses.change,
						kind: "change",
						count: changeCount,
						canonicalType: canonical,
					})
				}
			}
		}
		return candidates
	}

	private getStructuredDeltaHighlightedCandidates(
		candidates: FWStructuredDeltaCandidate[],
		options: { highlightCount: number; relativeDetailLevelEnabled: boolean }
	): FWStructuredDeltaCandidate[] {
		if (candidates.length === 0) return []
		if (options.relativeDetailLevelEnabled) {
			const presentLevelsInOrder: number[] = []
			const seenLevels = new Set<number>()
			for (const candidate of candidates) {
				const level = this.getStructuredDeltaLevel(candidate.canonicalType)
				if (seenLevels.has(level)) continue
				seenLevels.add(level)
				presentLevelsInOrder.push(level)
			}
			const includedLevels = new Set(presentLevelsInOrder.slice(0, options.highlightCount))
			return candidates.filter(candidate =>
				includedLevels.has(this.getStructuredDeltaLevel(candidate.canonicalType))
			)
		}
		const topLevel = this.getStructuredDeltaLevel(candidates[0].canonicalType)
		const maxIncludedLevel = topLevel + options.highlightCount - 1
		return candidates.filter(
			candidate => this.getStructuredDeltaLevel(candidate.canonicalType) <= maxIncludedLevel
		)
	}

	private filterStructuredDeltaImpliedTopCandidates(
		candidates: FWStructuredDeltaCandidate[]
	): FWStructuredDeltaCandidate[] {
		const filterableImpliedTypes = new Set<FWStructuredDeltaCanonicalType>([
			"Section",
			"Table",
			"Paragraph",
			"Sentence",
			"Comment",
		])
		/** Child level index for "don't filter parent if children have mixed kinds" rule. */
		const childLevelForFilterable: Partial<Record<FWStructuredDeltaCanonicalType, number>> = {
			Sentence: this.getStructuredDeltaLevel("Word"),
			Paragraph: this.getStructuredDeltaLevel("Sentence"),
			Section: this.getStructuredDeltaLevel("Paragraph"),
		}
		const output = [...candidates]
		while (
			output.length > 1 &&
			output[0].kind === "change" &&
			output[0].count === 1 &&
			filterableImpliedTypes.has(output[0].canonicalType)
		) {
			const childLevel = childLevelForFilterable[output[0].canonicalType]
			if (childLevel !== undefined) {
				const childKinds = new Set<FWStructuredDeltaKind>()
				for (let i = 1; i < output.length; i++) {
					if (this.getStructuredDeltaLevel(output[i].canonicalType) === childLevel) {
						childKinds.add(output[i].kind)
					}
				}
				if (childKinds.size >= 2) break
			}
			output.shift()
		}
		return output
	}

	private getStructuredDeltaMatchingTypeKey(
		summary: FWEditTypesDiffSummary,
		canonical: FWStructuredDeltaCanonicalType
	): string | null {
		const normalizedCanonical = this.canonicalizeStructuredDeltaTypeName(canonical)
		const found = Object.keys(summary).find(
			key => this.canonicalizeStructuredDeltaTypeName(key) === normalizedCanonical
		)
		return found ?? null
	}

	private canonicalizeStructuredDeltaTypeName(value: string): string {
		return value.toLowerCase().replace(/[\s_-]+/g, "")
	}

	private getStructuredDeltaLevel(type: FWStructuredDeltaCanonicalType): number {
		for (let i = 0; i < this.STRUCTURED_DELTA_SIGNIFICANCE_LEVELS.length; i++) {
			if (this.STRUCTURED_DELTA_SIGNIFICANCE_LEVELS[i].includes(type)) return i
		}
		return Number.MAX_SAFE_INTEGER
	}

	/** Public for snippet logic: significance level index (0 = most significant).
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * wiki.getStructuredDeltaLevelIndex("Sentence")
	 * ```
	 */
	getStructuredDeltaLevelIndex(type: FWStructuredDeltaCanonicalType): number {
		return this.getStructuredDeltaLevel(type)
	}

	private formatStructuredDeltaInlineMetric(
		typeKey: string,
		symbol: string,
		count: number
	): string {
		const label = this.getStructuredDeltaDisplayLabel(typeKey, count)
		const normalizedType = this.canonicalizeStructuredDeltaTypeName(typeKey)
		if (normalizedType === "whitespace")
			return `${symbol}${this.STRUCTURED_DELTA_DISPLAY_LABELS.Whitespace}`
		if (normalizedType === "punctuation")
			return `${symbol}${this.STRUCTURED_DELTA_DISPLAY_LABELS.Punctuation}`
		if (normalizedType === "textformatting")
			return `${symbol}${this.STRUCTURED_DELTA_DISPLAY_LABELS["Text Formatting"]}`
		return `${symbol}${count} ${label}`
	}

	private getStructuredDeltaDisplayLabel(typeKey: string, count: number): string {
		const base =
			this.STRUCTURED_DELTA_DISPLAY_LABELS[typeKey] ??
			typeKey.toLowerCase().replace(/\s+/g, " ")
		if (count === 1) return base
		return base.endsWith("s") ? `${base}es` : `${base}s`
	}

	private veTextMatchConfigPromise: Promise<{
		matchItems: Record<string, unknown>
		britishEnglishPairs: Record<string, string>
	}> | null = null

	private createVeDiagnostics(
		candidates: FWVeSuggestionCandidate[],
		suggestions: FWVeSuggestionItem[],
		gates: string[],
		notes: string[] = []
	): FWVeSuggestionDiagnostics {
		return {
			candidateCount: candidates.length,
			suggestionCount: suggestions.length,
			gates,
			notes,
		}
	}

	private createVeResponse<T extends FWVeSuggestionResponse["suggestionType"]>(
		suggestionType: T,
		pageTitle: string,
		pageId: number | null,
		candidates: FWVeSuggestionCandidate[],
		suggestions: FWVeSuggestionItem[],
		gates: string[],
		notes: string[] = []
	): FWVeSuggestionResponse & { suggestionType: T } {
		return {
			pageTitle,
			pageId,
			suggestionType,
			candidates,
			suggestions,
			diagnostics: this.createVeDiagnostics(candidates, suggestions, gates, notes),
		}
	}

	private escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	}

	private splitSourceParagraphs(source: string): string[] {
		return source
			.split(/\n{2,}/)
			.map(s => s.trim())
			.filter(Boolean)
	}

	private countOccurrences(text: string, pattern: RegExp): number {
		const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
		const re = new RegExp(pattern.source, flags)
		let count = 0
		let match: RegExpExecArray | null
		while ((match = re.exec(text)) !== null) {
			count++
			if (match[0].length === 0) re.lastIndex++
		}
		return count
	}

	private getReferenceIgnoredSections(): Set<string> {
		return new Set([
			"",
			"references",
			"notes",
			"notes and references",
			"references and further reading",
			"sources",
			"footnotes",
			"citations",
			"external links",
			"external websites",
			"weblinks",
			"see also",
			"further reading",
			"bibliography",
			"publications",
			"works",
		])
	}

	private parseSourceParagraphsWithSections(source: string): Array<{
		section: string
		text: string
		startLine: number
		startOffset: number
		endOffset: number
	}> {
		const lines = source.split("\n")
		const lineStarts: number[] = []
		let running = 0
		for (const line of lines) {
			lineStarts.push(running)
			running += line.length + 1
		}
		const paragraphs: Array<{
			section: string
			text: string
			startLine: number
			startOffset: number
			endOffset: number
		}> = []
		let section = ""
		let buffer: string[] = []
		let paragraphStartLine = 0
		const flush = (endLineInclusive: number) => {
			const text = buffer.join("\n").trim()
			if (!text) {
				buffer = []
				return
			}
			const startOffset = lineStarts[paragraphStartLine] ?? 0
			const endLineStart = lineStarts[endLineInclusive] ?? startOffset
			const endLine = lines[endLineInclusive] ?? ""
			const endOffset = endLineStart + endLine.length
			paragraphs.push({
				section,
				text,
				startLine: paragraphStartLine,
				startOffset,
				endOffset,
			})
			buffer = []
		}
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] ?? ""
			const heading = line.match(/^==+\s*(.*?)\s*==+$/)
			if (heading) {
				if (buffer.length > 0) flush(Math.max(0, i - 1))
				section = (heading[1] ?? "").trim().toLowerCase()
				continue
			}
			if (line.trim() === "") {
				if (buffer.length > 0) flush(Math.max(0, i - 1))
				continue
			}
			if (buffer.length === 0) paragraphStartLine = i
			buffer.push(line)
		}
		if (buffer.length > 0) flush(lines.length - 1)
		return paragraphs
	}

	private isTemplateOrTableLikeParagraph(text: string): boolean {
		const trimmed = text.trim()
		if (!trimmed) return false
		if (
			trimmed.includes("{{") ||
			trimmed.includes("}}") ||
			trimmed.includes("{|") ||
			trimmed.includes("|}") ||
			trimmed.includes("{{{")
		) {
			return true
		}
		const lines = trimmed.split("\n")
		return lines.some(line => /^\s*(\||!|\{\||\|\})/.test(line))
	}

	private splitTableLikeParagraphIntoUnits(text: string): string[] {
		if (!this.isTemplateOrTableLikeParagraph(text)) return [text]
		const lines = text.split("\n")
		const units: string[] = []
		let buffer: string[] = []
		const flush = () => {
			const unit = buffer.join("\n").trim()
			if (unit) units.push(unit)
			buffer = []
		}
		for (const line of lines) {
			const trimmed = line.trim()
			if (trimmed === "{|" || trimmed === "|}") {
				flush()
				continue
			}
			if (trimmed === "|-") {
				flush()
				continue
			}
			buffer.push(line)
		}
		flush()
		return units.length > 0 ? units : [text]
	}

	private isWithinTemplateOrTableBlock(source: string, offset: number): boolean {
		const before = source.slice(0, offset)
		const templateOpen = this.countOccurrences(before, /\{\{/g)
		const templateClose = this.countOccurrences(before, /\}\}/g)
		const tableOpen = this.countOccurrences(before, /\{\|/g)
		const tableClose = this.countOccurrences(before, /\|\}/g)
		return templateOpen > templateClose || tableOpen > tableClose
	}

	private stripReferenceContent(source: string): string {
		let out = source
		// Remove full ref tags first
		out = out.replace(/<ref\b[^>]*>[\s\S]*?<\/ref\s*>/gi, " ")
		// Remove self-closing refs
		out = out.replace(/<ref\b[^>]*\/\s*>/gi, " ")
		// Remove common inline citation templates
		out = out.replace(
			/\{\{\s*(?:sfn|sfnp|harv|harvnb|harvp|r|rp|efn|citation needed|cn)\b[\s\S]*?\}\}/gi,
			" "
		)
		// Remove citation templates often used in reference lists/inline bibliographies
		out = out.replace(
			/\{\{\s*(?:cite|citation|vcite|wikicite|cite web|cite news|cite journal|cite book|cite conference|cite report|cite arxiv|cite thesis)\b[\s\S]*?\}\}/gi,
			" "
		)
		// Remove bare list-style reference lines that are mostly citation templates/urls
		out = out.replace(
			/^\s*[*#]\s*(?:\{\{[^}]+\}\}|\[https?:\/\/[^\]]+\]|https?:\/\/\S+).*$\n?/gim,
			" "
		)
		return out
	}

	private extractTemplatesFromSource(source: string): Set<string> {
		const out = new Set<string>()
		const re = /\{\{\s*([^|}\n]+)[^}]*\}\}/gim
		let match: RegExpExecArray | null
		while ((match = re.exec(source)) !== null) {
			const raw = match[1]
			if (!raw) continue
			const normalized = raw.replace(/^Template:/i, "").trim()
			if (normalized) out.add(normalized)
		}
		return out
	}

	private extractWikiLinks(source: string): Array<{
		raw: string
		target: string
		label: string
		start: number
		end: number
	}> {
		const links: Array<{
			raw: string
			target: string
			label: string
			start: number
			end: number
		}> = []
		const re = /\[\[([^\]|#]+(?:#[^\]|]+)?)(?:\|([^\]]+))?\]\]/g
		let match: RegExpExecArray | null
		while ((match = re.exec(source)) !== null) {
			const raw = match[0] ?? ""
			const fullTarget = (match[1] ?? "").trim()
			const label = (match[2] ?? fullTarget).trim()
			const hashIndex = fullTarget.indexOf("#")
			const target = (hashIndex >= 0 ? fullTarget.slice(0, hashIndex) : fullTarget).trim()
			links.push({
				raw,
				target,
				label,
				start: match.index,
				end: match.index + raw.length,
			})
		}
		return links
	}

	private getImageLinkRanges(source: string): Array<{ start: number; end: number }> {
		const ranges: Array<{ start: number; end: number }> = []
		const lower = source.toLowerCase()
		let i = 0
		while (i < source.length - 1) {
			const openIndex = source.indexOf("[[", i)
			if (openIndex < 0) break
			const afterOpen = openIndex + 2
			const isImageLink =
				lower.startsWith("file:", afterOpen) || lower.startsWith("image:", afterOpen)
			if (!isImageLink) {
				i = afterOpen
				continue
			}
			let depth = 1
			let cursor = afterOpen
			while (cursor < source.length - 1 && depth > 0) {
				if (source.startsWith("[[", cursor)) {
					depth++
					cursor += 2
					continue
				}
				if (source.startsWith("]]", cursor)) {
					depth--
					cursor += 2
					continue
				}
				cursor++
			}
			ranges.push({ start: openIndex, end: cursor })
			i = Math.max(cursor, afterOpen)
		}
		return ranges
	}

	private stripImageFileLinksFromSource(source: string): string {
		const ranges = this.getImageLinkRanges(source)
		if (ranges.length === 0) return source
		const chars = Array.from(source)
		for (const range of ranges) {
			for (let i = range.start; i < range.end; i++) {
				chars[i] = " "
			}
		}
		return chars.join("")
	}

	private getApproxVePlainTextLengthFromWikitext(text: string): number {
		let out = text
		// Comments and ref tags are not visible plain text in VE content.
		out = out.replace(/<!--[\s\S]*?-->/g, " ")
		out = out.replace(/<ref\b[^>]*>[\s\S]*?<\/ref\s*>/gi, " ")
		out = out.replace(/<ref\b[^>]*\/\s*>/gi, " ")
		// Keep visible link labels while dropping wiki link syntax.
		out = out.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
		out = out.replace(/\[\[([^\]]+)\]\]/g, "$1")
		// For external links, keep label if present; otherwise drop URL literal.
		out = out.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/gi, "$2")
		out = out.replace(/\[https?:\/\/[^\]]+\]/gi, " ")
		// Drop common wikitext formatting markers and generic HTML tags.
		out = out.replace(/'{2,5}/g, "")
		out = out.replace(/<\/?[^>]+>/g, " ")
		out = out.replace(/&nbsp;/gi, " ")
		out = out.replace(/&amp;/gi, "&")
		// Normalize whitespace before length comparison.
		out = out.replace(/\s+/g, " ").trim()
		return out.length
	}

	private isLikelyIgnoredLinkTarget(target: string): boolean {
		const lower = target.toLowerCase()
		return (
			lower.startsWith("file:") ||
			lower.startsWith("image:") ||
			lower.startsWith("category:") ||
			lower.startsWith("help:") ||
			lower.startsWith("special:")
		)
	}

	private normalizeLinkTarget(target: string): string {
		return target.replace(/_/g, " ").trim().toLowerCase()
	}

	private isLikelyInterwikiExternalUrl(url: string): boolean {
		try {
			const parsed = new URL(url)
			const host = parsed.hostname.toLowerCase()
			return (
				host.endsWith(".wikipedia.org") ||
				host.endsWith(".wiktionary.org") ||
				host.endsWith(".wikidata.org") ||
				host.endsWith(".wikimedia.org")
			)
		} catch {
			return false
		}
	}

	private async resolvePageIdentity(pageTitle: string): Promise<{
		pageTitle: string
		pageId: number | null
		source: string
	}> {
		const trimmed = pageTitle.trim()
		if (!trimmed) return { pageTitle, pageId: null, source: "" }
		const data = (await this.request({
			api: "action",
			params: {
				action: "query",
				titles: trimmed,
				redirects: 1,
				formatversion: 2,
			},
		})) as {
			query?: { pages?: Array<{ pageid?: number; title?: string; missing?: boolean }> }
		}
		const page = data.query?.pages?.[0]
		const canonical = page?.title ?? trimmed
		if (!page || page.missing || typeof page.pageid !== "number") {
			return { pageTitle: canonical, pageId: null, source: "" }
		}
		const source = await this.getPageSource(canonical).catch(() => "")
		return { pageTitle: canonical, pageId: page.pageid, source }
	}

	private getSourceParagraphIndex(source: string, start: number): number {
		const before = source.slice(0, start)
		return before.split(/\n{2,}/).length - 1
	}

	private async getEnwikiTextMatchData(): Promise<{
		matchItems: Record<string, unknown>
		britishEnglishPairs: Record<string, string>
	}> {
		if (this.veTextMatchConfigPromise) return this.veTextMatchConfigPromise
		this.veTextMatchConfigPromise = (async () => {
			let configJson: { textMatch?: { matchItems?: Record<string, unknown> } } = {}
			let britishJson: { query?: Record<string, string> } = {}
			try {
				const configSource = await this.getPageSource("MediaWiki:Editcheck-config.json")
				configJson = JSON.parse(configSource) as {
					textMatch?: { matchItems?: Record<string, unknown> }
				}
			} catch {
				configJson = {}
			}
			try {
				const britishSource = await this.getPageSource(
					"MediaWiki:Editcheck-config-textmatch-british-english.json"
				)
				britishJson = JSON.parse(britishSource) as { query?: Record<string, string> }
			} catch {
				britishJson = {}
			}
			return {
				matchItems: configJson.textMatch?.matchItems ?? {},
				britishEnglishPairs: britishJson.query ?? {},
			}
		})()
		return this.veTextMatchConfigPromise
	}

	private async getToneCheckPredictionsBatch(
		modifiedTexts: string[],
		pageTitle: string,
		lang: string
	): Promise<Array<FWToneCheckPrediction | null>> {
		if (modifiedTexts.length === 0) return []
		const url = "https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict"
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Api-User-Agent": this.apiUserAgent ?? DEFAULT_API_USER_AGENT,
				},
				body: JSON.stringify({
					instances: modifiedTexts.map(modifiedText => ({
						lang,
						check_type: "tone",
						page_title: pageTitle,
						original_text: "",
						modified_text: modifiedText,
					})),
				}),
			})
			if (!response.ok) {
				return modifiedTexts.map(() => null)
			}
			const data = (await response.json()) as {
				predictions?: Array<FWToneCheckPrediction | null>
			}
			const predictions = data.predictions ?? []
			return modifiedTexts.map((_, i) => predictions[i] ?? null)
		} catch {
			return modifiedTexts.map(() => null)
		}
	}

	/**
	 * Simulate VE Tone suggestions for editor-open behavior (enwiki).
	 * @param pageTitle - Page title to evaluate
	 * @param options - Optional threshold and max candidates
	 * @returns Tone suggestion simulation payload
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeToneSuggestions("Cat", { maxCandidates: 5 })
	 * ```
	 */
	async getVeToneSuggestions(
		pageTitle: string,
		options?: { threshold?: number; maxCandidates?: number }
	): Promise<FWToneSuggestionResponse> {
		const threshold = options?.threshold ?? 0.8
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const paragraphs = this.splitSourceParagraphs(source).filter(p => p.length > 20)
		const candidates = paragraphs.slice(0, options?.maxCandidates ?? 20).map((text, i) => ({
			id: `tone-${i}`,
			text,
			data: { paragraphIndex: i },
		}))
		const predictions: Array<{
			candidate: FWVeSuggestionCandidate
			prediction: FWToneCheckPrediction | null
		}> = []
		for (let i = 0; i < candidates.length; i += 100) {
			const batch = candidates.slice(i, i + 100)
			const batchPredictions = await this.getToneCheckPredictionsBatch(
				batch.map(candidate => candidate.text ?? ""),
				canonicalTitle,
				"en"
			)
			for (let j = 0; j < batch.length; j++) {
				const candidate = batch[j]
				if (!candidate) continue
				predictions.push({
					candidate,
					prediction: batchPredictions[j] ?? null,
				})
			}
		}
		const suggestions: FWVeSuggestionItem[] = predictions
			.filter(
				item =>
					(item.prediction?.probability ?? 0) >= threshold && item.prediction?.prediction
			)
			.map(item => ({
				id: item.candidate.id,
				title: "Tone suggestion",
				message: "Model flagged paragraph as potentially non-neutral.",
				severity: "medium",
				data: {
					probability: item.prediction?.probability,
					paragraphIndex: item.candidate.data?.paragraphIndex,
				},
			}))
		return this.createVeResponse("tone", canonicalTitle, pageId, candidates, suggestions, [
			"showAsSuggestion enabled",
			"lang=en",
			"serial batched requests (<=100 instances per request)",
			`probability>=${threshold}`,
		])
	}

	/**
	 * Simulate VE TextMatch suggestions for editor-open behavior (enwiki).
	 * @param pageTitle - Page title to evaluate
	 * @returns TextMatch suggestion simulation payload
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeTextMatchSuggestions("Cat")
	 * ```
	 */
	async getVeTextMatchSuggestions(pageTitle: string): Promise<FWTextMatchSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const { matchItems, britishEnglishPairs } = await this.getEnwikiTextMatchData()
		const ignoredSections = this.getReferenceIgnoredSections()
		const sourceWithoutReferences = this.stripReferenceContent(source)
		const sourceForMatching = this.parseSourceParagraphsWithSections(sourceWithoutReferences)
			.filter(paragraph => !ignoredSections.has(paragraph.section))
			.filter(paragraph => !this.isTemplateOrTableLikeParagraph(paragraph.text))
			.filter(
				paragraph =>
					!this.isWithinTemplateOrTableBlock(
						sourceWithoutReferences,
						paragraph.startOffset
					)
			)
			.map(paragraph => paragraph.text)
			.join("\n\n")
		const templates = this.extractTemplatesFromSource(sourceWithoutReferences)
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		const items = Object.entries(matchItems)
		for (const [itemId, rawItem] of items) {
			const item = rawItem as {
				query?: string[] | Record<string, string | null>
				config?: {
					caseSensitive?: boolean
					minOccurrences?: number
					hasTemplate?: string[]
					lacksTemplate?: string[]
				}
				expand?: string
			}
			if (itemId === "british-english") {
				const hasTemplate = (item.config?.hasTemplate ?? []).some(name =>
					templates.has(name)
				)
				if (!hasTemplate) continue
				let count = 0
				for (const [us, uk] of Object.entries(britishEnglishPairs).slice(0, 2000)) {
					const re = new RegExp(`\\b${this.escapeRegex(us)}\\b`, "g")
					let match: RegExpExecArray | null
					while ((match = re.exec(sourceForMatching)) !== null) {
						count++
						const id = `textmatch-${itemId}-${count}`
						candidates.push({
							id,
							text: us,
							data: { replacement: uk, index: match.index },
						})
						suggestions.push({
							id,
							title: "Change English spelling",
							message: `Found "${us}" where British variant "${uk}" may be expected.`,
							severity: "low",
							data: { replacement: uk, index: match.index },
						})
					}
				}
				continue
			}
			const query = Array.isArray(item.query)
				? Object.fromEntries(item.query.map(value => [value, null]))
				: (item.query ?? {})
			const minOccurrences = item.config?.minOccurrences ?? 1
			const caseSensitive = item.config?.caseSensitive ?? false
			const matchedByParagraph = new Map<
				number,
				Array<{ term: string; replacement: string | null }>
			>()
			for (const [term, replacement] of Object.entries(query)) {
				const flags = caseSensitive ? "g" : "gi"
				const re = new RegExp(`\\b${this.escapeRegex(term)}\\b`, flags)
				let match: RegExpExecArray | null
				while ((match = re.exec(sourceForMatching)) !== null) {
					const paragraphIndex = this.getSourceParagraphIndex(
						sourceForMatching,
						match.index
					)
					const bucket = matchedByParagraph.get(paragraphIndex) ?? []
					bucket.push({ term, replacement: replacement ?? null })
					matchedByParagraph.set(paragraphIndex, bucket)
					candidates.push({
						id: `textmatch-${itemId}-${paragraphIndex}-${bucket.length}`,
						text: term,
						data: { itemId, paragraphIndex },
					})
				}
			}
			for (const [paragraphIndex, matches] of matchedByParagraph.entries()) {
				if (matches.length < minOccurrences) continue
				const first = matches[0]
				suggestions.push({
					id: `textmatch-${itemId}-${paragraphIndex}`,
					title: `TextMatch: ${itemId}`,
					message: `Matched ${matches.length} configured terms in one paragraph.`,
					severity: "medium",
					data: {
						itemId,
						paragraphIndex,
						matches: matches.map(m => m.term),
						replacement: first?.replacement ?? null,
					},
				})
			}
		}
		return this.createVeResponse("textMatch", canonicalTitle, pageId, candidates, suggestions, [
			"enwiki textMatch config",
			"whole-word matching",
			"hasTemplate/lacksTemplate gating",
			"exclude template/table-like content",
		])
	}

	/**
	 * Simulate VE ExternalLink suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeExternalLinkSuggestions("Cat")
	 * ```
	 */
	async getVeExternalLinkSuggestions(
		pageTitle: string
	): Promise<FWExternalLinkSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const sourceForLinks = this.stripReferenceContent(source)
		const ignoredSections = this.getReferenceIgnoredSections()
		const sectionedParagraphs = this.parseSourceParagraphsWithSections(sourceForLinks)
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		const seen = new Set<string>()
		const bracketed = /\[(https?:\/\/[^\s\]]+)(?:\s+[^\]]+)?\]/gi
		const bare = /(?<!\[)(https?:\/\/[^\s<>{}|\\^`[\]]+)/gi
		for (const re of [bracketed, bare]) {
			let match: RegExpExecArray | null
			while ((match = re.exec(sourceForLinks)) !== null) {
				const url = match[1] ?? match[0] ?? ""
				const offset = match.index
				if (!url || seen.has(`${url}@${offset}`)) continue
				seen.add(`${url}@${offset}`)
				const id = `external-${offset}`
				const section =
					sectionedParagraphs.find(
						paragraph =>
							offset >= paragraph.startOffset && offset <= paragraph.endOffset
					)?.section ?? ""
				candidates.push({ id, text: url, data: { index: offset, section } })
				if (this.isLikelyInterwikiExternalUrl(url)) continue
				if (ignoredSections.has(section)) continue
				suggestions.push({
					id,
					title: "External link in body",
					message:
						"Non-interwiki external link detected; VE external-link check would flag this.",
					severity: "low",
					data: { url, index: offset, section, action: "remove-or-dismiss" },
				})
			}
		}
		return this.createVeResponse(
			"externalLink",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			[
				"exclude interwiki-like urls",
				"ignore reference-style sections",
				"remove/dismiss only",
			]
		)
	}

	/**
	 * Simulate VE DuplicateLink suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeDuplicateLinkSuggestions("Cat")
	 * ```
	 */
	async getVeDuplicateLinkSuggestions(
		pageTitle: string,
		options?: { scope?: "paragraph" | "section" }
	): Promise<FWDuplicateLinkSuggestionResponse> {
		const scope = options?.scope ?? "paragraph"
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const sourceForLinks = this.stripReferenceContent(source)
		const ignoredSections = this.getReferenceIgnoredSections()
		const paragraphs = this.parseSourceParagraphsWithSections(sourceForLinks).filter(
			paragraph => !ignoredSections.has(paragraph.section)
		)
		const units =
			scope === "section"
				? (() => {
						const mergedBySection = new Map<string, string[]>()
						const tableRowUnits: string[] = []
						for (const paragraph of paragraphs) {
							if (this.isTemplateOrTableLikeParagraph(paragraph.text)) {
								tableRowUnits.push(
									...this.splitTableLikeParagraphIntoUnits(paragraph.text)
								)
								continue
							}
							const list = mergedBySection.get(paragraph.section) ?? []
							list.push(paragraph.text)
							mergedBySection.set(paragraph.section, list)
						}
						return [
							...Array.from(mergedBySection.values()).map(parts =>
								parts.join("\n\n")
							),
							...tableRowUnits,
						]
					})()
				: paragraphs.flatMap(paragraph =>
						this.splitTableLikeParagraphIntoUnits(paragraph.text)
					)
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		for (let unitIndex = 0; unitIndex < units.length; unitIndex++) {
			const unit = units[unitIndex] ?? ""
			const imageRanges = this.getImageLinkRanges(unit)
			const links = this.extractWikiLinks(unit)
				.filter(link => link.target && !this.isLikelyIgnoredLinkTarget(link.target))
				.map(link => ({
					...link,
					inImageCaption: imageRanges.some(
						range => link.start >= range.start && link.end <= range.end
					),
				}))
			links.forEach((link, linkIndex) => {
				candidates.push({
					id: `duplicate-${unitIndex}-candidate-${linkIndex}`,
					text: link.raw,
					data: {
						unitIndex,
						key: this.normalizeLinkTarget(link.target),
						position: linkIndex + 1,
						inImageCaption: !!link.inImageCaption,
					},
				})
			})
			const groups = new Map<string, typeof links>()
			for (const link of links) {
				if (link.inImageCaption) continue
				const key = this.normalizeLinkTarget(link.target)
				const group = groups.get(key) ?? []
				group.push(link)
				groups.set(key, group)
			}
			for (const [key, group] of groups) {
				group.forEach((link, i) => {
					const id = `duplicate-${unitIndex}-${key}-${i}`
					if (i === 0) return
					suggestions.push({
						id,
						title: "Duplicate wikilink",
						message: `Duplicate link to "${link.target}" in same ${scope}.`,
						severity: "low",
						data: { scope, unitIndex, target: link.target, position: i + 1 },
					})
				})
			}
		}
		return this.createVeResponse(
			"duplicateLink",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			[
				`scope=${scope}`,
				"ignore reference-style sections",
				"ignore image-caption links for duplicate checks",
				"first occurrence allowed",
				"second+ occurrences flagged",
			]
		)
	}

	/**
	 * Simulate VE Disambiguation suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeDisambiguationSuggestions("Cat")
	 * ```
	 */
	async getVeDisambiguationSuggestions(
		pageTitle: string
	): Promise<FWDisambiguationSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const links = this.extractWikiLinks(source).filter(
			link =>
				link.target &&
				!this.isLikelyIgnoredLinkTarget(link.target) &&
				!link.raw.includes("#") &&
				!/\#/.test(link.target)
		)
		const candidates: FWVeSuggestionCandidate[] = links.map((link, i) => ({
			id: `disambig-${i}`,
			text: link.raw,
			data: { target: link.target },
		}))
		const uniqueTargets = Array.from(new Set(links.map(link => link.target))).slice(0, 200)
		const disambigTargets = new Set<string>()
		for (let i = 0; i < uniqueTargets.length; i += 50) {
			const chunk = uniqueTargets.slice(i, i + 50)
			const data = (await this.request({
				api: "action",
				params: {
					action: "query",
					prop: "pageprops",
					titles: chunk.join("|"),
					redirects: 1,
				},
			})) as {
				query?: {
					pages?: Record<string, { title?: string; pageprops?: Record<string, unknown> }>
				}
			}
			for (const page of Object.values(data.query?.pages ?? {})) {
				if (page.pageprops?.disambiguation !== undefined && page.title) {
					disambigTargets.add(page.title)
				}
			}
		}
		const suggestions: FWVeSuggestionItem[] = links
			.map((link, i) => ({ link, i }))
			.filter(({ link }) => disambigTargets.has(link.target))
			.map(({ link, i }) => ({
				id: `disambig-${i}`,
				title: "Disambiguation link",
				message: `Link target "${link.target}" appears to be a disambiguation page.`,
				severity: "medium",
				data: { target: link.target, label: link.label },
			}))
		return this.createVeResponse(
			"disambiguation",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			["exclude fragment links", "pageprops.disambiguation check"]
		)
	}

	/**
	 * Simulate VE AddReference suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeAddReferenceSuggestions("Cat")
	 * ```
	 */
	async getVeAddReferenceSuggestions(
		pageTitle: string
	): Promise<FWAddReferenceSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const sourceForAddReference = this.stripImageFileLinksFromSource(source)
		const ignoredSections = this.getReferenceIgnoredSections()
		const paragraphs = this.parseSourceParagraphsWithSections(sourceForAddReference)
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		paragraphs.forEach((paragraph, i) => {
			if (this.isTemplateOrTableLikeParagraph(paragraph.text)) return
			if (this.isWithinTemplateOrTableBlock(sourceForAddReference, paragraph.startOffset))
				return
			const plainTextLength = this.getApproxVePlainTextLengthFromWikitext(paragraph.text)
			const id = `addref-${i}`
			candidates.push({
				id,
				text: paragraph.text.slice(0, 240),
				data: {
					section: paragraph.section,
					length: plainTextLength,
					index: paragraph.startLine,
				},
			})
			if (ignoredSections.has(paragraph.section)) return
			if (plainTextLength < 50) return
			if (/<ref[\s>]/i.test(paragraph.text) || /\{\{\s*cite\b/i.test(paragraph.text)) return
			if (/\{\{\s*(citation needed|cn)\b/i.test(paragraph.text)) return
			suggestions.push({
				id,
				title: "Add reference",
				message: "Paragraph is long enough and appears uncited.",
				severity: "medium",
				data: { section: paragraph.section, length: plainTextLength },
			})
		})
		return this.createVeResponse(
			"addReference",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			[
				"ignoreLeadSection=true",
				"ignore reference-style sections",
				"exclude template/table-like paragraphs",
				"minimumCharacters=50",
			]
		)
	}

	/**
	 * Simulate VE ImageCaption suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeImageCaptionSuggestions("Cat")
	 * ```
	 */
	async getVeImageCaptionSuggestions(
		pageTitle: string
	): Promise<FWImageCaptionSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const fileRe = /\[\[(?:File|Image):([^\]|]+)([^\]]*)\]\]/gi
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		let match: RegExpExecArray | null
		let i = 0
		while ((match = fileRe.exec(source)) !== null) {
			const params = (match[2] ?? "")
				.split("|")
				.map(p => p.trim())
				.filter(Boolean)
			const id = `imagecaption-${i++}`
			const isThumb = params.some(p => /^(thumb|thumbnail)$/i.test(p))
			const caption = params
				.filter(
					p =>
						!/^(thumb|thumbnail|left|right|center|none|upright.*|\d+px|frameless|frame)$/i.test(
							p
						)
				)
				.join(" ")
				.trim()
			candidates.push({ id, text: match[0], data: { file: match[1], isThumb, caption } })
			if (!isThumb) continue
			if (caption.length >= 12) continue
			suggestions.push({
				id,
				title: "Image caption",
				message:
					caption.length === 0
						? "Thumbnail image appears to be missing a caption."
						: "Thumbnail image caption appears too short to be descriptive.",
				severity: "low",
				data: { file: match[1], captionLength: caption.length },
			})
		}
		return this.createVeResponse(
			"imageCaption",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			["thumb images only", "empty caption only"]
		)
	}

	/**
	 * Simulate VE YearLink suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeYearLinkSuggestions("Cat")
	 * ```
	 */
	async getVeYearLinkSuggestions(pageTitle: string): Promise<FWYearLinkSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const links = this.extractWikiLinks(source).filter(
			link => !this.isLikelyIgnoredLinkTarget(link.target)
		)
		const getSingleYear = (text: string): string | null => {
			const matches = text.match(/\b\d{3,4}\b/g) ?? []
			return matches.length === 1 ? (matches[0] ?? null) : null
		}
		const candidates: FWVeSuggestionCandidate[] = links.map((link, i) => ({
			id: `yearlink-${i}`,
			text: link.raw,
			data: { target: link.target, label: link.label },
		}))
		const suggestions: FWVeSuggestionItem[] = links
			.map((link, i) => ({ link, i }))
			.filter(({ link }) => {
				const targetYear = getSingleYear(link.target)
				const labelYear = getSingleYear(link.label)
				return Boolean(targetYear && labelYear && targetYear !== labelYear)
			})
			.map(({ link, i }) => ({
				id: `yearlink-${i}`,
				title: "Year link mismatch",
				message: `Link target year and label year differ for "${link.raw}".`,
				severity: "low",
				data: {
					target: link.target,
					label: link.label,
					actionChoices: ["useTarget", "useLabel"],
				},
			}))
		return this.createVeResponse("yearLink", canonicalTitle, pageId, candidates, suggestions, [
			"single year in target and label",
			"targetYear !== labelYear",
		])
	}

	/**
	 * Simulate VE ConvertReference suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeConvertReferenceSuggestions("Cat")
	 * ```
	 */
	async getVeConvertReferenceSuggestions(
		pageTitle: string,
		options?: { strict?: "url-only" | "covered" | "any" }
	): Promise<FWConvertReferenceSuggestionResponse> {
		const strict = options?.strict ?? "url-only"
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const refRe = /<ref\b[^>]*>([\s\S]*?)<\/ref>/gi
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		let match: RegExpExecArray | null
		let i = 0
		while ((match = refRe.exec(source)) !== null) {
			const content = (match[1] ?? "").trim()
			const id = `convertref-${i++}`
			candidates.push({ id, text: content.slice(0, 240) })
			const hasUrl = /(https?:\/\/\S+)/i.test(content)
			if (!hasUrl) continue
			if (strict === "url-only" && !/^https?:\/\/\S+$/i.test(content)) continue
			if (strict === "covered" && !/^\[https?:\/\/\S+(?:\s+[^\]]+)?\]$/i.test(content))
				continue
			suggestions.push({
				id,
				title: "Convert reference",
				message: `Reference appears convertible under strictness "${strict}".`,
				severity: "low",
				data: { strict },
			})
		}
		return this.createVeResponse(
			"convertReference",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			[`strict=${strict}`, "reference contains convertible url"]
		)
	}

	/**
	 * Simulate VE CitationNeeded suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeCitationNeededSuggestions("Cat")
	 * ```
	 */
	async getVeCitationNeededSuggestions(
		pageTitle: string
	): Promise<FWCitationNeededSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const re = /\{\{\s*(citation needed|cn)\b([^}]*)\}\}/gi
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		let match: RegExpExecArray | null
		let i = 0
		while ((match = re.exec(source)) !== null) {
			const id = `citationneeded-${i++}`
			const raw = match[0] ?? ""
			candidates.push({ id, text: raw, data: { index: match.index } })
			suggestions.push({
				id,
				title: "Citation needed template",
				message: "Citation-needed template found; VE citation-needed check candidate.",
				severity: "medium",
				data: { index: match.index },
			})
		}
		return this.createVeResponse(
			"citationNeeded",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			["showAsSuggestion default=false unless enabled", "template compatibility required"]
		)
	}

	/**
	 * Simulate VE DoubleBold suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeDoubleBoldSuggestions("Cat")
	 * ```
	 */
	async getVeDoubleBoldSuggestions(pageTitle: string): Promise<FWDoubleBoldSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const lines = source.split("\n")
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		lines.forEach((line, i) => {
			if (!/'''[^']+'''/.test(line)) return
			const id = `doublebold-${i}`
			candidates.push({ id, text: line.trim(), data: { line: i + 1 } })
			const inHeading = /^===+/.test(line)
			const inHeaderCell = /^\!/.test(line)
			const inDefinitionTerm = /^;/.test(line)
			if (!(inHeading || inHeaderCell || inDefinitionTerm)) return
			suggestions.push({
				id,
				title: "Redundant bold",
				message: "Bold formatting appears redundant in this structural context.",
				severity: "low",
				data: { line: i + 1, inHeading, inHeaderCell, inDefinitionTerm },
			})
		})
		return this.createVeResponse(
			"doubleBold",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			["heading>=3 or table header or definition term", "bold annotation present"]
		)
	}

	/**
	 * Simulate VE RequiredTemplateParam suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeRequiredTemplateParamSuggestions("Cat")
	 * ```
	 */
	async getVeRequiredTemplateParamSuggestions(
		pageTitle: string
	): Promise<FWRequiredTemplateParamSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const templateInvocations = Array.from(
			source.matchAll(/\{\{\s*([^|}\n]+)((?:\|[^}]*)?)\}\}/gim)
		).slice(0, 400)
		const candidates: FWVeSuggestionCandidate[] = templateInvocations.map((match, i) => ({
			id: `requiredparam-${i}`,
			text: (match[1] ?? "").trim(),
			data: { invocation: (match[0] ?? "").slice(0, 200) },
		}))
		const suggestions: FWVeSuggestionItem[] = []
		for (let i = 0; i < templateInvocations.length; i++) {
			const match = templateInvocations[i]
			const template = (match?.[1] ?? "").trim()
			const paramsBlob = match?.[2] ?? ""
			if (!template) continue
			const id = `requiredparam-${i}`
			const emptyNamedParams = Array.from(
				paramsBlob.matchAll(/\|\s*([^=|]+)\s*=\s*(?=(?:\||$))/g)
			).map(part => (part[1] ?? "").trim())
			if (emptyNamedParams.length === 0) continue
			suggestions.push({
				id,
				title: "Template missing required params",
				message: `Template "${template}" has empty named params: ${emptyNamedParams.slice(0, 5).join(", ")}.`,
				severity: "medium",
				data: { template, emptyNamedParams },
			})
		}
		return this.createVeResponse(
			"requiredTemplateParam",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			[
				"showAsSuggestion default=false unless enabled",
				"heuristic: empty named params treated as potentially required",
			]
		)
	}

	/**
	 * Simulate VE Redirect suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeRedirectSuggestions("Cat")
	 * ```
	 */
	async getVeRedirectSuggestions(pageTitle: string): Promise<FWRedirectSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const links = this.extractWikiLinks(source).filter(
			link => link.target && !this.isLikelyIgnoredLinkTarget(link.target)
		)
		const candidates: FWVeSuggestionCandidate[] = links.map((link, i) => ({
			id: `redirect-${i}`,
			text: link.raw,
			data: { target: link.target, label: link.label },
		}))
		const targets = Array.from(new Set(links.map(link => link.target))).slice(0, 200)
		const redirectMap = new Map<string, string>()
		for (let i = 0; i < targets.length; i += 50) {
			const chunk = targets.slice(i, i + 50)
			const data = (await this.request({
				api: "action",
				params: {
					action: "query",
					titles: chunk.join("|"),
					redirects: 1,
					formatversion: 2,
				},
			})) as {
				query?: { redirects?: Array<{ from?: string; to?: string }> }
			}
			for (const item of data.query?.redirects ?? []) {
				if (item.from && item.to) redirectMap.set(item.from, item.to)
			}
		}
		const suggestions: FWVeSuggestionItem[] = links
			.map((link, i) => ({ link, i }))
			.filter(({ link }) => {
				const redirectTarget = redirectMap.get(link.target)
				if (!redirectTarget) return false
				const labelNorm = this.normalizeLinkTarget(link.label)
				const targetNorm = this.normalizeLinkTarget(link.target)
				return !labelNorm.startsWith(targetNorm)
			})
			.map(({ link, i }) => ({
				id: `redirect-${i}`,
				title: "Redirect link",
				message: `Link target "${link.target}" is a redirect.`,
				severity: "low",
				data: { target: link.target, finalTarget: redirectMap.get(link.target) },
			}))
		return this.createVeResponse("redirect", canonicalTitle, pageId, candidates, suggestions, [
			"showAsSuggestion default=false unless enabled",
			"exclude compact-label intent matches",
		])
	}

	/**
	 * Simulate VE SuggestedLink suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeSuggestedLinkSuggestions("Cat")
	 * ```
	 */
	async getVeSuggestedLinkSuggestions(
		pageTitle: string,
		options?: { threshold?: number }
	): Promise<FWSuggestedLinkSuggestionResponse> {
		const threshold = options?.threshold ?? 0.8
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const links = this.extractWikiLinks(source)
		const linkedText = new Set(links.map(link => link.label))
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		try {
			const titleVariants = [canonicalTitle, canonicalTitle.replace(/ /g, "_")]
			let apiLinks: Array<{
				link_text?: string
				link_target?: string
				score?: number
				context_before?: string
				context_after?: string
				match_index?: number
			}> | null = null
			for (const titleVariant of titleVariants) {
				if (apiLinks && apiLinks.length > 0) break
				const encoded = encodeURIComponent(titleVariant)
				const url = `https://api.wikimedia.org/service/linkrecommendation/v1/linkrecommendations/wikipedia/en/${encoded}`
				const res = await fetch(url, {
					headers: { "Api-User-Agent": this.apiUserAgent ?? DEFAULT_API_USER_AGENT },
				})
				if (!res.ok) continue
				const data = (await res.json()) as {
					links?: Array<{
						link_text?: string
						link_target?: string
						score?: number
						context_before?: string
						context_after?: string
						match_index?: number
					}>
				}
				apiLinks = data.links ?? []
			}
			for (let i = 0; i < (apiLinks?.length ?? 0); i++) {
				const entry = apiLinks?.[i]
				if (!entry?.link_text || !entry.link_target) continue
				const id = `suggestedlink-${i}`
				candidates.push({
					id,
					text: entry.link_text,
					data: { target: entry.link_target, score: entry.score ?? 0 },
				})
				if ((entry.score ?? 0) < threshold) continue
				if (!source.includes(entry.link_text)) continue
				if (linkedText.has(entry.link_text)) continue
				suggestions.push({
					id,
					title: "Suggested link",
					message: `Consider linking "${entry.link_text}" to "${entry.link_target}".`,
					severity: "low",
					data: entry,
				})
			}
		} catch {
			// No suggestions on API failure
		}
		return this.createVeResponse(
			"suggestedLink",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			["wikipedia hostname model", `score>=${threshold}`, "text must be currently unlinked"]
		)
	}

	/**
	 * Simulate VE FakeHeading suggestions for editor-open behavior (enwiki).
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.getVeFakeHeadingSuggestions("Cat")
	 * ```
	 */
	async getVeFakeHeadingSuggestions(pageTitle: string): Promise<FWFakeHeadingSuggestionResponse> {
		const {
			pageTitle: canonicalTitle,
			pageId,
			source,
		} = await this.resolvePageIdentity(pageTitle)
		const lines = source.split("\n")
		const candidates: FWVeSuggestionCandidate[] = []
		const suggestions: FWVeSuggestionItem[] = []
		lines.forEach((line, i) => {
			if (/^=+/.test(line)) return
			const trimmed = line.trim()
			if (!trimmed) return
			if (!/^'''[^']+'''$/.test(trimmed)) return
			const id = `fakeheading-${i}`
			candidates.push({ id, text: trimmed, data: { line: i + 1 } })
			suggestions.push({
				id,
				title: "Use real heading",
				message: "Fully bold paragraph line looks like a fake heading.",
				severity: "low",
				data: { line: i + 1, suggestedLevel: 3 },
			})
		})
		return this.createVeResponse(
			"fakeHeading",
			canonicalTitle,
			pageId,
			candidates,
			suggestions,
			["showAsSuggestion default=false unless enabled", "root paragraph bold-only heuristic"]
		)
	}

	/**
	 * Run async tasks with a concurrency limit; returns results in input order.
	 
	 * @example
	 * ```ts
	 * const wiki = new FakeWiki()
	 * await wiki.runWithConcurrency([1, 2, 3], 2, async (n) => n * 2)
	 * ```
	 */
	async runWithConcurrency<T, R>(
		items: T[],
		concurrency: number,
		fn: (_item: T) => Promise<R>
	): Promise<R[]> {
		const results: R[] = []
		let index = 0
		async function worker(): Promise<void> {
			while (index < items.length) {
				const i = index++
				const item = items[i]
				if (item === undefined) continue
				results[i] = await fn(item)
			}
		}
		await Promise.all(
			Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
		)
		return results
	}
}
