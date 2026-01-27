export interface PrototypeItem {
	id: string
	name: string
	description: string
	wrapper: string
	new?: boolean
	updated?: boolean
}

export interface PrototypeMetadataBase {
	id: string
	name: string
	description: string
	category: string
	new?: boolean
	updated?: boolean
}

export interface PrototypeMetadataPrototype extends PrototypeMetadataBase {
	type: "prototype"
	wrapper: string
}

export interface PrototypeMetadataVariants extends PrototypeMetadataBase {
	type: "variants"
	variants: PrototypeItem[]
}

export type PrototypeMetadata = PrototypeMetadataPrototype | PrototypeMetadataVariants

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
		description: 'Early dashboard explorations based on the "feed" metaphor.',
	},
	{
		id: "page",
		name: "Page",
		description: "Basic demonstrations of working with real page information.",
	},
	{
		id: "search",
		name: "Search",
		description: "Basic demonstrations of using search features.",
	},
	{
		id: "api",
		name: "API",
		description: "Basic demonstrations of API endpoints.",
	},
	{
		id: "components",
		name: "Components",
		description: "Basic examples of different Codex components.",
	},
]

export const prototypeMetadata: PrototypeMetadata[] = [
	{
		type: "variants",
		id: "CombinedFeed",
		name: "Combined feed",
		description: "A feed that combines multiple sources into one.",
		category: "feed",
		new: true,
		variants: [
			{
				id: "CustomPageFeed",
				name: "User variant",
				description: "Use the user as the primary source.",
				wrapper: "Tablet",
			},
			{
				id: "CustomThumbnailFeed",
				name: "Page variant",
				description: "Use the page as the primary source.",
				wrapper: "Tablet",
			},
		],
	},
	{
		type: "prototype",
		id: "MultiPageFeed",
		name: "Multi-page feed",
		description: "A feed that combines updates from multiple pages.",
		category: "feed",
		wrapper: "Special",
		// new: true,
	},
	{
		type: "variants",
		id: "PageFeed",
		name: "Page feed",
		description: "A feed component that shows recent changes to a page.",
		category: "feed",
		variants: [
			{
				id: "PageFeedLined",
				name: "Lined variant",
				description: "Use lines to separate changes.",
				wrapper: "Special",
			},
			{
				id: "PageFeed",
				name: "Card variant",
				description: "Use cards to display changes.",
				wrapper: "Special",
			},
		],
	},
	{
		type: "prototype",
		id: "PageChanges",
		name: "Page changes",
		description: "How to get a page's recent changes from the API.",
		category: "feed",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "SearchTitles",
		name: "Search titles",
		description: "How to search page titles using the API.",
		category: "search",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "SearchPages",
		name: "Search pages",
		description: "How to search page content using the API.",
		category: "search",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "SearchUsers",
		name: "Search users",
		description: "How to search user accounts using the API.",
		category: "search",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "FeaturedPage",
		name: "Featured page",
		description: "How to get a featured page from the API.",
		category: "api",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "OnThisDay",
		name: "On this day",
		description: "How to get pages that relate to a specific date.",
		category: "api",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "WikitextTransform",
		name: "Wikitext transform",
		description: "How to transform wikitext to HTML using the API.",
		category: "api",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "PageMetadata",
		name: "Page metadata",
		description: "How to get a page's metadata from the API.",
		category: "page",
		wrapper: "Special",
	},
	{
		type: "variants",
		id: "PageHtml",
		name: "Page HTML",
		description: "How to render the HTML representation of a page.",
		category: "page",
		variants: [
			{
				id: "PageHtml",
				name: "Desktop variant",
				description: "Get the desktop version.",
				wrapper: "Special",
			},
			{
				id: "PageMobileHtml",
				name: "Mobile variant",
				description: "Get the mobile version.",
				wrapper: "Special",
			},
		],
	},
	{
		type: "prototype",
		id: "PageSource",
		name: "Page source",
		description: "How to get a page's source.",
		category: "page",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "PageMedia",
		name: "Page media",
		description: "How to get a page's media items.",
		category: "page",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "RandomPage",
		name: "Random page",
		description: "How to get a random page from the API.",
		category: "api",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "Page",
		name: "Page",
		description: "How to get a page's summary.",
		category: "page",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "Card",
		name: "Card",
		description: "How to use a card component.",
		category: "components",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "Counter",
		name: "Counter",
		description: "How to use a button component.",
		category: "components",
		wrapper: "Special",
	},
	{
		type: "prototype",
		id: "HelloWorld",
		name: "Hello world",
		description: "How to use codex components.",
		category: "components",
		wrapper: "Special",
	},
]
