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
   * Make a request to either Wikimedia or MediaWiki REST API
   * @param {string} path - API path
   * @param {object} options - Request options
   * @param {"wikimedia" | "mediawiki"} options.api - 'wikimedia' or 'mediawiki'
   * @param {object|null} [options.body=null] - Request body
   * @param {"json" | "text"} [options.type='json'] - Response type
   * @returns {Promise<Object|string>} JSON or text response
   */
  async request(path, { api, body = null, type = "json" }) {
    if (api !== "wikimedia" && api !== "mediawiki") {
      throw new Error('Please specify either "wikimedia" or "mediawiki" as the API type');
    }

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
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return type === "json" ? await response.json() : await response.text();
    } catch (error) {
      console.error(
        `WikiApi request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { path, api, url },
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

  // ==================== PAGE CONTENT METHODS ====================

  /**
   * Get a page summary (extract, thumbnail, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page summary
   */
  async getPageSummary(pageName) {
    return this.request(`page/summary/${this.encode(pageName)}`, {
      api: "wikimedia",
    });
  }

  /**
   * Get page content as HTML
   * @param {string} pageName - Page title
   * @returns {Promise<string>} HTML content
   */
  async getPageHtml(pageName) {
    return await this.request(`page/${this.encode(pageName)}/html`, {
      api: "mediawiki",
      type: "text",
    });
  }

  /**
   * Get page content as wikitext source
   * @param {string} pageName - Page title
   * @returns {Promise<string>} Wikitext source
   */
  async getPageSource(pageName) {
    return this.request(`page/${this.encode(pageName)}/source`, {
      api: "mediawiki",
      type: "text",
    });
  }

  /**
   * Get full page metadata and latest revision
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page metadata
   */
  async getPage(pageName) {
    return this.request(`page/${this.encode(pageName)}`, { api: "mediawiki" });
  }

  // ==================== SEARCH METHODS ====================

  /**
   * Search for pages by title (autocomplete-style)
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 20)
   * @returns {Promise<Object>} Search results
   */
  async searchTitles(query, limit = 20) {
    return this.request(`search/title?q=${encodeURIComponent(query)}&limit=${limit}`, {
      api: "mediawiki",
    });
  }

  /**
   * Full-text search across page titles and content
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 20)
   * @returns {Promise<Object>} Search results
   */
  async searchPages(query, limit = 20) {
    return this.request(`search/page?q=${encodeURIComponent(query)}&limit=${limit}`, {
      api: "mediawiki",
    });
  }

  // ==================== PAGE HISTORY METHODS ====================

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
    return this.request(path, { api: "mediawiki" });
  }

  /**
   * Compare two revisions
   * @param {number} fromRevId - Source revision ID
   * @param {number} toRevId - Target revision ID
   * @returns {Promise<Object>} Diff between revisions
   */
  async compareRevisions(fromRevId, toRevId) {
    return this.request(`revision/${fromRevId}/compare/${toRevId}`, {
      api: "mediawiki",
    });
  }

  // ==================== RANDOM & FEATURED CONTENT ====================

  /**
   * Get a random page
   * @param {string} format - Format: 'summary', 'html', or 'title' (default: 'summary')
   * @returns {Promise<Object|string>} Random page content
   */
  async getRandomPage(format = "summary") {
    if (format === "title") {
      // For title-only, use MediaWiki API
      const result = await this.request("page/random", { api: "mediawiki" });
      return result.title;
    }
    return this.request(`page/random/${format}`, { api: "wikimedia" });
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
    return this.request(`feed/featured/${dateStr}`, { api: "wikimedia" });
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
    return this.request(`feed/onthisday/${type}/${dateStr}`, {
      api: "wikimedia",
    });
  }

  /**
   * Get current announcements
   * @returns {Promise<Object>} Announcements
   */
  async getAnnouncements() {
    return this.request("feed/announcements", { api: "wikimedia" });
  }

  // ==================== MEDIA & IMAGES ====================

  /**
   * Get page media (images, audio, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Media files associated with the page
   */
  async getPageMedia(pageName) {
    return this.request(`page/media/${this.encode(pageName)}`, {
      api: "wikimedia",
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

  // ==================== UTILITY METHODS ====================

  /**
   * Transform wikitext to HTML
   * @param {string} wikitext - Wikitext content
   * @param {string} pageTitle - Page title for context (optional)
   * @returns {Promise<string>} HTML content
   */
  async transformWikitextToHtml(wikitext, pageTitle = "Main_Page") {
    return this.request(`transform/wikitext/to/html/${this.encode(pageTitle)}`, {
      api: "mediawiki",
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
    return this.request(`page/metadata/${this.encode(pageName)}`, {
      api: "wikimedia",
    });
  }

  /**
   * Get related pages (links, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Related pages data
   */
  async getRelatedPages(pageName) {
    return this.request(`page/links/${this.encode(pageName)}`, {
      api: "wikimedia",
    });
  }

  /**
   * Get page mobile-optimized HTML
   * @param {string} pageName - Page title
   * @returns {Promise<string>} Mobile HTML
   */
  async getPageMobileHtml(pageName) {
    return this.request(`page/mobile-sections/${this.encode(pageName)}`, {
      api: "wikimedia",
    });
  }
}
