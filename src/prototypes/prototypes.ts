export type PrototypeDefinitionType = "prototype" | "variants" | "variant"

export type PrototypeStatus = "new" | "updated" | "wip"

export type PrototypeDefinitionBase = {
	id: string
	/** Component folder name to load; defaults to id when omitted */
	component?: string
	name: string
	description: string
	status?: PrototypeStatus
}

export type PrototypeDefinitionPrototype = PrototypeDefinitionBase & {
	type: "prototype"
	title: string
	category: string
	wrapper: string
}

export type PrototypeDefinitionVariants = PrototypeDefinitionBase & {
	type: "variants"
	category: string
	variants: PrototypeDefinition<"variant">[]
}

export type PrototypeDefinitionVariant = PrototypeDefinitionBase & {
	type: "variant"
	title: string
	wrapper: string
}

export type PrototypeDefinition<T extends PrototypeDefinitionType = PrototypeDefinitionType> = (
	| PrototypeDefinitionPrototype
	| PrototypeDefinitionVariants
	| PrototypeDefinitionVariant
) & {
	type: T
}

export type CategoryDefinition = {
	id: string
	name: string
	description: string
}

export type WrapperDefinition = {
	id: string
	name: string
}

// Define wrappers with their display names
export const wrappers: WrapperDefinition[] = [
	{
		id: "Special",
		name: "Special page",
	},
	{
		id: "Component",
		name: "Component",
	},
	{
		id: "Fullscreen",
		name: "Fullscreen",
	},
]

