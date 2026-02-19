<template>
	<div class="result-code-wrapper">
		<pre class="result-code"><code>{{ displayText }}</code></pre>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
	data: unknown
	methodName?: string
}>()

const displayText = computed(() => {
	const raw = props.data
	const s = typeof raw === "string" ? raw : String(raw ?? "")
	if (!s.trim()) return s
	const shouldPrettify =
		props.methodName === "getPageHtml" ||
		props.methodName === "getPageMobileHtml" ||
		/^\s*<!DOCTYPE/i.test(s) ||
		/^\s*<html/i.test(s)
	return shouldPrettify ? prettifyHtml(s) : s
})

/** Simple HTML pretty-print: one tag per line with indent by depth. */
function prettifyHtml(html: string, indentSize = 2): string {
	const voidTags = new Set([
		"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"
	])
	const lines: string[] = []
	// Split between tags so we get "><" as separator; result parts are "tag>" and "<next" or text
	const parts = html.replace(/>\s*</g, ">\n<").split("\n")
	let depth = 0
	const indent = () => " ".repeat(depth * indentSize)
	for (const part of parts) {
		const trimmed = part.trim()
		if (!trimmed) continue
		if (trimmed.startsWith("</")) {
			depth = Math.max(0, depth - 1)
			lines.push(indent() + trimmed)
		} else if (trimmed.startsWith("<!")) {
			lines.push(indent() + trimmed)
		} else if (trimmed.startsWith("<")) {
			const isSelfClosing = trimmed.endsWith("/>") || (() => {
				const nameMatch = trimmed.match(/^<([a-zA-Z0-9]+)/)
				return nameMatch ? voidTags.has(nameMatch[1].toLowerCase()) : false
			})()
			lines.push(indent() + trimmed)
			if (!isSelfClosing && !trimmed.startsWith("</")) depth++
		} else {
			lines.push(indent() + trimmed)
		}
	}
	return lines.join("\n")
}
</script>
