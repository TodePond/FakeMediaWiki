<template>
	<div ref="containerRef" class="visual-editor-container" v-once />
</template>

<script setup lang="ts">
import { whenVePlatformReady } from "@repo-lib/visualeditor/loadVe"
import type { VeDocument, VeTarget } from "@repo-lib/visualeditor/veTypes"
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue"

const props = withDefaults(
	defineProps<{
		initialHtml?: string
		placeholder?: string
		readOnly?: boolean
		lang?: string
		dir?: string
	}>(),
	{
		initialHtml: "<p></p>",
		readOnly: false,
		lang: "en",
		dir: "ltr",
	}
)

const containerRef = ref<HTMLDivElement | null>(null)
let target: VeTarget | null = null
let isDisposed = false
let mountToken = 0

function getTarget(): VeTarget | null {
	return target
}

function getHtml(): string {
	if (!target) return ""
	const surface = target.getSurface?.()
	return surface?.getHtml?.() ?? ""
}

function getModel(): VeDocument | null {
	if (!target) return null
	const surface = target.getSurface?.()
	return surface?.getDocument?.() ?? null
}

onMounted(async () => {
	const token = ++mountToken
	await whenVePlatformReady()
	const ve = window.ve
	if (!ve || !containerRef.value || isDisposed || token !== mountToken) return

	const nextTarget = new ve.init.sa.Target()
	const htmlDoc = ve.createDocumentFromHtml(props.initialHtml)
	const model = ve.dm.converter.getModelFromDom(htmlDoc, {
		lang: props.lang,
		dir: props.dir,
	})
	nextTarget.addSurface(model)
	const el = nextTarget.$element?.[0]
	if (el) {
		await nextTick()
		if (!containerRef.value || isDisposed || token !== mountToken) {
			nextTarget.destroy?.()
			return
		}
		containerRef.value.textContent = ""
		containerRef.value.appendChild(el)
		target = nextTarget
	} else {
		nextTarget.destroy?.()
	}
})

onUnmounted(() => {
	isDisposed = true
	mountToken += 1
	target?.destroy?.()
	target = null
	if (containerRef.value) {
		containerRef.value.textContent = ""
	}
})

watch(
	() => props.initialHtml,
	() => {
		// Initial content only; we don't replace content when prop changes to avoid losing edits
	}
)

defineExpose({
	getHtml,
	getModel,
	getTarget,
})
</script>

<style scoped></style>

<style>
.visual-editor-container .ve-ce-contentBranchNode {
	margin-left: 0.6rem;
	margin-right: 0.6rem;
}
</style>
