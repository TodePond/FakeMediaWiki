# fakewiki

Helpers for building MediaWiki prototypes: API client for Wikipedia and sister sites, Vue composables for feeds and recommendations, shared types, and styles. Use it for page history, search, diffs, discovery feeds, ML predictions, and more.

You can try every `FakeWiki` method with custom parameters in the [playground](https://todepond.github.io/FakeMediaWiki/Fullscreen/ApiPlayground).

## Install

```bash
npm install fakewiki
```

## Usage

**Page content** – summary (extract + thumbnail), full metadata, HTML, wikitext, or media:

```typescript
const summary = await wiki.getPageSummary("Wikipedia")
const page = await wiki.getPage("Wikipedia")
const html = await wiki.getPageHtml("Wikipedia")
const source = await wiki.getPageSource("Wikipedia")
const media = await wiki.getPageMedia("Wikipedia")
```

**Revision feeds** – by page, user, or combined; supports `limit`, `older_than`, `newer_than`:

```typescript
const { revisions } = await wiki.getPageHistory("Wikipedia", { limit: 20 })
const { revisions: userRevs } = await wiki.getUserHistory("Todepond", { limit: 10 })
const combined = await wiki.getCombinedFeed({
	pageNames: ["Wikipedia", "Wet Leg"],
	userNames: ["Todepond", "Samwalton9"],
	limit: 15,
})
```

**Search** – full-text page search, title prefix (autocomplete), or users:

```typescript
const { pages } = await wiki.searchPages("quantum physics", 10)
const { pages: titleHits } = await wiki.searchTitles("Albert")
const users = await wiki.searchUsers("Admin", 5)
```

**Diffs and revisions** – compare revisions, fetch parent or source, parse diff lines for UI:

```typescript
const diff = await wiki.getRevisionDiff("Wikipedia", 123456789)
const parentId = await wiki.getParentRevisionId("Wikipedia", 123456789)
const revSource = await wiki.getRevisionSource(123456789)
const segments = wiki.getDiffLineSegments(diff.diff[0])
const lineClass = wiki.getDiffLineClass(line.type)
```

**Discovery and feeds** – random page, featured article, on-this-day; related changes; link graph; list-building API:

```typescript
const random = await wiki.getRandomPage("summary")
const featured = await wiki.getFeaturedPage()
const onThisDay = await wiki.getOnThisDay()
const related = await wiki.getTopRelatedChanges(["Wikipedia", "Wet Leg"], { limit: 20 })
const linksMap = await wiki.getPagesLinks(["Wikipedia", "Wet Leg"])
const listBuilding = await wiki.getListBuilding("en", { qid: "Q123", k: 10 })
```

**Users** – user info, avatar, category (cached); display config async or sync for templates:

```typescript
const user = await wiki.getUserInfo("Todepond")
const avatar = await wiki.getUserAvatar("Todepond")
const display = await wiki.getUserCategoryDisplay("Todepond")
```

**ML predictions** – damaging/goodfaith per revision or batch (Lift Wing or ORES):

```typescript
const damaging = await wiki.getDamagingPrediction(revId)
const goodfaith = await wiki.getGoodfaithPrediction(revId)
const damagingMap = await wiki.getDamagingPredictions([revId1, revId2])
const goodfaithMap = await wiki.getGoodFaithPredictions([revId1, revId2])
const predictions = await wiki.getRevisionPredictions([revId1, revId2])
const predictionsOres = await wiki.getRevisionPredictionsFromOres([revId1, revId2])
```

**URLs and formatting** – page/revision/user/history/edit URLs; date and delta formatting; delta CSS class:

```typescript
const pageUrl = wiki.getPageUrl("Wikipedia")
const revUrl = wiki.getRevisionUrl("Wikipedia", 123456789)
const formatted = wiki.formatDate(rev.timestamp, "short")
const deltaClass = wiki.getDeltaClass(rev.delta)
```

**Result and state helpers** – loading/error/data state for UI; storage keys for prototypes:

```typescript
const result = wiki.createResult<FWRevision>()
const keys = wiki.getStorageKeys("MyPrototype", "query", 3)
```

## Hooks

Composables that work with `FakeWiki` for common prototype patterns. Feed hooks populate the user category cache; use `wiki.getCachedUserCategoryDisplay(userName)` in templates for icon/color.

**`useFeed`** – combined feed from page and user search queries, with load-more and edit-summary processing.

```typescript
import { useFeed } from "fakewiki"
import { ref } from "vue"

const pageQueries = ref(["Wikipedia", "Wet Leg"])
const userQueries = ref(["Todepond", "Samwalton9"])
const { allRevisionsData, loadFeed, isLoading, hasMore, loadMore } = useFeed({
	wiki,
	pageSearchQueries: pageQueries,
	userSearchQueries: userQueries,
})
await loadFeed()
```

**`useRelatedChanges`** – single or multi-page related changes feed with summarized comments.

```typescript
import { useRelatedChanges } from "fakewiki"

const pageName = ref("Wikipedia")
const { allRevisionsData, loadFeed, isLoading } = useRelatedChanges({
	wiki,
	pageName,
})
await loadFeed()
```

**`usePredictions`** – lazy-load damaging/goodfaith predictions for revision IDs, with icon/color and text for UI.

```typescript
import { usePredictions } from "fakewiki"

const { revisionPredictions, loadPrediction, getPredictionIcon, getPredictionText } =
	usePredictions(wiki, {
		source: "liftwing",
	})
await loadPrediction(revisionId)
const state = getPredictionIcon(revisionId)
const message = getPredictionText(revisionId)
```

**`useRelatedChangesRecommendations`** – recommend related pages from a feed’s revisions and merge recommended revisions into the feed.

```typescript
import { useRelatedChangesRecommendations } from "fakewiki"

const pageQueries = ref(["Wikipedia", "Wet Leg"])
const allRevisionsData = ref(revisionsFromFeed)
const filterKeepPercent = ref(15)
const { interleavedRevisions, loadRecommendations, recommendationProgress } =
	useRelatedChangesRecommendations({
		wiki,
		pageSearchQueries: pageQueries,
		allRevisionsData,
		filterKeepPercent,
	})
await loadRecommendations()
```

**`useListBuildingRecommendations`** – recommend pages from list-building API and merge those revisions into the feed.

```typescript
import { useListBuildingRecommendations } from "fakewiki"

const pageQueries = ref(["Wikipedia", "Wet Leg"])
const allRevisionsData = ref(revisionsFromFeed)
const { interleavedRevisions, loadRecommendations, recommendationProgress } =
	useListBuildingRecommendations({
		wiki,
		pageSearchQueries: pageQueries,
		allRevisionsData,
	})
await loadRecommendations()
```

See the source for full options and return shapes.

## Package exports

| Export                     | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| `fakewiki`                 | Main entry: `FakeWiki`, all types, and all hooks (useUser, useFeed, etc.) |
| `fakewiki/style/delta.css` | CSS for delta (change size) indicators                                    |

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
