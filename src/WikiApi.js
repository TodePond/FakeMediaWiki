/**
 * WikiApi - A comprehensive API client for Wikimedia and MediaWiki REST APIs
 * Designed for UX prototyping with Wikipedia and other MediaWiki sites
 */
export class WikiApi {
  constructor(base = 'https://en.wikipedia.org/') {
    this.base = base;
  }

  get wikimediaBase() {
    return `${this.base}api/rest_v1/`;
  }

  get mediawikiBase() {
    return `${this.base}w/rest.php/v1/`;
  }

  /**
   * Make a request to either Wikimedia or MediaWiki REST API
   * @param {string} path - API path
   * @param {string} api - 'wikimedia' or 'mediawiki'
   * @param {Object} options - Request options (method, body, headers, etc.)
   * @returns {Promise<Object>} JSON response
   */
  async request(path, api, options = {}) {
    if (!api) {
      throw new Error('Please specify either "wikimedia" or "mediawiki" as the API type');
    }
    const base = api === 'wikimedia' ? this.wikimediaBase : this.mediawikiBase;
    const containsQuery = path.includes('?');
    const separator = containsQuery ? '&' : '?';
    
    const url = `${base}${path}${separator}origin=*`;
    const method = options.method || 'GET';
    
    const headers = {
      'Content-Type': 'application/json',
      'Api-User-Agent': 'MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)',
      ...options.headers,
    };

    // Add ETag if provided for conditional requests
    if (options.etag) {
      headers['If-None-Match'] = options.etag;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle 304 Not Modified (cached response)
      if (response.status === 304) {
        return { cached: true };
      }

      return await response.json();
    } catch (error) {
      console.error(`WikiApi request failed: ${error.message}`, { path, api, url });
      throw error;
    }
  }

  /**
   * Encode a page title for URL usage
   * @param {string} slug - Page title
   * @returns {string} URL-encoded title
   */
  encode(slug) {
    return encodeURIComponent(slug.replace(/ /g, '_'));
  }

  // ==================== PAGE CONTENT METHODS ====================

  /**
   * Get a page summary (extract, thumbnail, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page summary
   */
  async getPageSummary(pageName) {
    return this.request(`page/summary/${this.encode(pageName)}`, 'wikimedia');
  }

