/**
 * Shared parsing for FakeWiki.ts and fakewiki hooks (JSDoc, method/hook extraction).
 */

import * as fs from "node:fs"
import * as path from "node:path"
import * as ts from "typescript"

export type ParamSchema = { key: string; description?: string }
export type MethodSchema = {
	name: string
	description?: string
	category?: string
	params: ParamSchema[]
	/** Code samples from JSDoc `@example` (each block, trimmed). */
	examples?: string[]
}

export type HookSchema = {
	name: string
	fileBase: string
	description?: string
	params: ParamSchema[]
	/** Raw parameter list text from source (handles destructuring). */
	paramsSource: string
	/** Code samples from JSDoc `@example` (each block, trimmed). */
	examples?: string[]
}

export function getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
	const fullStart = node.getFullStart()
	const start = node.getStart(sourceFile)
	const leading = sourceFile.getFullText().slice(fullStart, start)
	const match = leading.match(/\/\*\*[\s\S]*?\*\//)
	return match ? match[0] : undefined
}

export function parseParamTags(jsdoc: string): Map<string, string> {
	const params = new Map<string, string>()
	const paramRe = /\@param\s+(\w+)\s+[-–—]\s*([^\n*]+)/g
	let m
	while ((m = paramRe.exec(jsdoc)) !== null) {
		params.set(m[1], m[2].trim())
	}
	return params
}

export function getSummary(jsdoc: string): string | undefined {
	const lines = jsdoc.replace(/^\s*\/\*\*?\s*/, "").replace(/\s*\*\/\s*$/, "").split(/\n/)
	const summary: string[] = []
	for (const line of lines) {
		const trimmed = line.replace(/^\s*\*\s?/, "").trim()
		if (trimmed.startsWith("@") || trimmed === "") break
		summary.push(trimmed)
	}
	return summary.length ? summary.join("\n").trim() : undefined
}

export function getCategory(jsdoc: string): string | undefined {
	const match = jsdoc.match(/\@category\s+([^\n*]+)/)
	return match?.[1]?.trim()
}

/**
 * If the first and last line are markdown code fences, return inner code only
 * (so the doc generator can emit a single ` ```ts ` block without nesting).
 */
function unwrapOuterCodeFence(text: string): string {
	const lines = text.split("\n")
	if (lines.length < 2) return text
	const first = lines[0].trim()
	const last = lines[lines.length - 1]!.trim()
	if (first.startsWith("```") && last === "```") {
		return lines.slice(1, -1).join("\n").trim()
	}
	return text
}

/**
 * Extract `@example` code blocks from a JSDoc string.
 * Stops at the next line that looks like a JSDoc block tag (`@name`) when not inside a ``` fence.
 */
export function getExamplesFromJSDoc(jsdoc: string): string[] {
	if (!jsdoc) return []
	const raw = jsdoc
		.replace(/^\s*\/\*\*?\s*/, "")
		.replace(/\s*\*\/\s*$/, "")
	const lines = raw.split("\n")
	const examples: string[] = []

	function stripLine(line: string): string {
		return line.replace(/^\s*\*\s?/, "")
	}

	let i = 0
	while (i < lines.length) {
		const stripped = stripLine(lines[i])
		const trimmed = stripped.trim()
		if (!trimmed.startsWith("@example")) {
			i++
			continue
		}
		i++
		const block: string[] = []
		let inFence = false
		while (i < lines.length) {
			const s = stripLine(lines[i])
			const t = s.trim()
			if (t.startsWith("```")) {
				inFence = !inFence
			}
			if (!inFence) {
				if (/^@[a-zA-Z]/.test(t)) {
					break
				}
			}
			block.push(s)
			i++
		}
		const text = unwrapOuterCodeFence(block.join("\n").trim())
		if (text.length > 0) {
			examples.push(text)
		}
	}
	return examples
}

