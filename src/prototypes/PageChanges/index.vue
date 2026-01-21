<script setup>
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const searchQuery = ref(sessionStorage.getItem("searchQuery") || "Wet Leg");
/** @type {any} */
const history = ref([]);
const isLoading = ref(false);

onMounted(search);

function saveSearchQuery(query) {
  sessionStorage.setItem("searchQuery", query);
}

// If a comment begins with a /* comment block */
// replace it with a wikitext link to that heading
// eg
// from: "/* Singles */ blah blah"
// to: "[[pageName#Singles]] blah blah"
function linkUpComment(comment, pageName) {
  return comment.replace(/^\/\* (.*) \*\//, `[[${pageName}#$1|→$1]]`);
}

async function search() {
  isLoading.value = true;
  const pageName = searchQuery.value;
  const _history = await wiki.getPageHistory(pageName);

  console.log(_history);

  await Promise.all(
    _history.revisions.map(async (revision) => {
      const linkedUpComment = linkUpComment(revision.comment, pageName);
      let html = await wiki.transformWikitextToHtml(linkedUpComment, searchQuery.value);
      html = html.replaceAll("<a ", "<a target='_blank' ");
      revision.html = html;

      console.log(revision.html);
    }),
  );
  isLoading.value = false;

  history.value = _history;

  saveSearchQuery(pageName);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const dateString = date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeString = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${timeString}, ${dateString}`;
}

function getDeltaClass(delta) {
  if (delta > 0) {
    return "positive";
  } else if (delta < 0) {
    return "negative";
  } else {
    return "neutral";
  }
}

function getUserUrl(user) {
  return `https://en.wikipedia.org/wiki/${user.name}`;
}

function getRevisionUrl(id) {
  return `https://en.wikipedia.org/w/index.php?title=${searchQuery.value}&diff=${id}`;
}

function getThankUrl(id) {
  return `https://en.wikipedia.org/wiki/Special:Thanks/${id}`;
}
</script>

<template>
  <main>
    <form @submit.prevent="search">
      <CdxLabel input-id="page-name">Page name</CdxLabel>

      <span>
        <CdxTextInput autocomplete="off" v-model="searchQuery" input-type="search" id="page-name" />
        <CdxButton>Load changes</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Loading page" />
      </span>
    </form>
    <section class="changes">
      <div class="change" v-for="change in history.revisions" :key="change.timestamp">
        <div v-html="change.html"></div>
        <p>
          <a :href="getUserUrl(change.user)">
            <strong>{{ change.user.name }}</strong> </a
          >&nbsp;<span :class="getDeltaClass(change.delta)">{{ change.delta }}</span>
        </p>
        <p>
          <span>{{ formatTimestamp(change.timestamp) }}</span>
        </p>
        <footer>
          <a target="_blank" :href="getRevisionUrl(change.id)">View change</a>
          <span>|</span>
          <a target="_blank" :href="getThankUrl(change.id)">Give thanks</a>
        </footer>
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
  padding: 0.25rem 0.6rem;
}

.positive {
  color: var(--color-content-added);
}

.positive::before {
  content: "+";
}

.negative {
  color: var(--color-content-removed);
}

.neutral {
  color: var(--color-base);
}

.neutral::before {
  content: "±";
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

.change footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  row-gap: 0px;
}
</style>
<style>
.change p {
  margin: 0 !important;
}
</style>
