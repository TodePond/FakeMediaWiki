# fakewiki

Helpers for building MediaWiki prototypes.

- [API playground](https://todepond.github.io/FakeMediaWiki/Fullscreen/ApiPlayground)
- [API reference page](https://todepond.github.io/FakeMediaWiki/Fullscreen/FakeWikiReference)
- [API reference markdown](https://todepond.github.io/FakeMediaWiki/llms.txt)

## Install

```bash
npm install fakewiki
```

## Usage

```ts
import { FakeWiki } from "fakewiki"

const wiki = new FakeWiki()

const page = await wiki.getPage("Wet Leg")
console.log(page)
```

Full documentation is available in the [API reference](https://todepond.github.io/FakeMediaWiki/Fullscreen/FakeWikiReference). A [markdown version](https://todepond.github.io/FakeMediaWiki/llms.txt) is also available.

## External references

- [Wikimedia REST API](https://www.mediawiki.org/wiki/Wikimedia_REST_API)
- [MediaWiki REST API](https://www.mediawiki.org/wiki/API:REST_API)
- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Main_page)