export function extractFakeWikiMethods(sourceFile: ts.SourceFile): MethodSchema[] {
	const methods: MethodSchema[] = []

	function visit(node: ts.Node): void {
		if (ts.isClassDeclaration(node)) {
			const name = node.name?.getText(sourceFile)
			if (name === "FakeWiki") {
				for (const member of node.members) {
					if (ts.isMethodDeclaration(member)) {
						const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined
						const isPrivate = modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)
						const isProtected = modifiers?.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword)
						const methodName = (member.name as ts.Identifier).getText(sourceFile)
						if (isPrivate || isProtected || methodName === "request" || methodName.startsWith("_"))
							continue

						const jsdoc = getJSDocComment(member, sourceFile)
						const paramDocs = jsdoc ? parseParamTags(jsdoc) : new Map<string, string>()
						const description = jsdoc ? getSummary(jsdoc) : undefined
						const category = jsdoc ? getCategory(jsdoc) : undefined
						const examples = jsdoc ? getExamplesFromJSDoc(jsdoc) : undefined
						const examplesOut = examples?.length ? examples : undefined

						const params: ParamSchema[] = []
						for (const param of member.parameters) {
							const paramName = (param.name as ts.Identifier).getText(sourceFile)
							params.push({
								key: paramName,
								description: paramDocs.get(paramName),
							})
						}
						methods.push({ name: methodName, description, category, params, examples: examplesOut })
					}
				}
			}
		}
		ts.forEachChild(node, visit)
	}
	visit(sourceFile)
	return methods
}

function isExported(node: ts.FunctionDeclaration): boolean {
	const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined
	return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

/** Collapse whitespace so multi-line binding patterns render as one readable line. */
export function normalizeBindingPatternText(text: string): string {
	return text.replace(/\s+/g, " ").trim()
}

function paramBindingKey(param: ts.ParameterDeclaration, sourceFile: ts.SourceFile): string {
	return normalizeBindingPatternText(param.name.getText(sourceFile))
}

export function extractHookFunctions(sourceFile: ts.SourceFile, fileBase: string): HookSchema[] {
	const hooks: HookSchema[] = []

	for (const stmt of sourceFile.statements) {
		if (!ts.isFunctionDeclaration(stmt) || !stmt.name || !isExported(stmt)) continue

		const fnName = stmt.name.getText(sourceFile)
		const jsdoc = getJSDocComment(stmt, sourceFile)
		const paramDocs = jsdoc ? parseParamTags(jsdoc) : new Map<string, string>()
		const description = jsdoc ? getSummary(jsdoc) : undefined
		const examples = jsdoc ? getExamplesFromJSDoc(jsdoc) : undefined
		const examplesOut = examples?.length ? examples : undefined

		let paramsSource = ""
		if (stmt.parameters.length > 0) {
			const first = stmt.parameters[0].getStart(sourceFile)
			const last = stmt.parameters[stmt.parameters.length - 1].getEnd()
			paramsSource = sourceFile.getFullText().slice(first, last)
		}

		const params: ParamSchema[] = []
		for (const param of stmt.parameters) {
			const key = paramBindingKey(param, sourceFile)
			params.push({ key, description: paramDocs.get(key) })
		}

		hooks.push({ name: fnName, fileBase, description, params, paramsSource, examples: examplesOut })
	}

	return hooks
}

const HOOKS_SKIP = new Set(["index.ts", "types.ts"])

export function loadAllHookSchemas(hooksDir: string): HookSchema[] {
	const all: HookSchema[] = []
	const entries = fs.readdirSync(hooksDir, { withFileTypes: true })
	for (const ent of entries) {
		if (!ent.isFile() || !ent.name.endsWith(".ts") || HOOKS_SKIP.has(ent.name)) continue
		const filePath = path.join(hooksDir, ent.name)
		const content = fs.readFileSync(filePath, "utf-8")
		const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
		all.push(...extractHookFunctions(sf, ent.name))
	}
	all.sort((a, b) => a.name.localeCompare(b.name))
	return all
}
