# fakewiki

Helpers for building MediaWiki prototypes: API client, storage keys, result types, and shared styles. API details are documented via TSDoc on the source; this file covers package layout and usage at a glance.

## Package exports

| Export                     | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `fakewiki`                 | Main entry: `FakeWiki` class and default export |
| `fakewiki/types`           | Shared TypeScript types and interfaces          |
| `fakewiki/style/delta.css` | CSS for delta (change size) indicators          |

## What’s in the package

- **FakeWiki** – Client for Wikimedia REST API, MediaWiki REST API, and MediaWiki Action API. Use it for page summaries, history, search, diffs, and related endpoints. See TSDoc on `FakeWiki` and its methods for parameters and return types.
- **Storage keys** – Helpers to build consistent keys for prototype storage (e.g. `getStorageKey`, `getStorageKeys`).
- **Result pattern** – `FWResult<T>` and helpers like `createResult` / `createResults` for loading/error/data state in prototypes.
- **Delta utilities** – `getDeltaClass(delta)` for positive/negative/neutral CSS class names; use with `fakewiki/style/delta.css` for styling.
- **Schemas** – OpenAPI 3.0 specs in `schema/`: `mediawiki-schema.json`, `wikimedia-schema.json`. Useful for docs, codegen, or validation.

## API bases

- **Wikimedia REST API** – `https://en.wikipedia.org/api/rest_v1/` (cacheable, machine-readable content).
- **MediaWiki REST API** – `https://en.wikipedia.org/w/rest.php/v1/`.
- **MediaWiki Action API** – `https://en.wikipedia.org/w/api.php` (query parameters).

## Quick usage

```typescript
import { FakeWiki } from "fakewiki"
import type { FWResult, FWRevision } from "fakewiki/types"
import "fakewiki/style/delta.css"

const wiki = new FakeWiki()

// Page summary, history, search (see TSDoc for options and return types)
const summary = await wiki.getPageSummary("Wikipedia")
const history = await wiki.getPageHistory("Wikipedia", { limit: 5 })

// Storage keys for your prototype
const key = wiki.getStorageKey("PageFeed", "searchQuery")

// Result state for UI
const result = wiki.createResult<FWRevision>()

// Delta styling
const deltaClass = wiki.getDeltaClass(150) // "positive"
```

**Search:**

```typescript
const pages = await wiki.searchPages("Albert Einstein", 10)
const users = await wiki.searchUsers("Admin", 5)
const titles = await wiki.searchTitles("Wiki")
```

**User info and history:**

```typescript
const userInfo = await wiki.getUserInfo("Example")
const avatarUrl = await wiki.getUserAvatar("Example")
const userRevisions = await wiki.getUserHistory("Example", { limit: 20 })
```

**Feeds and discovery:**

```typescript
const feed = await wiki.getCombinedFeed({
	pageNames: ["Wikipedia", "Wet Leg"],
	userNames: ["Todepond", "Samwalton9"],
	limit: 10,
})
const random = await wiki.getRandomPage()
const featured = await wiki.getFeaturedPage()
const onThisDay = await wiki.getOnThisDay(new Date())
```

**Revisions and diffs:**

```typescript
const diff = await wiki.getRevisionDiff("Wikipedia", 123456789)
const parentId = await wiki.getParentRevisionId("Wikipedia", 123456789)
const source = await wiki.getRevisionSource(123456789)
```

**URLs:**

```typescript
wiki.getPageUrl("Wikipedia")
wiki.getRevisionUrl(123456789, "Wikipedia")
wiki.getUserUrl("Example")
```

**Timestamps:**

```typescript
wiki.formatRelativeTime("2024-01-15T12:00:00Z", {
	seconds: "words",
	minutes: "minutes",
	hours: "hours",
	days: "days",
	weeks: "date",
	months: "date",
	years: "date",
}) // e.g. "15 January 2024", e.g. "3 minutes ago"
```

## Reference docs in this package

- **CODEX_REFERENCE.md** – Codex components, design tokens, and links.
- **ICON_REFERENCE.md** – Codex icons used in the project and how to add more.

## External references

- [Wikimedia REST API](https://www.mediawiki.org/wiki/Wikimedia_REST_API)
- [MediaWiki REST API](https://www.mediawiki.org/wiki/API:REST_API)
- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Main_page)
