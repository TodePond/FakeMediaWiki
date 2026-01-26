/**
 * Helper for interacting with Wikimedia and MediaWiki REST APIs.
 */
export class WikiApi {
  /**
   * Create a new WikiApi instance
   * @param {string} base - Base URL for the API
   */
  constructor(base = "https://en.wikipedia.org/") {
    this.base = base;
  }

  /**
   * Get the base URL for the Wikimedia REST API
   * @returns {string} Wikimedia base URL
   */
  get wikimediaBase() {
    return `${this.base}api/rest_v1/`;
  }

  /**
   * Get the base URL for the MediaWiki REST API
   * @returns {string} MediaWiki base URL
   */
  get mediawikiBase() {
    return `${this.base}w/rest.php/v1/`;
  }

  /**
   * @typedef {Object} RestApiOptions
   * @property {"wikimedia" | "mediawiki"} api - API type
   * @property {string} path - API path
   * @property {object|null} [body=null] - Request body (for POST requests)
   * @property {"json" | "text"} [type='json'] - Response type
   */

  /**
   * @typedef {Object} ActionApiOptions
   * @property {"action"} api - API type
   * @property {Object<string, any>} params - Action API parameters (e.g., { action: "query", list: "usercontribs", ... })
   */

  /**
   * Make a request to Wikimedia REST API, MediaWiki REST API, or MediaWiki Action API
   * @param {RestApiOptions | ActionApiOptions} options - Request options
   * @returns {Promise<Object|string>} JSON or text response
   */
  async request(options) {
    const { api } = options;

    if (api === "action") {
      return this._handleActionApiRequest(/** @type {ActionApiOptions} */ (options));
    } else if (api === "wikimedia" || api === "mediawiki") {
      return this._handleRestApiRequest(/** @type {RestApiOptions} */ (options));
    } else {
      throw new Error('API type must be "wikimedia", "mediawiki", or "action"');
    }
  }

