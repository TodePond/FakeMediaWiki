/**
 * Produce visual diff HTML from two HTML strings using VisualEditor's diff view.
 * Used by the VisualDiff component; prefer using the component rather than calling this directly.
 * When the HTML contains Parsoid data-mw, template parameter changes are injected into
 * the before/after HTML so the existing VE diff (and its sidebar) shows them as normal
 * content changes (e.g. removals in red, additions in green).
 */
import {
	extractTemplatesFromHtml,
	getTemplateParamChanges,
	injectTemplateParamDiffsIntoHtml,
} from "./templateParamDiff"
import { whenVePlatformReady } from "./loadVe"
import { htmlToModelSync } from "./veConversion"

/** Minimal full document so VE's parser can handle fragment or empty content */
function wrapFragmentForVe(html: string): string {
	const body = html.trim() ? html : "<p></p>"
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`
}

/**
 * Normalize Parsoid/MediaWiki HTML so that revision-specific or render-specific
 * attributes don't cause every link or node to appear changed in the visual diff.
 * We strip data-mw and similar attributes so that unchanged templates don't show
 * as full block delete+add when only metadata (e.g. JSON ordering, about ids, RDFa)
 * differs between revisions.
 */
function normalizeHtmlForVisualDiff(html: string): string {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, "text/html")
	const stripAttrs = [
		"data-parsoid",
		"data-mw",
		"data-ve-attributes",
		"id",
		"about", // Parsoid template/node ids (#mwt1, etc.) can differ between revisions
		"rel", // RDFa; ordering or values can vary
		"typeof", // RDFa type; can vary by revision
		"resource", // RDFa resource URI; often revision-specific
	]
	doc.querySelectorAll("*").forEach(el => {
		stripAttrs.forEach(attr => el.removeAttribute(attr))
		// Normalize internal link hrefs: remove query and fragment so same target compares equal
		if (el.tagName === "A" && el.getAttribute("href")) {
			const href = el.getAttribute("href")!
			try {
				const url = new URL(href, "https://en.wikipedia.org")
				if (url.pathname.startsWith("/wiki/")) {
					el.setAttribute("href", url.pathname)
				}
			} catch {
				// leave href as-is if not parseable
			}
		}
		// Normalize map/static image URLs: Kartographer and similar embed revid in img src/srcset,
		// so the same map shows as changed when comparing revisions. Strip revid and parser params.
		if (el.tagName === "IMG") {
			const src = el.getAttribute("src")
			if (src) {
				const normalized = normalizeMapOrStaticImageUrl(src)
				if (normalized !== src) el.setAttribute("src", normalized)
			}
			const srcset = el.getAttribute("srcset")
			if (srcset) {
				el.setAttribute(
					"srcset",
					srcset
						.split(",")
						.map(part => {
							const s = part.trim().split(/\s+/)[0]
							if (!s) return part.trim()
							const n = normalizeMapOrStaticImageUrl(s)
							return part.trim().replace(s, n)
						})
						.join(", ")
				)
			}
		}
	})
	return doc.documentElement.outerHTML
}

/**
 * Strip revision-specific query params from map/static image URLs (e.g. Kartographer)
 * so the same map compares equal across revisions.
 */
function normalizeMapOrStaticImageUrl(urlString: string): string {
	try {
		const url = new URL(urlString, "https://en.wikipedia.org")
		// Kartographer static map tiles include revid= and parser=parsoid; revid differs per revision
		if (url.hostname === "maps.wikimedia.org") {
			url.searchParams.delete("revid")
			url.searchParams.delete("parser")
		}
		return url.toString()
	} catch {
		return urlString
	}
}

/**
 * Build VisualEditor diff from old/new HTML and return the diff element's HTML.
 * Normalizes both HTML strings before diffing to reduce spurious "all links changed" noise.
 * If the raw HTML contains data-mw template markup, template parameter changes are
 * injected into both documents so the VE diff shows them as normal content changes
 * (triggering the usual sidebar and remove/insert styling).
 * Accepts empty string for one side (e.g. first revision = all add, or all remove).
 *
 * @param oldHtml - HTML of the older revision (or removed content); may be empty
 * @param newHtml - HTML of the newer revision (or added content); may be empty
 * @returns HTML string of the visual diff (suitable for v-html or dynamic placement)
 */
export async function renderVisualDiffToHtml(oldHtml: string, newHtml: string): Promise<string> {
	await whenVePlatformReady()
	const ve = window.ve
	if (!ve) return ""
	// Allow empty side (e.g. first revision = all added, or pure deletion)
	let wrappedOld = wrapFragmentForVe(oldHtml ?? "")
	let wrappedNew = wrapFragmentForVe(newHtml ?? "")
	// Extract template param changes from raw HTML (with data-mw), then inject them
	// so the VE diff treats them as normal content changes (sidebar + remove/insert styling)
	const oldTemplates = extractTemplatesFromHtml(wrappedOld)
	const newTemplates = extractTemplatesFromHtml(wrappedNew)
	const paramChanges = getTemplateParamChanges(oldTemplates, newTemplates)
	const { oldHtmlInjected, newHtmlInjected } = injectTemplateParamDiffsIntoHtml(
		wrappedOld,
		wrappedNew,
		paramChanges
	)
	wrappedOld = oldHtmlInjected
	wrappedNew = newHtmlInjected

	const normalizedOld = normalizeHtmlForVisualDiff(wrappedOld)
	const normalizedNew = normalizeHtmlForVisualDiff(wrappedNew)
	const oldDoc = htmlToModelSync(normalizedOld)
	const newDoc = htmlToModelSync(normalizedNew)
	const visualDiff = new ve.dm.VisualDiff(oldDoc, newDoc)
	const element = new ve.ui.DiffElement(visualDiff)
	const el = element.$element?.[0]
	return el ? el.outerHTML : ""
}
