interface RestApiOptions {
  api: "wikimedia" | "mediawiki";
  path: string;
  body?: Record<string, unknown> | null;
  type?: "json" | "text";
}

interface ActionApiOptions {
  api: "action";
  params: Record<string, unknown>;
}

type ApiOptions = RestApiOptions | ActionApiOptions;

interface HistoryOptions {
  limit?: number | string;
  older_than?: string;
  newer_than?: string;
}

interface ToolbarComment {
  comment: string | null;
  suggestedBy: string | null;
  hashtags: string[] | string;
  other: string[];
  useThisBot: string | null;
  reportBugs: string | null;
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
  | "years";

interface RelativeTimestampOptions {
  seconds?: TimestampFormat;
  minutes?: TimestampFormat;
  hours?: TimestampFormat;
  days?: TimestampFormat;
  weeks?: TimestampFormat;
  months?: TimestampFormat;
  years?: TimestampFormat;
}

/**
 * Helper for interacting with Wikimedia and MediaWiki REST APIs.
 */
export class WikiApi {
  base: string;

  /**
   * Create a new WikiApi instance
   * @param base - Base URL for the API
   */
  constructor(base = "https://en.wikipedia.org/") {
    this.base = base;
  }

  /**
   * Get the base URL for the Wikimedia REST API
   * @returns Wikimedia base URL
   */
  get wikimediaBase(): string {
    return `${this.base}api/rest_v1/`;
  }

  /**
   * Get the base URL for the MediaWiki REST API
   * @returns MediaWiki base URL
   */
  get mediawikiBase(): string {
    return `${this.base}w/rest.php/v1/`;
  }

  /**
   * Make a request to Wikimedia REST API, MediaWiki REST API, or MediaWiki Action API
   * @param options - Request options
   * @returns JSON or text response
   */
  async request(options: ApiOptions): Promise<unknown> {
    const { api } = options;

    if (api === "action") {
      return this._handleActionApiRequest(options as ActionApiOptions);
    } else if (api === "wikimedia" || api === "mediawiki") {
      return this._handleRestApiRequest(options as RestApiOptions);
    } else {
      throw new Error('API type must be "wikimedia", "mediawiki", or "action"');
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
    const base = api === "wikimedia" ? this.wikimediaBase : this.mediawikiBase;
    const containsQuery = path.includes("?");
    const separator = containsQuery ? "&" : "?";

    const url = `${base}${path}${separator}origin=*`;
    const headers = {
      "Content-Type": "application/json",
      "Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
    };

    try {
      const response = await fetch(url, {
        headers,
        method: body ? "POST" : "GET",
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`${response.status}`);
      }

      return type === "json" ? await response.json() : await response.text();
    } catch (error) {
      console.error(`Request failed: ${error instanceof Error ? error.message : "Unknown error"}`, {
        path,
        api,
        url,
      });
      throw error;
    }
  }

  /**
   * Handle Action API requests
   * @param options - Action API options
   * @returns JSON response from Action API
   * @private
   */
  async _handleActionApiRequest({ params }: ActionApiOptions): Promise<unknown> {
    const searchParams = new URLSearchParams();

    // Add all parameters to the URL
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array values (some Action API params accept multiple values)
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }

    // Ensure format is JSON (default for Action API)
    if (!searchParams.has("format")) {
      searchParams.append("format", "json");
    }

    // Use formatversion 2 for cleaner response structure
    if (!searchParams.has("formatversion")) {
      searchParams.append("formatversion", "2");
    }

    const url = `${this.base}w/api.php?${searchParams.toString()}&origin=*`;
    const headers = {
      "Content-Type": "application/json",
      "Api-User-Agent": "MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)",
    };

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`${response.status}`);
      }

      const data = (await response.json()) as {
        error?: { info?: string; code?: string };
        warnings?: unknown;
      };

      // Check for Action API errors
      if (data.error) {
        throw new Error(data.error.info || data.error.code || "Unknown error");
      }

      // Check for warnings (non-fatal, but log them)
      if (data.warnings) {
        console.warn("Action API warnings:", data.warnings);
      }

