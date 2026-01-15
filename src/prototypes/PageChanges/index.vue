<script setup>
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from '@wikimedia/codex';
import { onMounted, ref } from 'vue';
import { WikiApi } from '../../wiki';

const wiki = new WikiApi();

const searchQuery = ref(sessionStorage.getItem('searchQuery') || 'Wet Leg');
const history = ref([]);
const isLoading = ref(false);

onMounted(search);

function saveSearchQuery(query) {
  sessionStorage.setItem('searchQuery', query);
}

async function search() {
  isLoading.value = true;
  const _history = await wiki.getPageHistory(searchQuery.value);
  isLoading.value = false;
  console.log(_history);
  history.value = _history;
  saveSearchQuery(searchQuery.value);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const dateString = date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeString = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${timeString}, ${dateString}`;
}

function getDeltaClass(delta) {
  if (delta > 0) {
    return 'positive';
  } else if (delta < 0) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

function getUserUrl(user) {
  return `https://en.wikipedia.org/wiki/${user.name}`;
}

function getRevisionUrl(id) {
  return `https://en.wikipedia.org/w/index.php?title=${searchQuery.value}&diff=${id}`;
}
</script>

<template>
  <main>
    <form @submit.prevent="search">
      <CdxLabel input-id="page-name">Page name</CdxLabel>

      <span>
        <CdxTextInput autocomplete="off" v-model="searchQuery" input-type="search" id="page-name" />
        <CdxButton>Load</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
      </span>
    </form>
    <section class="changes">
      <div class="change" v-for="change in history.revisions" :key="change.timestamp">
        <p>
          <a :href="getRevisionUrl(change.id)">{{ change.comment }}</a>
        </p>
        <p>
          <a :href="getUserUrl(change.user)">
            <strong>{{ change.user.name }}</strong>
          </a>
          &nbsp;<span :class="getDeltaClass(change.delta)">{{ change.delta }}</span>
        </p>
        <p>
          <span>{{ formatTimestamp(change.timestamp) }}</span>
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.changes {
  margin: 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.changes p {
  margin: 0;
}

.change {
  border: 1px solid var(--border-color-base);
  padding: 0.5rem;
}

.positive {
  color: var(--color-content-added);
}

.positive::before {
  content: '+';
}

.negative {
  color: var(--color-content-removed);
}

.neutral {
  color: var(--color-base);
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
