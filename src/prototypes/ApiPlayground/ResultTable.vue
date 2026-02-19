<template>
	<div class="result-table-wrapper">
		<table class="result-table">
			<thead>
				<tr>
					<th v-for="col in columns" :key="col">{{ col }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, i) in rows" :key="i">
					<td v-for="col in columns" :key="col" class="result-table__cell">
						{{ formatCell(row[col]) }}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
	data: unknown
	methodName?: string
}>()

const rows = computed(() => {
	const d = props.data
	if (Array.isArray(d)) return d
	if (d !== null && typeof d === "object") {
		const obj = d as Record<string, unknown>
		const key = ["pages", "revisions", "results", "items"].find((k) => Array.isArray(obj[k]))
		if (key) return obj[key] as Record<string, unknown>[]
	}
	return []
})

const columns = computed(() => {
	const first = rows.value[0]
	if (!first || typeof first !== "object") return []
	return Object.keys(first as object)
})

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return "—"
	if (typeof value === "object") return JSON.stringify(value)
	return String(value)
}
</script>
