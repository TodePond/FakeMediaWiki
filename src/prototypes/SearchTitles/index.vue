<script setup>
import {
  CdxButton,
  CdxCard,
  CdxLabel,
  CdxProgressIndicator,
  CdxTextInput,
} from "@wikimedia/codex";
import { ref } from "vue";
import { WikiApi } from "../../WikiApi";

const wiki = new WikiApi();

const searchQuery = ref("");
const results = ref([]);
const isLoading = ref(false);
const error = ref(null);

const search = async () => {
  if (!searchQuery.value.trim()) return;

  isLoading.value = true;
  error.value = null;
  try {
    const data = await wiki.searchTitles(searchQuery.value, 20);
    results.value = data.pages || [];
  } catch (err) {
    error.value = err.message;
    results.value = [];
  } finally {
    isLoading.value = false;
  }
};

const getPageUrl = (title) => {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
};
</script>

<template>
  <section>
    <form @submit.prevent="search">
      <CdxLabel input-id="search-query">Search titles (autocomplete)</CdxLabel>
      <span>
        <CdxTextInput
          autocomplete="off"
          v-model="searchQuery"
          input-type="search"
          id="search-query"
          placeholder="Type to search..."
          @input="search"
        />
        <CdxButton>Search</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Searching" />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="results.length > 0" class="results">
      <p class="results-count">{{ results.length }} results</p>
      <div class="results-list">
        <CdxCard
          v-for="page in results"
          :key="page.key"
          :url="getPageUrl(page.title)"
        >
          <template #title>{{ page.title }}</template>
          <template #description v-if="page.description">{{
            page.description
          }}</template>
        </CdxCard>
      </div>
    </div>
    <div v-else-if="!isLoading && searchQuery" class="no-results">
      No results found
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

.results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.results-count {
  margin: 0;
  font-weight: bold;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error {
  color: var(--color-destructive);
  padding: 0.5rem;
  border: 1px solid var(--color-destructive);
  background-color: var(--background-color-destructive-subtle);
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--color-base--subtle);
}
</style>
