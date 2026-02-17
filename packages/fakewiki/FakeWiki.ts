import type {
	FWActionApiOptions,
	FWApiOptions,
	FWCachedRevision,
	FWCompareResponse,
	FWDiffLine,
	FWDiffSegment,
	FWFeaturedPage,
	FWHistoryCacheEntitySnapshot,
	FWHistoryCacheSnapshot,
	FWHistoryCoverageEntry,
	FWHistoryOptions,
	FWLiftWingPrediction,
	FWLiftWingResponse,
	FWOnThisDayItem,
	FWPageHistoryResponse,
	FWPageHistoryRevision,
	FWPageMediaResponse,
	FWPageMetadata,
	FWPageSearchResult,
	FWPageSummary,
	FWRandomPageResult,
	FWRandomPageSummary,
	FWRelativeTimestampOptions,
	FWRestApiOptions,
	FWResult,
	FWRevision,
	FWRevisionPredictions,
	FWToolbarComment,
	FWUserCategory,
	FWUserContrib,
	FWUserInfo,
	FWUserSearchResult,
} from "./types"

/** MediaWiki REST API page history returns this many revisions per request; used as default and max for getPageHistory and getCombinedFeed. */
const PAGE_HISTORY_REVISIONS_PER_REQUEST = 20

/** Default limit for search endpoints (searchTitles, searchPages, searchUsers). */
const DEFAULT_SEARCH_LIMIT = 20

/** Default limit for user contribution history (Action API usercontribs). */
const DEFAULT_USER_CONTRIBS_LIMIT = 20

/** Maximum limit we allow for user contribution history (Action API supports up to 500). */
const USER_CONTRIBS_MAX_LIMIT = 500

/**
 * Helper for interacting with Wikimedia and MediaWiki REST APIs.
 */
export class FakeWiki {
	/**
	 * Base URL for the API
	 */
	base: string

	/**
	 * Cache for user information
	 */
	private userInfoCache: Map<string, FWUserInfo | null>

