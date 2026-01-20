<script setup>
import { CdxButton, CdxCard, CdxProgressIndicator } from "@wikimedia/codex";
import { ref } from "vue";
import { WikiApi } from "../../WikiApi";

const wiki = new WikiApi();

const format = ref("summary");
/** @type {any} */
const randomPage = ref(null);
const isLoading = ref(false);
const error = ref(null);

const getRandom = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await wiki.getRandomPage(format.value);
    randomPage.value = data;
  } catch (/** @type {any} */ err) {
    error.value = err.message;
    randomPage.value = null;
  } finally {
    isLoading.value = false;
  }
};

const getPageUrl = () => {
  const pageTitle =
    typeof randomPage.value === "string" ? randomPage.value : randomPage.value?.title || "";
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
};
</script>

<template>
  <section>
    <div class="controls">
      <CdxButton @click="getRandom">Load random page</CdxButton>
      <CdxProgressIndicator v-if="isLoading" aria-label="Loading random page" />
    </div>
    <div v-if="error" class="error">{{ error }}</div>
    <CdxCard
      v-else-if="randomPage"
      :thumbnail="randomPage.thumbnail ? { url: randomPage.thumbnail.source } : null"
      :url="getPageUrl()"
    >
      <template #title>{{ randomPage.title }}</template>
      <template #description v-if="randomPage.description">{{ randomPage.description }}</template>
      <template #supporting-text v-if="randomPage.extract">{{ randomPage.extract }}</template>
    </CdxCard>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.title-result {
  padding: 1rem;
  border: 1px solid var(--border-color-base);
  text-align: center;
}

.html-content {
  border: 1px solid var(--border-color-base);
  padding: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.html-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.error {
  color: var(--color-destructive);
  padding: 0.5rem;
  border: 1px solid var(--color-destructive);
  background-color: var(--background-color-destructive-subtle);
}
</style>
