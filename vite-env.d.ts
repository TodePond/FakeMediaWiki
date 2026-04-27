/// <reference types="vite/client" />
/* eslint-disable no-unused-vars */

declare module "*.md?raw" {
	const src: string
	export default src
}

interface ImportMetaEnv {
	readonly BASE_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
	glob<T = unknown>(pattern: string, options?: { eager?: boolean }): Record<string, T>
}