  /**
   * Handle REST API requests (Wikimedia or MediaWiki)
   * @param {RestApiOptions} options - REST API options
   * @returns {Promise<Object|string>} JSON or text response
   * @private
   */
  async _handleRestApiRequest({ api, path, body = null, type = "json" }) {
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
   * @param {ActionApiOptions} options - Action API options
   * @returns {Promise<Object>} JSON response from Action API
   * @private
   */
  async _handleActionApiRequest({ params }) {
    const searchParams = new URLSearchParams();

    // Add all parameters to the URL
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array values (some Action API params accept multiple values)
          value.forEach((v) => searchParams.append(key, v));
        } else {
          searchParams.append(key, value.toString());
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

      const data = await response.json();

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
   * @param {string} slug - Page title
   * @returns {string} URL-encoded title
   */
  encode(slug) {
    return encodeURIComponent(slug.replace(/ /g, "_"));
  }

  /**
   * Get a page summary (extract, thumbnail, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page summary
   */
  async getPageSummary(pageName) {
    return this.request({
      api: "wikimedia",
      path: `page/summary/${this.encode(pageName)}`,
    });
  }

  /**
   * Get page content as HTML
   * @param {string} pageName - Page title
   * @returns {Promise<string>} HTML content
   */
  async getPageHtml(pageName) {
    return await this.request({
      api: "mediawiki",
      path: `page/${this.encode(pageName)}/html`,
      type: "text",
    });
  }

  /**
   * Get page content as wikitext source
   * @param {string} pageName - Page title
   * @returns {Promise<string>} Wikitext source
   */
  async getPageSource(pageName) {
    const page = await this.request({
      api: "mediawiki",
      path: `page/${this.encode(pageName)}`,
    });
    return page.source;
  }

  /**
   * Get full page metadata and latest revision
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page metadata
   */
  async getPage(pageName) {
    return this.request({
      api: "mediawiki",
      path: `page/${this.encode(pageName)}`,
    });
  }

  /**
   * Search for pages by title (autocomplete-style)
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 20)
   * @returns {Promise<Object>} Search results
   */
  async searchTitles(query, limit = 20) {
    return this.request({
      api: "mediawiki",
      path: `search/title?q=${encodeURIComponent(query)}&limit=${limit}`,
    });
  }

  /**
   * Full-text search across page titles and content
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 20)
   * @returns {Promise<Object>} Search results
   */
  async searchPages(query, limit = 20) {
    return this.request({
      api: "mediawiki",
      path: `search/page?q=${encodeURIComponent(query)}&limit=${limit}`,
    });
  }

  /**
   * Search for users by username
   * @param {string} query - Search query (username or part of username)
   * @returns {Promise<Array>} Array of user objects with username, avatar, and page metadata
   */
  async searchUsers(query, limit = 20) {
    // Search for users by prefixing with "User:" if not already present
    const cleanQuery = query.trim();
    const searchQuery = cleanQuery.startsWith("User:") ? cleanQuery : `User:${cleanQuery}`;

    // Search for titles matching the query
    const data = await this.searchTitles(searchQuery, limit * 2); // Get more results to account for filtering

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
   * @param {string} pageName - Page title
   * @param {Object} options - Options (limit, older_than, newer_than, etc.)
   * @returns {Promise<Object>} Revision history
   */
  async getPageHistory(pageName, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append("limit", options.limit);
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
   * @param {string} userName - Username
   * @param {Object} options - Options (limit, older_than, newer_than, etc.)
   * @returns {Promise<Object>} User revision history with same structure as getPageHistory
   */
  async getUserHistory(userName, options = {}) {
    // Try REST API endpoint first (if it exists)
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit);
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
   * @param {string} userName - Username
   * @param {Object} options - Options (limit, etc.)
   * @returns {Promise<Object>} User revision history
   */
  async getUserHistoryViaActionApi(userName, options = {}) {
    const limit = options.limit || 20;
    const ucstart = options.older_than || undefined;
    const ucend = options.newer_than || undefined;

    const params = {
      action: "query",
      list: "usercontribs",
      ucuser: userName,
      uclimit: limit,
      ucprop: "ids|title|timestamp|comment|size|sizediff|flags",
    };

    if (ucstart) params.ucstart = ucstart;
    if (ucend) params.ucend = ucend;

    const data = await this.request({
      api: "action",
      params,
    });

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
   * @param {number} fromRevId - Source revision ID
   * @param {number} toRevId - Target revision ID
   * @returns {Promise<Object>} Diff between revisions
   */
  async compareRevisions(fromRevId, toRevId) {
    return this.request({
      api: "mediawiki",
      path: `revision/${fromRevId}/compare/${toRevId}`,
    });
  }

  /**
   * Get a random page
   * @param {string} format - Format: 'summary', 'html', or 'title' (default: 'summary')
   * @returns {Promise<Object|string>} Random page content
   */
  async getRandomPage(format = "summary") {
    if (format === "title") {
      // For title-only, use MediaWiki API
      const result = await this.request({
        api: "mediawiki",
        path: "page/random",
      });
      return result.title;
    }
    return this.request({
      api: "wikimedia",
      path: `page/random/${format}`,
    });
  }

  /**
   * Get featured page for a specific date
   * @param {Date|string} date - Date object or YYYY/MM/DD string
   * @returns {Promise<Object>} Featured page data
   */
  async getFeaturedPage(date = new Date()) {
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
   * @param {string} type - Type: 'events', 'births', 'deaths', 'holidays', 'selected'
   * @param {Date|string} date - Date object or MM/DD string
   * @returns {Promise<Object>} On this day content
   */
  async getOnThisDay(type = "events", date = new Date()) {
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
   * @returns {Promise<Object>} Announcements
   */
  async getAnnouncements() {
    return this.request({
      api: "wikimedia",
      path: "feed/announcements",
    });
  }

  /**
   * Get page media (images, audio, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Media files associated with the page
   */
  async getPageMedia(pageName) {
    return this.request({
      api: "wikimedia",
      path: `page/media-list/${this.encode(pageName)}`,
    });
  }

  /**
   * Get thumbnail image for a page
   * @param {string} pageName - Page title
   * @returns {Promise<string|null>} Thumbnail URL or null
   */
  async getPageThumbnail(pageName) {
    try {
      const summary = await this.getPageSummary(pageName);
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
   * @param {string} wikitext - Wikitext content
   * @param {string} pageTitle - Page title for context (optional)
   * @returns {Promise<string>} HTML content
   */
  async transformWikitextToHtml(wikitext, pageTitle = "Main_Page") {
    return this.request({
      api: "mediawiki",
      path: `transform/wikitext/to/html/${this.encode(pageTitle)}`,
      body: { wikitext },
      type: "text",
    });
  }

  /**
   * Get page categories
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page categories
   */
  async getPageCategories(pageName) {
    return this.request({
      api: "wikimedia",
      path: `page/metadata/${this.encode(pageName)}`,
    });
  }

  /**
   * Get related pages (links, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Related pages data
   */
  async getRelatedPages(pageName) {
    return this.request({
      api: "wikimedia",
      path: `page/links/${this.encode(pageName)}`,
    });
  }

  /**
   * Get page mobile-optimized HTML
   * @param {string} pageName - Page title
   * @returns {Promise<string>} Mobile HTML
   */
  async getPageMobileHtml(pageName) {
    return this.request({
      api: "wikimedia",
      path: `page/mobile-html/${this.encode(pageName)}`,
      type: "text",
    });
  }

  async getUserAvatar(userName) {
    // return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg";

    // Get media from the user's user page
    try {
      const media = await this.getPageMedia(`User:${userName}`);
      console.log(media);
      if (media.items.length > 0) {
        // Look for the first item in the section 1, to avoid notices at the top of the page
        // Resort to the notices if no item is found in section 1
        let leadItem = media.items.find((item) => item.section_id === 1) ?? media.items[0];

        return (
          leadItem.srcset[0]?.src ??
          "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg"
        );
      }
      return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg";
    } catch (error) {
      // If no image found, use the default
      return "https://upload.wikimedia.org/wikipedia/commons/8/89/Baby_Globe_plushie_Wikipedia_25th_birthday_mascot.jpg";
    }
  }

  getTableFromToolbarComment(comment) {
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
    if (toolbar.hashtags.length > 0) {
      table += `| ${toolbar.hashtags.join(" ")}\n|-\n`;
    }
    if (toolbar.other.length > 0) {
      table += `| ${toolbar.other.join("\n|-\n|")}\n|-\n`;
    }

    table += `\n|}`;

    return table;
  }

  /**
   *
   * @param {string} comment
   * @returns
   */
  parseToolbarComment(comment) {
    /** @type {string[]} */
    let parts = comment.split(" | ");
    parts = parts.filter((part) => part.trim().length > 0);
    if (parts.length <= 1) {
      return null;
    }

    /** @type {[string]} */
    // @ts-expect-error - i already checked that it's not empty
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

  preprocessEditSummary(summary, pageName) {
    summary = summary.replace(/^\/\* (.*) \*\//, `[[${pageName}#$1|→$1]]`);
    summary = summary.replaceAll("[[Category:", "[[:Category:");
    if (summary.includes("#IABot")) {
      summary = `(${summary})`;
    }
    return summary;
  }

  async getEditSummaryHtml(summary, pageName) {
    summary = this.preprocessEditSummary(summary, pageName);
    summary = this.getTableFromToolbarComment(summary);
    return await this.transformWikitextToHtml(summary);
  }

  /**
   * Get a relative timestamp string (e.g., "2 minutes ago", "3 days ago")
   * @param {string|Date} timestamp - ISO timestamp string or Date object
   * @param {Object} [options] - Formatting options for different time periods
   * @param {string} [options.seconds] - Format for seconds: "words", "date", or unit name
   * @param {string} [options.minutes] - Format for minutes: "words", "date", or unit name
   * @param {string} [options.hours] - Format for hours: "words", "date", or unit name
   * @param {string} [options.days] - Format for days: "words", "date", or unit name
   * @param {string} [options.weeks] - Format for weeks: "words", "date", or unit name
   * @param {string} [options.months] - Format for months: "words", "date", or unit name
   * @param {string} [options.years] - Format for years: "words", "date", or unit name
   * @returns {string} Relative time string
   */
  getRelativeTimestamp(timestamp, options = {}) {
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
    const formatDate = (date) => {
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
    const formatUnit = (value, unit) => {
      const unitNames = {
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
    const getFormat = (period) => {
      return options[period];
    };

    // Determine which time period we're in and get the appropriate format
    let currentPeriod;
    let currentValue;

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
      let forcedValue;
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
