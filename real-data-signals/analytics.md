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

## 3) Most edited pages

This endpoint returns the top content pages by **number of edits** in a given **month** on a project. It answers “what got edited a lot” in aggregate (not the same as pageviews).

### Documentation

- [Edit analytics (includes “Edited pages” family)](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/edits.html)
- [Wikimedia Analytics API overview](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/)

### Endpoint

`https://wikimedia.org/api/rest_v1/metrics/edited-pages/top-by-edits/{project}/{editor-type}/{page-type}/{year}/{month}/{day}`

### Method

`GET`

### Request shape

Path parameters (see live spec for allowed values):

- `project` (example: `en.wikipedia.org`)
- `editor-type` (example: `all-editor-types`)
- `page-type` (example: `content` for article namespace style content)
- `year` (example: `2024`)
- `month` (example: `01`)
- `day` — use `all-days` for the **entire month**

### Example

#### Request

```bash
curl -sS "https://wikimedia.org/api/rest_v1/metrics/edited-pages/top-by-edits/en.wikipedia.org/all-editor-types/content/2024/01/all-days" \
  -H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response (excerpt)

```json
{
	"items": [
		{
			"project": "en.wikipedia",
			"editor-type": "all-editor-types",
			"page-type": "content",
			"granularity": "monthly",
			"results": [
				{
					"timestamp": "2024-01-01T00:00:00.000Z",
					"top": [
						{
							"page_title": "Deaths_in_December_2024",
							"edits": 2252,
							"rank": 1
						}
					]
				}
			]
		}
	]
}
```

### Availability

Publicly available via Wikimedia’s Analytics API. **Edited-pages** metrics **exclude** edits on redirects (per family documentation). Data is **not** real-time; expect **delay** between live editing and published aggregates (often on the order of days—see official notes for this endpoint family).

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 4) Article edit counts

This endpoint returns a **daily** time series of **edit counts** for a **single page title** on a project. **Includes** edits on redirects (per “edits” family documentation—contrast with edited-pages family above).

### Documentation

- [Edit analytics — edits to a page](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/edits.html)

### Endpoint

`https://wikimedia.org/api/rest_v1/metrics/edits/per-page/{project}/{page_title}/{editor-type}/daily/{start}/{end}`

### Method

`GET`

### Request shape

Path parameters:

- `project` (example: `en.wikipedia` — format per [REST spec](https://wikimedia.org/api/rest_v1/?doc) for the Wikimedia `metrics` module; this example matches live responses)
- `page_title` (example: `Earth` — must be URL-escaped, e.g. `Barack%2B_Obama` when needed)
- `editor-type` (example: `all-editor-types`)
- `start` / `end` — per spec, often as `YYYYMMDD00` to `YYYYMMDD00` for daily (example: `2024040100` to `2024041000`)

### Example

#### Request

```bash
curl -sS "https://wikimedia.org/api/rest_v1/metrics/edits/per-page/en.wikipedia/Earth/all-editor-types/daily/2024040100/2024041000" \
  -H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response (illustrative)

```json
{
	"items": [
		{
			"project": "en.wikipedia",
			"editor-type": "all-editor-types",
			"page-title": "Earth",
			"granularity": "daily",
			"results": [
				{
					"timestamp": "2024-04-01T00:00:00.000Z",
					"edits": 3
				}
			]
		}
	]
}
```

### Availability

Publicly available via Wikimedia’s Analytics API. Use for **prototyping** “edit activity on this title over a window,” not for low-latency “live” counters.

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 5) Global edit counts

This endpoint returns **daily edit counts** for a **whole project** (e.g. all content-namespace edits for English Wikipedia) over a time range. Useful for dashboards or **normalization** (e.g. per-article signal vs wiki-wide busyness), not for ranking individual articles by themselves.

### Documentation

- [Edit analytics — number of edits](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/edits.html)
- [Project metrics examples](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/examples/project-metrics.html)

### Endpoint

`https://wikimedia.org/api/rest_v1/metrics/edits/aggregate/{project}/{editor-type}/{page-type}/daily/{start}/{end}`

### Method

`GET`

### Request shape

Path parameters:

- `project` (example: `en.wikipedia.org`)
- `editor-type` (example: `all-editor-types`)
- `page-type` (example: `content`)
- `start` / `end` (example: `2024040100` to `2024041000`)

### Example

#### Request

```bash
curl -sS "https://wikimedia.org/api/rest_v1/metrics/edits/aggregate/en.wikipedia.org/all-editor-types/content/daily/2024040100/2024041000" \
  -H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response (excerpt)

```json
{
	"items": [
		{
			"project": "en.wikipedia",
			"editor-type": "all-editor-types",
			"page-type": "content",
			"granularity": "daily",
			"results": [
				{
					"timestamp": "2024-04-01T00:00:00.000Z",
					"edits": 128772
				}
			]
		}
	]
}
```

### Availability

Publicly available. Same **latency** caveats as other AQS metrics; check stability labels in the [REST API documentation](https://wikimedia.org/api/rest_v1/?doc) for the specific path.

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)
