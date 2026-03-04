/**
 * Extract template parameter changes from Parsoid/MediaWiki HTML (data-mw)
 * and render a "Template parameters changed" section like the VisualEditor
 * extension sidebar on Wikipedia, without requiring the extension.
 */
import DiffMatchPatch from "diff-match-patch"

/** One template occurrence with its target name and params (param name -> wikitext value) */
export interface TemplateInfo {
	target: string
	params: Record<string, string>
}

/** Parsed data-mw.parts entry for a template (Parsoid DOM spec) */
interface DataMwPart {
	template?: {
		target?: { wt?: string; href?: string }
		params?: Record<string, { wt?: string; html?: string }>
	}
}

function getParamValue(p: { wt?: string; html?: string }): string {
	if (p.wt !== undefined && p.wt !== null) return String(p.wt).trim()
	if (p.html !== undefined && p.html !== null) {
		// Strip HTML tags for comparison
		const div = typeof document !== "undefined" ? document.createElement("div") : null
		if (div) {
			div.innerHTML = p.html
			return (div.textContent ?? div.innerText ?? "").trim()
		}
		return String(p.html)
			.replace(/<[^>]+>/g, "")
			.trim()
	}
	return ""
}

/**
 * Extract all templates with their params from HTML that contains data-mw
 * (e.g. Parsoid output). Uses raw HTML before any normalization that strips data-mw.
 */
export function extractTemplatesFromHtml(html: string): TemplateInfo[] {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, "text/html")
	const results: TemplateInfo[] = []
	// typeof can be "mw:Transclusion" or "mw:Transclusion mw:Extension/..." etc.
	const nodes = doc.querySelectorAll('[typeof~="mw:Transclusion"]')
	nodes.forEach(node => {
		const dataMw = node.getAttribute("data-mw")
		if (!dataMw) return
		try {
			const data = JSON.parse(dataMw) as { parts?: DataMwPart[] }
			const parts = data.parts ?? []
			for (const part of parts) {
				const t = part.template
				if (!t?.target?.wt || !t.params) continue
				const target = t.target.wt.trim()
				const params: Record<string, string> = {}
				for (const [k, v] of Object.entries(t.params)) {
					if (v && typeof v === "object") params[k] = getParamValue(v)
				}
				results.push({ target, params })
			}
		} catch {
			// ignore malformed data-mw
		}
	})
	return results
}

/** Single changed parameter: param name, old/new values, and diff segments for display */
export interface TemplateParamChange {
	templateTarget: string
	paramName: string
	oldValue: string
	newValue: string
	/** Segments: -1 = delete, 0 = equal, 1 = insert (same as diff-match-patch) */
	diffSegments: [number, string][]
}

/**
 * Compare two template lists (from old and new HTML) and return parameter-level changes.
 * Matches templates by document order and target name; then compares params by name.
 */
export function getTemplateParamChanges(
	oldTemplates: TemplateInfo[],
	newTemplates: TemplateInfo[]
): TemplateParamChange[] {
	const dmp = new DiffMatchPatch()
	const changes: TemplateParamChange[] = []
	const maxLen = Math.max(oldTemplates.length, newTemplates.length)
	for (let i = 0; i < maxLen; i++) {
		const oldT = oldTemplates[i]
		const newT = newTemplates[i]
		if (!oldT || !newT || oldT.target !== newT.target) continue
		const allParamNames = new Set([...Object.keys(oldT.params), ...Object.keys(newT.params)])
		for (const name of allParamNames) {
			const oldVal = oldT.params[name] ?? ""
			const newVal = newT.params[name] ?? ""
			if (oldVal === newVal) continue
			const rawDiffs = dmp.diff_main(oldVal, newVal)
			dmp.diff_cleanupSemantic(rawDiffs)
			changes.push({
				templateTarget: oldT.target,
				paramName: name,
				oldValue: oldVal,
				newValue: newVal,
				diffSegments: rawDiffs,
			})
		}
	}
	return changes
}

/**
 * Fill a table cell with the value, converting newlines into <p> elements for readability.
 */
function fillCellWithParagraphs(
	doc: Document,
	cell: HTMLTableCellElement,
	value: string
): void {
	const lines = value.split(/\r?\n/)
	for (const line of lines) {
		const p = doc.createElement("p")
		p.textContent = line
		cell.appendChild(p)
	}
	if (lines.length === 0) {
		const p = doc.createElement("p")
		p.textContent = ""
		cell.appendChild(p)
	}
}

/**
 * Inject template parameter changes into the body of two HTML documents.
 * One table per template (per wireframe): template name as header row, then one row
 * per changed param. Named params: two columns (param name | value). Unnamed/positional
 * params: single column (value only). No "Template parameters changed" caption.
 *
 * @param oldHtml Full document HTML (e.g. from wrapFragmentForVe)
 * @param newHtml Full document HTML
 * @param changes Template param changes (from getTemplateParamChanges)
 * @returns { oldHtmlInjected, newHtmlInjected } - same documents with injected tables appended to body
 */
