<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const storageKey1 = "searchQueryFeed1";
const storageKey2 = "searchQueryFeed2";
const storageKey3 = "searchQueryFeed3";
const searchQuery1 = ref(sessionStorage.getItem(storageKey1) || "Wikipedia");
const searchQuery2 = ref(sessionStorage.getItem(storageKey2) || "Life");
const searchQuery3 = ref(sessionStorage.getItem(storageKey3) || "Water");
const history = ref<{ revisions?: Array<{ comment: string; timestamp: string; user: { name: string }; delta: number; id: number; summary?: { comment?: string; suggestedBy?: string; hashtags?: string; useThisBot?: string }; avatarUrl?: string | null; pageName?: string }> }>({});
const isLoading = ref(false);
const errors = ref<string[]>([]);

onMounted(search);

function saveSearchQueries(): void {
  sessionStorage.setItem(storageKey1, searchQuery1.value);
  sessionStorage.setItem(storageKey2, searchQuery2.value);
  sessionStorage.setItem(storageKey3, searchQuery3.value);
}

async function search(): Promise<void> {
  isLoading.value = true;
  errors.value = [];
  const pageNames = [searchQuery1.value, searchQuery2.value, searchQuery3.value].filter(
    (name) => name.trim() !== "",
  );

  if (pageNames.length === 0) {
    history.value = { revisions: [] };
    isLoading.value = false;
    return;
  }

  const allRevisions: Array<{ comment: string; timestamp: string; user: { name: string }; delta: number; id: number; summary?: { comment?: string; suggestedBy?: string; hashtags?: string; useThisBot?: string }; avatarUrl?: string | null; pageName?: string }> = [];

  await Promise.all(
    pageNames.map(async (pageName) => {
      try {
        const _history = (await wiki.getPageHistory(pageName, { limit: 5 })) as { revisions?: Array<{ comment: string; timestamp: string; user: { name: string }; delta: number; id: number; summary?: { comment?: string; suggestedBy?: string; hashtags?: string; useThisBot?: string }; avatarUrl?: string | null; pageName?: string }> };

        if (_history.revisions) {
          await Promise.all(
            _history.revisions.map(async (revision) => {
              const _summary = wiki.preprocessEditSummary(revision.comment, pageName);
              const toolbar = wiki.parseToolbarComment(_summary);
              const summary = toolbar ? toolbar : { comment: _summary, hashtags: [], other: [], suggestedBy: null, useThisBot: null, reportBugs: null };
              summary.comment = summary.comment
                ? await wiki.transformWikitextToHtml(summary.comment, pageName)
                : "";
              summary.hashtags = summary.hashtags ? summary.hashtags.join(" ") : "";
              revision.summary = summary;
              revision.avatarUrl = await wiki.getUserAvatar(revision.user.name);
              revision.pageName = pageName; // Store page name for URL generation
              allRevisions.push(revision);
            }),
          );
        }
      } catch (e) {
        const errorObj = e as Error;
        if (errorObj.message.includes("404")) {
          errors.value.push(`${pageName}: Page not found`);
        } else {
          errors.value.push(`${pageName}: ${errorObj.message}`);
        }
      }
    }),
  );

  // Sort revisions by timestamp (most recent first) to interleave them
  allRevisions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  isLoading.value = false;
  history.value = { revisions: allRevisions };

  saveSearchQueries();
}

