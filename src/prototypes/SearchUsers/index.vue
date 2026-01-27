<script setup lang="ts">
import { CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const searchQuery = ref(sessionStorage.getItem("searchUsersQuery") || "samwalton");
const results = ref<Array<{ key?: string; username: string; description?: string; avatar?: { url: string } | null }>>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

let searchId = 0;
const search = async (): Promise<void> => {
  searchId++;
  const currentSearchId = searchId;
  sessionStorage.setItem("searchUsersQuery", searchQuery.value);
  if (!searchQuery.value.trim()) return;

  isLoading.value = true;
  error.value = null;
  try {
    const usersWithAvatars = (await wiki.searchUsers(searchQuery.value, 20)) as Array<{ key?: string; username: string; description?: string; avatar?: { url: string } | null }>;

    if (currentSearchId === searchId) {
      results.value = usersWithAvatars;
      hasSearched.value = true;
      console.log(results.value);
    }
  } catch (err) {
    if (currentSearchId === searchId) {
      const errorObj = err as Error;
      error.value = errorObj.message;
      results.value = [];
    }
  } finally {
    if (currentSearchId === searchId) {
      isLoading.value = false;
    }
  }
};

const getUserUrl = (username: string): string => {
  return `https://en.wikipedia.org/wiki/User:${encodeURIComponent(username)}`;
};

onMounted(() => {
  if (searchQuery.value) {
    search();
  }
});
</script>

<template>
  <section>
    <form @submit.prevent="search">
      <CdxLabel input-id="search-query">Search users</CdxLabel>
      <span>
        <CdxTextInput
          autocomplete="off"
          v-model="searchQuery"
          input-type="search"
          id="search-query"
          placeholder="Type to search..."
          @input="search"
        />
        <CdxProgressIndicator v-if="isLoading" aria-label="Searching" />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="results.length > 0" class="results">
      <p class="results-count">{{ results.length }} results</p>
      <div class="results-list">
        <CdxCard
          v-for="user in results"
          :key="user.key"
          :url="getUserUrl(user.username)"
          :thumbnail="user.avatar"
        >
          <template #title>{{ user.username }}</template>
          <template #description v-if="user.description">{{ user.description }}</template>
        </CdxCard>
      </div>
    </div>
    <div v-else-if="!isLoading && hasSearched" class="no-results">No users found</div>
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
