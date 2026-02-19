<template>
	<div class="result-json-wrapper">
		<pre class="result-json">{{ jsonString }}</pre>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
	data: unknown
	methodName?: string
}>()

const jsonString = computed(() => {
	const d = props.data
	if (d instanceof Map) {
		return JSON.stringify(Object.fromEntries(d), null, 2)
	}
	return JSON.stringify(d, null, 2)
})
</script>
