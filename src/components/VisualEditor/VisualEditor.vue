<template>
	<div ref="containerRef" class="visual-editor-container" />
</template>

<script setup lang="ts">
import { whenVeReady } from "@/lib/visualeditor/loadVe"
import type { VeDocument, VeTarget } from "@/lib/visualeditor/veTypes"
import { onMounted, onUnmounted, ref, watch } from "vue"

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
	await whenVeReady()
	const ve = window.ve
	if (!ve || !containerRef.value) return

	const platform = new ve.init.sa.Platform(ve.messagePaths ?? [])
	await platform.getInitializedPromise().catch(() => {
		containerRef.value!.textContent = "VisualEditor could not be initialized."
		return Promise.reject()
	})

	target = new ve.init.sa.Target()
	const htmlDoc = ve.createDocumentFromHtml(props.initialHtml)
	const model = ve.dm.converter.getModelFromDom(htmlDoc, {
		lang: props.lang,
		dir: props.dir,
	})
	target.addSurface(model)
	const el = target.$element?.[0]
	if (el) containerRef.value.appendChild(el)
})

onUnmounted(() => {
	if (target?.destroy) {
		target.destroy()
	}
	target = null
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

<style scoped>
.visual-editor-container {
	/* width: 100%; */
	/* min-height: 200px; */
	/* Give a defined height so flex children can fill it (otherwise they collapse to content size) */
	/* min-height: 280px; */
	/* display: flex; */
	/* flex-direction: column; */
}

/* Let the VE target fill the container so the surface can expand */
.visual-editor-container > * {
	/* flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0; */
}
</style>

<style>
/* Standalone target wraps the surface in this div – let it grow */
.visual-editor-container .ve-init-sa-target-surfaceWrapper {
	/* flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0; */
	/* min-height: 100%; */
}

/* Surface takes remaining space below the toolbar */
.visual-editor-container .ve-ui-surface {
	/* flex: 1; */
	/* min-height: 0; */
	/* min-height: 100%; */
	/* height: 100%; */
}

.visual-editor-container .ve-init-target-visual {
	/* height: 100%; */
}

.visual-editor-container .ve-ce-documentNode {
	/* min-height: 100%; */
	/* overflow: auto; */
}

.visual-editor-container .ve-ce-contentBranchNode {
	margin-left: 0.6rem;
	margin-right: 0.6rem;
}
</style>
