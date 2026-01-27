import type { Component } from "vue";
import { prototypeMetadata } from "./prototypes";

// Dynamically import all components using Vite's glob import
 
// @ts-ignore - import.meta.glob is a Vite-specific feature
const componentModules = import.meta.glob<{ default: Component }>("./*/index.vue", { eager: true });

// Build component map from glob imports
// Extract component name from path (e.g., "./Card/index.vue" -> "Card")
const componentMap: Record<string, Component | undefined> = {};
for (const [path, module] of Object.entries(componentModules)) {
  const componentName = path.match(/\.\/([^/]+)\/index\.vue$/)?.[1];
  if (componentName && module) {
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
export const prototypes: PrototypeDefinition[] = prototypeMetadata
  .map((meta) => {
    const component = componentMap[meta.componentName];
    if (!component) {
      return null;
    }
    return {
      id: meta.id,
      component,
      wrapper: meta.wrapper,
      pinned: meta.pinned,
    } as PrototypeDefinition;
  })
  .filter((p): p is PrototypeDefinition => p !== null);

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));

export function getPinnedPrototypes(): PrototypeDefinition[] {
  return prototypes.filter((p) => p.pinned);
}

export function getUnpinnedPrototypes(): PrototypeDefinition[] {
  return prototypes.filter((p) => !p.pinned);
}
