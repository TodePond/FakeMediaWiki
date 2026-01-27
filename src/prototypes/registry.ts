import type { Component } from "vue";
import { prototypeMetadata, type PrototypeMetadata } from "./prototypes";

// Dynamically import all components using Vite's glob import
const componentModules = import.meta.glob<{ default: Component }>("./*/index.vue", { eager: true });

// Build component map from glob imports
// Extract component name from path (e.g., "./Card/index.vue" -> "Card")
const componentMap: Record<string, Component> = {};
for (const [path, module] of Object.entries(componentModules)) {
  const componentName = path.match(/\.\/([^/]+)\/index\.vue$/)?.[1];
  if (componentName) {
    componentMap[componentName] = module.default;
  }
}

export interface PrototypeDefinition {
  id: string;
  component: Component;
  pinned?: boolean;
  wrapper?: string;
}

/**
 * Build prototypes array from metadata and component map
 */
export const prototypes: PrototypeDefinition[] = prototypeMetadata.map((meta) => ({
  id: meta.id,
  component: componentMap[meta.componentName],
  wrapper: meta.wrapper,
  pinned: meta.pinned,
}));

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));

export function getPinnedPrototypes(): PrototypeDefinition[] {
  return prototypes.filter((p) => p.pinned);
}

export function getUnpinnedPrototypes(): PrototypeDefinition[] {
  return prototypes.filter((p) => !p.pinned);
}
