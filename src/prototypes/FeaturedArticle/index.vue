<script setup>
import {
  CdxButton,
  CdxCard,
  CdxLabel,
  CdxProgressIndicator,
  CdxTextInput,
} from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../WikiApi";

const wiki = new WikiApi();

const dateInput = ref("");
const featuredArticle = ref(null);
const isLoading = ref(false);
const error = ref(null);

const loadFeatured = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const date = dateInput.value ? new Date(dateInput.value) : new Date();
    const data = await wiki.getFeaturedArticle(date);
    featuredArticle.value = data;
  } catch (err) {
    error.value = err.message;
    featuredArticle.value = null;
  } finally {
    isLoading.value = false;
  }
};

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

onMounted(() => {
  dateInput.value = getTodayDate();
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
        <CdxButton>Load Featured Article</CdxButton>
        <CdxProgressIndicator
          v-if="isLoading"
          aria-label="Loading featured article"
        />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <CdxCard
      v-if="featuredArticle && featuredArticle.tfa"
      :thumbnail="
        featuredArticle.tfa.thumbnail
          ? { url: featuredArticle.tfa.thumbnail.source }
          : null
      "
      :url="getPageUrl(featuredArticle.tfa.title)"
    >
      <template #title>{{ featuredArticle.tfa.title }}</template>
      <template #description v-if="featuredArticle.tfa.description">
        {{ featuredArticle.tfa.description }}
      </template>
      <template #supporting-text v-if="featuredArticle.tfa.extract">
        {{ featuredArticle.tfa.extract }}
      </template>
    </CdxCard>
    <div v-else-if="featuredArticle && !featuredArticle.tfa" class="no-article">
      No featured article for this date
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