function formatTimestamp(timestamp: string): string {
  return wiki.getRelativeTimestamp(timestamp, {
    seconds: "words",
    minutes: "minutes",
    hours: "hours",
    days: "days",
    weeks: "date",
    months: "date",
    years: "date",
  });
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

function getBotUrl(useThisBot: string | null | undefined): string {
  if (!useThisBot) return "#";
  console.log(useThisBot);
  const [head] = useThisBot.split("|");
  let path = head.split("[[")[1];
  if (path) {
    [path] = path.split("/use");
  }
  if (!path) {
    return "#";
  }
  return `https://en.wikipedia.org/wiki/${path}`;
}

function getUserUrl(userName: string): string {
  return `https://en.wikipedia.org/wiki/User:${encodeURIComponent(userName)}`;
}

function getRevisionUrl(id: number, pageName: string): string {
  return `https://en.wikipedia.org/w/index.php?title=${pageName}&diff=${id}`;
}

function getPageUrl(pageName: string): string {
  return `https://en.wikipedia.org/wiki/${pageName}`;
}

function getThankUrl(id: number): string {
  return `https://en.wikipedia.org/wiki/Special:Thanks/${id}`;
}
</script>

<template>
  <main>
    <form @submit.prevent="search">
      <div class="inputs">
        <div class="input-group">
          <CdxLabel input-id="page-name-1">Page name 1</CdxLabel>
          <CdxTextInput
            autocomplete="off"
            v-model="searchQuery1"
            input-type="search"
            id="page-name-1"
          />
        </div>
        <div class="input-group">
          <CdxLabel input-id="page-name-2">Page name 2</CdxLabel>
          <CdxTextInput
            autocomplete="off"
            v-model="searchQuery2"
            input-type="search"
            id="page-name-2"
          />
        </div>
        <div class="input-group">
          <CdxLabel input-id="page-name-3">Page name 3</CdxLabel>
          <CdxTextInput
            autocomplete="off"
            v-model="searchQuery3"
            input-type="search"
            id="page-name-3"
          />
        </div>
      </div>
      <span>
        <CdxButton>Refresh feed</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Loading pages" />
      </span>
    </form>

    <section class="changes">
      <div v-if="errors.length > 0" class="error">
        <div v-for="(error, index) in errors" :key="index">{{ error }}</div>
      </div>
      <div
        class="change"
        v-for="change in history.revisions"
        :key="`${change.pageName}-${change.timestamp}`"
      >
        <img class="change-avatar" :src="change.avatarUrl" />
        <div class="change-body">
          <span class="change-header">
            <a target="_blank" :href="getUserUrl(change.user.name)">
              <strong class="change-user-name">{{ change.user.name }}</strong>
            </a>
            <span class="change-suggested-by" v-if="change.summary.suggestedBy">
              &nbsp;suggested by
              <a :href="getUserUrl(change.summary.suggestedBy)">{{ change.summary.suggestedBy }}</a>
            </span>
            <!-- <span class="change-timestamp">&nbsp;{{ formatTimestamp(change.timestamp) }}</span> -->
            <!-- <br /> -->
          </span>
          <span class="change-page-name-and-delta">
            <a target="_blank" :href="getPageUrl(change.pageName)" class="change-page-name">
              {{ change.pageName }} </a
            >&nbsp;<span :class="getDeltaClass(change.delta)">{{ change.delta }}</span>
          </span>
          <!-- <br /> -->
          <span class="change-timestamp"
            ><a target="_blank" :href="getRevisionUrl(change.id, change.pageName)">{{
              formatTimestamp(change.timestamp)
            }}</a></span
          >
          <div class="change-comment" v-html="change?.summary?.comment"></div>
        </div>
        <footer>
          <a target="_blank" :href="getRevisionUrl(change.id, change.pageName)"
            ><CdxIcon :icon="cdxIconLinkExternal"
          /></a>
          <a target="_blank" :href="getThankUrl(change.id)"><CdxIcon :icon="cdxIconHeart" /></a>
        </footer>
      </div>
    </section>
  </main>
</template>

<style scoped>
.change {
  /* padding: 0.6rem 0rem; */
  /* padding: 0.8rem 0rem; */
  padding: 1rem 0rem;
}

.change-comment {
  /* padding-top: 0.2rem; */
  padding-top: 0.4rem;
}

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
  display: flex;
  border-top: 0.5px solid var(--border-color-subtle);
}

.change:first-child {
  /* border-top: none; */
}

.change-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* gap: 0.1rem; */
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

.inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

form {
  padding-bottom: 1rem;
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

.change-user-name {
  color: var(--color-progressive);
}

.change-suggested-by {
  color: var(--color-subtle);
  /* font-size: 0.8rem; */
  display: block;
  margin-top: -0.2rem;
}

.change-comment {
  color: var(--color-subtle);
  /* padding-top: 0.4rem; */
  overflow-x: break-word;
}

.change-timestamp {
  color: var(--color-subtle);
  font-size: 0.8rem;
  margin-top: -0.3rem;
  /* padding-bottom: 0.25rem; */
}

.change-timestamp a {
  color: var(--color-subtle);
}

.change-page-name-and-delta {
  margin-top: -0.3rem;
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

.change-page-name {
  color: var(--color-base);
  font-weight: bold;
  /* font-size: 0.9rem; */
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
