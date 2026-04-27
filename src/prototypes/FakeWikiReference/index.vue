<template>
	<article class="rds-article" aria-label="FakeWiki reference">
		<LlmS />
	</article>
</template>

<script setup lang="ts">
import LlmS from "./generated/llms.vue"
</script>

<style scoped>
.rds-article {
	box-sizing: border-box;
	width: 100%;
	max-width: min(1000px, 100%);
	margin: 0 auto;
	min-width: 0;
	padding-inline: clamp(0.5rem, 4vw, var(--spacing-150, 1.5rem));
	padding-block: var(--spacing-150, 1.5rem);
}
:deep(.fwr-generated-body) {
	min-width: 0;
	overflow-x: auto;
}
:deep(.fwr-generated-body p) {
	margin: 0.5em 0;
}
:deep(.fwr-generated-body code) {
	display: inline-block;
	max-width: 100%;
	box-sizing: border-box;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	word-break: break-word;
	vertical-align: bottom;
}
:deep(.fwr-generated-body ul) {
	margin: 0.35em 0 0.35em 1.25em;
}
:deep(.fwr-generated-body h1) {
	font-size: var(--font-size-xxxlarge, 1.75rem);
	margin: 0 0 0.5em;
	scroll-margin-top: 0.5rem;
}
:deep(.fwr-generated-body h2) {
	font-size: var(--font-size-xlarge, 1.3rem);
	margin: 1.25em 0 0.5em;
	scroll-margin-top: 0.5rem;
}
:deep(.fwr-generated-body h3) {
	font-size: var(--font-size-large, 1.15rem);
	margin: 1em 0 0.4em;
	scroll-margin-top: 0.5rem;
}
:deep(.fwr-generated-body h4) {
	font-size: var(--font-size-medium, 1.05rem);
	margin: 0.75em 0 0.35em;
	scroll-margin-top: 0.5rem;
}
:deep(.fwr-generated-body pre) {
	box-sizing: border-box;
	display: block;
	white-space: pre;
	tab-size: 4;
	width: 100%;
	max-width: 100%;
	min-width: 0;
	max-height: min(50vh, 28rem);
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	padding: 1em;
	font-family: monospace, monospace;
	font-size: 0.92em;
	line-height: 1.4;
}
:deep(.fwr-generated-body pre code) {
	display: block;
	margin: 0;
	padding: 0;
	background: none !important;
	border: none !important;
	border-radius: 0 !important;
	max-width: none;
	white-space: pre;
	overflow-wrap: normal;
	word-break: normal;
	font-family: inherit;
	font-size: inherit;
}
</style>
