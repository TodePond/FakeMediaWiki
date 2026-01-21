<script setup>
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const pageName = ref(sessionStorage.getItem("pageSourceQuery") || "Wet Leg");
const sourceContent = ref("");
const isLoading = ref(false);
const error = ref(null);

const loadPage = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const source = await wiki.getPageSource(pageName.value);
    sourceContent.value = source;
    sessionStorage.setItem("pageSourceQuery", pageName.value);
  } catch (/** @type {any} */ err) {
    error.value = err.message;
    sourceContent.value = "";
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadPage);
</script>

<template>
  <section>
    <form @submit.prevent="loadPage">
      <CdxLabel input-id="page-name">Page name</CdxLabel>
      <span>
        <CdxTextInput autocomplete="off" v-model="pageName" input-type="search" id="page-name" />
        <CdxButton>Load Source</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <pre v-if="sourceContent" class="source-content">{{ sourceContent }}</pre>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cdx-text-input {
  max-width: 100%;
  min-width: 0;
  width: 256px;
}

form > span {
  display: flex;
  gap: 0.25rem;
  width: 100%;
  flex-wrap: wrap;
}

.source-content {
  border: 1px solid var(--border-color-base);
  padding: 1rem;
  max-height: 600px;
  overflow-y: auto;
  background-color: var(--background-color-base);
  font-family: monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error {
  color: var(--color-destructive);
  padding: 0.5rem;
  border: 1px solid var(--color-destructive);
  background-color: var(--background-color-destructive-subtle);
}
</style>
