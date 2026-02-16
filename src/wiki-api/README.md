# Wiki API Reference

This directory contains API schemas and utilities for interacting with Wikimedia and MediaWiki APIs.

## Files

- `WikiApi.ts` - Main API client class with methods for interacting with Wikimedia REST API, MediaWiki REST API, and MediaWiki Action API
- `schema/mediawiki-schema.json` - OpenAPI 3.0 schema for MediaWiki REST API
- `schema/wikimedia-schema.json` - OpenAPI 3.0 schema for Wikimedia REST API

## Utility methods

The WikiApi class provides several utility methods for prototypes:

### Storage keys

- `wiki.getStorageKey(prototypeName, keyName)` - Generate a single storage key
- `wiki.getStorageKeys(prototypeName, keyName, count)` - Generate multiple storage keys

### Result types

- `Result<T>` interface - Standardized result type with `data`, `loading`, and `error` properties
- `wiki.createResult<T>()` - Create a single Result instance with default values
- `wiki.createResults<T>(count)` - Create multiple Result instances

### Delta utilities

- `wiki.getDeltaClass(delta)` - Get CSS class name for change size indicator ("positive", "negative", or "neutral")
- `style/delta.css` - Shared CSS styles for delta indicators (import this file to use the classes)

## Reference documentation

- `CODEX_REFERENCE.md` - Guide to Codex components, icons, and design tokens
- `ICON_REFERENCE.md` - Documentation of Codex icons used in the project

## API types

### Wikimedia REST API

Base URL: `https://en.wikipedia.org/api/rest_v1/`

Provides cacheable access to Wikimedia content in machine-readable formats.

### MediaWiki REST API

Base URL: `https://en.wikipedia.org/w/rest.php/v1/`

REST endpoints for MediaWiki functionality.

### MediaWiki Action API

Base URL: `https://en.wikipedia.org/w/api.php`

The traditional MediaWiki API using query parameters.

## Usage

### Basic API usage

```typescript
import { WikiApi } from "./wiki-api/WikiApi"

const wiki = new WikiApi()

// Get page summary
const summary = await wiki.getPageSummary("Wikipedia")

// Get page history
const history = await wiki.getPageHistory("Wikipedia", { limit: 5 })

// Search for pages
const results = await wiki.searchPages("query", 20)
```

### Using storage keys

```typescript
import { WikiApi } from "./wiki-api/WikiApi"

const wiki = new WikiApi()

// Single key
const key = wiki.getStorageKey("PageFeed", "searchQuery")
// Returns: "PageFeed_searchQuery"

// Multiple keys
const keys = wiki.getStorageKeys("CustomPageFeed", "pageQuery", 3)
// Returns: ["CustomPageFeed_pageQuery1", "CustomPageFeed_pageQuery2", "CustomPageFeed_pageQuery3"]
```

### Using result types

```typescript
import { WikiApi } from "./wiki-api/WikiApi"
import type { Result, Revision } from "./wiki-api/types"

const wiki = new WikiApi()

// Single result
const result = wiki.createResult<Revision>()

// Multiple results
const results = wiki.createResults<Revision>(3)
```

### Using delta utilities

```typescript
import { WikiApi } from "./wiki-api/WikiApi"
import "./wiki-api/style/delta.css"

const wiki = new WikiApi()

const className = wiki.getDeltaClass(150) // Returns "positive"
const className2 = wiki.getDeltaClass(-50) // Returns "negative"
const className3 = wiki.getDeltaClass(0) // Returns "neutral"
```

## Schema files

The schema files (`mediawiki-schema.json` and `wikimedia-schema.json`) are OpenAPI 3.0 specifications that document all available endpoints, parameters, and response formats. These can be used for:

- API documentation generation
- Type generation
- Validation
- Understanding available endpoints

## References

- [Wikimedia REST API Documentation](https://www.mediawiki.org/wiki/Wikimedia_REST_API)
- [MediaWiki REST API Documentation](https://www.mediawiki.org/wiki/API:REST_API)
- [MediaWiki Action API Documentation](https://www.mediawiki.org/wiki/API:Main_page)
