interface RestApiOptions {
	api: "wikimedia" | "mediawiki"
	path: string
	body?: Record<string, unknown> | null
	type?: "json" | "text"
}

interface ActionApiOptions {
	api: "action"
	params: Record<string, unknown>
}

type ApiOptions = RestApiOptions | ActionApiOptions

interface HistoryOptions {
	limit?: number | string
	older_than?: string
	newer_than?: string
}

interface ToolbarComment {
	comment: string | null
	suggestedBy: string | null
	hashtags: string[] | string
	other: string[]
	useThisBot: string | null
	reportBugs: string | null
}

type TimestampFormat =
	| "words"
	| "date"
	| "seconds"
	| "minutes"
	| "hours"
	| "days"
	| "weeks"
	| "months"
	| "years"

interface RelativeTimestampOptions {
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
	avatar: { url: string } | null
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

type CachedRevision = PageHistoryRevision & { pageName?: string }

export interface PageHistoryResponse {
	revisions?: PageHistoryRevision[]
	latest?: string
	older?: string
	newer?: string
}

export interface OnThisDayEvent {
	text: string
	year?: number
	pages?: Array<{ title: string }>
}

export interface OnThisDayHoliday {
	text: string
	pages?: Array<{ title: string }>
}

export interface OnThisDayResponse {
	events?: OnThisDayEvent[]
	births?: OnThisDayEvent[]
	deaths?: OnThisDayEvent[]
	holidays?: OnThisDayHoliday[]
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

/**
 * Helper for interacting with Wikimedia and MediaWiki REST APIs.
 */
export class WikiApi {
	base: string
	private userInfoCache: Map<string, UserInfo | null>
	// Cache for page histories: key = pageName, value = sorted array of revisions (newest first)
	private pageHistoryCache = new Map<string, PageHistoryRevision[]>()
	// Cache for user histories: key = userName, value = sorted array of revisions (newest first)
	private userHistoryCache = new Map<string, (PageHistoryRevision & { pageName: string })[]>()

	/**
	 * Create a new WikiApi instance
	 * @param base - Base URL for the API
	 */
	constructor(base = "https://en.wikipedia.org/") {
		this.base = base
		this.userInfoCache = new Map()
	}

	/**
	 * Get the base URL for the Wikimedia REST API
	 * @returns Wikimedia base URL
	 */
	get wikimediaBase(): string {
		return `${this.base}api/rest_v1/`
	}

	/**
	 * Get the base URL for the MediaWiki REST API
	 * @returns MediaWiki base URL
	 */
	get mediawikiBase(): string {
		return `${this.base}w/rest.php/v1/`
	}

