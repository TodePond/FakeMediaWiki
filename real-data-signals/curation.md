# List of endpoints for community-curated and daily “Explore”-style data

## 1) Daily featured feed (aggregated)

This endpoint returns one JSON object for a calendar day, aggregating the same “curated of the day” data used in the official apps’ Explore feed (for example: today’s featured article, picture of the day, previous day’s most read, in the news, DYK, and a short on-this-day list when available); for a given date and project, the payload can also surface keys such as **`tfa`**, **`image`**, **`mostread`**, **`dyk`** (Did you know), embedded **`onthisday`**, and **`news`**, but the exact set depends on the wiki, language, and what the service can assemble—see the [Wikifeeds](https://www.mediawiki.org/wiki/Wikifeeds) page for documented core fields and support notes. For the full on-this-day data instead of the short list embedded in `feed/featured`, use **`feed/onthisday/…`** (for example **`all`** for every bucket, or **`selected`** for the curated short list).

### Documentation

- [Wikifeeds: feed/featured](https://www.mediawiki.org/wiki/Wikifeeds#%E2%80%A6%2Ffeed%2Ffeatured%2F%7Byyyy%7D%2F%7Bmm%7D%2F%7Bdd%7D)
- [Wikifeeds API](https://www.mediawiki.org/wiki/Wikifeeds_API) (see **Quick start** for an alternate **host** that serves the same featured payload by language: `https://api.wikimedia.org/feed/v1/wikipedia/{lang}/featured/…`).

### Endpoint

`https://en.wikipedia.org/api/rest_v1/feed/featured/{yyyy}/{mm}/{dd}`

(Same data path, different **service URL**: `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/{yyyy}/{mm}/{dd}`.)

### Method

`GET`

### Request shape

Path parameters:

- `yyyy` (four digits, earliest year supported: **2016**)
- `mm` (month, two digits, zero-padded)
- `dd` (day, two digits, zero-padded)

Optionally use another project host instead of `en.wikipedia.org` (for example `de.wikipedia.org`) if that wiki exposes the route.

### Example

#### Request

```bash
curl -sS "https://en.wikipedia.org/api/rest_v1/feed/featured/2026/04/24" \
  -H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response

```json
{
	"tfa": {
		"type": "standard",
		"title": "Ornithoprion",
		"pageid": 48807661,
		"extract": "Ornithoprion is an extinct genus of cartilaginous fish. The only known species, O. hertwigi, lived during the Moscovian stage of the Pennsylvanian subperiod, which spanned from 315 to 307 million year"
	},
	"mostread": {
		"date": "2026-04-23Z",
		"articles": [
			{
				"title": "Nahui_Ollin",
				"views": 1171179,
				"rank": 2
			},
			{
				"title": "2026_Tamil_Nadu_Legislative_Assembly_election",
				"views": 355438,
				"rank": 4
			}
		]
	},
	"image": {
		"title": "File:Rapanui Rock during sunset, Sumner, Christchurch, New Zealand.jpg",
		"file_page": "https://commons.wikimedia.org/wiki/File:Rapanui_Rock_during_sunset,_Sumner,_Christchurch,_New_Zealand.jpg"
	},
	"dyk": [
		{
			"text": "... that a 4th-century set of Roman glassware was highly valued by Silla royalty in Korea, and is considered a National Treasure?"
		},
		{
			"text": "... that the Tabaru River hosts the westernmost mangroves in Japan?"
		}
	],
	"onthisday": [
		{
			"text": "A building in the Savar Upazila of Dhaka, Bangladesh, collapsed, killing 1,134 people, making it the deadliest accidental structural failure in modern history.",
			"pages": [
				{
					"type": "standard",
					"title": "Savar_Upazila",
					"pageid": 9495766
				},
				{
					"type": "standard",
					"title": "Greater_Dhaka",
					"pageid": 24027047
				}
			]
		}
	]
}
```

### Availability

Publicly available on wikis that surface Wikifeeds over the [MediaWiki REST API](https://www.mediawiki.org/wiki/Wikifeeds_API). Treated as **unstable** in some upstream documentation; not every key is present for every language or every day. Some keys (for example `news`, `dyk`, or embedded `onthisday`) may be missing depending on the project.

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 2) On this day (by type, including all buckets)

This endpoint returns events tied to a month and day (anniversaries, births, deaths, holidays, and related article metadata). The path segment **`all`** returns every bucket in one response (keys such as `selected`, `events`, `births`, `deaths`, `holidays`). Other `type` values return a single key matching that name (for example `…/onthisday/events/04/24` has top-level `events` only). The **`selected`** type highlights a smaller, editorially chosen set of anniversaries when the wiki provides them.

### Documentation

- [Wikifeeds: feed/onthisday](https://www.mediawiki.org/wiki/Wikifeeds#%E2%80%A6%2Ffeed%2Fonthisday%2F%7Btype%7D%2F%7Bmm%7D%2F%7Bdd%7D)

### Endpoint

`https://en.wikipedia.org/api/rest_v1/feed/onthisday/{type}/{mm}/{dd}`

### Method

`GET`

### Request shape

Path parameters:

- `type`: `all` | `selected` | `events` | `births` | `deaths` | `holidays`
- `mm` (month, two digits, zero-padded)
- `dd` (day, two digits, zero-padded)

### Example

#### Request

```bash
curl -sS "https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/04/24" \
  -H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response

```json
{
	"selected": [
		{
			"text": "A building in the Savar Upazila of Dhaka, Bangladesh, collapsed, killing 1,134 people, making it the deadliest accidental structural failure in modern history.",
			"year": 2013,
			"pages": [
				{
					"type": "standard",
					"title": "Savar_Upazila",
					"pageid": 9495766
				},
				{
					"type": "standard",
					"title": "Greater_Dhaka",
					"pageid": 24027047
				}
			]
		}
	],
	"events": [
		{
			"text": "A mass stabbing at a school in Nantes, France, leaves one person dead and three others wounded.",
			"pages": [
				{
					"type": "standard",
					"title": "2025_Nantes_school_stabbing",
					"pageid": 79801582
				}
			]
		}
	],
	"births": [
		{
			"text": "Olivia Gadecki, Australian tennis player",
			"year": 2002,
			"pages": [
				{
					"type": "standard",
					"title": "Olivia_Gadecki",
					"pageid": 66556420
				}
			]
		}
	],
	"holidays": [
		{
			"text": "Armenian Genocide Remembrance Day (Armenia, California, France)",
			"pages": [
				{
					"type": "standard",
					"title": "Armenian_Genocide_Remembrance_Day",
					"pageid": 4575104
				}
			]
		}
	],
	"deaths": [
		{
			"text": "Roy Phillips, British musician (born 1941)",
			"year": 2025,
			"pages": [
				{
					"type": "standard",
					"title": "Roy_Phillips",
					"pageid": 11256854
				}
			]
		}
	]
}
```

(Trimmed: each page object in the **live** response includes more fields. Most items in each **array** are omitted; a single entry is shown per bucket when one exists for that day.)

### Availability

Publicly available on wikis that surface Wikifeeds. Coverage of languages and the richness of each bucket vary; the **`all`** request may be large. Not all types return data for all dates.

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)
