/**
 * Middle-ground diff: use the compare API to determine the context(s) of the change,
 * then transform every block (add, remove, context) to HTML so the result is
 * a fully rendered visual diff with no raw wikitext.
 *
 * Flow: getDiffSource(pageName, revId) → group lines into blocks → transform
 * every block's wikitext to HTML → render blocks with diff styling.
 */
import type { FWCompareResponse, FWDiffLine } from "fakewiki/types"

export interface VisualDiffBlock {
	type: number
	/** Rendered HTML content (all blocks are transformed so we never show raw wikitext) */
	content: string
	isHtml: boolean
}

export type WikiLike = {
	transformWikitextToHtml(wikitext: string, pageTitle?: string): Promise<string>
}

/**
 * Build "old" and "new" HTML from the compare response to pass to the visual diff.
 * Includes context in both sides so the diff is shown in place. Does not pre-split
 * change lines (type 3) into segments—we give VE two full documents and let it do the diffing.
 *
 * - Old doc = context (0) + remove (2)
 * - New doc = context (0) + add (1) + change (3) + move (4,5)
 */
export async function buildRemoveAndAddHtml(
	response: FWCompareResponse,
	wiki: WikiLike,
	pageName: string
): Promise<{ removeHtml: string; addHtml: string }> {
	const lines = response.diff ?? []
	const oldParts: string[] = []
	const newParts: string[] = []

	for (const line of lines) {
		const text = line.text ?? ""
		switch (line.type) {
			case 0: // context: include in both so VE shows the change in place
				oldParts.push(text)
				newParts.push(text)
				break
			case 2: // remove: only in old
				oldParts.push(text)
				break
			case 1: // add: only in new
				newParts.push(text)
				break
			case 3: // change
			case 4:
			case 5: // move: full line goes to new (VE will diff; we don't split segments)
				newParts.push(text)
				break
			default:
				break
		}
	}

	const oldWikitext = oldParts.join("\n")
	const newWikitext = newParts.join("\n")
	const removeHtml =
		oldWikitext.trim() === ""
			? ""
			: await wiki.transformWikitextToHtml(oldWikitext, pageName)
	const addHtml =
		newWikitext.trim() === ""
			? ""
			: await wiki.transformWikitextToHtml(newWikitext, pageName)

	return { removeHtml, addHtml }
}

/**
 * Group consecutive diff lines of the same type into blocks.
 */
function groupDiffLinesIntoBlocks(lines: FWDiffLine[]): { type: number; text: string }[] {
	if (lines.length === 0) return []
	const blocks: { type: number; text: string }[] = []
	let currentType = lines[0].type
	let currentLines: string[] = [lines[0].text ?? ""]

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]
		const t = line.type
		const text = line.text ?? ""
		if (t === currentType) {
			currentLines.push(text)
		} else {
			blocks.push({ type: currentType, text: currentLines.join("\n") })
			currentType = t
			currentLines = [text]
		}
	}
	blocks.push({ type: currentType, text: currentLines.join("\n") })
	return blocks
}

export type WikiLikeForBlocks = {
	transformWikitextToHtml(wikitext: string, pageTitle?: string): Promise<string>
}

/**
 * Turn a compare-API diff into visual blocks. Every block is transformed to HTML
 * so we only show rendered content (no raw wikitext). The compare output defines
 * which sections are add/remove/context; we retrieve those sections (as wikitext
 * from the diff) and render them as HTML.
 *
 * @param response - From wiki.getDiffSource(pageName, revId)
 * @param wiki - FakeWiki (or similar) for transformWikitextToHtml
 * @param pageName - Page title for transform context
 * @returns Blocks to render: all as HTML with diff block styling (add/remove/context)
 */
export async function diffToVisualBlocks(
	response: FWCompareResponse,
	wiki: WikiLikeForBlocks,
	pageName: string
): Promise<VisualDiffBlock[]> {
	const blocks = groupDiffLinesIntoBlocks(response.diff ?? [])
	const result: VisualDiffBlock[] = []

	for (const block of blocks) {
		const trimmed = block.text.trim()
		const html =
			trimmed === "" ? "" : await wiki.transformWikitextToHtml(block.text, pageName)
		result.push({ type: block.type, content: html, isHtml: true })
	}

	return result
}
