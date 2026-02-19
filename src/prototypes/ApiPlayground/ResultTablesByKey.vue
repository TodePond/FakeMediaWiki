<template>
	<div class="result-tables-by-key">
		<section
			v-for="(entry, key) in sections"
			:key="String(key)"
			class="result-tables-by-key__section"
		>
			<h3 class="result-tables-by-key__title">{{ key }}</h3>
			<div class="result-table-wrapper">
				<table class="result-table">
					<thead>
						<tr>
							<th v-for="col in entry.columns" :key="col">{{ col }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, i) in entry.rows" :key="i">
							<td v-for="col in entry.columns" :key="col" class="result-table__cell">
								{{ formatCell(row[col]) }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
	data: unknown
	methodName?: string
}>()

const sections = computed(() => {
	const d = props.data
	if (d === null || typeof d !== "object" || Array.isArray(d)) return {}
	const obj = d instanceof Map ? Object.fromEntries(d) : (d as Record<string, unknown>)
	const out: Record<string, { rows: Record<string, unknown>[]; columns: string[] }> = {}
	for (const [key, value] of Object.entries(obj)) {
		const revs = value !== null && typeof value === "object" && !Array.isArray(value)
			? (value as Record<string, unknown>).revisions
			: undefined
		if (!Array.isArray(revs) || revs.length === 0) {
			out[key] = { rows: [], columns: [] }
			continue
		}
		const rows = revs as Record<string, unknown>[]
		const columns = [...new Set(rows.flatMap((r) => (r && typeof r === "object" ? Object.keys(r) : [])))]
		out[key] = { rows, columns }
	}
	return out
})

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return "—"
	if (typeof value === "object") return JSON.stringify(value)
	return String(value)
}
</script>
