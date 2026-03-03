<template>
	<section class="visualeditor-sandbox">
		<h1 class="visualeditor-sandbox__title">VisualEditor Sandbox</h1>

		<p v-if="loadState === 'failed'" class="visualeditor-sandbox__setup">
			To use this prototype:
		</p>
		<ol v-if="loadState === 'failed'" class="visualeditor-sandbox__steps">
			<li>
				Build VisualEditor elsewhere, then copy its <code>dist/</code>,
				<code>lib/</code> (and optionally <code>i18n/</code>) into
				<code>public/ve/</code> in this repo. See <code>public/ve/README.md</code>.
			</li>
		</ol>
		<p v-if="loadState === 'loading'" class="visualeditor-sandbox__loading">
			Loading VisualEditor…
		</p>
		<div v-if="loadState === 'ready'" class="visualeditor-sandbox__editor-wrap">
			<VisualEditor
				:key="editorKey"
				ref="editorRef"
				:initial-html="initialHtml"
				class="visualeditor-sandbox__editor"
			/>
		</div>
		<div v-if="loadState === 'ready'" class="visualeditor-sandbox__actions">
			<CdxButton @click="convertToHtml" action="progressive"> Convert to HTML </CdxButton>
			<CdxButton @click="convertFromHtml"> Convert from HTML </CdxButton>
		</div>
		<div v-if="loadState === 'ready'" class="visualeditor-sandbox__html-wrap">
			<CdxLabel input-id="ve-html-output">HTML</CdxLabel>
			<CdxTextArea
				id="ve-html-output"
				v-model="htmlOutput"
				:rows="6"
				class="visualeditor-sandbox__html"
			/>
		</div>
	</section>
</template>

<script setup lang="ts">
import VisualEditor from "@/components/VisualEditor/VisualEditor.vue"
import { whenVeReady } from "@/lib/visualeditor/loadVe"
import { CdxButton, CdxLabel, CdxTextArea } from "@wikimedia/codex"
import { onMounted, ref } from "vue"

const editorRef = ref<InstanceType<typeof VisualEditor> | null>(null)
const htmlOutput = ref("<p><b>Hello,</b> <i>World!</i></p>")
const initialHtml = ref("<p><b>Hello,</b> <i>World!</i></p>")
const loadState = ref<"loading" | "ready" | "failed">("loading")

function convertToHtml(): void {
	const editor = editorRef.value
	if (!editor?.getHtml) return
	htmlOutput.value = editor.getHtml()
}

function convertFromHtml(): void {
	initialHtml.value = htmlOutput.value
	// Re-mount with new HTML would require a key change or the component to support setContent.
	// For a minimal demo we set initialHtml and the user would need to re-open or we force remount.
	// VisualEditor uses initialHtml only on mount, so we need to remount. Use a key that changes.
	editorKey.value += 1
}

const editorKey = ref(0)

onMounted(async () => {
	try {
		await whenVeReady()
		loadState.value = typeof window.ve !== "undefined" ? "ready" : "failed"
	} catch {
		loadState.value = "failed"
	}
})
</script>

<style scoped>
@import "./style.css";

.visualeditor-sandbox {
	padding: 1.5rem;
}

.visualeditor-sandbox__intro {
	margin-bottom: 0.5rem;
}

.visualeditor-sandbox__loading {
	color: var(--color-base-subtle, #54595d);
	margin: 1rem 0;
}

.visualeditor-sandbox__setup {
	margin-top: 0.5rem;
	margin-bottom: 0.25rem;
	font-weight: 600;
}

.visualeditor-sandbox__steps {
	margin: 0 0 1rem 1.25rem;
	color: var(--color-base-subtle, #54595d);
}

.visualeditor-sandbox__steps code {
	font-size: 0.875em;
	background: var(--background-color-interactive-subtle, #f8f9fa);
	padding: 0.1em 0.35em;
	border-radius: 2px;
}

.visualeditor-sandbox__editor-wrap {
	width: 100%;
	border: 1px solid var(--border-color-base, #a2a9b1);
	border-radius: 2px;
	overflow: hidden;
	background: var(--background-color-base, #fff);
	margin-bottom: 1rem;
}

.visualeditor-sandbox__editor {
	/* display: block; */
	/* min-height: 300px; */
}

.visualeditor-sandbox__actions {
	display: flex;
	gap: 0.5rem;
	margin-bottom: 0.75rem;
}

.visualeditor-sandbox__html-wrap {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.visualeditor-sandbox__html {
	font-family: ui-monospace, monospace;
	font-size: 0.875rem;
}
</style>
