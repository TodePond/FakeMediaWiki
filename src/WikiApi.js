export class WikiApi {
  constructor(base = 'https://en.wikipedia.org/') {
    this.base = base;
  }

  get wikimediaBase() {
    return `${this.base}api/rest_v1/`;
  }

  get mediawikiBase() {
    return `${this.base}w/rest.php/`;
  }

  async request(path, api) {
    if (!api) {
      throw new Error('Please specify either "wikimedia" or "mediawiki" as the API type');
    }
    const base = api === 'wikimedia' ? this.wikimediaBase : this.mediawikiBase;
    const containsQuery = path.includes('?');
    const response = await fetch(`${base}${path}${containsQuery ? '&' : '?'}origin=*`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Api-User-Agent': 'MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)',
      },
    });
    return response.json();
  }

  encode(slug) {
    return encodeURIComponent(slug);
  }

  async getPageSummary(pageName) {
    return this.request(`page/summary/${this.encode(pageName)}`, 'wikimedia');
  }

  async getPageHistory(pageName) {
    return this.request(`v1/page/${this.encode(pageName)}/history`, 'mediawiki');
  }
}