	/**
	 * Make a request to Wikimedia REST API, MediaWiki REST API, or MediaWiki Action API
	 * @param options - Request options
	 * @returns JSON or text response
	 */
	async request(options: ApiOptions): Promise<unknown> {
		const { api } = options

		if (api === "action") {
			return this._handleActionApiRequest(options as ActionApiOptions)
		} else if (api === "wikimedia" || api === "mediawiki") {
			return this._handleRestApiRequest(options as RestApiOptions)
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
	}: RestApiOptions): Promise<unknown> {
		const base = api === "wikimedia" ? this.wikimediaBase : this.mediawikiBase
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
	async _handleActionApiRequest({ params }: ActionApiOptions): Promise<unknown> {
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
	async getPageSummary(pageName: string): Promise<PageSummary> {
		return (await this.request({
			api: "wikimedia",
			path: `page/summary/${this.encode(pageName)}`,
		})) as PageSummary
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
	async getPage(pageName: string): Promise<PageMetadata> {
		return (await this.request({
			api: "mediawiki",
			path: `page/${this.encode(pageName)}`,
		})) as PageMetadata
	}

	/**
	 * Search for pages by title (autocomplete-style)
	 * @param query - Search query
	 * @param limit - Maximum results (default: 20)
	 * @returns Search results with pages array
	 */
	async searchTitles(query: string, limit = 20): Promise<{ pages?: PageSearchResult[] }> {
		return (await this.request({
			api: "mediawiki",
			path: `search/title?q=${encodeURIComponent(query)}&limit=${limit}`,
		})) as { pages?: PageSearchResult[] }
	}

	/**
	 * Full-text search across page titles and content
	 * @param query - Search query
	 * @param limit - Maximum results (default: 20)
	 * @returns Search results with pages array
	 */
	async searchPages(query: string, limit = 20): Promise<{ pages?: PageSearchResult[] }> {
		return (await this.request({
			api: "mediawiki",
			path: `search/page?q=${encodeURIComponent(query)}&limit=${limit}`,
		})) as { pages?: PageSearchResult[] }
	}

	/**
	 * Search for users by username
	 * @param query - Search query (username or part of username)
	 * @param limit - Maximum results (default: 20)
	 * @returns Array of user objects with username, avatar, and page metadata
	 */
	async searchUsers(query: string, limit = 20): Promise<UserSearchResult[]> {
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

		// Fetch avatars for each user
		const usersWithAvatars = await Promise.all(
			limitedPages.map(async page => {
				const username = page.title.replace(/^User:/, "")
				const avatar = await this.getUserAvatar(username)
				return {
					...page,
					username,
					avatar: avatar ? { url: avatar } : null,
				}
			})
		)

		return usersWithAvatars
	}

	/**
	 * Get page revision history
	 * Uses caching to avoid fetching the same data twice.
	 * Looks backwards from startDate by fetching ~20 revisions.
	 * @param pageName - Page title
	 * @param options - Options
	 * @param options.startDate - ISO timestamp string - look backwards from this date (default: now)
	 * @param options.older_than - Revision ID or timestamp - for explicit pagination
	 * @param options.newer_than - Revision ID or timestamp - for explicit pagination
	 * @returns Revision history with revisions array
	 * @note The MediaWiki REST API returns 20 revisions per request.
	 */
	async getPageHistory(
		pageName: string,
		options: { startDate?: string; older_than?: string; newer_than?: string } = {}
	): Promise<PageHistoryResponse> {
		const cached = this.pageHistoryCache.get(pageName) || []
		const { startDate, older_than, newer_than } = options

		// If explicit older_than/newer_than provided, use those
		if (older_than || newer_than) {
			const params = new URLSearchParams()
			if (older_than) params.append("older_than", older_than)
			if (newer_than) params.append("newer_than", newer_than)

			const query = params.toString()
			const path = `page/${this.encode(pageName)}/history${query ? `?${query}` : ""}`
			const response = (await this.request({
				api: "mediawiki",
				path,
			})) as PageHistoryResponse

			const newRevisions = response.revisions || []
			const merged = [...cached, ...newRevisions]
				.filter((rev, index, self) => index === self.findIndex(r => r.id === rev.id))
				.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

			this.pageHistoryCache.set(pageName, merged)
			return { ...response, revisions: merged }
		}

		// Use startDate-based pagination with gap detection
		const targetStartTime = startDate ? new Date(startDate).getTime() : Date.now()

		// Find cached revisions older than startDate (sorted newest first)
		const cachedOlder = cached.filter(
			rev => new Date(rev.timestamp).getTime() < targetStartTime
		)

		// Check if we have enough cached data (API returns ~20 revisions)
		// If we have 20+ cached revisions older than startDate, return from cache
		if (cachedOlder.length >= 20) {
			return { revisions: cachedOlder.slice(0, 20) }
		}

		// Determine where to fetch from:
		// - If no cache or cache doesn't reach startDate: fetch from startDate
		// - If cache has gaps: fetch from the oldest cached revision (to fill the gap)
		let fetchFrom: string | undefined = undefined
		if (cachedOlder.length > 0) {
			// Find the oldest cached revision (last in sorted array)
			const oldestCached = cachedOlder[cachedOlder.length - 1]
			if (oldestCached) {
				fetchFrom = String(oldestCached.id)
			}
		} else if (startDate) {
			// No cache older than startDate, fetch from startDate
			fetchFrom = startDate
		}

		// Fetch from API
		const params = new URLSearchParams()
		if (fetchFrom) params.append("older_than", fetchFrom)

		const query = params.toString()
		const path = `page/${this.encode(pageName)}/history${query ? `?${query}` : ""}`
		const response = (await this.request({
			api: "mediawiki",
			path,
		})) as PageHistoryResponse

		const newRevisions = response.revisions || []

		// Merge with cache, deduplicate by revision ID, sort by timestamp
		const merged = [...cached, ...newRevisions]
			.filter((rev, index, self) => index === self.findIndex(r => r.id === rev.id))
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		this.pageHistoryCache.set(pageName, merged)

		// Return revisions older than startDate
		const resultOlder = merged.filter(
			rev => new Date(rev.timestamp).getTime() < targetStartTime
		)
		return { ...response, revisions: resultOlder.slice(0, 20) }
	}

	/**
	 * Get user contribution history (revisions made by a user)
	 * Uses caching to avoid fetching the same data twice.
	 * Looks backwards from startDate by fetching ~20 revisions.
	 * @param userName - Username
	 * @param options - Options
	 * @param options.startDate - ISO timestamp string - look backwards from this date (default: now)
	 * @param options.limit - Limit (default: 20)
	 * @param options.older_than - Timestamp - for explicit pagination
	 * @param options.newer_than - Timestamp - for explicit pagination
	 * @returns User revision history with same structure as getPageHistory
	 */
	async getUserHistory(
		userName: string,
		options: HistoryOptions & { startDate?: string } = {}
	): Promise<PageHistoryResponse> {
		const cached = this.userHistoryCache.get(userName) || []
		const { startDate, older_than, newer_than, limit = 20 } = options
		const limitNum =
			typeof limit === "number" ? limit : typeof limit === "string" ? parseInt(limit, 10) : 20

		// If explicit older_than/newer_than provided, use those
		if (older_than || newer_than) {
			const fetched = await this.getUserHistoryViaActionApi(userName, {
				limit: limitNum,
				older_than,
				newer_than,
			})
			const newRevisions = (fetched.revisions || []).map(
				rev => rev as PageHistoryRevision & { pageName: string }
			)
			const merged: (PageHistoryRevision & { pageName: string })[] = [
				...cached,
				...newRevisions,
			]
				.filter((rev, index, self) => index === self.findIndex(r => r.id === rev.id))
				.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

			this.userHistoryCache.set(userName, merged)
			return { ...fetched, revisions: merged }
		}

		// Use startDate-based pagination with gap detection
		const targetStartTime = startDate ? new Date(startDate).getTime() : Date.now()

		// Find cached revisions older than startDate (sorted newest first)
		const cachedOlder = cached.filter(
			rev => new Date(rev.timestamp).getTime() < targetStartTime
		)

		// Check if we have enough cached data
		if (cachedOlder.length >= limitNum) {
			return { revisions: cachedOlder.slice(0, limitNum) }
		}

		// Determine where to fetch from:
		// - If no cache or cache doesn't reach startDate: fetch from startDate
		// - If cache has gaps: fetch from the oldest cached revision (to fill the gap)
		let fetchFrom: string | undefined = undefined
		if (cachedOlder.length > 0) {
			// Find the oldest cached revision (last in sorted array)
			const oldestCached = cachedOlder[cachedOlder.length - 1]
			if (oldestCached) {
				fetchFrom = oldestCached.timestamp
			}
		} else if (startDate) {
			// No cache older than startDate, fetch from startDate
			fetchFrom = startDate
		}

		// Fetch from API
		const fetched = await this.getUserHistoryViaActionApi(userName, {
			limit: limitNum,
			older_than: fetchFrom,
		})

		const newRevisions = (fetched.revisions || []).map(
			rev => rev as PageHistoryRevision & { pageName: string }
		)

		// Merge with cache, deduplicate by revision ID, sort by timestamp
		const merged = [...cached, ...newRevisions]
			.filter((rev, index, self) => index === self.findIndex(r => r.id === rev.id))
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		this.userHistoryCache.set(userName, merged)

		// Return revisions older than startDate
		const resultOlder = merged.filter(
			rev => new Date(rev.timestamp).getTime() < targetStartTime
		)
		return { ...fetched, revisions: resultOlder.slice(0, limitNum) }
	}

	/**
	 * Get user contributions using the Action API (fallback)
	 * @param userName - Username
	 * @param options - Options (limit, etc.)
	 * @returns User revision history
	 */
	async getUserHistoryViaActionApi(
		userName: string,
		options: HistoryOptions = {}
	): Promise<PageHistoryResponse> {
		const limit = options.limit || 20
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
				usercontribs?: Array<{
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
				}>
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
			revisions: revisions as PageHistoryRevision[],
		}
	}

	/**
	 * Get contributions for multiple users by calling getUserHistory for each.
	 * Uses caching to avoid fetching the same data twice.
	 * Looks backwards from startDate by fetching ~20 revisions per user.
	 * @param userNames - Array of usernames
	 * @param options - Options
	 * @param options.startDate - ISO timestamp string - look backwards from this date (default: now)
	 * @param options.limit - Limit per user (default: 20)
	 * @param options.older_than - Timestamp - for explicit pagination
	 * @param options.newer_than - Timestamp - for explicit pagination
	 * @returns Map of username to their revision history
	 */
	async getUsersHistory(
		userNames: string[],
		options: HistoryOptions & { startDate?: string } = {}
	): Promise<Map<string, PageHistoryResponse>> {
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
				return { userName, history: { revisions: [] } as PageHistoryResponse }
			}
		})

