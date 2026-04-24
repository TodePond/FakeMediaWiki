# List of ML and analytics signals for use in MediaWiki prototypes

## 1) Lift Wing `revertrisk-language-agnostic`

This endpoint predicts whether a revision is likely to be reverted, using a model that is designed to work across languages.
It is useful when you want one revert-risk score format regardless of the wiki language.

### Documentation

- [Language-agnostic revert risk endpoint reference](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_reverted_risk_language_agnostic_prediction)
- [Language-agnostic revert risk model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Language-agnostic_revert_risk)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-language-agnostic:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 123456,
	"lang": "en"
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-language-agnostic:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id": 123456, "lang": "en"}'
```

### Response shape

```json
{
	"output": {
		"prediction": true,
		"probabilities": {
			"true": 0.77,
			"false": 0.23
		}
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

### Rate limits

**Explicit numeric (Lift Wing external usage)**: [LiftWing external usage rate limits](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 2) Lift Wing `revertrisk-multilingual`

This endpoint predicts whether a revision is likely to be reverted for supported languages.
It returns one revert-risk result for the revision you pass in.

### Documentation

- [Multilingual revert risk endpoint reference](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_reverted_risk_multilingual_prediction)
- [Multilingual revert risk model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Multilingual_revert_risk)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-multilingual:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 123456,
	"lang": "en"
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-multilingual:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id": 123456, "lang": "en"}'
```

### Response shape

```json
{
	"prediction": false,
	"probability": {
		"true": 0.31,
		"false": 0.69
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

Supported language codes (API reference): `ka`, `lv`, `ta`, `ur`, `eo`, `lt`, `sl`, `hy`, `hr`, `sk`, `eu`, `et`, `ms`, `az`, `da`, `bg`, `sr`, `ro`, `el`, `th`, `bn`, `no`, `hi`, `ca`, `hu`, `ko`, `fi`, `vi`, `uz`, `sv`, `cs`, `he`, `id`, `tr`, `uk`, `nl`, `pl`, `ar`, `fa`, `it`, `zh`, `ru`, `es`, `ja`, `de`, `fr`, `en`.

### Rate limits

**Explicit numeric (Lift Wing external usage)**: [LiftWing external usage rate limits](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 3) Lift Wing `reference-need:predict`

This endpoint predicts whether the content in a revision needs additional references.
It returns a score you can use to flag edits that may need citation follow-up.

### Documentation

- [Reference need endpoint reference](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_reference_need_prediction)
- [Multilingual reference need model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Multilingual_reference_need)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/reference-need:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 123456,
	"lang": "en"
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/reference-need:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id": 123456, "lang": "en"}'
```

### Response shape

```json
{
	"rn_score": 0.42
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

### Rate limits

**Explicit numeric (Lift Wing external usage)**: [LiftWing external usage rate limits](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 4) Lift Wing `edit-check:predict` (tone usage)

This endpoint runs Edit Check models on text you provide.
For tone checks, you send before-and-after text and the endpoint returns whether the new wording is likely to violate tone guidance.

### Documentation

- [Tone Check model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Tone_Check)
- [Edit check / Tone Check overview](https://www.mediawiki.org/wiki/Edit_check/Tone_Check)

Inline explanation from project notes: this endpoint is called with batched `instances` payloads, and tone suggestions are typically filtered by `prediction == true` and a probability threshold.

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict`

### Method

`POST`

### Request shape

```json
{
	"instances": [
		{
			"lang": "en",
			"check_type": "tone",
			"page_title": "Earth",
			"original_text": "old text",
			"modified_text": "new text"
		}
	]
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"instances":[{"lang":"en","check_type":"tone","page_title":"Earth","original_text":"old text","modified_text":"new text"}]}'
```

### Response shape

```json
{
	"predictions": [
		{
			"prediction": true,
			"probability": 0.81,
			"check_type": "tone",
			"language": "en",
			"page_title": "Earth"
		}
	]
}
```

### Availability

**Active:** Check types may change over time.

Publicly available on `api.wikimedia.org`; this is the production inference surface used by Edit Check.

Single global endpoint. Availability is determined by supported `check_type` values (for example `tone`). The docs do not publish a single exhaustive language list for all check types.

### Rate limits

**Explicit numeric (Lift Wing external usage)**: [LiftWing external usage rate limits](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 5) Action API `recentchanges`

This endpoint lists the most recent edits on a wiki, similar to the RecentChanges page, and it can include predictions from ORES when you request `oresscores`.
It returns normal edit metadata (revision IDs, timestamps, users, comments, tags) plus model prediction fields from ORES where available.

### Documentation

- [API:Recentchanges](https://www.mediawiki.org/wiki/API:Recentchanges)
- [Action API main page](https://www.mediawiki.org/wiki/API:Main_page)

### Endpoint

`https://en.wikipedia.org/w/api.php?action=query&list=recentchanges`

### Method

`GET`

### Request shape

Common parameters for signal retrieval:

- `rcprop=title|timestamp|ids|user|comment|sizes|oresscores|tags`
- `rclimit=...`
- `rctype=edit|new`
- `rctoponly=1`
- optional `rcshow=oresreview`
- optional pagination/time filters (`rccontinue`, `rcstart`, `rcend`)

### Example request

```bash
curl "https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcprop=title|timestamp|ids|user|comment|sizes|oresscores|tags&rclimit=50&rctype=edit|new&rctoponly=1&format=json"
```

### Response shape

```json
{
	"query": {
		"recentchanges": [
			{
				"revid": 123456789,
				"title": "Earth",
				"user": "ExampleUser",
				"timestamp": "2026-04-23T10:00:00Z",
				"comment": "copyedit",
				"oldlen": 1000,
				"newlen": 1025,
				"oresscores": {},
				"tags": ["mw-reverted"]
			}
		]
	},
	"continue": {
		"rccontinue": "..."
	}
}
```

### Availability

Publicly available on each wiki's `api.php`; this is a core production MediaWiki Action API module.

Available on Wikimedia wikis through each wiki's `api.php` endpoint.

### Rate limits

**Inherited/global policy** (no endpoint-specific req/s or req/hr published on this module page):

- [Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 6) Action API `feedrecentchanges` (Atom/RSS)

This endpoint returns recent changes as a feed (Atom or RSS) instead of JSON.
It is useful when you want chronological change events in feed format for polling or downstream processing.

### Documentation

- [API:Feedrecentchanges](https://www.mediawiki.org/wiki/API:Feedrecentchanges)

### Endpoint

`https://en.wikipedia.org/w/api.php?action=feedrecentchanges`

### Method

`GET`

### Request shape

Parameters used in related-change retrieval patterns:

- `feedformat=atom`
- `target={PageTitle}`
- `limit={1..50}`
- `days={>=1}`
- optional `showlinkedto=1`
- optional `from={timestamp}`

### Example request

```bash
curl "https://en.wikipedia.org/w/api.php?action=feedrecentchanges&feedformat=atom&target=Earth&limit=50&days=7"
```

### Response shape

```xml
<entry>
  <title>Mars</title>
  <link href="https://en.wikipedia.org/w/index.php?title=Mars&diff=123456&oldid=123455" />
  <updated>2026-04-23T10:00:00Z</updated>
  <author><name>ExampleUser</name></author>
  <summary>edit summary...</summary>
</entry>
```

### Availability

**Active:** Feed output is a stable Atom/RSS interface.

Publicly available on each wiki's `api.php`; this is a core production MediaWiki Action API module.

Available on Wikimedia wikis that expose the feed module via `api.php`.

### Rate limits

**Inherited/global policy**:

- [Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 7) Action API `search` with `srsearch=morelike:...`

This endpoint performs full-text search, and it can also run "more like this" retrieval using `srsearch=morelike:...`.
It returns candidate pages that are textually similar to your seed pages.

### Documentation

- [API:Search](https://www.mediawiki.org/wiki/API:Search)

### Endpoint

`https://en.wikipedia.org/w/api.php?action=query&list=search`

### Method

`GET`

### Request shape

- `srsearch=morelike:Earth|Mars`
- `srwhat=text`
- `srlimit=10`
- `sroffset=0`
- optional `srnamespace=0`

### Example request

```bash
curl "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=morelike:Earth|Mars&srwhat=text&srlimit=10&sroffset=0&format=json"
```

### Response shape

```json
{
	"query": {
		"searchinfo": {
			"totalhits": 250
		},
		"search": [
			{
				"pageid": 123,
				"ns": 0,
				"title": "Planet",
				"size": 5555,
				"wordcount": 850,
				"snippet": "A <span class=\"searchmatch\">planet</span> is ...",
				"timestamp": "2026-04-20T12:00:00Z"
			}
		]
	},
	"continue": {
		"sroffset": 10
	}
}
```

### Availability

**Active:** Operator behavior depends on the wiki's search backend.

Publicly available on each wiki's `api.php`; this is a core production MediaWiki Action API module.

Available where the search backend supports the `morelike:` operator (commonly CirrusSearch-backed wikis).

### Rate limits

**Inherited/global policy**:

- [Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 8) Link Recommendation API

This endpoint suggests links that could be added to an article.
It returns candidate link text, target pages, and context so you can propose concrete linking edits.

### Documentation

- [Link Recommendation API (MediaWiki)](https://www.mediawiki.org/wiki/Link_Recommendation_API)
- [Add-a-link model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/add-a-link_model)

### Endpoint

`https://api.wikimedia.org/service/linkrecommendation/v1/linkrecommendations/{project}/{lang}/{title}`

### Method

`GET` (read recommendations)

### Request shape

- Path parameters:
    - `{project}` (example: `wikipedia`)
    - `{lang}` (example: `en`)
    - `{title}` (page title)

### Example request

```bash
curl "https://api.wikimedia.org/service/linkrecommendation/v1/linkrecommendations/wikipedia/en/Earth"
```

### Response shape

```json
{
	"links": [
		{
			"link_text": "planet",
			"link_target": "Planet",
			"score": 0.92,
			"context_before": "Earth is a ",
			"context_after": " in the Solar System.",
			"match_index": 1
		}
	]
}
```

### Availability

**Active:** No deprecation warning is shown in the referenced docs.

Publicly available via Wikimedia production API traffic.

Path is explicit by project and language (`{project}/{lang}/{title}`); availability is only where that project-language pair has a deployed recommendation model.

### Rate limits

**Inherited/global policy** (explicitly stated on API page as global Wikimedia API limits):

- [Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

---

## 9) Edit-types API

This endpoint analyzes a revision diff and labels the kinds of changes made.
Depending on the route, it returns summary counts, detailed structured changes, or debug output.

### Documentation

- [edit-types Swagger docs](https://edit-types.wmcloud.org/docs)
- [edit-types project repository](https://github.com/geohci/edit-types)

### Endpoint

- `https://edit-types.wmcloud.org/diff-summary`
- `https://edit-types.wmcloud.org/diff-details`
- `https://edit-types.wmcloud.org/diff-debug`

### Method

`GET`

### Request shape

Query params:

- `lang`
- `revid`
- optional `content_type`

### Example requests

```bash
curl "https://edit-types.wmcloud.org/diff-summary?lang=en&revid=123456"
curl "https://edit-types.wmcloud.org/diff-details?lang=en&revid=123456"
```

### Response shape

```json
{
	"Template": {
		"change": 1
	},
	"Wikilink": {
		"insert": 2
	}
}
```

### Availability

**Experimental:** Experimental/community service. Behavior and availability may change.

Publicly available Toolforge/WMCS-hosted service (not a core Wikimedia production API surface).

Cross-wiki in input shape (`lang` + `revid`), with real availability determined by whether the service can fetch and analyze that revision for the requested language wiki.

### Rate limits

**Not explicitly published** in fetched docs.

---

## 10) List-building API (`serpentine`)

This endpoint returns a ranked list of candidate pages from a multi-source list-building service.
It combines several retrieval channels and returns unified results for exploration workflows.

### Documentation

No official public documentation URL was found in fetched sources; endpoint is observed directly in production usage.

### Endpoint

`https://list-building.toolforge.org/api/serpentine`

### Method

`GET`

### Request shape

Query params used:

- `lang`
- `k-reader`
- `k-links`
- `k-morelike`
- optional `page_title`
- optional `qid`

### Example request

```bash
curl "https://list-building.toolforge.org/api/serpentine?lang=en&k-reader=10&k-links=10&k-morelike=10&page_title=Earth"
```

### Response shape

```json
{
	"qid": "Q2",
	"results": [
		{
			"page_title": "Planet",
			"qid": "Q634",
			"source": "morelike",
			"redlink": false,
			"description": "Astronomical body"
		}
	]
}
```

### Availability

**Experimental:** Experimental/community service.

Publicly available Toolforge-hosted service (not a core Wikimedia production API surface).

Cross-wiki in input shape (`lang` + optional `page_title`/`qid`), with availability limited to languages/entities present in the service backends.

### Rate limits

**Not explicitly published** in fetched sources.

---

## 11) Raw on-wiki edit-check config JSON endpoints

This endpoint returns the live JSON rules that Edit Check reads directly from wiki pages.
Those rules include phrase matching and replacement lists, so the response shows the exact configuration currently in production.

### Documentation

- [Main edit-check config raw JSON](https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config.json&action=raw)
- [British-English replacement raw JSON](https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config-textmatch-british-english.json&action=raw)

Inline explanation from project notes: the imported British-English replacement file contains hundreds of replacement pairs, and the main config includes multiple `textMatch.matchItems` buckets used as phrase/rule sources.

### Endpoint

- `https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config.json&action=raw`
- `https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config-textmatch-british-english.json&action=raw`

### Method

`GET`

### Request shape

- `title=MediaWiki:...`
- `action=raw`

### Example requests

```bash
curl "https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config.json&action=raw"
curl "https://en.wikipedia.org/w/index.php?title=MediaWiki:Editcheck-config-textmatch-british-english.json&action=raw"
```

### Response shape

```json
{
	"textMatch": {
		"matchItems": {
			"british-english": {
				"import": "MediaWiki:Editcheck-config-textmatch-british-english.json"
			},
			"LLM-multiple-indicators": {
				"minOccurrences": 3
			}
		}
	}
}
```

### Availability

**Active:** Because this is on-wiki config, changes can go live immediately after page edits.

Publicly available as live on-wiki configuration pages read by production tooling.

The listed endpoints are specifically for English Wikipedia (`en.wikipedia.org`) configuration pages.

### Rate limits

**Inherited/global policy**:

- [Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 12) Lift Wing `outlink-topic-model:predict` (language-agnostic link-based article topic)

This endpoint predicts article topics from the page's outgoing wiki links.
It returns topic labels with scores, using a language-agnostic model.

### Documentation

- [Language-agnostic link-based article topic model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Language_agnostic_link-based_article_topic)
- [Lift Wing API reference: outlink-topic-model](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_articletopic_outlink_prediction)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/outlink-topic-model:predict`

### Method

`POST`

### Request shape

At least one of `page_id` or `page_title` is required, plus `lang`.

```json
{
	"page_title": "Douglas_Adams",
	"lang": "en",
	"threshold": 0.1
}
```

Optional parameters documented in API reference:

- `page_id`
- `revision_id`
- `threshold`
- `features_str`
- `debug`

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/outlink-topic-model:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"page_title":"Frida_Kahlo","lang":"en","threshold":0.1}'
```

### Response shape

```json
{
	"prediction": {
		"article": "https://en.wikipedia.org/wiki/Frida_Kahlo",
		"results": [
			{
				"score": 0.863,
				"topic": "Culture.Biography.Biography*"
			},
			{
				"score": 0.516,
				"topic": "Geography.Regions.Americas.North_America"
			}
		]
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.


### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 13) Lift Wing `{wiki}-articletopic:predict` (revscoring articletopic)

This endpoint predicts article topics for a specific revision on a specific wiki.
It returns topic labels and probabilities so you can classify article content areas.

### Documentation

- [Lift Wing API reference: revscoring articletopic](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_articletopic_prediction)
- [Lift Wing API reference index](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/{wiki}-articletopic:predict`

Wikidata note from API docs: `wikidatawiki-itemtopic:predict` is used for Wikidata item topics.

### Method

`POST`

### Request shape

```json
{
	"rev_id": 12345
}
```

Optional:

- `extended_output`

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/enwiki-articletopic:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":12345}'
```

### Response shape

```json
{
	"prediction": "Culture.Biography.Biography*",
	"probability": {
		"Culture.Biography.Biography*": 0.72,
		"Geography.Regions.Americas.North_America": 0.19
	}
}
```

### Availability

**Active:** Wikidata uses `wikidatawiki-itemtopic:predict` instead.

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing revscoring deployment.

Available for the following: `{wiki}-articletopic` is documented for `arwiki`, `cswiki`, `enwiki`, `euwiki`, `huwiki`, `hywiki`, `kowiki`, `srwiki`, `ukwiki`, `viwiki`; Wikidata uses the separate `wikidatawiki-itemtopic:predict` endpoint.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 14) Lift Wing `articlequality:predict` (language-agnostic article quality)

This endpoint predicts article quality for a revision using a language-agnostic model.
You provide a revision ID and language code, and the response returns quality output for that revision.

### Documentation

- [Lift Wing API reference: language-agnostic articlequality](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_language_agnostic_articlequality_prediction)
- [Language-agnostic article-quality model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Proposed/Language-agnostic_Wikipedia_article_quality)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/articlequality:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 123456,
	"lang": "en"
}
```

Optional:

- `extended_output`

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/articlequality:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":123456,"lang":"en"}'
```

### Response shape

```json
{
	"prediction": "B",
	"probability": {
		"B": 0.62,
		"C": 0.24,
		"GA": 0.09,
		"FA": 0.05
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 15) Lift Wing `readability:predict` (multilingual readability)

This endpoint estimates how difficult the article text is to read.
It returns readability-related output for the revision and language you provide.

### Documentation

- [Lift Wing API reference: readability](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_readability_prediction)
- [Multilingual readability model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Proposed/Multilingual_readability_model_card)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/readability:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 123456,
	"lang": "en"
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/readability:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":123456,"lang":"en"}'
```

### Response shape

```json
{
	"prediction": 0.41
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

Supported language codes (API reference): `af`, `sq`, `am`, `ar`, `hy`, `as`, `az`, `eu`, `be`, `bn`, `bs`, `br`, `bg`, `my`, `ca`, `zh-yue`, `zh`, `zh-classical`, `hr`, `cs`, `da`, `nl`, `en`, `eo`, `et`, `tl`, `fi`, `fr`, `gl`, `ka`, `de`, `el`, `gu`, `ha`, `he`, `hi`, `hu`, `is`, `id`, `ga`, `it`, `ja`, `jv`, `kn`, `kk`, `km`, `ko`, `ku`, `ky`, `lo`, `la`, `lv`, `lt`, `mk`, `mg`, `ms`, `ml`, `mr`, `mn`, `ne`, `no`, `or`, `om`, `ps`, `fa`, `pl`, `pt`, `pa`, `ro`, `ru`, `sa`, `gd`, `sr`, `sd`, `si`, `sk`, `sl`, `so`, `es`, `su`, `sw`, `sv`, `ta`, `te`, `th`, `tr`, `uk`, `ur`, `ug`, `uz`, `vi`, `cy`, `fy`, `xh`, `yi`, `simple`.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 16) Lift Wing `{wiki}-draftquality:predict` (revscoring draft quality)

This endpoint predicts draft quality for a revision on supported wikis.
It returns draft-quality classes and related probabilities.

### Documentation

- [Lift Wing API reference: revscoring draftquality](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_draftquality_prediction)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/{wiki}-draftquality:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 12345
}
```

Optional:

- `extended_output`

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/enwiki-draftquality:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":12345}'
```

### Response shape

```json
{
	"prediction": "OK",
	"probability": {
		"OK": 0.78,
		"attack": 0.03,
		"spam": 0.12,
		"vandalism": 0.07
	}
}
```

### Availability

**Active:** where this model is deployed.

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing revscoring deployment.

Available for the following: `enwiki`, `ptwiki`.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 17) Lift Wing `wikidatawiki-itemtopic:predict` (Wikidata item topic)

This endpoint predicts topic labels for Wikidata item revisions.
It returns one or more topic categories with probabilities for the given Wikidata revision.

### Documentation

- [Lift Wing API reference: revscoring articletopic](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_articletopic_prediction) (notes `wikidatawiki-itemtopic:predict` URL scheme for Wikidata)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/wikidatawiki-itemtopic:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 2366803550
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/wikidatawiki-itemtopic:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":2366803550}'
```

### Response shape

```json
{
	"wikidatawiki": {
		"models": {
			"itemtopic": {
				"version": "1.2.0"
			}
		},
		"scores": {
			"2366803550": {
				"itemtopic": {
					"score": {
						"prediction": ["STEM.Biology", "STEM.STEM*"],
						"probability": {
							"STEM.Biology": 0.999,
							"STEM.STEM*": 0.998
						}
					}
				}
			}
		}
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

Wikidata only (`wikidatawiki`).

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 18) Lift Wing `article-descriptions:predict`

This endpoint generates short description text for an article title and language.
It returns one or more candidate descriptions that can be used as summary snippets.

### Documentation

- [Lift Wing API reference: article descriptions](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_article_descriptions)
- [Article descriptions model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Proposed/Article_descriptions)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/article-descriptions:predict`

### Method

`POST`

### Request shape

```json
{
	"lang": "en",
	"title": "Clandonald",
	"num_beams": 2,
	"debug": 1
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/article-descriptions:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"lang":"en","title":"Clandonald","num_beams":2,"debug":1}'
```

### Response shape

```json
{
	"lang": "en",
	"title": "Clandonald",
	"num_beams": 2,
	"groundtruth": "Hamlet in Alberta, Canada",
	"prediction": ["Hamlet in Alberta, Canada", "human settlement in Alberta, Canada"]
}
```

### Availability

**Active:** Output quality can vary by language and topic domain.

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 19) Lift Wing `reference-risk:predict`

This endpoint predicts whether references introduced by a revision are likely to survive over time.
It returns risk-oriented fields that help identify references that may be unstable.

### Documentation

- [Lift Wing API reference: reference risk prediction](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_reference_risk_prediction)
- [Language-agnostic reference risk model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Proposed/Language-agnostic_reference_risk)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/reference-risk:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 1242378206,
	"lang": "en"
}
```

Optional:

- `extended_output` (boolean)

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/reference-risk:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":1242378206,"lang":"en"}'
```

### Response shape

```json
{
	"model_name": "reference-risk",
	"model_version": "2024-11",
	"wiki_db": "enwiki",
	"revision_id": 1242378206,
	"reference_count": 307,
	"survival_ratio": {
		"min": 0.7011,
		"mean": 0.8286,
		"median": 0.8284
	},
	"reference_risk_score": 0.0
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 20) Lift Wing `langid:predict`

This endpoint detects the language of input text.
It returns language identifiers and a confidence score for the detected language.

### Documentation

- [Lift Wing API reference: language identification prediction](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_language_identification_prediction)
- [Language identification model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Proposed/Language_Identification)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/langid:predict`

### Method

`POST`

### Request shape

```json
{
	"text": "This is an English sentence about Wikipedia and machine learning."
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/langid:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: your-tool-name (contact)" \
  -d '{"text":"This is an English sentence about Wikipedia and machine learning."}'
```

### Response shape

```json
{
	"language": "eng_Latn",
	"wikicode": "en",
	"languagename": "English",
	"score": 0.5686957836151123
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

Not tied to a specific wiki; works on raw input text.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 21) Lift Wing `{wiki}-drafttopic:predict`

This endpoint predicts draft-topic categories for a wiki revision.
It returns topic predictions and probabilities for the revision you provide.

### Documentation

- [Lift Wing API reference: revscoring drafttopic prediction](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_drafttopic_prediction)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/{wiki}-drafttopic:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 1350687796
}
```

Optional:

- `extended_output` (boolean)

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/enwiki-drafttopic:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":1350687796}'
```

### Response shape

```json
{
	"enwiki": {
		"models": {
			"drafttopic": {
				"version": "1.3.0"
			}
		},
		"scores": {
			"1350687796": {
				"drafttopic": {
					"score": {
						"prediction": ["STEM.Earth and environment", "STEM.STEM*"],
						"probability": {
							"STEM.Earth and environment": 0.999,
							"STEM.STEM*": 0.999
						}
					}
				}
			}
		}
	}
}
```

### Availability

**Active:** where this model is deployed.

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing revscoring deployment.

Available for the following: `enwiki`.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 22) Lift Wing `revertrisk-wikidata:predict`

This endpoint predicts revert risk for Wikidata revisions.
It uses revision metadata and content to return a revert-likelihood output.

### Documentation

- [Lift Wing API reference: revertrisk wikidata](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revertrisk_wikidata)
- [RevertRisk Wikidata model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/RevertRisk_Wikidata)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-wikidata:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 2484352064
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/revertrisk-wikidata:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":2484352064}'
```

### Response shape

```json
{
	"model_name": "revertrisk-wikidata",
	"model_version": "2",
	"revision_id": 2484352064,
	"output": {
		"prediction": false,
		"probabilities": {
			"true": 0.3965919981582395,
			"false": 0.6034080018417605
		}
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

Wikidata revisions only.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 23) Lift Wing `{wiki}-articlequality:predict` (revscoring articlequality)

This endpoint predicts article quality class for a wiki revision.
It returns a quality label and class probabilities for that revision.

### Documentation

- [Lift Wing API reference: revscoring articlequality prediction](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_articlequality_prediction)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/{wiki}-articlequality:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 1350839573
}
```

Optional:

- `extended_output` (boolean)

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/enwiki-articlequality:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":1350839573}'
```

### Response shape

```json
{
	"enwiki": {
		"models": {
			"articlequality": {
				"version": "0.9.2"
			}
		},
		"scores": {
			"1350839573": {
				"articlequality": {
					"score": {
						"prediction": "Start",
						"probability": {
							"Stub": 0.02398888577889904,
							"Start": 0.5392005742880663,
							"C": 0.31740026564541135,
							"B": 0.10214225714909148,
							"GA": 0.011721489950630397,
							"FA": 0.00554652718790141
						}
					}
				}
			}
		}
	}
}
```

### Availability

**Active:** where this model is deployed. Wikidata uses `wikidatawiki-itemquality:predict` instead.

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing revscoring deployment.

Available for the following: `{wiki}-articlequality` is documented for `enwiki`, `euwiki`, `fawiki`, `frwiki`, `glwiki`, `nlwiki`, `ptwiki`, `ruwiki`, `svwiki`, `trwiki`, `ukwiki`; Wikidata uses the separate `wikidatawiki-itemquality:predict` endpoint.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 24) Lift Wing `wikidatawiki-itemquality:predict` (Wikidata item quality)

This endpoint predicts item quality class for a Wikidata revision.
It uses the Wikidata-specific itemquality URL scheme and returns class probabilities.

### Documentation

- [Lift Wing API reference: revscoring articlequality prediction](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_articlequality_prediction) (documents the Wikidata `wikidatawiki-itemquality:predict` URL scheme)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/wikidatawiki-itemquality:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 2484352064
}
```

Optional:

- `extended_output` (boolean)

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/wikidatawiki-itemquality:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":2484352064}'
```

### Response shape

```json
{
	"wikidatawiki": {
		"models": {
			"itemquality": {
				"version": "0.5.0"
			}
		},
		"scores": {
			"2484352064": {
				"itemquality": {
					"score": {
						"prediction": "B",
						"probability": {
							"A": 0.07284809111130389,
							"B": 0.8010284572408711,
							"C": 0.09078131952285162,
							"D": 0.0313878119171716,
							"E": 0.003954320207801803
						}
					}
				}
			}
		}
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing revscoring deployment.

Wikidata only (`wikidatawiki`).

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 25) Lift Wing `article-country:predict`

This endpoint predicts which countries are most relevant to an article.
You provide article title and language, and it returns country candidates with scores and source evidence.

### Documentation

- [Lift Wing API reference: article country](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_article_country)
- [Article country model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Proposed/Article_country)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/article-country:predict`

### Method

`POST`

### Request shape

```json
{
	"lang": "en",
	"title": "Toni_Morrison"
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/article-country:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: your-tool-name (contact)" \
  -d '{"lang":"en","title":"Toni_Morrison"}'
```

### Response shape

```json
{
	"model_name": "article-country",
	"model_version": "1",
	"prediction": {
		"article": "https://en.wikipedia.org/wiki/Toni_Morrison",
		"wikidata_item": "Q72334",
		"results": [
			{
				"country": "United States",
				"score": 1.0,
				"source": {
					"wikidata_properties": [{ "P27": "country of citizenship" }],
					"categories": [],
					"links": [
						{
							"country": "United States",
							"count": 249.0,
							"prop-tfidf": 0.622714545729024
						}
					]
				}
			}
		]
	}
}
```

### Availability

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 26) Lift Wing recommendation API `translation`

This endpoint recommends articles to translate from one language wiki to another.
It returns ranked candidate articles based on source/target languages and optional seed or topic inputs.

### Documentation

- [Lift Wing API reference: content translation recommendation](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_content_translation_recommendation)
- [Interactive recommendation API docs](https://api.wikimedia.org/service/lw/recommendation/api/docs)

### Endpoint

`https://api.wikimedia.org/service/lw/recommendation/api/v1/translation`

### Method

`GET`

### Request shape

Query parameters:

- `source` (required): source wiki language code (example: `en`)
- `target` (required): target wiki language code (example: `fr`)
- `count` (optional, default `12`)
- `seed` (optional)
- `topic` (optional)
- `include_pageviews` (optional, default `false`)
- `search_algorithm` (optional, default `morelike`)
- `rank_method` (optional, default `default`)

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/recommendation/api/v1/translation?source=en&target=fr&count=3&seed=Apple&include_pageviews=true" \
  -H "User-Agent: your-tool-name (contact)"
```

### Response shape

```json
{
	"recommendations": [
		{
			"title": "Agriculture in Mesoamerica",
			"pageviews": 40,
			"wikidata_id": "Q5660007",
			"rank": 96,
			"langlinks_count": 4,
			"size": 13765,
			"lead_section_size": null,
			"collection": null
		}
	],
	"continue_offset": null,
	"continue_seed": null
}
```

### Availability

**Active:** Some request options are marked experimental in ecosystem documentation.

Publicly available via Wikimedia's production recommendation API.

### Rate limits

**Global policy limits (no endpoint page numeric limit in fetched source set)**:

- [Wikimedia APIs: Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

---

## 27) Action API `query&list=search` with `srqiprofile`

This endpoint runs full-text search and lets you choose ranking profiles with `srqiprofile`.
Profiles such as `popular_inclinks_pv` bias ranking toward high-pageview and high-inlink results.

### Documentation

- [MediaWiki Action API: Search](https://www.mediawiki.org/wiki/API:Search)

### Endpoint

`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Jupiter&srlimit=5&srqiprofile=popular_inclinks_pv&srinfo=totalhits`

### Method

`GET`

### Request shape

Query parameters:

- `action=query`
- `list=search`
- `srsearch` (required)
- `srqiprofile` (optional ranking profile, examples include `popular_inclinks_pv`, `wsum_inclinks_pv`)
- `srinfo` (optional metadata, example: `totalhits`)
- `srlimit` (optional)
- `sroffset` (optional continuation offset)
- `format=json`

### Example request

```bash
curl "https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=Jupiter&srlimit=5&srqiprofile=popular_inclinks_pv&srinfo=totalhits" \
  -H "User-Agent: your-tool-name (contact)"
```

### Response shape

```json
{
	"batchcomplete": "",
	"continue": { "sroffset": 5, "continue": "-||" },
	"query": {
		"searchinfo": { "totalhits": 26743 },
		"search": [
			{
				"ns": 0,
				"title": "Jupiter",
				"pageid": 38930,
				"size": 176407,
				"wordcount": 16375,
				"timestamp": "2026-04-19T01:14:29Z"
			}
		]
	}
}
```

### Availability

**Active:** Ranking profile behavior varies by wiki backend configuration.

Publicly available on each wiki's `api.php`; this is a core production MediaWiki Action API module.

Available where the Action API search module is enabled; `srqiprofile` effects depend on search backend/profile support.

### Rate limits

**Global policy limits (no endpoint page numeric limit)**:

- [Wikimedia APIs: Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

## 28) AQS pageviews `per-article`

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

## 29) AQS pageviews `top`

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

## 30) Action API `query&list=backlinks`

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

## 31) Action API `query&prop=langlinks`

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

## 32) Deprecated: Lift Wing revscoring `damaging`

This endpoint predicts how damaging an edit is for a specific revision.
It returns a prediction plus probabilities you can use to estimate the chance that the edit is harmful.

### Documentation

- [Lift Wing damaging reference](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_damaging_prediction)
- [Lift Wing API usage (Wikitech)](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/{wiki}-damaging:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 12345
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/enwiki-damaging:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id": 12345}'
```

### Response shape

```json
{
	"prediction": false,
	"probability": {
		"true": 0.08,
		"false": 0.92
	}
}
```

### Availability

**Deprecated:** `revertrisk-language-agnostic` and `revertrisk-multilingual` are recommended as newer alternatives.

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

Available for the following: `arwiki`, `bswiki`, `cawiki`, `cswiki`, `dewiki`, `enwiki`, `eswiki`, `eswikibooks`, `eswikiquote`, `etwiki`, `fawiki`, `fiwiki`, `frwiki`, `hewiki`, `hiwiki`, `huwiki`, `itwiki`, `jawiki`, `kowiki`, `lvwiki`, `nlwiki`, `nowiki`, `plwiki`, `ptwiki`, `rowiki`, `ruwiki`, `sqwiki`, `srwiki`, `svwiki`, `ukwiki`, `wikidatawiki`, `zhwiki`.

### Rate limits

**Explicit numeric (Lift Wing external usage)** via [LiftWing external usage rate limits](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage):

- Anonymous: `50,000 req/hour` (2026 note also lists `15 req/s`)
- Authenticated: `100,000 req/hour` (2026 note also lists `100 req/s`)
- Bots/WMCS/known clients: `200,000 req/hour` (2026 note also lists `200 req/s`)

---

## 33) Deprecated: Lift Wing revscoring `goodfaith`

This endpoint predicts whether an edit appears to be made in good faith.
It returns a prediction and probabilities so you can separate likely mistakes from likely abuse.

### Documentation

- [Lift Wing goodfaith reference](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_goodfaith_prediction)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/{wiki}-goodfaith:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 12345
}
```

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/enwiki-goodfaith:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Api-User-Agent: your-tool-name (contact)" \
  -d '{"rev_id": 12345}'
```

### Response shape

```json
{
	"prediction": true,
	"probability": {
		"true": 0.89,
		"false": 0.11
	}
}
```

### Availability

**Deprecated:** `revertrisk-language-agnostic` and `revertrisk-multilingual` are recommended as newer alternatives.

Publicly available on `api.wikimedia.org`, served by Wikimedia's production Lift Wing inference platform.

Available for the following: `arwiki`, `bswiki`, `cawiki`, `cswiki`, `dewiki`, `enwiki`, `eswiki`, `eswikibooks`, `eswikiquote`, `etwiki`, `fawiki`, `fiwiki`, `frwiki`, `hewiki`, `hiwiki`, `huwiki`, `itwiki`, `jawiki`, `kowiki`, `lvwiki`, `nlwiki`, `nowiki`, `plwiki`, `ptwiki`, `rowiki`, `ruwiki`, `sqwiki`, `srwiki`, `svwiki`, `ukwiki`, `wikidatawiki`, `zhwiki`.

### Rate limits

**Explicit numeric (Lift Wing external usage)**: [LiftWing external usage rate limits](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---

## 34) Deprecated: ORES v3 scores endpoint (`damaging|goodfaith`)

This endpoint returns ORES scores for one or more revision IDs and the model names you request.
It is a batch-style scoring endpoint that can return multiple model outputs in one call.

### Documentation

- [ORES overview](https://www.mediawiki.org/wiki/ORES)
- [ORES on Wikitech](https://wikitech.wikimedia.org/wiki/ORES)

### Endpoint

`https://ores.wikimedia.org/v3/scores/{wikiCode}/?models=damaging|goodfaith&revids={id1}|{id2}|...`

### Method

`GET`

### Request shape

Path:

- `{wikiCode}` (example: `enwiki`)

Query:

- `models=damaging|goodfaith`
- `revids=12345|23456`

### Example request

```bash
curl "https://ores.wikimedia.org/v3/scores/enwiki/?models=damaging|goodfaith&revids=12345|23456"
```

### Response shape

```json
{
	"enwiki": {
		"scores": {
			"12345": {
				"damaging": {
					"score": {
						"prediction": false,
						"probability": {
							"true": 0.03,
							"false": 0.97
						}
					}
				},
				"goodfaith": {
					"score": {
						"prediction": true,
						"probability": {
							"true": 0.91,
							"false": 0.09
						}
					}
				}
			}
		}
	}
}
```

### Availability

**Legacy/deprecating:** Lift Wing is the recommended platform for these models.

Publicly available as a legacy compatibility endpoint.

wiki/model pairs still served by ORES; request unsupported pairs and the API returns an unavailable/missing model result.

### Rate limits

**Explicit numeric usage guidance on ORES page**:

- up to `20` revisions per request,
- up to `4` parallel requests.

Source: [https://www.mediawiki.org/wiki/ORES](https://www.mediawiki.org/wiki/ORES)

---

## 35) Deprecated: Lift Wing `{wiki}-reverted:predict` (deprecated model)

This endpoint predicts whether a wiki revision will be reverted, using the older revscoring reverted model.
The official docs mark this model for deprecation and recommend newer revert-risk models.

### Documentation

- [Lift Wing API reference: revscoring reverted prediction](https://api.wikimedia.org/wiki/Lift_Wing_API/Reference/Get_revscoring_reverted_prediction)
- [Multilingual revert risk model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Multilingual_revert_risk) (recommended replacement in docs)
- [Language-agnostic revert risk model card](https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Language-agnostic_revert_risk) (recommended replacement in docs)

### Endpoint

`https://api.wikimedia.org/service/lw/inference/v1/models/{wiki}-reverted:predict`

### Method

`POST`

### Request shape

```json
{
	"rev_id": 74995306
}
```

Optional:

- `extended_output` (boolean)

### Example request

```bash
curl "https://api.wikimedia.org/service/lw/inference/v1/models/viwiki-reverted:predict" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: your-tool-name (contact)" \
  -d '{"rev_id":74995306}'
```

### Response shape

```json
{
	"viwiki": {
		"models": {
			"reverted": {
				"version": "0.5.0"
			}
		},
		"scores": {
			"74995306": {
				"reverted": {
					"score": {
						"prediction": false,
						"probability": {
							"false": 0.6663072574407378,
							"true": 0.33369274255926223
						}
					}
				}
			}
		}
	}
}
```

### Availability

**Deprecated:** `revertrisk-language-agnostic` and `revertrisk-multilingual` are recommended as newer alternatives.

Still callable on supported wikis.

Available for the following: `bnwiki`, `elwiki`, `enwiktionary`, `glwiki`, `hrwiki`, `idwiki`, `iswiki`, `tawiki`, `viwiki`.

### Rate limits

**Explicit numeric (Lift Wing external usage)**:

- [Machine Learning/LiftWing/API/External usage#Rate limits for external usage](https://wikitech.wikimedia.org/wiki/Machine_Learning/LiftWing/API/External_usage#Rate_limits_for_external_usage)

---
