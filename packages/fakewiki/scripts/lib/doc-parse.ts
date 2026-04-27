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
}

export type HookSchema = {
	name: string
	fileBase: string
	description?: string
	params: ParamSchema[]
	/** Raw parameter list text from source (handles destructuring). */
	paramsSource: string
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

						const params: ParamSchema[] = []
						for (const param of member.parameters) {
							const paramName = (param.name as ts.Identifier).getText(sourceFile)
							params.push({
								key: paramName,
								description: paramDocs.get(paramName),
							})
						}
						methods.push({ name: methodName, description, category, params })
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

		hooks.push({ name: fnName, fileBase, description, params, paramsSource })
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
