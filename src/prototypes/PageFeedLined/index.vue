<script setup>
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const storageKey = "searchQueryFeed";
const searchQuery = ref(sessionStorage.getItem(storageKey) || "Wikipedia");
/** @type {any} */
const history = ref([]);
const isLoading = ref(false);
/** @type {any} */
const error = ref(null);

onMounted(search);

function saveSearchQuery(query) {
  sessionStorage.setItem(storageKey, query);
}

async function search() {
  isLoading.value = true;
  const pageName = searchQuery.value;
  let _history;
  try {
    _history = await wiki.getPageHistory(pageName, { limit: 5 });
  } catch (/** @type {any} */ e) {
    if (e.message.includes("404")) {
      error.value = "Page not found";
    } else {
      error.value = e.message;
    }
    history.value = [];
    isLoading.value = false;
    return;
  }

  await Promise.all(
    _history.revisions.map(async (revision) => {
      const _summary = wiki.preprocessEditSummary(revision.comment, searchQuery.value);
      const toolbar = wiki.parseToolbarComment(_summary);
      const summary = toolbar ? toolbar : { comment: _summary };
      summary.comment = summary.comment
        ? await wiki.transformWikitextToHtml(summary.comment, searchQuery.value)
        : "";
      // summary.useThisBot = summary.useThisBot
      //   ? await wiki.transformWikitextToHtml(summary.useThisBot, searchQuery.value)
      //   : "";
      // summary.reportBugs = summary.reportBugs
      //   ? await wiki.transformWikitextToHtml(summary.reportBugs, searchQuery.value)
      //   : "";
      summary.hashtags = summary.hashtags ? summary.hashtags.join(" ") : "";
      // let html = await wiki.getEditSummaryHtml(revision.comment, searchQuery.value);
      // html = html.replaceAll("<a ", "<a target='_blank' ");
      // revision.html = html;
      revision.summary = summary;
      revision.avatarUrl = await wiki.getUserAvatar(revision.user.name);
    }),
  );
  isLoading.value = false;
  history.value = _history;

  saveSearchQuery(pageName);
}

function formatTimestamp(timestamp) {
  return (
    "• " +
    wiki.getRelativeTimestamp(timestamp, {
      seconds: "words",
      minutes: "minutes",
      hours: "hours",
      days: "days",
      weeks: "date",
      months: "date",
      years: "date",
    })
  );
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

function getBotUrl(useThisBot) {
  console.log(useThisBot);
  const [head] = useThisBot.split("|");
  let path = head.split("[[")[1];
  [path] = path.split("/use");
  if (!path) {
    return "#";
  }
  return `https://en.wikipedia.org/wiki/${path}`;
}

function getUserUrl(userName) {
  return `https://en.wikipedia.org/wiki/User:${encodeURIComponent(userName)}`;
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
      <div v-if="error" class="error">{{ error }}</div>
      <div class="change" v-for="change in history.revisions" :key="change.timestamp">
        <img class="change-avatar" :src="change.avatarUrl" />
        <div class="change-body">
          <span class="change-header">
            <a target="_blank" :href="getUserUrl(change.user.name)">
              <strong>{{ change.user.name }}</strong>
            </a>
            <span class="change-timestamp">&nbsp;{{ formatTimestamp(change.timestamp) }}</span>
            <br />
          </span>
          <span class="change-suggested-by" v-if="change.summary.suggestedBy">
            Suggested by
            <a :href="getUserUrl(change.summary.suggestedBy)">{{ change.summary.suggestedBy }}</a>
          </span>
          <span :class="getDeltaClass(change.delta)">{{ change.delta }} </span>
          <div v-html="change?.summary?.comment"></div>
        </div>
        <footer>
          <!-- <a
            v-if="change.summary.useThisBot"
            target="_blank"
            :href="getBotUrl(change.summary.useThisBot)"
          >
            <CdxIcon :icon="cdxIconRobot" />
          </a> -->
          <a target="_blank" :href="getRevisionUrl(change.id)"
            ><CdxIcon :icon="cdxIconLinkExternal"
          /></a>
          <a target="_blank" :href="getThankUrl(change.id)"><CdxIcon :icon="cdxIconHeart" /></a>
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
  /* gap: 0.5rem; */
}

.changes p {
  margin: 0;
}

.change {
  /* border: 1px solid var(--border-color-base); */
  padding: 0.6rem 0rem;
  display: flex;
  border-bottom: 0.5px solid var(--border-color-subtle);
}

.change-body {
  flex: 1;
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

.change-header {
  display: flex;
  /* gap: 0.25rem; */
  flex-wrap: wrap;
  align-items: baseline;
}

.change-suggested-by {
  color: var(--color-subtle);
  font-size: 0.8rem;
  display: block;
}

.change-timestamp {
  color: var(--color-subtle);
}

.change-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 0.5rem;
}

.change footer {
  display: flex;
  /* gap: 0.5rem; */
  /* justify-content: flex-end; */
  /* flex-direction: column; */
  flex-wrap: wrap;
  row-gap: 0px;
  /* font-size: 20rem; */
  /* transform: scale(2); */
  /* transform-origin: bottom right; */
  margin-right: -0.1rem;
}

.change footer a {
  flex-shrink: 0;
}

.change footer .cdx-icon {
  width: 2rem;
  height: 2rem;
  padding: 0.5rem;
  color: var(--color-progressive);
}

.change footer .cdx-icon:hover {
  color: var(--color-progressive--hover);
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
  margin: 0;
}
.change .wikitable {
  margin: 0.5rem 0;
  font-size: 0.8rem;
}

.change img {
  width: 100%;
  height: auto;
  object-fit: contain;
}
</style>
