<template>
	<div class="result-image-wrapper">
		<img
			v-if="url"
			:src="url"
			alt="Result"
			class="result-image"
		/>
		<span v-else class="result-image__fallback">No image URL</span>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
	data: unknown
	methodName?: string
}>()

const url = computed(() => {
	const d = props.data
	if (typeof d === "string" && (d.startsWith("http") || d.startsWith("//"))) return d
	if (typeof d === "string" && d) return d
	return null
})
</script>
