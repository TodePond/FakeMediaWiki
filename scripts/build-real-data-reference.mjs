/**
 * Parses wiki-signals/*.md into a JSON model for the WikiSignals prototype.
 * Invoked by `npm run generate` (see packages/fakewiki). Or run directly: node scripts/build-real-data-reference.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")
const signalsDir = join(repoRoot, "wiki-signals")
const outDir = join(repoRoot, "src/prototypes/WikiSignals/generated")
const outFile = join(outDir, "sections.json")

const SOURCES = ["analytics.md", "curation.md", "links.md", "inference.md"]

function slugify(s) {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80) || "section"
}

/**
 * @param {string} text
 * @returns {{ heading: string, body: string }[] }
 */
function splitSections(text) {
	const lines = text.split(/\r?\n/)
	const sections = []
	let i = 0
	// Skip until first ## at column 0
	while (i < lines.length && !/^##\s+/.test(lines[i])) i++
	while (i < lines.length) {
		const heading = lines[i]
		const titleMatch = heading.match(/^##\s+(.+)$/)
		if (!titleMatch) {
			i++
			continue
		}
		const start = i
		i++
		while (i < lines.length && !/^##\s+/.test(lines[i])) i++
		const body = lines.slice(start + 1, i).join("\n")
		sections.push({ heading, titleText: titleMatch[1].trim(), body })
	}
	return sections
}

/**
 * Extract next fenced block after startLine; returns { lang, content, endIndex } or null
 * @param {string[]} lines
 * @param {number} start
 */
function nextFence(lines, start) {
	let i = start
	while (i < lines.length) {
		const m = lines[i].match(/^```(\w*)\s*$/)
		if (m) {
			const lang = m[1] || ""
			const body = []
			i++
			while (i < lines.length && !/^```\s*$/.test(lines[i])) {
				body.push(lines[i])
				i++
			}
			if (i < lines.length) i++ // closing ```
			return { lang, content: body.join("\n"), lineIndex: i }
		}
		i++
	}
	return null
}

/**
 * @param {string} body - section body without ## heading line
 */
function parseSectionIntoSegments(body) {
	const lines = body.split(/\r?\n/)
	const segments = []
	let i = 0

	function flushBuffer(buf) {
		const t = buf.join("\n").trimEnd()
		if (t) segments.push({ type: "markdown", content: t })
	}

	let buf = []

	while (i < lines.length) {
		const line = lines[i]
		const reqMatch = line.match(/^####\s+Request\s*(\([^)]*\))?\s*$/)
		const resHeader = line.match(/^####\s+Response/)

		if (reqMatch) {
			flushBuffer(buf)
			buf = []
			i++
			// Skip blank lines until fence
			while (i < lines.length && lines[i].trim() === "") i++
			const fence = nextFence(lines, i)
			if (!fence || fence.lang !== "bash") {
				// Malformed: put line back into markdown
				buf.push(line)
				continue
			}
			const requestBash = fence.content
			i = fence.lineIndex
			while (i < lines.length && lines[i].trim() === "") i++
			if (i >= lines.length || !/^####\s+Response/.test(lines[i])) {
				segments.push({ type: "requestPair", requestBash, responseJson: "" })
				continue
			}
			i++ // #### Response
			while (i < lines.length && lines[i].trim() === "") i++
			const respFence = nextFence(lines, i)
			let responseJson = ""
			if (respFence && (respFence.lang === "json" || respFence.lang === "")) {
				responseJson = respFence.content
				i = respFence.lineIndex
			} else {
				// optional: try any fence as response
				if (respFence) {
					responseJson = respFence.content
					i = respFence.lineIndex
				}
			}
			segments.push({ type: "requestPair", requestBash, responseJson })
			continue
		}

		buf.push(line)
		i++
	}
	flushBuffer(buf)
	return segments
}

function parseFile(filename) {
	const raw = readFileSync(join(signalsDir, filename), "utf8")
	const lines = raw.split(/\r?\n/)
	let h1 = ""
	let preambleStart = 0
	if (lines[0]?.startsWith("# ")) {
		h1 = lines[0].slice(2).trim()
		preambleStart = 1
	}
	const rest = lines.slice(preambleStart).join("\n")
	const firstSection = rest.search(/^##\s+/m)
	const preamble =
		firstSection === -1 ? rest.trimEnd() : rest.slice(0, firstSection).trimEnd()
	const fromFirstSection = firstSection === -1 ? "" : rest.slice(firstSection)
	const sectionBlocks = splitSections(fromFirstSection)
	const slug = filename.replace(/\.md$/, "")

	const sections = sectionBlocks.map((sec, idx) => {
		const id = `${slug}-${idx + 1}`
		const anchor = `${slug}-${slugify(sec.titleText)}`
		const segments = parseSectionIntoSegments(sec.body)
		return {
			id,
			anchor,
			headingLine: sec.heading,
			titleText: sec.titleText,
			segments,
		}
	})

	return { slug, title: h1 || filename, preamble, sections }
}

function main() {
	const files = SOURCES.map(parseFile)
	const payload = { version: 1, generatedBy: "build-real-data-reference.mjs", files }
	mkdirSync(outDir, { recursive: true })
	writeFileSync(outFile, JSON.stringify(payload, null, "\t") + "\n", "utf8")
	console.log(`Wrote ${outFile} (${files.reduce((a, f) => a + f.sections.length, 0)} sections).`)
}

main()
