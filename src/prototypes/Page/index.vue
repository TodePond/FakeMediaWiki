<script setup>
import { CdxButton, CdxCard, CdxLabel, CdxProgressIndicator, CdxTextInput } from '@wikimedia/codex';
import { onMounted, ref } from 'vue';

async function requestWikipediaApi(path) {
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/${path}?origin=*`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MediaWikiPrototypes/0.1 (lwilson-ctr@wikimedia.org)',
    },
  });
  return response.json();
}

const url = ref('');
const title = ref('');
const description = ref('');
const supportingText = ref('');
const thumbnail = ref(null);
const searchQuery = ref('Wet Leg');
const isLoading = ref(false);
const search = async () => {
  // const underscoredSearchQuery = searchQuery.value.replaceAll(' ', '_');
  const encodedSearchQuery = encodeURIComponent(searchQuery.value);
  isLoading.value = true;
  const summary = await requestWikipediaApi(`page/summary/${encodedSearchQuery}`);
  isLoading.value = false;
  console.log(summary);

  url.value = summary.content_urls.desktop.page;
  title.value = summary.title;
  description.value = summary.description;
  supportingText.value = summary.extract;
  thumbnail.value = summary.thumbnail?.source
    ? {
        url: summary.thumbnail.source,
      }
    : null;
};

onMounted(search);
</script>

<template>
  <section>
    <form @submit.prevent="search">
      <CdxLabel input-id="page-name">Page name</CdxLabel>

      <span>
        <CdxTextInput autocomplete="off" v-model="searchQuery" input-type="search" id="page-name" />
        <CdxButton>Load</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
      </span>
    </form>
    <CdxCard :thumbnail="thumbnail" :url="url">
      <template #title>{{ title }}</template>
      <template #description>{{ description }}</template>
      <template #supporting-text>{{ supportingText }}</template>
    </CdxCard>
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
</style>
