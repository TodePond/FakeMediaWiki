<script setup>
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput, CdxTextArea } from '@wikimedia/codex';
import { ref } from 'vue';
import { WikiApi } from '../../WikiApi';

const wiki = new WikiApi();

const wikitext = ref('== Hello World ==\n\nThis is a test of **wikitext** transformation.');
const pageTitle = ref('Test_Page');
const htmlResult = ref('');
const isLoading = ref(false);
const error = ref(null);

const transform = async () => {
  if (!wikitext.value.trim()) return;
  
  isLoading.value = true;
  error.value = null;
  try {
    const html = await wiki.transformWikitextToHtml(wikitext.value, pageTitle.value);
    htmlResult.value = html;
  } catch (err) {
    error.value = err.message;
    htmlResult.value = '';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <section>
    <form @submit.prevent="transform">
      <CdxLabel input-id="page-title">Page Title (for context)</CdxLabel>
      <CdxTextInput v-model="pageTitle" id="page-title" />
      <CdxLabel input-id="wikitext">Wikitext</CdxLabel>
      <CdxTextArea 
        v-model="wikitext" 
        id="wikitext"
        :rows="10"
        placeholder="Enter wikitext here..."
      />
      <CdxButton>Transform to HTML</CdxButton>
      <CdxProgressIndicator v-if="isLoading" aria-label="Transforming" />
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="htmlResult" class="html-result">
      <h3>HTML Result:</h3>
      <div class="html-content" v-html="htmlResult"></div>
    </div>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cdx-text-input,
.cdx-text-area {
  max-width: 100%;
  min-width: 0;
  width: 100%;
}

.html-result {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.html-result h3 {
  margin: 0;
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
