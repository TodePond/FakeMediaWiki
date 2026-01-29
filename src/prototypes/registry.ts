import type { Component } from "vue"
import { defineAsyncComponent } from "vue"
import { categories, PrototypeDefinition, prototypeMetadata, wrappers } from "./prototypes"

export { categories, wrappers }

// Dynamically import all components using Vite's glob import (lazy loading)
// @ts-ignore - import.meta.glob is a Vite-specific feature
const componentModules = import.meta.glob<{ default: Component }>("./*/index.vue")

// Build component loader map from glob imports
// Extract component name from path (e.g., "./Card/index.vue" -> "Card")
const componentLoaderMap: Record<string, () => Promise<{ default: Component }>> = {}
for (const [path, loader] of Object.entries(componentModules)) {
	const componentName = path.match(/\.\/([^/]+)\/index\.vue$/)?.[1]
	if (componentName && loader) {
		componentLoaderMap[componentName] = loader
	}
}

// Cache for async components to avoid recreating them
const asyncComponentCache = new Map<string, Component>()

/**
 * Build flat list of all individual prototypes for component loading
 */
export const prototypes: PrototypeDefinition[] = []
for (const meta of prototypeMetadata) {
	if (meta.type === "prototype") {
		const component = meta.component ?? meta.id
		if (componentLoaderMap[component] !== undefined) {
			prototypes.push({
				id: meta.id,
				component,
				name: meta.name,
				description: meta.description,
				category: meta.category,
				wrapper: meta.wrapper,
				status: meta.status,
				type: "prototype",
				title: meta.title,
			})
		}
	} else if (meta.type === "variants") {
		for (const variant of meta.variants) {
			const component = variant.component ?? variant.id
			if (componentLoaderMap[component] !== undefined) {
				prototypes.push({
					id: variant.id,
					component,
					name: variant.name,
					description: variant.description,
					wrapper: variant.wrapper,
					status: variant.status ?? meta.status,
					type: "variant",
					title: variant.title,
				})
			}
		}
	}
}

export function getPrototype(id: string): PrototypeDefinition<"prototype" | "variant"> | undefined {
	const prototype = prototypes.find(p => p.id === id)
	if (prototype?.type === "variants") {
		throw new Error(`Prototype ${id} is a group of variant and cannot be retrieved directly`)
	}
	return prototype
}

/**
 * Build prototype groups for display (preserves variant grouping)
 */
export const prototypeGroups: PrototypeDefinition<"prototype" | "variants">[] = []
for (const meta of prototypeMetadata) {
	if (meta.type === "prototype") {
		// Only include if component exists
		const component = meta.component ?? meta.id
		if (componentLoaderMap[component] !== undefined) {
			prototypeGroups.push({
				id: meta.id,
				component,
				name: meta.name,
				description: meta.description,
				category: meta.category,
				type: "prototype",
				wrapper: meta.wrapper,
				status: meta.status,
				title: meta.title,
			})
		}
	} else if (meta.type === "variants") {
		// Only include if at least one variant component exists
		const validVariants = meta.variants.filter(
			v => componentLoaderMap[v.component ?? v.id] !== undefined
		)
		if (validVariants.length > 0) {
			prototypeGroups.push({
				id: meta.id,
				name: meta.name,
				description: meta.description,
				category: meta.category,
				type: "variants",
				status: meta.status,
				variants: validVariants,
			})
		}
	}
}

/**
 * Get a lazy-loaded component by prototype ID
 */
export function getPrototypeComponent(id: string): Component | undefined {
	// Check cache first
	if (asyncComponentCache.has(id)) {
		return asyncComponentCache.get(id)
	}

	const prototype = prototypes.find(p => p.id === id)
	if (!prototype) {
		return undefined
	}
	const component = prototype.component ?? prototype.id
	const loader = componentLoaderMap[component]
	if (!loader) {
		return undefined
	}

	// Create async component and cache it
	const asyncComponent = defineAsyncComponent(loader)
	asyncComponentCache.set(id, asyncComponent)
	return asyncComponent
}

/**
 * Get prototype groups grouped by category in the defined order
 */
export function getPrototypeGroupsByCategory(): Record<
	string,
	PrototypeDefinition<"prototype" | "variants">[]
> {
	const grouped: Record<string, PrototypeDefinition<"prototype" | "variants">[]> = {}

	// Initialize all categories from categories array
	for (const category of categories) {
		grouped[category.id] = []
	}

	// Group prototype groups by category
	for (const group of prototypeGroups) {
		const category = group.category
		if (!grouped[category]) {
			grouped[category] = []
		}
		grouped[category].push(group)
	}

	return grouped
}

/**
 * Get wrapper definition by ID
 */
export function getWrapper(id: string) {
	return wrappers.find(w => w.id === id)
}

/**
 * Get wrapper name by ID, falling back to the ID if not found
 */
export function getWrapperName(id: string): string {
	const wrapper = getWrapper(id)
	return wrapper?.name ?? id
}
