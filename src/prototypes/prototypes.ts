export type PrototypeDefinitionType = "prototype" | "variants" | "variant"

export type PrototypeDefinitionBase = {
	id: string
	name: string
	description: string
	new?: boolean
	updated?: boolean
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

export const prototypeMetadata: PrototypeDefinition[] = [
	{
		type: "variants",
		id: "CombinedFeed",
		name: "Combined feed",
		description: "A feed that combines multiple sources into one.",
		category: "feed",
		updated: true,
		variants: [
			{
				type: "variant",
				id: "CustomPageFeed",
				title: "Combined feed (user)",
				name: "User variant",
				description: "Use the user as the primary source.",
				wrapper: "Special",
			},
			{
				type: "variant",
				id: "CustomThumbnailFeed",
				title: "Combined feed (page)",
				name: "Page variant",
				description: "Use the page as the primary source.",
				wrapper: "Special",
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
		description: "How to render the HTML representation of a page.",
		category: "page",
		variants: [
			{
				id: "PageHtml",
				name: "Desktop variant",
				description: "Get the desktop version.",
				wrapper: "Component",
				type: "variant",
				title: "Desktop HTML",
			},
			{
				id: "PageMobileHtml",
				name: "Mobile variant",
				description: "Get the mobile version.",
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
		name: "Page",
		description: "How to get a page's summary.",
		category: "page",
		wrapper: "Component",
		title: "Page",
	},
	{
		type: "prototype",
		id: "Card",
		name: "Card",
		description: "How to use a card component.",
		category: "components",
		wrapper: "Component",
		title: "Card component",
	},
	{
		type: "prototype",
		id: "Counter",
		name: "Counter",
		description: "How to use a button component.",
		category: "components",
		wrapper: "Component",
		title: "Button component",
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
]
