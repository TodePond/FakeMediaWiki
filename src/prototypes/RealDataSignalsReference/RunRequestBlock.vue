<template>
	<div class="rds-runnable" :aria-busy="loading">
		<h4>Request</h4>
		<pre class="rds-pre"><code>{{ requestBash }}</code></pre>
		<div class="rds-run-row">
			<CdxButton :disabled="loading" @click="onRun">
				{{ loading ? "Loading…" : "Run" }}
			</CdxButton>
			<CdxProgressIndicator v-show="loading" class="rds-run-progress" aria-label="Request in progress" />
		</div>
		<h4>Response</h4>
		<pre
			v-if="loading"
			class="rds-pre rds-pre--loading"
			aria-live="polite"
		><code>Loading…</code></pre>
		<template v-else>
			<pre
				v-if="error"
				class="rds-pre rds-pre--error"
				role="alert"
			><code>{{ error }}</code></pre>
			<pre class="rds-pre"><code>{{ displayResponse }}</code></pre>
		</template>
	</div>
</template>

<script setup lang="ts">
import { CdxButton, CdxProgressIndicator } from "@wikimedia/codex"
import { computed, ref } from "vue"
import { runCurlBash } from "./curlToFetch"

const props = defineProps<{
	requestBash: string
	/** Documented / static JSON in the markdown */
	responseJson: string
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const liveText = ref<string | null>(null)

const displayResponse = computed(() => (liveText.value != null ? liveText.value : props.responseJson))

async function onRun() {
	loading.value = true
	error.value = null
	try {
		const r = await runCurlBash(props.requestBash)
		if (r.ok) {
			error.value = null
			liveText.value = r.text
		} else {
			error.value = r.error
		}
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
.rds-runnable {
	margin: 0.5em 0;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}
.rds-run-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin: 0.25rem 0 0.75rem;
}
.rds-run-progress {
	flex-shrink: 0;
}
.rds-pre--loading {
	color: var(--color-subtle, #54595d);
	font-style: italic;
}
/* Unset wiki load.css: nested `code` in `pre` was getting its own border/padding
   and `pre-wrap` on both split curl lines into separate-looking boxes. */
.rds-pre {
	box-sizing: border-box;
	display: block;
	margin: 0.25em 0;
	padding: 1em;
	width: 100%;
	max-width: 100%;
	min-width: 0;
	max-height: min(50vh, 28rem);
	white-space: pre;
	tab-size: 4;
	overflow: auto;
	overflow-wrap: normal;
	word-break: normal;
	-webkit-overflow-scrolling: touch;
	/* Reassert one code block; wiki global `pre, code` both add borders. */
	background-color: var(--background-color-neutral-subtle, #f8f9fa);
	border: 1px solid var(--border-color-muted, #dadde3);
	color: var(--color-emphasized, #101418);
	font-family: monospace, monospace;
	font-size: 0.92em;
	line-height: 1.4;
}
.rds-pre code {
	display: block;
	margin: 0;
	padding: 0;
	background: none !important;
	border: none !important;
	border-radius: 0 !important;
	white-space: pre;
	font-family: inherit;
	font-size: inherit;
	color: inherit;
}
.rds-pre--error {
	color: var(--color-destructive, #b32424);
}
.rds-pre--error code {
	color: inherit;
}
</style>
