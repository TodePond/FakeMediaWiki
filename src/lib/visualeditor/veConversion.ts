/**
 * Convert between HTML and VisualEditor's document model.
 * Requires the VE loader to have run (whenVeReady) before calling.
 *
 * Quirks: VE models HTML comments as first-class nodes and renders them in the editor.
 * Round-trip HTML → model → HTML preserves comments and other VE-specific behavior.
 */
import { whenVeReady } from "./loadVe"
import type { VeDocument } from "./veTypes"

/**
 * Convert HTML string to a VE document model.
 * Use after whenVeReady() has resolved.
 */
export async function htmlToModel(
	html: string,
	options?: { lang?: string; dir?: string }
): Promise<VeDocument> {
	await whenVeReady()
	const ve = window.ve
	const htmlDoc = ve.createDocumentFromHtml(html)
	return ve.dm.converter.getModelFromDom(htmlDoc, options ?? {})
}

/**
 * Convert a VE document model to HTML string.
 * Uses the same serialization as the editor's getHtml() (properInnerHtml of body).
 */
export async function modelToHtml(doc: VeDocument): Promise<string> {
	await whenVeReady()
	const ve = window.ve
	const dom = ve.dm.converter.getDomFromModel(doc)
	return ve.properInnerHtml(dom.body)
}

/**
 * Synchronous conversion helpers for use when VE is already loaded (e.g. inside a component
 * that has already awaited whenVeReady()). Throws if ve is not yet on window.
 */
export function htmlToModelSync(
	html: string,
	options?: { lang?: string; dir?: string }
): VeDocument {
	const ve = window.ve
	if (!ve) throw new Error("VisualEditor not loaded. Await whenVeReady() first.")
	const htmlDoc = ve.createDocumentFromHtml(html)
	return ve.dm.converter.getModelFromDom(htmlDoc, options ?? {})
}

export function modelToHtmlSync(doc: VeDocument): string {
	const ve = window.ve
	if (!ve) throw new Error("VisualEditor not loaded. Await whenVeReady() first.")
	const dom = ve.dm.converter.getDomFromModel(doc)
	return ve.properInnerHtml(dom.body)
}
