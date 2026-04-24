# List of analytics signals for use in MediaWiki prototypes

## 1) AQS pageviews `per-article`

This endpoint returns a time series of page view counts for a specific article.

### Documentation

- [Wikimedia Analytics API: page view analytics reference](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html)
- [Wikimedia Analytics API: page metrics examples](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/examples/page-metrics.html)

### Endpoint

`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/{project}/{access}/{agent}/{article}/{granularity}/{start}/{end}`

### Method

`GET`

### Request shape

Path parameters:

- `project` (example: `en.wikipedia.org`)
- `access` (example: `all-access`)
- `agent` (example: `all-agents`)
- `article` (example: `Jupiter`)
- `granularity` (`daily` or `monthly`)
- `start` (example: `20260415`)
- `end` (example: `20260421`)

### Example request

```bash
curl "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/Jupiter/daily/20260415/20260421" \
  -H "Accept: application/json" \
  -H "User-Agent: your-tool-name (contact)"
```

### Response shape

```json
{
	"items": [
		{
			"project": "en.wikipedia",
			"article": "Jupiter",
			"granularity": "daily",
			"timestamp": "2026041500",
			"access": "all-access",
			"agent": "all-agents",
			"views": 7289
		}
	]
}
```

### Availability

Publicly available via Wikimedia's Analytics API in production.

Broad Wikimedia project coverage through AQS project identifiers (for example `en.wikipedia.org`).

### Rate limits

**Global policy limits (no endpoint page numeric limit in fetched source set)**:

- [Wikimedia APIs: Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 2) AQS pageviews `top`

This endpoint returns ranked most-viewed pages for a project on a specific day.

### Documentation

- [Wikimedia Analytics API: page view analytics reference](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html)

### Endpoint

`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/{project}/{access}/{year}/{month}/{day}`

### Method

`GET`

### Request shape

Path parameters:

- `project` (example: `en.wikipedia.org`)
- `access` (example: `all-access`)
- `year` (example: `2026`)
- `month` (example: `04`)
- `day` (example: `20`)

### Example request

```bash
curl "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/2026/04/20" \
  -H "Accept: application/json" \
  -H "User-Agent: your-tool-name (contact)"
```

### Response shape

```json
{
	"items": [
		{
			"project": "en.wikipedia",
			"access": "all-access",
			"year": "2026",
			"month": "04",
			"day": "20",
			"articles": [
				{ "article": "Main_Page", "views": 6925830, "rank": 1 },
				{ "article": "Special:Search", "views": 1107488, "rank": 2 }
			]
		}
	]
}
```

### Availability

Publicly available via Wikimedia's Analytics API in production.

Broad Wikimedia project coverage through AQS project identifiers.

### Rate limits

**Global policy limits (no endpoint page numeric limit in fetched source set)**:

- [Wikimedia APIs: Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 3) Action API `query&list=backlinks`

This endpoint finds pages that link to a specified page title or page id.

### Documentation

- [MediaWiki Action API: Backlinks](https://www.mediawiki.org/wiki/API:Backlinks)

### Endpoint

`https://en.wikipedia.org/w/api.php?action=query&format=json&list=backlinks&bltitle=Jupiter&bllimit=5`

### Method

`GET`

### Request shape

Query parameters:

- `action=query`
- `list=backlinks`
- `bltitle` or `blpageid` (one required)
- `bllimit` (optional)
- `blcontinue` (optional continuation token)
- `format=json`

### Example request

```bash
curl "https://en.wikipedia.org/w/api.php?action=query&format=json&list=backlinks&bltitle=Jupiter&bllimit=5" \
  -H "User-Agent: your-tool-name (contact)"
```

### Response shape

```json
{
	"batchcomplete": "",
	"continue": {
		"blcontinue": "0|1365",
		"continue": "-||"
	},
	"query": {
		"backlinks": [
			{ "pageid": 639, "ns": 0, "title": "Alkane" },
			{ "pageid": 666, "ns": 0, "title": "Alkali metal" }
		]
	}
}
```

### Availability

Publicly available on each wiki's `api.php`; this is a core production MediaWiki Action API module.

Available on Wikimedia wikis via each wiki's `api.php`.

### Rate limits

**Global policy limits (no endpoint page numeric limit)**:

- [Wikimedia APIs: Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 4) Action API `query&prop=langlinks`

This endpoint returns interlanguage links from a page to versions of the page in other languages.

### Documentation

- [MediaWiki Action API: Langlinks](https://www.mediawiki.org/wiki/API:Langlinks)

### Endpoint

`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=langlinks&titles=Jupiter&lllimit=5&llprop=url|langname|autonym`

### Method

`GET`

### Request shape

Query parameters:

- `action=query`
- `prop=langlinks`
- `titles` (required)
- `lllimit` (optional)
- `llprop` (optional, examples: `url|langname|autonym`)
- `llcontinue` (optional continuation token)
- `format=json`

### Example request

```bash
curl "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=langlinks&titles=Jupiter&lllimit=5&llprop=url|langname|autonym" \
  -H "User-Agent: your-tool-name (contact)"
```

### Response shape

```json
{
	"continue": {
		"llcontinue": "38930|ann",
		"continue": "||"
	},
	"query": {
		"pages": {
			"38930": {
				"pageid": 38930,
				"ns": 0,
				"title": "Jupiter",
				"langlinks": [
					{
						"lang": "af",
						"url": "https://af.wikipedia.org/wiki/Jupiter",
						"langname": "Afrikaans",
						"autonym": "Afrikaans",
						"*": "Jupiter"
					}
				]
			}
		}
	}
}
```

### Availability

Publicly available on each wiki's `api.php`; this is a core production MediaWiki Action API module.

Available on Wikimedia wikis with interlanguage link data.

### Rate limits

**Global policy limits (no endpoint page numeric limit)**:

- [Wikimedia APIs: Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)
