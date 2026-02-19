<template>
	<dl class="result-object">
		<template v-for="(value, key) in flatEntries" :key="key">
			<dt class="result-object__key">{{ key }}</dt>
			<dd class="result-object__value">
				<ResultInlineTable
					v-if="isPlainObject(value)"
					:data="value as Record<string, unknown>"
				/>
				<template v-else>{{ formatCell(value) }}</template>
			</dd>
		</template>
	</dl>
</template>

<script setup lang="ts">
import { computed } from "vue"
import ResultInlineTable from "./ResultInlineTable.vue"

const props = defineProps<{
	data: unknown
	methodName?: string
}>()

const flatEntries = computed(() => {
	const d = props.data
	if (d === null || typeof d !== "object" || Array.isArray(d)) return {}
	return d as Record<string, unknown>
})

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
}

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return "—"
	if (typeof value === "object") return JSON.stringify(value)
	return String(value)
}
</script>
