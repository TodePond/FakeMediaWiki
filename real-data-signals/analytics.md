# Analytics signals for use in MediaWiki prototypes

## 1) Article views

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

### Example

#### Request

```bash
curl -sS "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/Jupiter/daily/20260415/20260420" \
  -H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response

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
		},
		{
			"project": "en.wikipedia",
			"article": "Jupiter",
			"granularity": "daily",
			"timestamp": "2026041600",
			"access": "all-access",
			"agent": "all-agents",
			"views": 7377
		},
		{
			"project": "en.wikipedia",
			"article": "Jupiter",
			"granularity": "daily",
			"timestamp": "2026041700",
			"access": "all-access",
			"agent": "all-agents",
			"views": 6939
		},
		{
			"project": "en.wikipedia",
			"article": "Jupiter",
			"granularity": "daily",
			"timestamp": "2026041800",
			"access": "all-access",
			"agent": "all-agents",
			"views": 7268
		},
		{
			"project": "en.wikipedia",
			"article": "Jupiter",
			"granularity": "daily",
			"timestamp": "2026041900",
			"access": "all-access",
			"agent": "all-agents",
			"views": 7304
		},
		{
			"project": "en.wikipedia",
			"article": "Jupiter",
			"granularity": "daily",
			"timestamp": "2026042000",
			"access": "all-access",
			"agent": "all-agents",
			"views": 7719
		}
	]
}
```

### Availability

Publicly available via Wikimedia's Analytics API in production.

Broad Wikimedia project coverage through AQS project identifiers (for example `en.wikipedia.org`).

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 2) Most viewed articles

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

### Example

#### Request

```bash
curl -sS "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/2026/04/15" \
  -H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response

```json
{
	"items": [
		{
			"project": "en.wikipedia",
			"access": "all-access",
			"year": "2026",
			"month": "04",
			"day": "15",
			"articles": [
				{
					"article": "Main_Page",
					"views": 7048872,
					"rank": 1
				},
				{
					"article": "Special:Search",
					"views": 1237127,
					"rank": 2
				},
				{
					"article": "Wikipedia:Featured_pictures",
					"views": 336973,
					"rank": 3
				},
				{
					"article": "Eric_Swalwell",
					"views": 214002,
					"rank": 4
				},
				{
					"article": "Dhurandhar:_The_Revenge",
					"views": 179368,
					"rank": 5
				},
				{
					"article": ".xxx",
					"views": 167150,
					"rank": 6
				},
				{
					"article": "List_of_highest-grossing_Indian_films",
					"views": 165718,
					"rank": 7
				},
				{
					"article": "Samrat_Choudhary",
					"views": 146967,
					"rank": 8
				}
			],
			"_note": "…truncated: full API `articles` array is much longer (see AQS for full daily list)."
		}
	]
}
```

_Full per-day `articles` list is long; the capture includes every ranked article. Snippet above shows the envelope and the first 8 `articles` only._

### Availability

Publicly available via Wikimedia's Analytics API in production.

Broad Wikimedia project coverage through AQS project identifiers.

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---
