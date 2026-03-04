<template>
	<div ref="containerRef" class="visual-diff-container" />
</template>

<script setup lang="ts">
import { renderVisualDiffToHtml } from "@/lib/visualeditor/veVisualDiff"
import { onMounted, onUnmounted, ref, watch } from "vue"

const props = defineProps<{
	oldHtml: string
	newHtml: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)

async function render() {
	if (!containerRef.value || !props.oldHtml || !props.newHtml) {
		if (containerRef.value) containerRef.value.innerHTML = ""
		return
	}
	const html = await renderVisualDiffToHtml(props.oldHtml, props.newHtml)
	containerRef.value.innerHTML = html
}

onMounted(render)

onUnmounted(() => {
	if (containerRef.value) containerRef.value.innerHTML = ""
})

watch(
	() => [props.oldHtml, props.newHtml] as const,
	() => {
		render()
	},
	{ deep: true }
)
</script>

<style scoped>
.visual-diff-container {
	min-width: 0;
	max-width: 100%;
}
</style>
