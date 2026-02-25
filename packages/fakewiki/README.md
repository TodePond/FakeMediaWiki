# fakewiki

Helpers for building MediaWiki prototypes: API client for Wikipedia and sister sites, Vue composables for feeds and recommendations, shared types, and styles. Use it for page history, search, diffs, discovery feeds, ML predictions, and more.

## Install

```bash
npm install fakewiki
```

## Quick start

```typescript
import { FakeWiki } from "fakewiki"

const wiki = new FakeWiki()

// Page summary and history
const summary = await wiki.getPageSummary("Wikipedia")
const history = await wiki.getPageHistory("Wikipedia", { limit: 10 })

// Search
const pages = await wiki.searchPages("Albert Einstein", 10)
const users = await wiki.searchUsers("Admin", 5)
const titles = await wiki.searchTitles("Wiki")
```

## API overview

The `FakeWiki` class talks to the **Wikimedia REST API**, **MediaWiki REST API**, and **MediaWiki Action API**. All async methods are documented with TSDoc in the source. Below is a grouped overview.

**Pages and content**

- `getPageSummary`, `getPage`, `getPageHtml`, `getPageSource`, `getPageMobileHtml` – page metadata and content
- `getPageHistory`, `getUserHistory`, `getUsersHistory`, `getCombinedFeed` – revision feeds
- `getPageMedia`, `getPageThumbnail`, `getPageThumbnails`, `getPageHero`, `getPageCategories` – media and structure

**Search**

- `searchPages`, `searchUsers`, `searchTitles` – full-text and prefix search

**Diffs and revisions**

- `getRevisionDiff`, `getParentRevisionId`, `getRevisionSource` – compare and fetch revision content
- `getDiffLineSegments`, `getDiffLineClass` – diff line parsing for UI

**Discovery and feeds**

- `getRandomPage`, `getFeaturedPage`, `getOnThisDay` – discovery
- `getRelatedChanges`, `getTopRelatedChanges`, `getTopRelatedPages` – related changes
- `getPagesLinks`, `getPagesBacklinks`, `getPagesLinksAndBacklinks` – link graph
- `getListBuilding`, `getMultiPageListBuilding` – list-building API

**Users**

- `getUserInfo`, `getUserAvatar`, `getUserCategory` – user metadata and classification. `getUserCategory` is cached on the instance; feed hooks call it when loading revisions so the cache is populated. Use `getUserCategoryDisplay(userName)` for icon + color (returns `null` if the user is not yet in the cache). To override icon/color per category for a call, pass a second argument: `getUserCategoryDisplay(userName, { userTypeConfig })`.
- `getUserCategoryDisplay(userName, options?)`, `getCachedUserCategory(userName)` – read from the in-instance cache for UI (display config or category string for test IDs).

**ML predictions (damaging / goodfaith)**

- `getDamagingPrediction`, `getGoodfaithPrediction`
- `getRevisionPredictions`, `getRevisionPredictionsFromOres` – batch predictions

**URLs and formatting**

- `getPageUrl`, `getRevisionUrl`, `getUserUrl`, `getHistoryUrl`, `getEditUrl`, etc.
- `formatDate`, `formatTime`, `formatRelativeTimestamp`, `formatNiceRelativeTimestamp`, `formatDelta`
- `getDeltaClass(delta)` – CSS class for delta indicators; use with `fakewiki/style/delta.css`

**Result and state helpers**

- `createResult<T>()`, `createResults<T>()` – loading/error/data state for UI
- `getStorageKey`, `getStorageKeys` – consistent keys for prototype storage (optional)

## Hooks

The package exports composables that work with `FakeWiki` for common prototype patterns. User category caching is handled by FakeWiki: when feed hooks load revisions they call `wiki.getUserCategory(userName)`, and FakeWiki caches the result. In the template use `wiki.getUserCategoryDisplay(userName)` for icon and color. To customize icon/color per category, pass the config at call time: `wiki.getUserCategoryDisplay(userName, { userTypeConfig })`.

**`useFeed`** – combined feed from page and user search queries, with load-more and edit-summary processing. Calls `getUserCategory` for each revision so the cache is ready for `wiki.getUserCategoryDisplay()` in the UI.

```typescript
import { useFeed } from "fakewiki"
import { ref } from "vue"

const pageQueries = ref(["Wikipedia", "Wet Leg"])
const userQueries = ref(["Todepond"])
const { allRevisionsData, loadFeed, isLoading, hasMore, loadMore } = useFeed({
	wiki,
	pageSearchQueries: pageQueries,
	userSearchQueries: userQueries,
	onUserCategory: (userName, category) => {
		/* cache if needed */
	},
})
await loadFeed()
```

**`useRelatedChanges`** – single- or multi-page related changes feed with summarized comments. Populates FakeWiki’s user category cache for `wiki.getUserCategoryDisplay()`.

```typescript
import { useRelatedChanges } from "fakewiki"

const pageName = ref("Wikipedia")
const { allRevisionsData, loadFeed, isLoading } = useRelatedChanges({
	wiki,
	pageName,
	onUserCategory: (userName, category) => {
		/* cache */
	},
})
await loadFeed()
```

**`usePredictions`** – lazy-load damaging/goodfaith predictions for revision IDs, with icon/color state for UI.

```typescript
import { usePredictions } from "fakewiki"

const { revisionPredictions, loadPrediction, getPredictionState } = usePredictions(wiki, {
	source: "liftwing", // or "ores"
})
await loadPrediction(revisionId)
const state = getPredictionState(revisionId) // { icon, color, isLoading, isError }
```

**`useRelatedChangesRecommendations`** – recommend related pages from a feed’s revisions and merge recommended revisions into the feed.

**`useListBuildingRecommendations`** – recommend pages from list-building API and merge those revisions into the feed.

See the source for full options and return shapes.

## Package exports

| Export                     | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| `fakewiki`                 | Main entry: `FakeWiki`, all types, and all hooks (useUser, useFeed, etc.) |
| `fakewiki/style/delta.css` | CSS for delta (change size) indicators                                    |

## API Playground

Try every `FakeWiki` method with custom parameters in the browser:

**[API Playground →](https://todepond.github.io/Fullscreen/ApiPlayground)**

## API bases

- **Wikimedia REST API** – `https://en.wikipedia.org/api/rest_v1/`
- **MediaWiki REST API** – `https://en.wikipedia.org/w/rest.php/v1/`
- **MediaWiki Action API** – `https://en.wikipedia.org/w/api.php`

## Reference docs (in repo)

- **CODEX_REFERENCE.md** – Codex components and design tokens
- **ICON_REFERENCE.md** – Codex icons used in the project

## External references

- [Wikimedia REST API](https://www.mediawiki.org/wiki/Wikimedia_REST_API)
- [MediaWiki REST API](https://www.mediawiki.org/wiki/API:REST_API)
- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Main_page)
