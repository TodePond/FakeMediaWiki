<script setup>
import { CdxButton, CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const dateInput = ref("");
/** @type {any} */
const featuredPage = ref(null);
const isLoading = ref(false);
const error = ref(null);

const loadFeatured = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const date = dateInput.value ? new Date(dateInput.value) : new Date();
    const data = await wiki.getFeaturedPage(date);
    featuredPage.value = data;
  } catch (/** @type {any} */ err) {
    error.value = err.message;
    featuredPage.value = null;
  } finally {
    isLoading.value = false;
  }
};

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

onMounted(() => {
  dateInput.value = getTodayDate() ?? "";
  loadFeatured();
});

const getPageUrl = (title) => {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
};
</script>

<template>
  <section>
    <form @submit.prevent="loadFeatured">
      <CdxLabel input-id="date-input">Date</CdxLabel>
      <span>
        <CdxTextInput v-model="dateInput" input-type="date" id="date-input" />
        <CdxButton>Load featured page</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Loading featured article" />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <CdxCard
      v-if="featuredPage && featuredPage.tfa"
      :thumbnail="featuredPage.tfa.thumbnail ? { url: featuredPage.tfa.thumbnail.source } : null"
      :url="getPageUrl(featuredPage.tfa.title)"
    >
      <template #title>{{ featuredPage.tfa.title }}</template>
      <template #description v-if="featuredPage.tfa.description">
        {{ featuredPage.tfa.description }}
      </template>
      <template #supporting-text v-if="featuredPage.tfa.extract">
        {{ featuredPage.tfa.extract }}
      </template>
    </CdxCard>
    <div v-else-if="featuredPage && !featuredPage.tfa" class="no-article">
      No featured page for this date
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

.error {
  color: var(--color-destructive);
  padding: 0.5rem;
  border: 1px solid var(--color-destructive);
  background-color: var(--background-color-destructive-subtle);
}

.no-article {
  padding: 1rem;
  text-align: center;
  color: var(--color-base--subtle);
}
</style>
