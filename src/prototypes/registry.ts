import type { Component } from "vue"
import { defineAsyncComponent } from "vue"
import { prototypeMetadata, categories } from "./prototypes"

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
	wrapper?: string
}

/**
 * Build prototypes array from metadata
 */
export const prototypes: PrototypeDefinition[] = prototypeMetadata.filter(
	meta => componentLoaderMap[meta.id] !== undefined
)

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
 * Get prototypes grouped by category in the defined order
 */
export function getPrototypesByCategory(): Record<string, PrototypeDefinition[]> {
	const grouped: Record<string, PrototypeDefinition[]> = {}
	
	// Initialize all categories from categories array
	for (const category of categories) {
		grouped[category.id] = []
	}
	
	// Group prototypes by category
	for (const prototype of prototypes) {
		const category = prototype.category
		if (!grouped[category]) {
			grouped[category] = []
		}
		grouped[category].push(prototype)
	}
	
	return grouped
}