	/**
	 * Cache for derived user categories
	 */
	private userCategoryCache: Map<string, FWUserCategory>

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
	 * Create a new FakeWiki instance
	 * @param base - Base URL for the API
	 */
	constructor(base = "https://en.wikipedia.org/") {
		this.base = base
		this.userInfoCache = new Map()
		this.userCategoryCache = new Map()
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
	 */
	getWikimediaBase(): string {
		return `${this.base}api/rest_v1/`
	}

	/**
	 * Get the base URL for the MediaWiki REST API
	 * @returns MediaWiki base URL
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
				throw new Error(`${response.status}`)
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
				throw new Error(`${response.status}`)
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
	 */
	encode(slug: string): string {
		return encodeURIComponent(slug.replace(/ /g, "_"))
	}

	/**
	 * Get a page summary (extract, thumbnail, etc.)
	 * @param pageName - Page title
	 * @returns Page summary
	 */
	async getPageSummary(pageName: string): Promise<FWPageSummary> {
		return (await this.request({
			api: "wikimedia",
			path: `page/summary/${this.encode(pageName)}`,
		})) as FWPageSummary
	}

	/**
	 * Get page content as HTML
	 * @param pageName - Page title
	 * @returns HTML content
	 */
	async getPageHtml(pageName: string): Promise<string> {
		return (await this.request({
			api: "mediawiki",
			path: `page/${this.encode(pageName)}/html`,
			type: "text",
		})) as string
	}

	/**
	 * Get page content as wikitext source
	 * @param pageName - Page title
	 * @returns Wikitext source
	 */
	async getPageSource(pageName: string): Promise<string> {
		const page = (await this.request({
			api: "mediawiki",
			path: `page/${this.encode(pageName)}`,
		})) as { source: string }
		return page.source
	}

	/**
	 * Get full page metadata and latest revision
	 * @param pageName - Page title
	 * @returns Page metadata with source content
	 */
	async getPage(pageName: string): Promise<FWPageMetadata> {
		return (await this.request({
			api: "mediawiki",
			path: `page/${this.encode(pageName)}`,
		})) as FWPageMetadata
	}

	/**
	 * Search for pages by title (autocomplete-style)
	 * @param query - Search query
	 * @param limit - Maximum results (default: DEFAULT_SEARCH_LIMIT)
	 * @returns Search results with pages array
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
	 * Search for users by username (without avatars).
	 * @param query - Search query (username or part of username)
	 * @param limit - Maximum results (default: DEFAULT_SEARCH_LIMIT)
	 * @returns Array of user objects with username and page metadata (no avatar)
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
		const path = `page/${this.encode(pageName)}/history${query ? `?${query}` : ""}`
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
			ucprop: "ids|title|timestamp|comment|size|sizediff|flags",
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
		}))

		return {
			revisions: revisions as FWPageHistoryRevision[],
		}
	}

	/**
	 * Get contributions for multiple users by calling getUserHistory for each.
	 * Uses caching to avoid fetching the same data twice.
	 * Fetches user histories in parallel.
	 * @param userNames - Array of usernames
	 * @param options - Options
	 * @param options.limit - Limit per user (default: DEFAULT_USER_CONTRIBS_LIMIT)
	 * @param options.older_than - Timestamp - for explicit pagination
	 * @param options.newer_than - Timestamp - for explicit pagination
	 * @returns Map of username to their revision history
	 */
	async getUsersHistory(
		userNames: string[],
		options: FWHistoryOptions = {}
	): Promise<Map<string, FWPageHistoryResponse>> {
		if (userNames.length === 0) {
			return new Map()
		}

		// Call getUserHistory for each user in parallel
		const userPromises = userNames.map(async userName => {
			try {
				const history = await this.getUserHistory(userName, options)
				return { userName, history }
			} catch (e) {
				// Silently skip users that fail
				return { userName, history: { revisions: [] } as FWPageHistoryResponse }
			}
		})

		const userResults = await Promise.all(userPromises)
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
	 * @param options.after - Revision ID (as string) - only returns revisions older than this
	 * @returns Array of revisions sorted by timestamp (newest first), deduplicated by revision ID
	 */
	async getCombinedFeed(options: {
		userNames?: string[]
		pageNames?: string[]
		limit?: number
		after?: string // Revision ID (as string) - for pagination
	}): Promise<FWCachedRevision[]> {
		const {
			userNames = [],
			pageNames = [],
			limit = PAGE_HISTORY_REVISIONS_PER_REQUEST,
			after,
		} = options
		const totalLimit = Math.min(Math.max(limit, 1), PAGE_HISTORY_REVISIONS_PER_REQUEST)
		const allRevisions: FWCachedRevision[] = []
		const seenIds = new Set<number>()

		// Convert 'after' revision ID to a timestamp for user-history cursors
		// and to find page-specific older_than revision IDs.
		let afterTimestampIso: string | undefined = undefined
		let afterTimestamp: number | undefined = undefined
		let afterPageName: string | undefined = undefined
		if (after) {
			const afterId = parseInt(after, 10)
			// Try to find the timestamp and page in caches
			for (const [pageName, cached] of this.pageHistoryCache) {
				const rev = cached.find(r => r.id === afterId)
				if (rev) {
					afterTimestampIso = rev.timestamp
					afterTimestamp = new Date(rev.timestamp).getTime()
					afterPageName = pageName
					break
				}
			}
			if (!afterTimestampIso) {
				for (const [, cached] of this.userHistoryCache) {
					const rev = cached.find(r => r.id === afterId)
					if (rev) {
						afterTimestampIso = rev.timestamp
						afterTimestamp = new Date(rev.timestamp).getTime()
						break
					}
				}
			}
		}

		// Fetch user contributions - caching handled internally
		if (userNames.length > 0) {
			const userOptions: FWHistoryOptions = {
				limit: PAGE_HISTORY_REVISIONS_PER_REQUEST,
			}
			if (afterTimestampIso) {
				userOptions.older_than = afterTimestampIso
			}
			const userResultsMap = await this.getUsersHistory(userNames, userOptions)

			for (const [, history] of userResultsMap) {
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

		// Fetch page histories - use older_than (revision ID) when available.
		if (pageNames.length > 0) {
			const pagePromises = pageNames.map(async pageName => {
				try {
					let options: FWHistoryOptions = {}
					if (after && afterTimestamp !== undefined) {
						if (pageName === afterPageName) {
							options = { older_than: after }
						} else {
							// Find a revision ID from this page that's older than after
							const pageCached = this.pageHistoryCache.get(pageName) || []
							const olderRev = pageCached
								.filter(r => new Date(r.timestamp).getTime() < afterTimestamp!)
								.sort((a, b) => a.id - b.id)[0]
							if (olderRev) {
								options = { older_than: String(olderRev.id) }
							}
						}
					}
					const history = await this.getPageHistory(pageName, options)
					return { pageName, revisions: history.revisions || [] }
				} catch (e) {
					return { pageName, revisions: [] }
				}
			})

			const pageResults = await Promise.all(pagePromises)
			for (const { pageName, revisions } of pageResults) {
				for (const rev of revisions) {
					if (rev.id && !seenIds.has(rev.id)) {
						seenIds.add(rev.id)
						allRevisions.push({ ...rev, pageName } as FWCachedRevision)
					}
				}
			}
		}

		// If we know the "after" timestamp, enforce it after merging to avoid
		// leaking newer revisions from sources without a page-specific cursor.
		const filteredByAfter =
			afterTimestamp !== undefined
				? allRevisions.filter(rev => new Date(rev.timestamp).getTime() < afterTimestamp)
				: allRevisions

		// Sort by timestamp (newest first), then limit
		return filteredByAfter
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, totalLimit)
	}

	/**
	 * Clear the page history cache for a page (or all pages if no name given).
	 * Use when you need fresh data, e.g. when opening the inline history view.
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
	 * Get the parent (previous) revision ID for a revision on a page.
	 * Uses the page history endpoint with older_than so we don't rely on the
	 * current list having the previous revision.
	 * @param pageName - Page title
	 * @param revId - Revision ID (we want the revision immediately older than this)
	 * @returns Parent revision ID, or null if none (e.g. first revision)
	 */
	async getParentRevisionId(pageName: string, revId: number): Promise<number | null> {
		const history = await this.getPageHistory(pageName, {
			older_than: String(revId),
		})
		const parent = history.revisions?.[0]
		return parent?.id ?? null
	}

	/**
	 * Compare two revisions
	 * @param fromRevId - Source revision ID (older)
	 * @param toRevId - Target revision ID (newer)
	 * @returns Diff between revisions
	 */
	async compareRevisions(fromRevId: number, toRevId: number): Promise<FWCompareResponse> {
		return (await this.request({
			api: "mediawiki",
			path: `revision/${fromRevId}/compare/${toRevId}`,
		})) as FWCompareResponse
	}

	/**
	 * Get wikitext source for a revision by ID.
	 * @param revId - Revision ID
	 * @returns Revision source (e.g. wikitext)
	 */
	async getRevisionSource(revId: number): Promise<string> {
		const revision = (await this.request({
			api: "mediawiki",
			path: `revision/${revId}`,
		})) as { source: string }
		return revision.source
	}

	/**
	 * Get diff for a revision by comparing it with its parent (previous) revision.
	 * When there is no parent (e.g. first revision), returns a synthetic diff where
	 * every line is shown as added.
	 * @param pageName - Page title
	 * @param revId - Revision ID to diff
	 * @returns Diff from parent to this revision, or a full-content "all added" diff when there is no parent
	 */
	async getRevisionDiff(pageName: string, revId: number): Promise<FWCompareResponse> {
		const parentId = await this.getParentRevisionId(pageName, revId)
		if (parentId != null) return this.compareRevisions(parentId, revId)
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
	 * @param date - Date object or YYYY/MM/DD string
	 * @returns Featured page data
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
	 */
	async getPageMedia(pageName: string): Promise<FWPageMediaResponse> {
		return (await this.request({
			api: "wikimedia",
			path: `page/media-list/${this.encode(pageName)}`,
		})) as FWPageMediaResponse
	}

	/**
	 * Get outgoing wikilinks for multiple pages (intra-language links)
	 * Automatically handles pagination to fetch all links.
	 * @param pageNames - Array of page titles
	 * @param options - Options
	 * @param options.namespace - Filter by namespace (e.g., 0 for main namespace)
	 * @returns Map of page title to array of linked page titles
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
	 * Get thumbnail image for a page
	 * @param pageName - Page title
	 * @returns Thumbnail URL or null
	 */
	async getPageThumbnail(pageName: string): Promise<string | null> {
		try {
			// For User talk pages, get the user avatar instead
			if (pageName.startsWith("User talk:")) {
				const userName = pageName.substring(10) // Remove "User talk:" prefix
				return await this.getUserAvatar(userName)
			}

			// For User pages, get the user avatar instead
			if (pageName.startsWith("User:")) {
				const userName = pageName.substring(5) // Remove "User:" prefix
				return await this.getUserAvatar(userName)
			}

			// For Talk pages, get the thumbnail from the main page
			let targetPageName = pageName
			if (pageName.startsWith("Talk:")) {
				targetPageName = pageName.substring(5) // Remove "Talk:" prefix
			}

			const summary = await this.getPageSummary(targetPageName)
			if (summary.thumbnail) {
				const thumb = summary.thumbnail
				return thumb.source || null
			}
			return null
		} catch (error) {
			console.error("Failed to get thumbnail:", error)
			return null
		}
	}

	/**
	 * Get page hero image: thumbnail if present, otherwise the first media image.
	 * @param pageName - Page title
	 * @returns Hero image URL or null
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
	 */
	async transformWikitextToHtml(wikitext: string, pageTitle = "Main_Page"): Promise<string> {
		const html = (await this.request({
			api: "mediawiki",
			path: `transform/wikitext/to/html/${this.encode(pageTitle)}`,
			body: { wikitext },
			type: "text",
		})) as string
		// Transform API often returns leading/trailing newlines; trim so inline use doesn’t get line breaks
		return html.trim()
	}

	/**
	 * Get page categories
	 * @param pageName - Page title
	 * @returns Page categories
	 */
	async getPageCategories(pageName: string): Promise<unknown> {
		return this.request({
			api: "wikimedia",
			path: `page/metadata/${this.encode(pageName)}`,
		})
	}

	/**
	 * Get page mobile-optimized HTML
	 * @param pageName - Page title
	 * @returns Mobile HTML
	 */
	async getPageMobileHtml(pageName: string): Promise<string> {
		return (await this.request({
			api: "wikimedia",
			path: `page/mobile-html/${this.encode(pageName)}`,
			type: "text",
		})) as string
	}

	/**
	 * Infer a user avatar image from their user page
	 * @param userName - Username
	 * @returns Avatar image URL or null
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
			return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg"
		} catch {
			// If no image found, use the default
			return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg"
		}
	}

	/**
	 * Get user information including edit count, registration date, and account type
	 * Results are cached in memory to avoid repeated API calls for the same user.
	 * @param userName - Username or IP address
	 * @returns User information including edit count, registration date, and account status
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
	 */
	isTemporaryAccount(userName: string): boolean {
		return userName.startsWith("~")
	}

	/**
	 * Check if a username is an IP address
	 * @param userName - Username to check
	 * @returns True if the username appears to be an IP address
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
	 * Parse a toolbar-style edit summary into a table of contents
	 * @param editSummary - Edit summary to parse
	 * @returns Table of contents
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

	/** Format date as "DD Month YYYY" or "DD.MM.YY". */
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

	/** Convert timestamp to YYYY-MM-DD key for grouping. */
	toDateKey(timestamp: string | number | Date): string {
		const d = this.toValidDate(timestamp)
		if (!d) return "Invalid date"
		const year = d.getFullYear()
		const month = (d.getMonth() + 1).toString().padStart(2, "0")
		const day = d.getDate().toString().padStart(2, "0")
		return `${year}-${month}-${day}`
	}

	/** Format time as HH:MM. */
	formatTime(timestamp: string | number | Date): string {
		const d = this.toValidDate(timestamp)
		if (!d) return "Invalid date"
		const hours = d.getHours()
		const minutes = d.getMinutes()
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
	}

	/** Check whether a timestamp falls on today in local time. */
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
		} else if (diffWeeks < 4) {
			currentPeriod = "weeks"
			currentValue = diffWeeks
		} else if (diffMonths < 12) {
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
	 */
	getUserUrl(userName: string): string {
		return `${this.base}wiki/User:${encodeURIComponent(userName)}`
	}

	/**
	 * Get URL for viewing a revision diff
	 * @param id - Revision ID
	 * @param pageName - Page title
	 * @returns URL to revision diff
	 */
	getRevisionUrl(id: number, pageName: string): string {
		return `${this.base}w/index.php?title=${this.encode(pageName)}&diff=${id}`
	}

	/**
	 * Get URL for a page
	 * @param pageName - Page title
	 * @returns URL to page
	 */
	getPageUrl(pageName: string): string {
		return `${this.base}wiki/${this.encode(pageName)}`
	}

	/**
	 * Get URL for page history
	 * @param pageName - Page title
	 * @returns URL to page history
	 */
	getHistoryUrl(pageName: string): string {
		return `${this.base}w/index.php?title=${this.encode(pageName)}&action=history`
	}

	/**
	 * Get URL for user talk page
	 * @param userName - Username
	 * @returns URL to user talk page
	 */
	getUserTalkUrl(userName: string): string {
		return `${this.base}wiki/User_talk:${encodeURIComponent(userName)}`
	}

	/**
	 * Get URL for user contributions
	 * @param userName - Username
	 * @returns URL to Special:Contributions
	 */
	getUserContribsUrl(userName: string): string {
		return `${this.base}wiki/Special:Contributions/${encodeURIComponent(userName)}`
	}

	/**
	 * Get URL for editing a page
	 * @param pageName - Page title
	 * @returns URL to edit page
	 */
	getEditUrl(pageName: string): string {
		return `${this.base}w/index.php?title=${this.encode(pageName)}&action=edit`
	}

	/**
	 * Get URL for thanking a user for a revision
	 * @param id - Revision ID
	 * @returns URL to thank page
	 */
	getThankUrl(id: number): string {
		return `${this.base}wiki/Special:Thanks/${id}`
	}

	/**
	 * Get file page URL from an upload URL
	 * Extracts the filename from a Wikimedia Commons upload URL and returns a link to the file page
	 * @param uploadUrl - Upload URL (e.g., https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/File.jpg/640px-File.jpg)
	 * @param pageName - Page name where the file is used
	 * @returns URL to the file page with media fragment (e.g., https://en.wikipedia.org/wiki/Page#/media/File:File.jpg)
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
	 */
	getStorageKeys(prototypeName: string, keyName: string, count: number): string[] {
		return Array.from({ length: count }, (_, i) =>
			this.getStorageKey(prototypeName, `${keyName}${i + 1}`)
		)
	}

	/**
	 * Create a new Result instance with default values
	 * @returns Result instance with empty data, loading false, and no error
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
	 */
	createResults<T = FWRevision>(count: number): FWResult<T>[] {
		return Array.from({ length: count }, () => this.createResult<T>())
	}

	/**
	 * Get CSS class name for delta (change size) indicator
	 * @param delta - Change size (positive, negative, or zero)
	 * @returns CSS class name: "positive", "negative", or "neutral"
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
	 * Get damaging prediction for a single revision from Lift Wing API
	 * @param revisionId - Revision ID
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Prediction score with probability
	 */
	async getDamagingPrediction(
		revisionId: number,
		wiki?: string
	): Promise<FWLiftWingPrediction | null> {
		const wikiCode = wiki || this.getWikiCode()
		const url = `https://api.wikimedia.org/service/lw/inference/v1/models/${wikiCode}-damaging:predict`

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
				},
				body: JSON.stringify({ rev_id: revisionId }),
			})

			if (!response.ok) {
				throw new Error(`Lift Wing API error: ${response.status}`)
			}

			const data = (await response.json()) as FWLiftWingResponse
			const wikiData = data[wikiCode]
			if (!wikiData?.scores?.[String(revisionId)]?.damaging) {
				return null
			}

			return wikiData.scores[String(revisionId)].damaging.score
		} catch (error) {
			console.error(`Failed to get damaging prediction for revision ${revisionId}:`, error)
			return null
		}
	}

