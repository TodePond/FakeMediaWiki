<template>
	<div ref="containerRef" class="visual-diff-container" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue"
import { whenVePlatformReady } from "@/lib/visualeditor/loadVe"
import { htmlToModelSync } from "@/lib/visualeditor/veConversion"
import type { VeDiffElement } from "@/lib/visualeditor/veTypes"

const props = defineProps<{
	oldHtml: string
	newHtml: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let diffElement: VeDiffElement | null = null

async function render() {
	await whenVePlatformReady()
	if (!containerRef.value || !props.oldHtml || !props.newHtml) return

	// Remove previous diff element
	if (diffElement?.$element) {
		diffElement.$element.remove?.()
		diffElement = null
	}

	const ve = window.ve
	if (!ve) return

	const oldDoc = htmlToModelSync(props.oldHtml)
	const newDoc = htmlToModelSync(props.newHtml)
	const visualDiff = new ve.dm.VisualDiff(oldDoc, newDoc)
	const element = new ve.ui.DiffElement(visualDiff)
	diffElement = element

	containerRef.value.innerHTML = ""
	const el = element.$element?.[0]
	if (el) containerRef.value.appendChild(el)
}

onMounted(render)

onUnmounted(() => {
	if (diffElement?.$element) {
		diffElement.$element.remove?.()
	}
	diffElement = null
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
	width: 100%;
	min-height: 120px;
}
</style>