  /**
   * Get page content as HTML
   * @param {string} pageName - Page title
   * @returns {Promise<string>} HTML content
   */
  async getPageHtml(pageName) {
    const response = await fetch(
      `${this.mediawikiBase}page/${this.encode(pageName)}/html?origin=*`,
      {
        headers: {
          'Api-User-Agent': 'MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)',
        },
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  /**
   * Get page content as wikitext source
   * @param {string} pageName - Page title
   * @returns {Promise<string>} Wikitext source
   */
  async getPageSource(pageName) {
    const response = await fetch(
      `${this.mediawikiBase}page/${this.encode(pageName)}/source?origin=*`,
      {
        headers: {
          'Api-User-Agent': 'MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)',
        },
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  /**
   * Get full page metadata and latest revision
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page metadata
   */
  async getPage(pageName) {
    return this.request(`page/${this.encode(pageName)}`, 'mediawiki');
  }

  // ==================== SEARCH METHODS ====================

  /**
   * Search for pages by title (autocomplete-style)
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 20)
   * @returns {Promise<Object>} Search results
   */
  async searchTitles(query, limit = 20) {
    return this.request(`search/title?q=${encodeURIComponent(query)}&limit=${limit}`, 'mediawiki');
  }

  /**
   * Full-text search across page titles and content
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 20)
   * @returns {Promise<Object>} Search results
   */
  async searchPages(query, limit = 20) {
    return this.request(`search/page?q=${encodeURIComponent(query)}&limit=${limit}`, 'mediawiki');
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
    if (options.limit) params.append('limit', options.limit);
    if (options.older_than) params.append('older_than', options.older_than);
    if (options.newer_than) params.append('newer_than', options.newer_than);
    
    const query = params.toString();
    const path = `page/${this.encode(pageName)}/history${query ? `?${query}` : ''}`;
    return this.request(path, 'mediawiki');
  }

  /**
   * Compare two revisions
   * @param {number} fromRevId - Source revision ID
   * @param {number} toRevId - Target revision ID
   * @returns {Promise<Object>} Diff between revisions
   */
  async compareRevisions(fromRevId, toRevId) {
    return this.request(`revision/${fromRevId}/compare/${toRevId}`, 'mediawiki');
  }

  // ==================== RANDOM & FEATURED CONTENT ====================

  /**
   * Get a random page
   * @param {string} format - Format: 'summary', 'html', or 'title' (default: 'summary')
   * @returns {Promise<Object|string>} Random page content
   */
  async getRandomPage(format = 'summary') {
    if (format === 'title') {
      // For title-only, use MediaWiki API
      const result = await this.request('page/random', 'mediawiki');
      return result.title;
    }
    return this.request(`page/random/${format}`, 'wikimedia');
  }

  /**
   * Get featured article for a specific date
   * @param {Date|string} date - Date object or YYYY/MM/DD string
   * @returns {Promise<Object>} Featured article data
   */
  async getFeaturedArticle(date = new Date()) {
    const dateStr = date instanceof Date 
      ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
      : date;
    return this.request(`feed/featured/${dateStr}`, 'wikimedia');
  }

  /**
   * Get "On This Day" content
   * @param {string} type - Type: 'events', 'births', 'deaths', 'holidays', 'selected'
   * @param {Date|string} date - Date object or MM/DD string
   * @returns {Promise<Object>} On this day content
   */
  async getOnThisDay(type = 'events', date = new Date()) {
    const dateStr = date instanceof Date
      ? `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
      : date;
    return this.request(`feed/onthisday/${type}/${dateStr}`, 'wikimedia');
  }

  /**
   * Get current announcements
   * @returns {Promise<Object>} Announcements
   */
  async getAnnouncements() {
    return this.request('feed/announcements', 'wikimedia');
  }

  // ==================== MEDIA & IMAGES ====================

  /**
   * Get page media (images, audio, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Media files associated with the page
   */
  async getPageMedia(pageName) {
    return this.request(`page/media/${this.encode(pageName)}`, 'wikimedia');
  }

  /**
   * Get thumbnail image for a page
   * @param {string} pageName - Page title
   * @param {number} width - Thumbnail width in pixels (default: 320)
   * @returns {Promise<string|null>} Thumbnail URL or null
   */
  async getPageThumbnail(pageName, width = 320) {
    try {
      const summary = await this.getPageSummary(pageName);
      if (summary.thumbnail) {
        // Wikimedia API provides thumbnails with width parameter
        const thumb = summary.thumbnail;
        return thumb.source || thumb.url || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get thumbnail:', error);
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
  async transformWikitextToHtml(wikitext, pageTitle = 'Main_Page') {
    const response = await fetch(
      `${this.mediawikiBase}transform/wikitext/to/html/${this.encode(pageTitle)}?origin=*`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-User-Agent': 'MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)',
        },
        body: JSON.stringify({ wikitext }),
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  /**
   * Get multiple page summaries at once
   * @param {string[]} pageNames - Array of page titles
   * @returns {Promise<Object[]>} Array of page summaries
   */
  async getMultiplePageSummaries(pageNames) {
    const promises = pageNames.map(name => 
      this.getPageSummary(name).catch(error => ({ 
        title: name, 
        error: error.message 
      }))
    );
    return Promise.all(promises);
  }

  /**
   * Check if a page exists
   * @param {string} pageName - Page title
   * @returns {Promise<boolean>} True if page exists
   */
  async pageExists(pageName) {
    try {
      await this.getPage(pageName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get page categories
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Page categories
   */
  async getPageCategories(pageName) {
    return this.request(`page/metadata/${this.encode(pageName)}`, 'wikimedia');
  }

  /**
   * Get related pages (links, etc.)
   * @param {string} pageName - Page title
   * @returns {Promise<Object>} Related pages data
   */
  async getRelatedPages(pageName) {
    return this.request(`page/links/${this.encode(pageName)}`, 'wikimedia');
  }

  /**
   * Get page mobile-optimized HTML
   * @param {string} pageName - Page title
   * @returns {Promise<string>} Mobile HTML
   */
  async getPageMobileHtml(pageName) {
    return this.request(`page/mobile-sections/${this.encode(pageName)}`, 'wikimedia');
  }

}
