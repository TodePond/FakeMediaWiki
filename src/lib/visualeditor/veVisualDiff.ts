/**
 * Produce visual diff HTML from two HTML strings using VisualEditor's diff view.
 * Used by the VisualDiff component; prefer using the component rather than calling this directly.
 */
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
	})
	return doc.documentElement.outerHTML
}

/**
 * Build VisualEditor diff from old/new HTML and return the diff element's HTML.
 * Normalizes both HTML strings before diffing to reduce spurious "all links changed" noise.
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
	const wrappedOld = wrapFragmentForVe(oldHtml ?? "")
	const wrappedNew = wrapFragmentForVe(newHtml ?? "")
	const normalizedOld = normalizeHtmlForVisualDiff(wrappedOld)
	const normalizedNew = normalizeHtmlForVisualDiff(wrappedNew)
	const oldDoc = htmlToModelSync(normalizedOld)
	const newDoc = htmlToModelSync(normalizedNew)
	const visualDiff = new ve.dm.VisualDiff(oldDoc, newDoc)
	const element = new ve.ui.DiffElement(visualDiff)
	const el = element.$element?.[0]
	return el ? el.outerHTML : ""
}
