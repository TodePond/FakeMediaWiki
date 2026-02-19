<template>
	<table class="result-object__inline-table" :class="{ 'result-object__inline-table--nested': nested }">
		<tbody>
			<tr v-for="(cellValue, cellKey) in entries" :key="String(cellKey)">
				<td class="result-object__inline-table-key">{{ cellKey }}</td>
				<td class="result-object__inline-table-val">
					<ResultInlineTable
						v-if="isPlainObject(cellValue)"
						:data="cellValue as Record<string, unknown>"
						:nested="true"
					/>
					<pre
						v-else-if="cellKey === 'source' && isWikitextLike(cellValue)"
						class="result-object__source-block"
					>{{ cellValue }}</pre>
					<template v-else>{{ formatCell(cellValue) }}</template>
				</td>
			</tr>
		</tbody>
	</table>
</template>

<script lang="ts">
export default { name: "ResultInlineTable" }
</script>
<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
	defineProps<{
		data: Record<string, unknown>
		nested?: boolean
	}>(),
	{ nested: false }
)

const entries = computed(() => props.data)

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isWikitextLike(value: unknown): value is string {
	if (typeof value !== "string") return false
	const s = value
	// Only treat as source block when it looks like wikitext (e.g. getPage.source), not URLs or short strings
	return (
		s.length > 80 &&
		(s.includes("\n") || s.includes("{{") || s.includes("[["))
	)
}

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return "—"
	if (typeof value === "object") return JSON.stringify(value)
	return String(value)
}
</script>
