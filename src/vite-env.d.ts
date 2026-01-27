/// <reference types="vite/client" />
/* eslint-disable no-unused-vars */

interface ImportMetaEnv {
	readonly BASE_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
	glob<T = unknown>(pattern: string, options?: { eager?: boolean }): Record<string, T>
}