export function injectTemplateParamDiffsIntoHtml(
	oldHtml: string,
	newHtml: string,
	changes: TemplateParamChange[]
): { oldHtmlInjected: string; newHtmlInjected: string } {
	if (changes.length === 0) {
		return { oldHtmlInjected: oldHtml, newHtmlInjected: newHtml }
	}
	const parser = new DOMParser()
	const oldDoc = parser.parseFromString(oldHtml, "text/html")
	const newDoc = parser.parseFromString(newHtml, "text/html")
	const oldBody = oldDoc.body
	const newBody = newDoc.body
	if (!oldBody || !newBody) return { oldHtmlInjected: oldHtml, newHtmlInjected: newHtml }

	// Group changes by template so we emit one table per template
	const byTemplate = new Map<string, TemplateParamChange[]>()
	for (const c of changes) {
		const list = byTemplate.get(c.templateTarget) ?? []
		list.push(c)
		byTemplate.set(c.templateTarget, list)
	}

	const tableClass = "ve-injected-template-params"
	let rowIndex = 0
	for (const [templateName, templateChanges] of byTemplate) {
		const oldTable = oldDoc.createElement("table")
		oldTable.setAttribute("class", tableClass)
		oldTable.setAttribute("data-diff-injected", "template-params")
		const newTable = newDoc.createElement("table")
		newTable.setAttribute("class", tableClass)
		newTable.setAttribute("data-diff-injected", "template-params")

		// Header row: template name
		const oldThead = oldDoc.createElement("thead")
		const oldHeaderRow = oldDoc.createElement("tr")
		const oldTh = oldDoc.createElement("th")
		oldTh.setAttribute("colspan", "2")
		oldTh.textContent = templateName
		oldHeaderRow.appendChild(oldTh)
		oldThead.appendChild(oldHeaderRow)
		oldTable.appendChild(oldThead)
		const newThead = newDoc.createElement("thead")
		const newHeaderRow = newDoc.createElement("tr")
		const newTh = newDoc.createElement("th")
		newTh.setAttribute("colspan", "2")
		newTh.textContent = templateName
		newHeaderRow.appendChild(newTh)
		newThead.appendChild(newHeaderRow)
		newTable.appendChild(newThead)

		const oldTbody = oldDoc.createElement("tbody")
		const newTbody = newDoc.createElement("tbody")

		for (const c of templateChanges) {
			const isPositional = /^\d+$/.test(c.paramName)
			// Named params: two columns (param name | value). Unnamed: one column (value only).
			if (isPositional) {
				// Unnamed params: single cell with value
				const oldRow = oldDoc.createElement("tr")
				oldRow.setAttribute("data-injected-index", String(rowIndex))
				const oldTd = oldDoc.createElement("td")
				oldTd.setAttribute("colspan", "2")
				fillCellWithParagraphs(oldDoc, oldTd, c.oldValue)
				oldRow.appendChild(oldTd)
				oldTbody.appendChild(oldRow)
				const newRow = newDoc.createElement("tr")
				newRow.setAttribute("data-injected-index", String(rowIndex))
				const newTd = newDoc.createElement("td")
				newTd.setAttribute("colspan", "2")
				fillCellWithParagraphs(newDoc, newTd, c.newValue)
				newRow.appendChild(newTd)
				newTbody.appendChild(newRow)
			} else {
				// Named params: param name (bold) | value
				const oldRow = oldDoc.createElement("tr")
				oldRow.setAttribute("data-injected-index", String(rowIndex))
				const oldThParam = oldDoc.createElement("th")
				oldThParam.textContent = c.paramName
				oldRow.appendChild(oldThParam)
				const oldTdValue = oldDoc.createElement("td")
				fillCellWithParagraphs(oldDoc, oldTdValue, c.oldValue)
				oldRow.appendChild(oldTdValue)
				oldTbody.appendChild(oldRow)
				const newRow = newDoc.createElement("tr")
				newRow.setAttribute("data-injected-index", String(rowIndex))
				const newThParam = newDoc.createElement("th")
				newThParam.textContent = c.paramName
				newRow.appendChild(newThParam)
				const newTdValue = newDoc.createElement("td")
				fillCellWithParagraphs(newDoc, newTdValue, c.newValue)
				newRow.appendChild(newTdValue)
				newTbody.appendChild(newRow)
			}
			rowIndex++
		}

		oldTable.appendChild(oldTbody)
		newTable.appendChild(newTbody)
		oldBody.appendChild(oldTable)
		newBody.appendChild(newTable)
	}

	return {
		oldHtmlInjected: oldDoc.documentElement.outerHTML,
		newHtmlInjected: newDoc.documentElement.outerHTML,
	}
}
