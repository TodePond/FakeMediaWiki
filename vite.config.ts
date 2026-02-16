import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { URL, fileURLToPath } from "node:url"

import vue from "@vitejs/plugin-vue"
import vueJsx from "@vitejs/plugin-vue-jsx"
import { defineConfig } from "vite"
import { prototypeMetadata } from "./src/prototypes/prototypes.ts"

// Generate entry points from registry
function generateEntryPoints(): Record<string, string> {
	const entryPoints: Record<string, string> = {
		main: fileURLToPath(new URL("./index.html", import.meta.url)),
		"404": fileURLToPath(new URL("./404.html", import.meta.url)),
	}

	// Create a unique entry point for each prototype based on its wrapper and id
	const uniquePrototypes = new Map<string, (typeof prototypeMetadata)[0]>()
	prototypeMetadata.forEach(prototype => {
		const key = `${prototype.wrapper}/${prototype.id}`
		if (!uniquePrototypes.has(key)) {
			uniquePrototypes.set(key, prototype)
		}
	})

	uniquePrototypes.forEach((_prototype, key) => {
		const [wrapper, id] = key.split("/")
		if (wrapper && id) {
			const entryName = `${wrapper.toLowerCase()}-${id.toLowerCase()}`
			const entryPath = fileURLToPath(
				new URL(`./entry-points/${wrapper}/${id}.html`, import.meta.url)
			)
			entryPoints[entryName] = entryPath
		}
	})

	return entryPoints
}

// Create HTML entry point files
function createEntryPointFiles(): void {
	const baseUrl = process.env.BASE_URL || "/"
	const entryPointsDir = fileURLToPath(new URL("./entry-points", import.meta.url))
	const indexHtmlTemplate = readFileSync(
		fileURLToPath(new URL("./index.html", import.meta.url)),
		"utf-8"
	)

	const uniquePrototypes = new Map<string, (typeof prototypeMetadata)[0]>()
	prototypeMetadata.forEach(prototype => {
		const key = `${prototype.wrapper}/${prototype.id}`
		if (!uniquePrototypes.has(key)) {
			uniquePrototypes.set(key, prototype)
		}
	})

	uniquePrototypes.forEach((_prototype, key) => {
		const [wrapper, id] = key.split("/")
		if (wrapper && id) {
			// Build route path with base URL
			const routePath = `${baseUrl.replace(/\/$/, "")}/${wrapper}/${id}`

			const htmlContent = indexHtmlTemplate.replace(
				"<title>Fake MediaWiki</title>",
				`<title>${id} - Fake MediaWiki</title>`
			)
			// Add a script to set the initial route
			const routeScript = `
    <script>
      // Set initial route for this prototype
      window.__INITIAL_ROUTE__ = '${routePath}';
    </script>`
			const modifiedHtml = htmlContent.replace(
				'<script type="module" src="/src/main.ts"></script>',
				`${routeScript}\n    <script type="module" src="/src/main.ts"></script>`
			)

			const filePath = join(entryPointsDir, wrapper, `${id}.html`)
			mkdirSync(dirname(filePath), { recursive: true })
			writeFileSync(filePath, modifiedHtml)
		}
	})
}

// Create entry point files
createEntryPointFiles()

// Generate entry points object
const entryPoints = generateEntryPoints()

// https://vite.dev/config/
export default defineConfig({
	base: process.env.BASE_URL || "/",
	plugins: [vue(), vueJsx()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	build: {
		rollupOptions: {
			input: entryPoints,
		},
	},
})
