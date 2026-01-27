<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const searchQuery = ref(sessionStorage.getItem("searchQuery") || "Wet Leg");
const history = ref<{ revisions?: Array<{ comment: string; html?: string; timestamp: string; user: { name: string }; delta: number; id: number }> }>({});
const isLoading = ref(false);
const error = ref<string | null>(null);

onMounted(search);

function saveSearchQuery(query: string): void {
  sessionStorage.setItem("searchQuery", query);
}

// If a comment begins with a /* comment block */
// replace it with a wikitext link to that heading
// eg
// from: "/* Singles */ blah blah"
// to: "[[pageName#Singles]] blah blah"
function linkUpComment(comment: string, pageName: string): string {
  return comment.replace(/^\/\* (.*) \*\//, `[[${pageName}#$1|→$1]]`);
}

async function search(): Promise<void> {
  isLoading.value = true;
  const pageName = searchQuery.value;
  let _history: { revisions?: Array<{ comment: string; html?: string; timestamp: string; user: { name: string }; delta: number; id: number }> };
  try {
    _history = (await wiki.getPageHistory(pageName)) as { revisions?: Array<{ comment: string; html?: string; timestamp: string; user: { name: string }; delta: number; id: number }> };
  } catch (e) {
    const errorObj = e as Error;
    if (errorObj.message.includes("404")) {
      error.value = "Page not found";
    } else {
      error.value = errorObj.message;
    }
    history.value = { revisions: [] };
    isLoading.value = false;
    return;
  }
  console.log(_history);
  if (_history.revisions) {
    await Promise.all(
      _history.revisions.map(async (revision) => {
        const linkedUpComment = linkUpComment(revision.comment, pageName);
        let html = await wiki.transformWikitextToHtml(linkedUpComment, searchQuery.value);
        html = html.replaceAll("<a ", "<a target='_blank' ");
        revision.html = html;

        console.log(revision.html);
      }),
    );
  }
  isLoading.value = false;

  history.value = _history;

  saveSearchQuery(pageName);
}

function formatTimestamp(timestamp: string): string {
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

function getDeltaClass(delta: number): string {
  if (delta > 0) {
    return "positive";
  } else if (delta < 0) {
    return "negative";
  } else {
    return "neutral";
  }
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
      <div v-if="error" class="error">{{ error }}</div>
      <div class="change" v-for="change in history.revisions" :key="change.timestamp">
        <div v-html="change.html"></div>
        <p>
          <a :href="wiki.getUserUrl(change.user.name)">
            <strong>{{ change.user.name }}</strong> </a
          >&nbsp;<span :class="getDeltaClass(change.delta)">{{ change.delta }}</span>
        </p>
        <p>
          <span>{{ formatTimestamp(change.timestamp) }}</span>
        </p>
        <footer>
          <a target="_blank" :href="wiki.getRevisionUrl(change.id, searchQuery)">View change</a>
          <span>|</span>
          <a target="_blank" :href="wiki.getThankUrl(change.id)">Give thanks</a>
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

.error {
  color: var(--color-destructive);
  padding: 0.5rem;
  border: 1px solid var(--color-destructive);
  background-color: var(--background-color-destructive-subtle);
}
</style>
<style>
.change p {
  margin: 0 !important;
}
</style>
