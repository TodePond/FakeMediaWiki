<template>
	<!-- Primitive -->
	<span v-if="isPrimitive(displayValue)" class="api-result-primitive">{{
		formatPrimitive(displayValue)
	}}</span>
	<pre
		v-else-if="valueKey === 'source' && isWikitextLike(displayValue)"
		class="api-result-source"
	>{{ displayValue }}</pre>
	<!-- Empty containers -->
	<div v-else-if="isEmptyContainer(displayValue)" class="api-result-empty">
		{{ getEmptyContainerLabel(displayValue) }}
	</div>
	<!-- Array of objects → data table with header row -->
	<div v-else-if="isArrayOfObjects(displayValue)" class="api-result-table-wrap">
		<table class="api-result-table">
			<thead>
				<tr>
					<th v-for="col in columns(displayValue)" :key="col" class="api-result-table__heading">
						{{ col }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, i) in displayValue" :key="i">
					<td v-for="col in columns(displayValue)" :key="col" class="api-result-table__cell">
						<ResultValue :value="(row as Record<string, unknown>)[col]" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<!-- Array (of primitives or mixed) → single-column table -->
	<div v-else-if="Array.isArray(displayValue)" class="api-result-table-wrap">
		<table class="api-result-table">
			<tbody>
				<tr v-for="(item, i) in displayValue" :key="i">
					<td class="api-result-table__cell">
						<ResultValue :value="item" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<!-- Object or Map → key-value table -->
	<div v-else-if="isObjectOrMap(displayValue)" class="api-result-table-wrap">
		<table class="api-result-table api-result-table--key-value">
			<tbody>
				<tr v-for="(val, key) in objectEntries(displayValue)" :key="String(key)">
					<td class="api-result-table__heading">{{ key }}</td>
					<td class="api-result-table__cell">
						<ResultValue :value="val" :value-key="String(key)" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<!-- Fallback -->
	<span v-else class="api-result-primitive">{{ formatPrimitive(displayValue) }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue"

defineOptions({ name: "ResultValue" })

const props = withDefaults(
	defineProps<{
		/** Root call from playground passes data */
		data?: unknown
		/** Recursive call passes value */
		value?: unknown
		/** When rendering a key-value cell, the key (e.g. for source wikitext) */
		valueKey?: string
	}>(),
	{ valueKey: undefined }
)

const displayValue = computed(() =>
	props.data !== undefined ? props.data : props.value
)

function isPrimitive(v: unknown): boolean {
	return v === null || v === undefined || typeof v !== "object"
}

function isArrayOfObjects(v: unknown): v is Record<string, unknown>[] {
	return (
		Array.isArray(v) &&
		v.length > 0 &&
		v.every((x) => x !== null && typeof x === "object" && !Array.isArray(x))
	)
}

function isObjectOrMap(v: unknown): v is Record<string, unknown> | Map<string, unknown> {
	return v !== null && typeof v === "object" && !Array.isArray(v)
}

function isEmptyObjectOrMap(v: Record<string, unknown> | Map<string, unknown>): boolean {
	return v instanceof Map ? v.size === 0 : Object.keys(v).length === 0
}

function isEmptyContainer(v: unknown): boolean {
	if (Array.isArray(v)) return v.length === 0
	if (isObjectOrMap(v)) return isEmptyObjectOrMap(v)
	return false
}

function getEmptyContainerLabel(v: unknown): string {
	if (Array.isArray(v)) return "Empty array"
	if (v instanceof Map) return "Empty object"
	if (isObjectOrMap(v)) return "Empty object"
	return "No results"
}

function objectEntries(v: Record<string, unknown> | Map<string, unknown>): Record<string, unknown> {
	return v instanceof Map ? Object.fromEntries(v) : v
}

function columns(rows: Record<string, unknown>[]): string[] {
	const set = new Set<string>()
	for (const row of rows) {
		if (row && typeof row === "object") Object.keys(row).forEach((k) => set.add(k))
	}
	return [...set]
}

function formatPrimitive(v: unknown): string {
	if (v === null || v === undefined) return "—"
	if (typeof v === "object") return JSON.stringify(v)
	return String(v)
}

function isWikitextLike(v: unknown): v is string {
	if (typeof v !== "string") return false
	const s = v
	return (
		s.length > 80 &&
		(s.includes("\n") || s.includes("{{") || s.includes("[["))
	)
}
</script>
