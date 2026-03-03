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
					<CdxLabel input-id="ve-diff-old">Old HTML</CdxLabel>
					<CdxTextArea
						id="ve-diff-old"
						v-model="oldHtml"
						:rows="4"
						class="visual-diff-prototype__textarea"
						placeholder="<p>First version</p>"
					/>
				</div>
				<div class="visual-diff-prototype__input-group">
					<CdxLabel input-id="ve-diff-new">New HTML</CdxLabel>
					<CdxTextArea
						id="ve-diff-new"
						v-model="newHtml"
						:rows="4"
						class="visual-diff-prototype__textarea"
						placeholder="<p>Second version</p>"
					/>
				</div>
			</div>
			<div class="visual-diff-prototype__diff-wrap">
				<VisualDiff
					v-if="oldHtml.trim() && newHtml.trim()"
					:old-html="oldHtml"
					:new-html="newHtml"
					class="visual-diff-prototype__diff"
				/>
				<p v-else class="visual-diff-prototype__hint">
					Enter both “Old HTML” and “New HTML” to see the diff.
				</p>
			</div>
		</template>
	</section>
</template>

<script setup lang="ts">
import VisualDiff from "@/components/VisualDiff/VisualDiff.vue"
import { whenVeReady } from "@/lib/visualeditor/loadVe"
import { CdxLabel, CdxTextArea } from "@wikimedia/codex"
import { onMounted, ref } from "vue"

const oldHtml = ref("<p>Hello there, <b>world</b>!</p>")
const newHtml = ref("<p>Hey there, <i>world</i>!</p>")
const loadState = ref<"loading" | "ready" | "failed">("loading")

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
.visual-diff-prototype {
	padding: 1.5rem;
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
	grid-template-columns: 1fr 1fr;
	gap: 1rem;
	margin-bottom: 1rem;
}

@media (max-width: 600px) {
	.visual-diff-prototype__inputs {
		grid-template-columns: 1fr;
	}
}

.visual-diff-prototype__input-group {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.visual-diff-prototype__textarea {
	font-family: ui-monospace, monospace;
	font-size: 0.875rem;
}

.visual-diff-prototype__diff-wrap {
	border: 1px solid var(--border-color-base, #a2a9b1);
	border-radius: 2px;
	overflow: hidden;
	background: var(--background-color-base, #fff);
	min-height: 160px;
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
