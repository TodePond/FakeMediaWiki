import type { Component } from "vue"
import { defineAsyncComponent } from "vue"
import { categories, prototypeMetadata } from "./prototypes"

export { categories }

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

export interface PrototypeDefinition {
	id: string
	name: string
	description: string
	category: string
	new?: boolean
	updated?: boolean
	wrapper: string
}

export interface PrototypeVariant {
	id: string
	name: string
	description: string
	wrapper: string
	new?: boolean
	updated?: boolean
}

export interface PrototypeGroup {
	id: string
	name: string
	description: string
	category: string
	type: "prototype" | "variants"
	new?: boolean
	updated?: boolean
	wrapper?: string
	variants?: PrototypeVariant[]
}

/**
 * Build flat list of all individual prototypes for component loading
 */
export const prototypes: PrototypeDefinition[] = []
for (const meta of prototypeMetadata) {
	if (meta.type === "prototype") {
		if (componentLoaderMap[meta.id] !== undefined) {
			prototypes.push({
				id: meta.id,
				name: meta.name,
				description: meta.description,
				category: meta.category,
				wrapper: meta.wrapper,
				new: meta.new,
				updated: meta.updated,
			})
		}
	} else if (meta.type === "variants") {
		for (const variant of meta.variants) {
			if (componentLoaderMap[variant.id] !== undefined) {
				prototypes.push({
					id: variant.id,
					name: variant.name,
					description: variant.description,
					category: meta.category,
					wrapper: variant.wrapper,
					new: variant.new ?? meta.new,
					updated: variant.updated ?? meta.updated,
				})
			}
		}
	}
}

/**
 * Build prototype groups for display (preserves variant grouping)
 */
export const prototypeGroups: PrototypeGroup[] = []
for (const meta of prototypeMetadata) {
	if (meta.type === "prototype") {
		// Only include if component exists
		if (componentLoaderMap[meta.id] !== undefined) {
			prototypeGroups.push({
				id: meta.id,
				name: meta.name,
				description: meta.description,
				category: meta.category,
				type: "prototype",
				wrapper: meta.wrapper,
				new: meta.new,
				updated: meta.updated,
			})
		}
	} else {
		// Only include if at least one variant component exists
		const validVariants = meta.variants.filter(
			v => componentLoaderMap[v.id] !== undefined
		)
		if (validVariants.length > 0) {
			prototypeGroups.push({
				id: meta.id,
				name: meta.name,
				description: meta.description,
				category: meta.category,
				type: "variants",
				new: meta.new,
				updated: meta.updated,
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
	const loader = componentLoaderMap[prototype.id]
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
export function getPrototypeGroupsByCategory(): Record<string, PrototypeGroup[]> {
	const grouped: Record<string, PrototypeGroup[]> = {}

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