		const userResults = await Promise.all(userPromises)
		const allResults = new Map<string, PageHistoryResponse>()

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
	 * @param options.limit - Maximum total number of revisions to return (default: 20, max: 20)
	 * @param options.after - Revision ID (as string) - only returns revisions older than this
	 * @returns Array of revisions sorted by timestamp (newest first), deduplicated by revision ID
	 */
	async getCombinedFeed(options: {
		userNames?: string[]
		pageNames?: string[]
		limit?: number
		after?: string // Revision ID (as string) - for pagination
	}): Promise<CachedRevision[]> {
		const { userNames = [], pageNames = [], limit = 20, after } = options
		const totalLimit = Math.min(Math.max(limit, 1), 20)
		const allRevisions: CachedRevision[] = []
		const seenIds = new Set<number>()

		// Convert 'after' revision ID to a timestamp for startDate
		let startDate: string | undefined = undefined
		if (after) {
			const afterId = parseInt(after, 10)
			// Try to find the timestamp in caches
			for (const [, cached] of this.pageHistoryCache) {
				const rev = cached.find(r => r.id === afterId)
				if (rev) {
					startDate = rev.timestamp
					break
				}
			}
			if (!startDate) {
				for (const [, cached] of this.userHistoryCache) {
					const rev = cached.find(r => r.id === afterId)
					if (rev) {
						startDate = rev.timestamp
						break
					}
				}
			}
		}

		// Fetch user contributions - caching handled internally
		if (userNames.length > 0) {
			const userResultsMap = await this.getUsersHistory(userNames, {
				limit: 20,
				startDate,
			})

			for (const [, history] of userResultsMap) {
				if (history.revisions) {
					for (const rev of history.revisions) {
						if (rev.id && !seenIds.has(rev.id)) {
							seenIds.add(rev.id)
							allRevisions.push(rev as CachedRevision)
						}
					}
				}
			}
		}

		// Fetch page histories - caching handled internally
		if (pageNames.length > 0) {
			const pagePromises = pageNames.map(async pageName => {
				try {
					const history = await this.getPageHistory(pageName, { startDate })
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
						allRevisions.push({ ...rev, pageName } as CachedRevision)
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
	async compareRevisions(fromRevId: number, toRevId: number): Promise<CompareResponse> {
		return (await this.request({
			api: "mediawiki",
			path: `revision/${fromRevId}/compare/${toRevId}`,
		})) as CompareResponse
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
	async getRevisionDiff(pageName: string, revId: number): Promise<CompareResponse> {
		const parentId = await this.getParentRevisionId(pageName, revId)
		if (parentId != null) return this.compareRevisions(parentId, revId)
		// No parent: treat as first revision and show entire content as added.
		const source = await this.getRevisionSource(revId)
		const lines = source.split(/\n/)
		const diff: DiffLine[] = lines.map((text, i) => ({
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
	 * Get a random page
	 * @param format - Format: 'summary', 'html', or 'title' (default: 'summary')
	 * @returns Random page content - string for 'title' format, RandomPageSummary for 'summary' or 'html' format
	 */
	async getRandomPage(
		format: "summary" | "html" | "title" = "summary"
	): Promise<RandomPageResult> {
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
		})) as RandomPageSummary
	}

	/**
	 * Get featured page for a specific date
	 * @param date - Date object or YYYY/MM/DD string
	 * @returns Featured page data
	 */
	async getFeaturedPage(date: Date | string = new Date()): Promise<FeaturedPage> {
		const dateStr =
			date instanceof Date
				? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
				: date
		return (await this.request({
			api: "wikimedia",
			path: `feed/featured/${dateStr}`,
		})) as FeaturedPage
	}

	/**
	 * Get "On This Day" content
	 * @param type - Type: 'events', 'births', 'deaths', 'holidays', 'selected'
	 * @param date - Date object or MM/DD string
	 * @returns On this day content
	 */
	async getOnThisDay(
		type: "events" | "births" | "deaths" | "holidays" | "selected" = "events",
		date: Date | string = new Date()
	): Promise<OnThisDayResponse> {
		const dateStr =
			date instanceof Date
				? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
				: date
		return (await this.request({
			api: "wikimedia",
			path: `feed/onthisday/${type}/${dateStr}`,
		})) as OnThisDayResponse
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
	async getPageMedia(pageName: string): Promise<PageMediaResponse> {
		return (await this.request({
			api: "wikimedia",
			path: `page/media-list/${this.encode(pageName)}`,
		})) as PageMediaResponse
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
	 * Get related pages (links, etc.)
	 * @param pageName - Page title
	 * @returns Related pages data
	 */
	async getRelatedPages(pageName: string): Promise<unknown> {
		return this.request({
			api: "wikimedia",
			path: `page/links/${this.encode(pageName)}`,
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
	async getUserInfo(userName: string): Promise<UserInfo | null> {
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

			const userInfo: UserInfo = {
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
	 * Determine user category based on edit count and days of activity
	 * @param userInfo - User information object
	 * @returns User category: "unregistered", "registered", "newcomer", "learner", or "experienced"
	 */
	getUserCategory(
		userInfo: UserInfo | null
	): "unregistered" | "registered" | "newcomer" | "learner" | "experienced" {
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

	getTableFromToolbarComment(comment: string): string {
		const toolbar = this.parseToolbarComment(comment)

		if (toolbar === null) {
			return comment
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
	 * Parse a toolbar comment into structured parts
	 * @param comment - Comment string to parse
	 * @returns Parsed toolbar comment or null if not a toolbar comment
	 */
	parseToolbarComment(comment: string): ToolbarComment | null {
		let parts = comment.split(" | ")
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

	preprocessEditSummary(summary: string, pageName: string): string {
		summary = summary.replace(/^\/\* (.*) \*\//, `[[${pageName}#$1|→$1]]`)
		summary = summary.replaceAll("[[Category:", "[[:Category:")
		if (summary.includes("#IABot")) {
			summary = `(${summary})`
		}
		return summary
	}

	async getEditSummaryHtml(summary: string, pageName: string): Promise<string> {
		summary = this.preprocessEditSummary(summary, pageName)
		const toolbar = this.parseToolbarComment(summary)
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

	/**
	 * Get a relative timestamp string (e.g., "2 minutes ago", "3 days ago")
	 * @param timestamp - ISO timestamp string or Date object
	 * @param options - Formatting options for different time periods
	 * @returns Relative time string
	 */
	getRelativeTimestamp(timestamp: string | Date, options: RelativeTimestampOptions = {}): string {
		const now = new Date()
		const past = timestamp instanceof Date ? timestamp : new Date(timestamp)

		// Handle invalid dates
		if (isNaN(past.getTime())) {
			return "Invalid date"
		}

		const diffMs = now.getTime() - past.getTime()

		// Handle future dates
		if (diffMs < 0) {
			return "Just now"
		}

		const diffSeconds = Math.floor(diffMs / 1000)
		const diffMinutes = Math.floor(diffMs / (1000 * 60))
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

		// Calculate calendar days (timezone-aware)
		// Create dates at midnight in local timezone to compare calendar days
		const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const pastDate = new Date(past.getFullYear(), past.getMonth(), past.getDate())
		const diffDays = Math.floor(
			(nowDate.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24)
		)

		const diffWeeks = Math.floor(diffDays / 7)
		const diffMonths = Math.floor(diffDays / 30)
		const diffYears = Math.floor(diffDays / 365)

		// Helper function to format date as "DD Month YYYY" (or "DD Month" if same year)
		const formatDate = (date: Date): string => {
			const currentYear = now.getFullYear()
			const dateYear = date.getFullYear()
			const includeYear = dateYear !== currentYear

			return date.toLocaleDateString("en-GB", {
				year: includeYear ? "numeric" : undefined,
				month: "long",
				day: "numeric",
			})
		}

		// Helper function to format a specific unit
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
			if (!names) {
				return `${value} ${unit} ago`
			}
			return `${value} ${value === 1 ? names.singular : names.plural} ago`
		}

		// Helper function to get format option for a time period
		const getFormat = (period: string): string | undefined => {
			return options[period as keyof RelativeTimestampOptions] as string | undefined
		}

		// Determine which time period we're in and get the appropriate format
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

		// Check if there's a format option for this period
		const format = getFormat(currentPeriod)

		// Handle "date" format
		if (format === "date") {
			return formatDate(past)
		}

		// Handle "words" format
		if (format === "words") {
			if (currentPeriod === "seconds") {
				return "Just now"
			} else if (currentPeriod === "minutes") {
				return "Minutes ago"
			} else if (currentPeriod === "hours") {
				return "Hours ago"
			} else if (currentPeriod === "days") {
				return "Days ago"
			} else if (currentPeriod === "weeks") {
				return "Weeks ago"
			} else if (currentPeriod === "months") {
				return "Months ago"
			} else if (currentPeriod === "years") {
				return "A long time ago"
			}
		}

		// Handle forced unit format (e.g., "days", "hours", etc.)
		if (
			format &&
			["seconds", "minutes", "hours", "days", "weeks", "months", "years"].includes(format)
		) {
			// Calculate the value for the forced unit
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

		// Default behavior: return relative timestamp for current period
		if (currentPeriod === "seconds") {
			return "Just now"
		} else {
			return formatUnit(currentValue, currentPeriod)
		}
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
	createResult<T = Revision>(): Result<T> {
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
	createResults<T = Revision>(count: number): Result<T>[] {
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
}
