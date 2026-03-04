<template>
	<section class="visual-diff-prototype">
		<h1 class="visual-diff-prototype__title">Visual Diff</h1>
		<p v-if="loadState === 'failed'" class="visual-diff-prototype__setup">
			To use this prototype, ensure VisualEditor assets are in <code>public/ve/</code>. Run
			<code>npm run update-ve</code>.
		</p>
		<p v-if="loadState === 'loading'" class="visual-diff-prototype__loading">
			Loading VisualEditor…
		</p>
		<template v-if="loadState === 'ready'">
			<div class="visual-diff-prototype__inputs">
				<div class="visual-diff-prototype__input-group">
					<CdxLabel>Old version</CdxLabel>
					<div class="visual-diff-prototype__editor-wrap">
						<VisualEditor
							ref="oldEditorRef"
							:initial-html="initialOldHtml"
							class="visual-diff-prototype__editor"
						/>
					</div>
				</div>
				<div class="visual-diff-prototype__input-group">
					<CdxLabel>New version</CdxLabel>
					<div class="visual-diff-prototype__editor-wrap">
						<VisualEditor
							ref="newEditorRef"
							:initial-html="initialNewHtml"
							class="visual-diff-prototype__editor"
						/>
					</div>
				</div>
			</div>
			<div class="visual-diff-prototype__diff-wrap">
				<VisualDiff
					v-if="diffOldHtml.trim() && diffNewHtml.trim()"
					:old-html="diffOldHtml"
					:new-html="diffNewHtml"
					class="visual-diff-prototype__diff"
				/>
				<p v-else class="visual-diff-prototype__hint">
					Edit the two versions above to see changes.
				</p>
			</div>
		</template>
	</section>
</template>

<script setup lang="ts">
import VisualDiff from "@/components/VisualDiff/VisualDiff.vue"
import VisualEditor from "@/components/VisualEditor/VisualEditor.vue"
import { whenVeReady } from "@/lib/visualeditor/loadVe"
import { CdxLabel } from "@wikimedia/codex"
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue"

const initialOldHtml = ref("<p>Hello there, <b>world</b>!</p>")
const initialNewHtml = ref("<p>Hey there, <i>world</i>!</p>")
/** HTML passed to VisualDiff; synced from editors for instant preview */
const diffOldHtml = ref(initialOldHtml.value)
const diffNewHtml = ref(initialNewHtml.value)

const oldEditorRef = ref<InstanceType<typeof VisualEditor> | null>(null)
const newEditorRef = ref<InstanceType<typeof VisualEditor> | null>(null)

const loadState = ref<"loading" | "ready" | "failed">("loading")

const POLL_INTERVAL_MS = 350

function updateDiff(): void {
	const oldHtmlFromEditor = oldEditorRef.value?.getHtml?.()
	const newHtmlFromEditor = newEditorRef.value?.getHtml?.()
	if (oldHtmlFromEditor !== undefined) diffOldHtml.value = oldHtmlFromEditor
	if (newHtmlFromEditor !== undefined) diffNewHtml.value = newHtmlFromEditor
}

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling(): void {
	if (pollTimer) return
	pollTimer = setInterval(updateDiff, POLL_INTERVAL_MS)
}

function stopPolling(): void {
	if (pollTimer) {
		clearInterval(pollTimer)
		pollTimer = null
	}
}

onMounted(async () => {
	try {
		await whenVeReady()
		await nextTick()
		loadState.value = typeof window.ve !== "undefined" ? "ready" : "failed"
	} catch {
		loadState.value = "failed"
	}
})

onUnmounted(stopPolling)

// When both editors are mounted, sync once then poll for instant diff
let initialSyncScheduled = false
watch(
	[oldEditorRef, newEditorRef],
	([oldRef, newRef]) => {
		if (oldRef && newRef) {
			if (!initialSyncScheduled) {
				initialSyncScheduled = true
				setTimeout(updateDiff, 1200)
			}
			startPolling()
		} else {
			stopPolling()
		}
	},
	{ flush: "post" }
)
</script>

<style scoped>
.visual-diff-prototype {
	padding: 1.5rem;
	box-sizing: border-box;
	max-width: 100%;
}

.visual-diff-prototype__intro {
	margin-bottom: 0.5rem;
}

.visual-diff-prototype__setup {
	margin-top: 0.5rem;
	color: var(--color-base-subtle, #54595d);
}

.visual-diff-prototype__setup code {
	font-size: 0.875em;
	background: var(--background-color-interactive-subtle, #f8f9fa);
	padding: 0.1em 0.35em;
	border-radius: 2px;
}

.visual-diff-prototype__loading {
	color: var(--color-base-subtle, #54595d);
	margin: 1rem 0;
}

.visual-diff-prototype__inputs {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 1rem;
	margin-bottom: 1rem;
}

@media (max-width: 640px) {
	.visual-diff-prototype {
		padding: 0.75rem;
		overflow-x: hidden;
		width: 100%;
	}

	.visual-diff-prototype__inputs {
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}

	/* Let each editor scroll horizontally instead of overflowing the page */
	.visual-diff-prototype__editor-wrap {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.visual-diff-prototype__diff-wrap {
		min-height: 120px;
		overflow-x: auto;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.visual-diff-prototype__diff-wrap > *,
	.visual-diff-prototype__diff-wrap :deep(.visual-diff-container),
	.visual-diff-prototype__diff-wrap :deep(.visual-diff-container > *) {
		display: flex !important;
		flex-direction: column !important;
		gap: 0.5rem;
		min-width: 0;
		max-width: 100%;
	}

	.visual-diff-prototype__diff-wrap [class*="ve-"],
	.visual-diff-prototype__diff-wrap :deep([class*="ve-"]) {
		min-width: 0;
		max-width: 100%;
		overflow-wrap: break-word;
		word-break: break-word;
	}
}

.visual-diff-prototype__input-group {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.visual-diff-prototype__editor-wrap {
	border: 1px solid var(--border-color-base, #a2a9b1);
	border-radius: 2px;
	overflow: hidden;
	background: var(--background-color-base, #fff);
	min-width: 0;
}

.visual-diff-prototype__editor {
	display: block;
	min-width: 0;
}

.visual-diff-prototype__textarea {
	font-family: ui-monospace, monospace;
	font-size: 0.875rem;
}

.visual-diff-prototype__diff-wrap {
	border: 1px solid var(--border-color-base, #a2a9b1);
	border-radius: 2px;
	overflow: auto;
	background: var(--background-color-base, #fff);
	min-height: 160px;
	min-width: 0;
}

.visual-diff-prototype__diff {
	display: block;
	padding: 0.5rem;
}

.visual-diff-prototype__hint {
	margin: 1rem;
	color: var(--color-base-subtle, #54595d);
}
</style>