// Define categories with their descriptions in display order
export const categories: CategoryDefinition[] = [
	{
		id: "feed",
		name: "Feed",
		description: 'Early dashboard explorations based on the "feed" metaphor.',
	},
	{
		id: "wrappers",
		name: "Wrappers",
		description: "Demonstrations of the various wrappers that are available for prototypes.",
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

export const prototypeMetadata: PrototypeDefinition<"prototype" | "variants">[] = [
	{
		type: "variants",
		id: "DiffFeed",
		name: "Diff feed",
		description: "A feed that shows inline diffs of changes.",
		category: "feed",
		variants: [
			{
				type: "variant",
				id: "DiffFeed",
				title: "Diff user feed",
				name: "Diff user feed",
				description: "A feed that shows inline diffs with user avatars.",
				wrapper: "Special",
				status: "new",
			},
			{
				type: "variant",
				id: "DiffFeedThumbnail",
				title: "Diff page feed",
				name: "Diff page feed",
				description: "A feed that shows inline diffs with page thumbnails.",
				wrapper: "Special",
				status: "new",
			},
		],
	},
	{
		type: "variants",
		id: "CombinedFeed",
		name: "Combined feed",
		description: "A feed that combines multiple sources into one.",
		category: "feed",
		variants: [
			{
				type: "variant",
				id: "SmoothWatchlist",
				title: "Enhanced watchlist",
				name: "Enhanced watchlist",
				description:
					"A combined feed that presents results like the Watchlist, but changed so that it doesn't break Lu's brain.",
				wrapper: "Special",
				status: "wip",
			},
			{
				type: "variant",
				id: "WatchlistFeed",
				title: "Combined watchlist",
				name: "Combined watchlist",
				description: "A combined feed that presents results exactly like the Watchlist.",
				wrapper: "Special",
				status: "new",
			},
			{
				type: "variant",
				id: "CustomPageFeed",
				title: "Combined user feed",
				name: "Combined user feed",
				description: "A combined feed that presents results exactly like the Custom page.",
				wrapper: "Special",
				status: "updated",
			},
			{
				type: "variant",
				id: "CustomThumbnailFeed",
				title: "Combined page feed",
				name: "Combined page feed",
				description: "Use the page as the primary source.",
				wrapper: "Special",
				status: "updated",
			},
		],
	},
	{
		type: "prototype",
		id: "MultiPageFeed",
		name: "Multi-page feed",
		description: "A feed that combines updates from multiple pages.",
		category: "feed",
		wrapper: "Component",
		title: "Multi-page feed",
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
				wrapper: "Component",
				title: "Lined feed",
				type: "variant",
			},
			{
				id: "PageFeed",
				name: "Card variant",
				description: "Use cards to display changes.",
				wrapper: "Component",
				title: "Card feed",
				type: "variant",
			},
		],
	},
	{
		type: "prototype",
		id: "PageChanges",
		name: "Page changes",
		description: "How to get a page's recent changes from the API.",
		category: "feed",
		wrapper: "Component",
		title: "Page changes",
	},
	{
		type: "prototype",
		id: "SearchTitles",
		name: "Search titles",
		description: "How to search page titles using the API.",
		category: "search",
		wrapper: "Component",
		title: "Search titles",
	},
	{
		type: "prototype",
		id: "SearchPages",
		name: "Search pages",
		description: "How to search page content using the API.",
		category: "search",
		wrapper: "Component",
		title: "Search pages",
	},
	{
		type: "prototype",
		id: "SearchUsers",
		name: "Search users",
		description: "How to search user accounts using the API.",
		category: "search",
		wrapper: "Component",
		title: "Search users",
	},
	{
		type: "prototype",
		id: "FeaturedPage",
		name: "Featured page",
		description: "How to get a featured page from the API.",
		category: "api",
		wrapper: "Component",
		title: "Featured page",
	},
	{
		type: "prototype",
		id: "OnThisDay",
		name: "On this day",
		description: "How to get pages that relate to a specific date.",
		category: "api",
		wrapper: "Component",
		title: "On this day",
	},
	{
		type: "prototype",
		id: "WikitextTransform",
		name: "Wikitext transform",
		description: "How to transform wikitext to HTML using the API.",
		category: "api",
		wrapper: "Component",
		title: "Wikitext transform",
	},
	{
		type: "prototype",
		id: "PageMetadata",
		name: "Page metadata",
		description: "How to get a page's metadata from the API.",
		category: "page",
		wrapper: "Component",
		title: "Page metadata",
	},
	{
		type: "variants",
		id: "PageHtml",
		name: "Page HTML",
		description: "How to retrieve and render the HTML of a page.",
		category: "page",
		variants: [
			{
				id: "PageHtml",
				name: "Desktop page HTML",
				description: "Get a desktop page.",
				wrapper: "Component",
				type: "variant",
				title: "Desktop HTML",
			},
			{
				id: "PageMobileHtml",
				name: "Mobile page HTML",
				description: "Get a mobile page.",
				wrapper: "Component",
				type: "variant",
				title: "Mobile HTML",
			},
		],
	},
	{
		type: "prototype",
		id: "PageSource",
		name: "Page source",
		description: "How to get a page's source.",
		category: "page",
		wrapper: "Component",
		title: "Page source",
	},
	{
		type: "prototype",
		id: "PageMedia",
		name: "Page media",
		description: "How to get a page's media items.",
		category: "page",
		wrapper: "Component",
		title: "Page media",
	},
	{
		type: "prototype",
		id: "RandomPage",
		name: "Random page",
		description: "How to get a random page from the API.",
		category: "api",
		wrapper: "Component",
		title: "Random page",
	},
	{
		type: "prototype",
		id: "Page",
		name: "Page summary",
		description: "How to get a page's summary.",
		category: "page",
		wrapper: "Component",
		title: "Page summary",
	},
	{
		type: "prototype",
		id: "Chip",
		name: "Filter",
		description: "An example of a chip filter component.",
		category: "components",
		wrapper: "Component",
		title: "Filter",
		status: "new",
	},
	{
		type: "prototype",
		id: "Card",
		name: "Card",
		description: "How to use a card component.",
		category: "components",
		wrapper: "Component",
		title: "Card",
	},
	{
		type: "prototype",
		id: "Counter",
		name: "Button",
		description: "How to use a button component.",
		category: "components",
		wrapper: "Component",
		title: "Button",
	},
	{
		type: "prototype",
		id: "HelloWorld",
		name: "Hello world",
		description: "How to use codex components.",
		category: "components",
		wrapper: "Component",
		title: "Hello world",
	},

	{
		type: "prototype",
		id: "WrapperDemo-Special",
		component: "WrapperDemo",
		title: "Special page wrapper",
		name: "Special page wrapper",
		description: "View this prototype in the Special page layout.",
		wrapper: "Special",
		category: "wrappers",
		status: "new",
	},
	{
		type: "prototype",
		id: "WrapperDemo-Component",
		component: "WrapperDemo",
		title: "Component wrapper",
		name: "Component wrapper",
		description: "View this prototype in the Component (tablet) layout.",
		wrapper: "Component",
		category: "wrappers",
		status: "new",
	},
	{
		type: "prototype",
		id: "WrapperDemo-Fullscreen",
		component: "WrapperDemo",
		title: "Fullscreen wrapper",
		name: "Fullscreen wrapper",
		description: "View this prototype in the Fullscreen layout.",
		wrapper: "Fullscreen",
		category: "wrappers",
		status: "new",
	},
]
