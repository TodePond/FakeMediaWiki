# Attribution signals

## 1) Page attribution signals

This endpoint returns structured **attribution signals** for a wiki page so off-wiki experiences can credit Wikimedia content in line with the [Wikimedia attribution framework](https://iw.toolforge.org/wikimedia-attribution). It is a **beta** module; response shape and field semantics may change before a stable v1.

### Documentation

- [Attribution API](https://www.mediawiki.org/wiki/Attribution_API)
- [REST sandbox (attribution.v0-beta)](https://www.mediawiki.org/w/index.php?title=Special:RestSandbox&api=attribution.v0-beta)
- [Wikimedia attribution framework](https://iw.toolforge.org/wikimedia-attribution)
- [Wikimedia APIs: access policy](https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette) (use a descriptive `User-Agent`)
- Announcement: [wikitech-l — Attribution API (Beta) launch](https://lists.wikimedia.org/hyperkitty/list/wikitech-l@lists.wikimedia.org/thread/X46T5M3DZWV5WC3VOISSTGPYWUAVUYGQ/)

### Endpoint

`https://{wiki}/w/rest.php/attribution/v0-beta/pages/{title}/signals`

### Method

`GET`

### Request shape

Path parameters:

- `{wiki}` — project host (example: `en.wikipedia.org`)
- `{title}` — page title (URL-encode spaces and special characters when needed; example: `Earth`)

The route is available on Wikimedia Foundation wikis; only Wikipedia articles and media through Commons or local Wikipedia are **fully** supported at this time—other page types may return incomplete data.

### Example

#### Request

```bash
curl -sS "https://en.wikipedia.org/w/rest.php/attribution/v0-beta/pages/Earth/signals" \
	-H "User-Agent: <your tool name> (<contact: URL or email>)"
```

#### Response

```json
{
	"essential": {
		"title": "Earth",
		"license": {
			"url": "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
			"title": "Creative Commons Attribution-Share Alike 4.0"
		},
		"link": "https://en.wikipedia.org/wiki/Earth",
		"default_brand_marks": [
			{
				"name": "Default logo",
				"url": "https://en.wikipedia.org/static/images/project-logos/enwiki-25.png",
				"type": "logo"
			},
			{
				"name": "Site icon",
				"url": "https://en.wikipedia.org/static/images/icons/enwiki-25.svg",
				"type": "icon"
			},
			{
				"name": "Sound logo",
				"url": "https://upload.wikimedia.org/wikipedia/commons/9/91/Wikimedia_Sonic_Logo_-_4-seconds.wav",
				"type": "audio"
			}
		],
		"source_wiki": {
			"site_id": "enwiki",
			"site_language": "en",
			"page_language": "en"
		}
	},
	"source_wiki": {
		"site_name": "English Wikipedia",
		"project_family": "wikipedia"
	}
}
```

(Live response for this title at documentation time; the beta API may add or adjust top-level keys and nested objects.)

### Availability

[Wikimedia production wikis](https://www.mediawiki.org/wiki/Attribution_API#Supported_project_and_content_types) where the Attribution module is deployed; not available on generic third-party MediaWiki sites.

### Rate limits

[Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)

[API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)
