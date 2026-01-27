import { prototypeMetadata } from "./prototypes.js";

// Dynamically import all components using Vite's glob import
// @ts-expect-error - import.meta.glob is a Vite-specific feature
const componentModules = import.meta.glob("./*/index.vue", { eager: true });

// Build component map from glob imports
// Extract component name from path (e.g., "./Card/index.vue" -> "Card")
const componentMap = {};
for (const [path, module] of Object.entries(componentModules)) {
  const componentName = path.match(/\.\/([^/]+)\/index\.vue$/)?.[1];
  if (componentName) {
    componentMap[componentName] = module.default;
  }
}

/**
 * @typedef {object} PrototypeDefinition
 * @property {string} id
 * @property {import("vue").Component} component
 * @property {boolean} [pinned]
 * @property {string} [wrapper]
 */

/**
 * Build prototypes array from metadata and component map
 * @type {PrototypeDefinition[]}
 */
export const prototypes = prototypeMetadata.map((meta) => ({
  id: meta.id,
  component: componentMap[meta.componentName],
  wrapper: meta.wrapper,
  pinned: meta.pinned,
}));

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));

export function getPinnedPrototypes() {
  return prototypes.filter((p) => p.pinned);
}

export function getUnpinnedPrototypes() {
  return prototypes.filter((p) => !p.pinned);
}
