<script setup lang="ts">
import { CdxButton, CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const searchQuery = ref(sessionStorage.getItem("searchPagesQuery") || "");
const results = ref<Array<{ key?: string; title: string; description?: string; excerpt?: string }>>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

const search = async (): Promise<void> => {
  if (!searchQuery.value.trim()) return;

  isLoading.value = true;
  error.value = null;
  try {
    const data = (await wiki.searchPages(searchQuery.value, 20)) as { pages?: Array<{ key?: string; title: string; description?: string; excerpt?: string }> };
    results.value = data.pages || [];
    console.log(results.value);
    hasSearched.value = true;
  } catch (err) {
    const errorObj = err as Error;
    error.value = errorObj.message;
    results.value = [];
  } finally {
    isLoading.value = false;
  }
};

function saveSearchQuery(query: string): void {
  sessionStorage.setItem("searchPagesQuery", query);
}


onMounted(() => {
  if (searchQuery.value) {
    search();
  }
});
</script>

<template>
  <section>
    <form @submit.prevent="search">
      <CdxLabel input-id="search-query">Full-text search</CdxLabel>
      <span>
        <CdxTextInput
          autocomplete="off"
          v-model="searchQuery"
          input-type="search"
          id="search-query"
          placeholder="Search titles and content..."
          @input="saveSearchQuery(searchQuery)"
        />
        <CdxButton>Search</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Searching" />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="results.length > 0" class="results">
      <p class="results-count">{{ results.length }} results</p>
      <div class="results-list">
        <CdxCard v-for="page in results" :key="page.key" :url="wiki.getPageUrl(page.title)">
          <template #title>{{ page.title }}</template>
          <template #description v-if="page.description">{{ page.description }}</template>
          <template #supporting-text v-if="page.excerpt">
            <div v-html="page.excerpt"></div>
          </template>
        </CdxCard>
      </div>
    </div>
    <div v-else-if="!isLoading && hasSearched" class="no-results">No results found</div>
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

<style>
.searchmatch {
  font-weight: bold;
}
</style>
