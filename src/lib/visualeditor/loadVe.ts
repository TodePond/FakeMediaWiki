/**
 * Load VisualEditor bundle and styles from /ve/ (vendored in public/ve/).
 * Injects script/link tags when first needed and returns a promise when window.ve is ready.
 */

const VE_BASE = "/ve"

const STYLES = [
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-accessibility.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-alerts.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-content.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-interactions.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-layout.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-location.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-media.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-moderation.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-movement.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-user.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-editing-core.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-editing-advanced.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-editing-functions.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-editing-styling.css`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui-icons-editing-list.css`,
	`${VE_BASE}/dist/visualEditor-wikimediaui.css`,
]

const SCRIPTS = [
	`${VE_BASE}/lib/jquery/jquery.js`,
	`${VE_BASE}/lib/oojs/oojs.js`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-core.js`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-widgets.js`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-toolbars.js`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-windows.js`,
	`${VE_BASE}/dist/lib/jquery.i18n.js`,
	`${VE_BASE}/dist/lib/jquery.uls.data.js`,
	`${VE_BASE}/lib/jquery.client/jquery.client.js`,
	`${VE_BASE}/lib/papaparse/papaparse.js`,
	`${VE_BASE}/lib/oojs-ui/oojs-ui-wikimediaui.js`,
	`${VE_BASE}/dist/visualEditor.js`,
]

let loadPromise: Promise<void> | null = null
let platformPromise: Promise<void> | null = null

function loadStyles(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector('link[href*="/ve/dist/visualEditor-wikimediaui.css"]')) {
			resolve()
			return
		}
		let remaining = STYLES.length
		const onLoad = () => {
			remaining--
			if (remaining === 0) resolve()
		}
		for (const href of STYLES) {
			const link = document.createElement("link")
			link.rel = "stylesheet"
			link.href = href
			link.onload = onLoad
			link.onerror = () => reject(new Error(`Failed to load VE styles: ${href}`))
			document.head.appendChild(link)
		}
	})
}

function loadScripts(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (typeof window.ve !== "undefined") {
			resolve()
			return
		}
		let index = 0
		function loadNext() {
			if (index >= SCRIPTS.length) {
				// Set message paths before any code uses platform
				if (window.ve && !window.ve.messagePaths) {
					window.ve.messagePaths = [
						`${VE_BASE}/dist/i18n/`,
						`${VE_BASE}/lib/oojs-ui/i18n/`,
					]
				}
				resolve()
				return
			}
			const src = SCRIPTS[index++]
			const script = document.createElement("script")
			script.src = src
			script.async = false
			script.onload = loadNext
			script.onerror = () => reject(new Error(`Failed to load VE script: ${src}`))
			document.head.appendChild(script)
		}
		loadNext()
	})
}

/**
 * Ensure VisualEditor bundle and styles are loaded. Resolves when window.ve is defined.
 * Safe to call multiple times; loads at most once.
 */
export function whenVeReady(): Promise<void> {
	if (loadPromise) return loadPromise
	loadPromise = loadStyles().then(() => loadScripts())
	return loadPromise
}

/**
 * Ensure VisualEditor platform is initialized (so ve.init.platform and ve.msg work).
 * Required for the diff view when it describes formatting-only changes (e.g. bold → italic).
 * Safe to call multiple times; initializes at most once.
 */
export function whenVePlatformReady(): Promise<void> {
	if (platformPromise) return platformPromise
	platformPromise = whenVeReady().then(() => {
		const ve = window.ve
		if (!ve?.init?.sa?.Platform) return
		if (ve.init.platform) return
		const platform = new ve.init.sa.Platform(ve.messagePaths ?? [])
		return platform.getInitializedPromise() as Promise<void>
	})
	return platformPromise
}