	/**
	 * Get goodfaith prediction for a single revision from Lift Wing API
	 * @param revisionId - Revision ID
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Prediction score with probability
	 */
	async getGoodfaithPrediction(
		revisionId: number,
		wiki?: string
	): Promise<FWLiftWingPrediction | null> {
		const wikiCode = wiki || this.getWikiCode()
		const url = `https://api.wikimedia.org/service/lw/inference/v1/models/${wikiCode}-goodfaith:predict`

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
				},
				body: JSON.stringify({ rev_id: revisionId }),
			})

			if (!response.ok) {
				throw new Error(`Lift Wing API error: ${response.status}`)
			}

			const data = (await response.json()) as FWLiftWingResponse
			const wikiData = data[wikiCode]
			if (!wikiData?.scores?.[String(revisionId)]?.goodfaith) {
				return null
			}

			return wikiData.scores[String(revisionId)].goodfaith.score
		} catch (error) {
			console.error(`Failed to get goodfaith prediction for revision ${revisionId}:`, error)
			return null
		}
	}

	/**
	 * Get damaging predictions for multiple revisions in parallel
	 * @param revisionIds - Array of revision IDs
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Map of revision ID to prediction score
	 */
	async getDamagingPredictions(
		revisionIds: number[],
		wiki?: string
	): Promise<Map<number, FWLiftWingPrediction>> {
		const results = new Map<number, FWLiftWingPrediction>()

		// Make requests in parallel
		const predictions = await Promise.allSettled(
			revisionIds.map(async revId => {
				const prediction = await this.getDamagingPrediction(revId, wiki)
				return { revId, prediction }
			})
		)

		// Collect successful results
		for (const result of predictions) {
			if (result.status === "fulfilled" && result.value.prediction) {
				results.set(result.value.revId, result.value.prediction)
			}
		}

		return results
	}

	/**
	 * Get goodfaith predictions for multiple revisions in parallel
	 * @param revisionIds - Array of revision IDs
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Map of revision ID to prediction score
	 */
	async getGoodFaithPredictions(
		revisionIds: number[],
		wiki?: string
	): Promise<Map<number, FWLiftWingPrediction>> {
		const results = new Map<number, FWLiftWingPrediction>()

		// Make requests in parallel
		const predictions = await Promise.allSettled(
			revisionIds.map(async revId => {
				const prediction = await this.getGoodfaithPrediction(revId, wiki)
				return { revId, prediction }
			})
		)

		// Collect successful results
		for (const result of predictions) {
			if (result.status === "fulfilled" && result.value.prediction) {
				results.set(result.value.revId, result.value.prediction)
			}
		}

		return results
	}

	/**
	 * Get both damaging and goodfaith predictions for multiple revisions in parallel
	 * @param revisionIds - Array of revision IDs
	 * @param wiki - Wiki code (e.g., "enwiki"). If not provided, extracted from base URL
	 * @returns Map of revision ID to both prediction scores
	 */
	async getRevisionPredictions(
		revisionIds: number[],
		wiki?: string
	): Promise<FWRevisionPredictions> {
		// Fetch both predictions in parallel
		const [damagingResults, goodfaithResults] = await Promise.all([
			this.getDamagingPredictions(revisionIds, wiki),
			this.getGoodFaithPredictions(revisionIds, wiki),
		])

		// Combine results
		const combined: FWRevisionPredictions = {}
		const allIds = new Set([...damagingResults.keys(), ...goodfaithResults.keys()])

		for (const revId of allIds) {
			combined[revId] = {}
			if (damagingResults.has(revId)) {
				combined[revId].damaging = damagingResults.get(revId)!
			}
			if (goodfaithResults.has(revId)) {
				combined[revId].goodfaith = goodfaithResults.get(revId)!
			}
		}

		return combined
	}
}