      return data;
    } catch (error) {
      console.error(
        `Action API request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          params,
          url,
        },
      );
      throw error;
    }
  }

  /**
   * Encode a page title for URL usage
   * @param slug - Page title
   * @returns URL-encoded title
   */
  encode(slug: string): string {
    return encodeURIComponent(slug.replace(/ /g, "_"));
  }

  /**
   * Get a page summary (extract, thumbnail, etc.)
   * @param pageName - Page title
   * @returns Page summary
   */
  async getPageSummary(pageName: string): Promise<unknown> {
    return this.request({
      api: "wikimedia",
      path: `page/summary/${this.encode(pageName)}`,
    });
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
    })) as string;
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
    })) as { source: string };
    return page.source;
  }

  /**
   * Get full page metadata and latest revision
   * @param pageName - Page title
   * @returns Page metadata
   */
  async getPage(pageName: string): Promise<unknown> {
    return this.request({
      api: "mediawiki",
      path: `page/${this.encode(pageName)}`,
    });
  }

  /**
   * Search for pages by title (autocomplete-style)
   * @param query - Search query
   * @param limit - Maximum results (default: 20)
   * @returns Search results
   */
  async searchTitles(query: string, limit = 20): Promise<unknown> {
    return this.request({
      api: "mediawiki",
      path: `search/title?q=${encodeURIComponent(query)}&limit=${limit}`,
    });
  }

  /**
   * Full-text search across page titles and content
   * @param query - Search query
   * @param limit - Maximum results (default: 20)
   * @returns Search results
   */
  async searchPages(query: string, limit = 20): Promise<unknown> {
    return this.request({
      api: "mediawiki",
      path: `search/page?q=${encodeURIComponent(query)}&limit=${limit}`,
    });
  }

  /**
   * Search for users by username
   * @param query - Search query (username or part of username)
   * @param limit - Maximum results (default: 20)
   * @returns Array of user objects with username, avatar, and page metadata
   */
  async searchUsers(query: string, limit = 20): Promise<unknown[]> {
    // Search for users by prefixing with "User:" if not already present
    const cleanQuery = query.trim();
    const searchQuery = cleanQuery.startsWith("User:") ? cleanQuery : `User:${cleanQuery}`;

    // Search for titles matching the query
    const data = (await this.searchTitles(searchQuery, limit * 2)) as {
      pages?: Array<{ title: string }>;
    };

    // Filter to only User namespace pages (exclude subpages like User:Name/Talk)
    const userPages = (data.pages || []).filter(
      (page) =>
        page.title.startsWith("User:") && !page.title.includes("/") && page.title !== "User:",
    );

    // Limit results after filtering
    const limitedPages = userPages.slice(0, limit);

    // Fetch avatars for each user
    const usersWithAvatars = await Promise.all(
      limitedPages.map(async (page) => {
        const username = page.title.replace(/^User:/, "");
        const avatar = await this.getUserAvatar(username);
        return {
          ...page,
          username,
          avatar: avatar ? { url: avatar } : null,
        };
      }),
    );

    return usersWithAvatars;
  }

  /**
   * Get page revision history
   * @param pageName - Page title
   * @param options - Options (limit, older_than, newer_than, etc.)
   * @returns Revision history
   */
  async getPageHistory(pageName: string, options: HistoryOptions = {}): Promise<unknown> {
    const params = new URLSearchParams();
    if (options.limit) params.append("limit", String(options.limit));
    if (options.older_than) params.append("older_than", options.older_than);
    if (options.newer_than) params.append("newer_than", options.newer_than);

    const query = params.toString();
    const path = `page/${this.encode(pageName)}/history${query ? `?${query}` : ""}`;
    return this.request({
      api: "mediawiki",
      path,
    });
  }

  /**
   * Get user contribution history (revisions made by a user)
   * @param userName - Username
   * @param options - Options (limit, older_than, newer_than, etc.)
   * @returns User revision history with same structure as getPageHistory
   */
  async getUserHistory(userName: string, options: HistoryOptions = {}): Promise<unknown> {
    // Try REST API endpoint first (if it exists)
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", String(options.limit));
      if (options.older_than) params.append("older_than", options.older_than);
      if (options.newer_than) params.append("newer_than", options.newer_than);

      const query = params.toString();
      const path = `user/${encodeURIComponent(userName)}/contributions${query ? `?${query}` : ""}`;
      return await this.request({
        api: "mediawiki",
        path,
      });
    } catch (error) {
      // If REST API doesn't have this endpoint, fall back to Action API
      return this.getUserHistoryViaActionApi(userName, options);
    }
  }

  /**
   * Get user contributions using the Action API (fallback)
   * @param userName - Username
   * @param options - Options (limit, etc.)
   * @returns User revision history
   */
  async getUserHistoryViaActionApi(
    userName: string,
    options: HistoryOptions = {},
  ): Promise<unknown> {
    const limit = options.limit || 20;
    const ucstart = options.older_than || undefined;
    const ucend = options.newer_than || undefined;

    const params: Record<string, unknown> = {
      action: "query",
      list: "usercontribs",
      ucuser: userName,
      uclimit: limit,
      ucprop: "ids|title|timestamp|comment|size|sizediff|flags",
    };

    if (ucstart) params.ucstart = ucstart;
    if (ucend) params.ucend = ucend;

    const data = (await this.request({
      api: "action",
      params,
    })) as {
      query?: {
        usercontribs?: Array<{
          revid: number;
          timestamp: string;
          minor?: boolean;
          size?: number;
          comment?: string;
          userid?: number;
          user?: string;
          sizediff?: number;
          title: string;
          pageid: number;
        }>;
      };
    };

    // Transform Action API response to match REST API format
    const contributions = data.query?.usercontribs || [];
    const revisions = contributions.map((contrib) => ({
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
    }));

    return {
      revisions,
      latest: revisions.length > 0 ? revisions[0] : null,
    };
  }

  /**
   * Compare two revisions
   * @param fromRevId - Source revision ID
   * @param toRevId - Target revision ID
   * @returns Diff between revisions
   */
  async compareRevisions(fromRevId: number, toRevId: number): Promise<unknown> {
    return this.request({
      api: "mediawiki",
      path: `revision/${fromRevId}/compare/${toRevId}`,
    });
  }

  /**
   * Get a random page
   * @param format - Format: 'summary', 'html', or 'title' (default: 'summary')
   * @returns Random page content
   */
  async getRandomPage(format: "summary" | "html" | "title" = "summary"): Promise<unknown> {
    if (format === "title") {
      // For title-only, use MediaWiki API
      const result = (await this.request({
        api: "mediawiki",
        path: "page/random",
      })) as { title: string };
      return result.title;
    }
    return this.request({
      api: "wikimedia",
      path: `page/random/${format}`,
    });
  }

  /**
   * Get featured page for a specific date
   * @param date - Date object or YYYY/MM/DD string
   * @returns Featured page data
   */
  async getFeaturedPage(date: Date | string = new Date()): Promise<unknown> {
    const dateStr =
      date instanceof Date
        ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
        : date;
    return this.request({
      api: "wikimedia",
      path: `feed/featured/${dateStr}`,
    });
  }

  /**
   * Get "On This Day" content
   * @param type - Type: 'events', 'births', 'deaths', 'holidays', 'selected'
   * @param date - Date object or MM/DD string
   * @returns On this day content
   */
  async getOnThisDay(
    type: "events" | "births" | "deaths" | "holidays" | "selected" = "events",
    date: Date | string = new Date(),
  ): Promise<unknown> {
    const dateStr =
      date instanceof Date
        ? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
        : date;
    return this.request({
      api: "wikimedia",
      path: `feed/onthisday/${type}/${dateStr}`,
    });
  }

  /**
   * Get current announcements
   * @returns Announcements
   */
  async getAnnouncements(): Promise<unknown> {
    return this.request({
      api: "wikimedia",
      path: "feed/announcements",
    });
  }

  /**
   * Get page media (images, audio, etc.)
   * @param pageName - Page title
   * @returns Media files associated with the page
   */
  async getPageMedia(pageName: string): Promise<unknown> {
    return this.request({
      api: "wikimedia",
      path: `page/media-list/${this.encode(pageName)}`,
    });
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
        const userName = pageName.substring(10); // Remove "User talk:" prefix
        return await this.getUserAvatar(userName);
      }

      // For User pages, get the user avatar instead
      if (pageName.startsWith("User:")) {
        const userName = pageName.substring(5); // Remove "User:" prefix
        return await this.getUserAvatar(userName);
      }

      // For Talk pages, get the thumbnail from the main page
      let targetPageName = pageName;
      if (pageName.startsWith("Talk:")) {
        targetPageName = pageName.substring(5); // Remove "Talk:" prefix
      }

      const summary = (await this.getPageSummary(targetPageName)) as {
        thumbnail?: { source?: string; url?: string };
      };
      if (summary.thumbnail) {
        const thumb = summary.thumbnail;
        return thumb.source || thumb.url || null;
      }
      return null;
    } catch (error) {
      console.error("Failed to get thumbnail:", error);
      return null;
    }
  }

  /**
   * Transform wikitext to HTML
   * @param wikitext - Wikitext content
   * @param pageTitle - Page title for context (optional)
   * @returns HTML content
   */
  async transformWikitextToHtml(wikitext: string, pageTitle = "Main_Page"): Promise<string> {
    return (await this.request({
      api: "mediawiki",
      path: `transform/wikitext/to/html/${this.encode(pageTitle)}`,
      body: { wikitext },
      type: "text",
    })) as string;
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
    });
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
    });
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
    })) as string;
  }

  async getUserAvatar(userName: string): Promise<string | null> {
    // Get media from the user's user page
    try {
      const media = (await this.getPageMedia(`User:${userName}`)) as {
        items?: Array<{ section_id?: number; srcset?: Array<{ src?: string }> }>;
      };
      if (media.items && media.items.length > 0) {
        // Look for the first item in the section 1, to avoid notices at the top of the page
        // Resort to the notices if no item is found in section 1
        const leadItem = media.items.find((item) => item.section_id === 1) ?? media.items[0];

        return (
          leadItem.srcset?.[0]?.src ??
          "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg"
        );
      }
      return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg";
    } catch (error) {
      // If no image found, use the default
      return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg";
    }
  }

  getTableFromToolbarComment(comment: string): string {
    const toolbar = this.parseToolbarComment(comment);

    if (toolbar === null) {
      return comment;
    }

    let table = `${toolbar.comment ?? ""}\n{\| class="wikitable" class="wikitable"\n|-\n`;
    if (toolbar.suggestedBy) {
      table += `| Suggested by [[User:${toolbar.suggestedBy}|${toolbar.suggestedBy}]]\n|-\n`;
    }
    if (toolbar.useThisBot && toolbar.reportBugs) {
      table += `| ${toolbar.useThisBot}. ${toolbar.reportBugs}\n|-\n`;
    }
    if (Array.isArray(toolbar.hashtags) && toolbar.hashtags.length > 0) {
      table += `| ${toolbar.hashtags.join(" ")}\n|-\n`;
    }
    if (toolbar.other.length > 0) {
      table += `| ${toolbar.other.join("\n|-\n|")}\n|-\n`;
    }

    table += `\n|}`;

    return table;
  }

  /**
   * Parse a toolbar comment into structured parts
   * @param comment - Comment string to parse
   * @returns Parsed toolbar comment or null if not a toolbar comment
   */
  parseToolbarComment(comment: string): ToolbarComment | null {
    let parts = comment.split(" | ");
    parts = parts.filter((part) => part.trim().length > 0);
    if (parts.length <= 1) {
      return null;
    }

    const [head] = parts;
    const suggestedByPart = parts.find((part) => part.startsWith("Suggested by "));
    const botPart = parts.find((part) => part.includes("Use this bot]]."));
    const hashtagParts = parts.filter((part) => part.startsWith("#"));

    const [useThisBot, reportBugs] = botPart ? botPart.split(". ") : [null, null];

    const commentPart =
      head !== suggestedByPart && head !== botPart && !hashtagParts.includes(head) ? head : null;

    const otherParts = parts.filter(
      (part) =>
        part !== commentPart &&
        part !== suggestedByPart &&
        part !== botPart &&
        !hashtagParts.includes(part),
    );

    return {
      comment: commentPart,
      suggestedBy: suggestedByPart ? suggestedByPart.replace("Suggested by ", "") : null,
      hashtags: hashtagParts,
      other: otherParts,
      useThisBot,
      reportBugs,
    };
  }

  preprocessEditSummary(summary: string, pageName: string): string {
    summary = summary.replace(/^\/\* (.*) \*\//, `[[${pageName}#$1|→$1]]`);
    summary = summary.replaceAll("[[Category:", "[[:Category:");
    if (summary.includes("#IABot")) {
      summary = `(${summary})`;
    }
    return summary;
  }

  async getEditSummaryHtml(summary: string, pageName: string): Promise<string> {
    summary = this.preprocessEditSummary(summary, pageName);
    summary = this.getTableFromToolbarComment(summary);
    return await this.transformWikitextToHtml(summary);
  }

  /**
   * Get a relative timestamp string (e.g., "2 minutes ago", "3 days ago")
   * @param timestamp - ISO timestamp string or Date object
   * @param options - Formatting options for different time periods
   * @returns Relative time string
   */
  getRelativeTimestamp(timestamp: string | Date, options: RelativeTimestampOptions = {}): string {
    const now = new Date();
    const past = timestamp instanceof Date ? timestamp : new Date(timestamp);

    // Handle invalid dates
    if (isNaN(past.getTime())) {
      return "Invalid date";
    }

    const diffMs = now.getTime() - past.getTime();

    // Handle future dates
    if (diffMs < 0) {
      return "Just now";
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Calculate calendar days (timezone-aware)
    // Create dates at midnight in local timezone to compare calendar days
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pastDate = new Date(past.getFullYear(), past.getMonth(), past.getDate());
    const diffDays = Math.floor((nowDate.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24));

    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Helper function to format date as "DD Month YYYY" (or "DD Month" if same year)
    const formatDate = (date: Date): string => {
      const currentYear = now.getFullYear();
      const dateYear = date.getFullYear();
      const includeYear = dateYear !== currentYear;

      return date.toLocaleDateString("en-GB", {
        year: includeYear ? "numeric" : undefined,
        month: "long",
        day: "numeric",
      });
    };

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
      };
      const names = unitNames[unit];
      return `${value} ${value === 1 ? names.singular : names.plural} ago`;
    };

    // Helper function to get format option for a time period
    const getFormat = (period: string): string | undefined => {
      return options[period as keyof RelativeTimestampOptions] as string | undefined;
    };

    // Determine which time period we're in and get the appropriate format
    let currentPeriod: string;
    let currentValue: number;

    if (diffSeconds < 60) {
      currentPeriod = "seconds";
      currentValue = diffSeconds;
    } else if (diffMinutes < 60) {
      currentPeriod = "minutes";
      currentValue = diffMinutes;
    } else if (diffHours < 24) {
      currentPeriod = "hours";
      currentValue = diffHours;
    } else if (diffDays < 7) {
      currentPeriod = "days";
      currentValue = diffDays;
    } else if (diffWeeks < 4) {
      currentPeriod = "weeks";
      currentValue = diffWeeks;
    } else if (diffMonths < 12) {
      currentPeriod = "months";
      currentValue = diffMonths;
    } else {
      currentPeriod = "years";
      currentValue = diffYears;
    }

    // Check if there's a format option for this period
    const format = getFormat(currentPeriod);

    // Handle "date" format
    if (format === "date") {
      return formatDate(past);
    }

    // Handle "words" format
    if (format === "words") {
      if (currentPeriod === "seconds") {
        return "Just now";
      } else if (currentPeriod === "minutes") {
        return "Minutes ago";
      } else if (currentPeriod === "hours") {
        return "Hours ago";
      } else if (currentPeriod === "days") {
        return "Days ago";
      } else if (currentPeriod === "weeks") {
        return "Weeks ago";
      } else if (currentPeriod === "months") {
        return "Months ago";
      } else if (currentPeriod === "years") {
        return "A long time ago";
      }
    }

    // Handle forced unit format (e.g., "days", "hours", etc.)
    if (
      format &&
      ["seconds", "minutes", "hours", "days", "weeks", "months", "years"].includes(format)
    ) {
      // Calculate the value for the forced unit
      let forcedValue: number;
      if (format === "seconds") {
        forcedValue = diffSeconds;
      } else if (format === "minutes") {
        forcedValue = diffMinutes;
      } else if (format === "hours") {
        forcedValue = diffHours;
      } else if (format === "days") {
        forcedValue = diffDays;
      } else if (format === "weeks") {
        forcedValue = diffWeeks;
      } else if (format === "months") {
        forcedValue = diffMonths;
      } else if (format === "years") {
        forcedValue = diffYears;
      } else {
        forcedValue = 0;
      }
      return formatUnit(forcedValue, format);
    }

    // Default behavior: return relative timestamp for current period
    if (currentPeriod === "seconds") {
      return "Just now";
    } else {
      return formatUnit(currentValue, currentPeriod);
    }
  }
}
