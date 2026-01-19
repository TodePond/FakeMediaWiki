<script setup>
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from '@wikimedia/codex';
import { ref } from 'vue';
import { WikiApi } from '../../WikiApi';

const wiki = new WikiApi();

const pageName = ref('');
const exists = ref(null);
const isLoading = ref(false);
const error = ref(null);

const checkExists = async () => {
  if (!pageName.value.trim()) return;
  
  isLoading.value = true;
  error.value = null;
  try {
    const result = await wiki.pageExists(pageName.value);
    exists.value = result;
  } catch (err) {
    error.value = err.message;
    exists.value = null;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <section>
    <form @submit.prevent="checkExists">
      <CdxLabel input-id="page-name">Page name</CdxLabel>
      <span>
        <CdxTextInput autocomplete="off" v-model="pageName" input-type="search" id="page-name" />
        <CdxButton>Check</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Checking page" />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="exists !== null" class="result">
      <div v-if="exists" class="exists">
        ✓ Page "<strong>{{ pageName }}</strong>" exists
      </div>
      <div v-else class="not-exists">
        ✗ Page "<strong>{{ pageName }}</strong>" does not exist
      </div>
    </div>
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

.result {
  padding: 1rem;
  border: 1px solid var(--border-color-base);
}

.exists {
  color: var(--color-success);
}

.not-exists {
  color: var(--color-destructive);
}

.error {
  color: var(--color-destructive);
  padding: 0.5rem;
  border: 1px solid var(--color-destructive);
  background-color: var(--background-color-destructive-subtle);
}
</style>
