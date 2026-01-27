export interface PrototypeMetadata {
	id: string
	name: string
	description: string
	category: string
	new?: boolean
	updated?: boolean
	wrapper?: string
}

export interface CategoryDefinition {
	id: string
	name: string
	description: string
}

// Define categories with their descriptions in display order
export const categories: CategoryDefinition[] = [
	{
		id: "feed",
		name: "Feed",
		description: 'Early dashboard explorations based around the "feed" metaphor.',
	},
	{
		id: "page",
		name: "Page",
		description: "Simple demonstrations of API endpoints for individual wiki pages.",
	},
	{
		id: "search",
		name: "Search",
		description: "Simple demonstrations of search endpoints.",
	},
	{
		id: "api",
		name: "API",
		description: "Simple pages that demonstrate one or more API endpoints.",
	},
	{
		id: "components",
		name: "Components",
		description: "Basic examples of different Codex components.",
	},
]

export const prototypeMetadata: PrototypeMetadata[] = [
	{
		id: "CustomPageFeed",
		name: "Combined feed: User variant",
		description:
			"A feed that combines multiple sources into one feed: Pages and users.<br/>In this variant, the <strong>user</strong> is the primary source.",
		category: "feed",
		wrapper: "Tablet",
		new: true,
	},
	{
		id: "CustomThumbnailFeed",
		name: "Combined feed: Page variant",
		description:
			"A feed that combines multiple sources into one feed: Pages and users.<br/>In this variant, the <strong>page</strong> is the primary source.",
		category: "feed",
		wrapper: "Tablet",
		new: true,
	},
	{
		id: "MultiPageFeed",
		name: "Multi-page feed",
		description: "A feed that combines updates from multiple pages.",
		category: "feed",
		wrapper: "Special",
		// new: true,
	},
	{
		id: "PageFeedLined",
		name: "Page feed: Lined variant",
		description:
			"A feed component displaying wiki pages in a lined list format with clear visual separation.",
		category: "feed",
		wrapper: "Special",
		// new: true,
	},
	{
		id: "PageFeed",
		name: "Page feed: Card variant",
		description: "A standard feed component for displaying a list of wiki pages with metadata.",
		category: "feed",
		wrapper: "Special",
	},
	{
		id: "PageChanges",
		name: "Page Changes",
		description: "A basic example of...",
		category: "feed",
		wrapper: "Special",
	},
	{
		id: "SearchTitles",
		name: "Search Titles",
		description: "A search interface for...",
		category: "search",
		wrapper: "Special",
	},
	{
		id: "SearchPages",
		name: "Search Pages",
		description: "A search interface for...",
		category: "search",
		wrapper: "Special",
	},
	{
		id: "SearchUsers",
		name: "Search Users",
		description: "A search interface for...",
		category: "search",
		wrapper: "Special",
	},
	{
		id: "FeaturedPage",
		name: "Featured Page",
		description: "A basic example of...",
		category: "api",
		wrapper: "Special",
	},
	{
		id: "OnThisDay",
		name: "On This Day",
		description: "A basic example of...",
		category: "api",
		wrapper: "Special",
	},
	{
		id: "WikitextTransform",
		name: "Wikitext Transform",
		description: "A basic example of...",
		category: "api",
		wrapper: "Special",
	},
	{
		id: "PageMetadata",
		name: "Page Metadata",
		description: "A basic example of...",
		category: "page",
		wrapper: "Special",
	},
	{
		id: "PageHtml",
		name: "Page HTML",
		description: "A basic example of...",
		category: "page",
		wrapper: "Special",
	},
	{
		id: "PageSource",
		name: "Page Source",
		description: "A basic example of...",
		category: "page",
		wrapper: "Special",
	},
	{
		id: "PageMedia",
		name: "Page Media",
		description: "A basic example of...",
		category: "page",
		wrapper: "Special",
	},
	{
		id: "PageMobileHtml",
		name: "Page Mobile HTML",
		description: "A basic example of...",
		category: "page",
		wrapper: "Special",
	},
	{
		id: "RandomPage",
		name: "Random Page",
		description: "A basic example of...",
		category: "api",
		wrapper: "Special",
	},
	{
		id: "Page",
		name: "Page",
		description: "A basic example of...",
		category: "page",
		wrapper: "Special",
	},
	{
		id: "Card",
		name: "Card",
		description: "A basic example of...",
		category: "components",
		wrapper: "Special",
	},
	{
		id: "Counter",
		name: "Counter",
		description: "A basic example of...",
		category: "components",
		wrapper: "Special",
	},
	{
		id: "HelloWorld",
		name: "Hello World",
		description: "A basic example of...",
		category: "components",
		wrapper: "Special",
	},
]
