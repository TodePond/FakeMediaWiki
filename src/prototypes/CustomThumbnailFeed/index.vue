<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { cdxIconArticle, cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons";
import { computed, onMounted, ref, type Ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

interface Revision {
  id: number;
  timestamp: string;
  user: { name: string };
  delta: number;
  comment: string;
  summary?: { comment?: string; suggestedBy?: string; hashtags?: string; useThisBot?: string };
  avatarUrl?: string | null;
  pageName?: string;
  title?: string;
  thumbnailUrl?: string | null;
}

const wiki = new WikiApi();

const pageStorageKeys: [string, string, string] = ["searchQueryFeed1", "searchQueryFeed2", "searchQueryFeed3"];
const userStorageKeys: [string, string, string] = ["searchQueryFeed4", "searchQueryFeed5", "searchQueryFeed6"];
const pageSearchQueries = ref<string[]>([
  sessionStorage.getItem(pageStorageKeys[0]) ?? "Wikipedia",
  sessionStorage.getItem(pageStorageKeys[1]) ?? "Life",
  sessionStorage.getItem(pageStorageKeys[2]) ?? "Water",
]);
const userSearchQueries = ref<string[]>([
  sessionStorage.getItem(userStorageKeys[0]) ?? "Samwalton9",
  sessionStorage.getItem(userStorageKeys[1]) ?? "GearsDatapack",
  sessionStorage.getItem(userStorageKeys[2]) ?? "TrademarkedTWOrantula",
]);

// Store results separately for each page
const pageResults: [Ref<Revision[]>, Ref<Revision[]>, Ref<Revision[]>] = [ref([]), ref([]), ref([])];
const userResults: [Ref<Revision[]>, Ref<Revision[]>, Ref<Revision[]>] = [ref([]), ref([]), ref([])];
const pageLoading: [Ref<boolean>, Ref<boolean>, Ref<boolean>] = [ref(false), ref(false), ref(false)];
const userLoading: [Ref<boolean>, Ref<boolean>, Ref<boolean>] = [ref(false), ref(false), ref(false)];
const pageError: [Ref<string | null>, Ref<string | null>, Ref<string | null>] = [ref(null), ref(null), ref(null)];
const userError: [Ref<string | null>, Ref<string | null>, Ref<string | null>] = [ref(null), ref(null), ref(null)];
onMounted(search);

function saveSearchQueries(): void {
  pageSearchQueries.value.forEach((query, index) => {
    if (pageStorageKeys[index]) {
      sessionStorage.setItem(pageStorageKeys[index], query);
    }
  });
  userSearchQueries.value.forEach((query, index) => {
    if (userStorageKeys[index]) {
      sessionStorage.setItem(userStorageKeys[index], query);
    }
  });
}

async function search(): Promise<void> {
  // Load each page independently
  const loadPromises: Promise<void>[] = [];
  for (let i = 0; i < pageSearchQueries.value.length; i++) {
    const query = pageSearchQueries.value[i];
    const results = pageResults[i];
    const loading = pageLoading[i];
    const error = pageError[i];
    if (
      query !== undefined &&
      results !== undefined &&
      loading !== undefined &&
      error !== undefined
    ) {
      if (query.trim()) {
        loadPromises.push(loadPage(i + 1, query, results, loading, error));
      } else {
        results.value = [];
        loading.value = false;
        error.value = null;
      }
    }
  }
  for (let i = 0; i < userSearchQueries.value.length; i++) {
    const query = userSearchQueries.value[i];
    const results = userResults[i];
    const loading = userLoading[i];
    const error = userError[i];
    if (
      query !== undefined &&
      results !== undefined &&
      loading !== undefined &&
      error !== undefined
    ) {
      if (query.trim()) {
        loadPromises.push(loadUser(i + 1, query, results, loading, error));
      } else {
        results.value = [];
        loading.value = false;
        error.value = null;
      }
    }
  }

  await Promise.all(loadPromises);
  saveSearchQueries();
}

async function loadUser(userNum: number, userName: string, resultsRef: Ref<Revision[]>, loadingRef: Ref<boolean>, errorRef: Ref<string | null>): Promise<void> {
  loadingRef.value = true;
  errorRef.value = null;

  try {
    const _history = (await wiki.getUserHistory(userName, { limit: 5 })) as { revisions?: Array<{ comment?: string; pageName?: string; title?: string; user: { name: string }; id: number; timestamp: string; delta: number }> };

    if (!_history.revisions) {
      resultsRef.value = [];
      loadingRef.value = false;
      return;
    }

    // Process revisions - but don't await thumbnail loading
    const processedRevisions = await Promise.all(
      _history.revisions.map(async (revision) => {
        const pageName = revision.pageName || revision.title || "";
        const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName);
        const toolbar = wiki.parseToolbarComment(_summary);
        const summary = toolbar ? toolbar : { comment: _summary, hashtags: [], other: [], suggestedBy: null, useThisBot: null, reportBugs: null };
        summary.comment = summary.comment
          ? await wiki.transformWikitextToHtml(summary.comment, pageName)
          : "";
        summary.hashtags = Array.isArray(summary.hashtags)
          ? summary.hashtags.join(" ")
          : summary.hashtags;
        const processedRevision: Revision = {
          ...revision,
          comment: revision.comment || "",
          summary: {
            comment: summary.comment ?? undefined,
            suggestedBy: summary.suggestedBy ?? undefined,
            hashtags: summary.hashtags,
            useThisBot: summary.useThisBot ?? undefined,
          },
          pageName,
          thumbnailUrl: null, // Will be loaded separately
        };
        return processedRevision;
      }),
    );

    // Store revisions immediately
    resultsRef.value = processedRevisions;
    loadingRef.value = false;

    // Load thumbnails asynchronously - don't block UI
    processedRevisions.forEach((revision) => {
      loadThumbnailForRevision(userNum, revision, resultsRef);
    });
  } catch (e) {
    loadingRef.value = false;
    const errorObj = e as Error;
    if (errorObj.message.includes("404")) {
      errorRef.value = `${userName}: User not found`;
    } else {
      errorRef.value = `${userName}: ${errorObj.message}`;
    }
    resultsRef.value = [];
  }
}

async function loadPage(pageNum: number, pageName: string, resultsRef: Ref<Revision[]>, loadingRef: Ref<boolean>, errorRef: Ref<string | null>): Promise<void> {
  loadingRef.value = true;
  errorRef.value = null;

  try {
    const _history = (await wiki.getPageHistory(pageName, { limit: 5 })) as { revisions?: Array<{ comment: string; user: { name: string }; id: number; timestamp: string; delta: number }> };

    if (!_history.revisions) {
      resultsRef.value = [];
      loadingRef.value = false;
      return;
    }

    // Process revisions - but don't await thumbnail loading
    const processedRevisions = await Promise.all(
      _history.revisions.map(async (revision) => {
        const _summary = wiki.preprocessEditSummary(revision.comment, pageName);
        const toolbar = wiki.parseToolbarComment(_summary);
        const summary = toolbar ? toolbar : { comment: _summary, hashtags: [], other: [], suggestedBy: null, useThisBot: null, reportBugs: null };
        summary.comment = summary.comment
          ? await wiki.transformWikitextToHtml(summary.comment, pageName)
          : "";
        summary.hashtags = Array.isArray(summary.hashtags)
          ? summary.hashtags.join(" ")
          : summary.hashtags;
        const processedRevision: Revision = {
          ...revision,
          summary: {
            comment: summary.comment ?? undefined,
            suggestedBy: summary.suggestedBy ?? undefined,
            hashtags: summary.hashtags,
            useThisBot: summary.useThisBot ?? undefined,
          },
          pageName,
          thumbnailUrl: null, // Will be loaded separately
        };
        return processedRevision;
      }),
    );

    // Store revisions immediately
    resultsRef.value = processedRevisions;
    loadingRef.value = false;

    // Load thumbnails asynchronously - don't block UI
    processedRevisions.forEach((revision) => {
      loadThumbnailForRevision(pageNum, revision, resultsRef);
    });
  } catch (e) {
    loadingRef.value = false;
    const errorObj = e as Error;
    if (errorObj.message.includes("404")) {
      errorRef.value = `${pageName}: Page not found`;
    } else {
      errorRef.value = `${pageName}: ${errorObj.message}`;
    }
    resultsRef.value = [];
  }
}

// Load thumbnail asynchronously and update the revision
async function loadThumbnailForRevision(_pageNum: number, revision: Revision, resultsRef: Ref<Revision[]>): Promise<void> {
  try {
    if (!revision.pageName) return;
    const thumbnailUrl = await wiki.getPageThumbnail(revision.pageName);
    // Update the revision in the results array
    const revIndex = resultsRef.value.findIndex((r) => r.id === revision.id);
    if (revIndex !== -1 && resultsRef.value[revIndex]) {
      resultsRef.value[revIndex]!.thumbnailUrl = thumbnailUrl;
      // Trigger reactivity by reassigning
      resultsRef.value = [...resultsRef.value];
    }
  } catch (e) {
    console.error("Failed to load thumbnail", e);
    // Thumbnail will remain null, placeholder will show
  }
}

// Combined view of all revisions from all pages and users, sorted by timestamp
const allRevisions = computed(() => {
  const revisions: Revision[] = [];
  const seenIds = new Set<number>();

  pageResults.forEach((result) => {
    result.value.forEach((revision) => {
      if (revision.id && !seenIds.has(revision.id)) {
        seenIds.add(revision.id);
        revisions.push(revision);
      }
    });
  });
  userResults.forEach((result) => {
    result.value.forEach((revision) => {
      if (revision.id && !seenIds.has(revision.id)) {
        seenIds.add(revision.id);
        revisions.push(revision);
      }
    });
  });
  // Sort by timestamp (most recent first)
  return revisions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
});

const isAnyLoading = computed(() => {
  return (
    pageLoading.some((loading) => loading.value) || userLoading.some((loading) => loading.value)
  );
});

const errors = computed(() => {
  const errs: string[] = [];
  pageError.forEach((error) => {
    if (error.value) errs.push(error.value);
  });
  userError.forEach((error) => {
    if (error.value) errs.push(error.value);
  });
  return errs;
});

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
      <div class="inputs-group">
        <div class="inputs">
          <CdxLabel input-id="page-name-1">Followed pages</CdxLabel>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="pageSearchQueries[0]"
              input-type="search"
              id="page-name-1"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="pageSearchQueries[1]"
              input-type="search"
              id="page-name-2"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="pageSearchQueries[2]"
              input-type="search"
              id="page-name-3"
            />
          </div>
        </div>
        <div class="inputs">
          <CdxLabel input-id="user-1">Followed users</CdxLabel>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="userSearchQueries[0]"
              input-type="search"
              id="user-1"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="userSearchQueries[1]"
              input-type="search"
              id="user-2"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="userSearchQueries[2]"
              input-type="search"
              id="user-3"
            />
          </div>
        </div>
      </div>
      <footer>
        <CdxButton>Refresh feed</CdxButton>
        <CdxProgressIndicator v-if="isAnyLoading" aria-label="Loading pages" />
      </footer>
    </form>

    <section class="changes">
      <div v-if="errors.length > 0" class="error">
        <div v-for="(error, index) in errors" :key="index">{{ error }}</div>
      </div>
      <div
        class="change"
        v-for="change in allRevisions"
        :key="`${change.pageName}-${change.timestamp}`"
      >
        <a v-if="change.pageName" target="_blank" :href="getPageUrl(change.pageName)"
          ><img
            v-if="change.thumbnailUrl"
            class="change-thumbnail"
            :src="change.thumbnailUrl"
            :alt="`Thumbnail for ${change.pageName}`"
          />
          <div v-else class="change-thumbnail-placeholder">
            <CdxIcon :icon="cdxIconArticle" />
          </div>
        </a>

        <div class="change-body">
          <span class="change-page-name-and-delta">
            <a v-if="change.pageName" target="_blank" :href="getPageUrl(change.pageName)" class="change-page-name">
              {{ change.pageName }} </a
            >&nbsp;<span :class="getDeltaClass(change.delta)">{{ change.delta }}</span>
          </span>
          <span class="change-header">
            <a class="change-user-name" target="_blank" :href="getUserUrl(change.user.name)">
              <strong>{{ change.user.name }}</strong>
            </a>
            <span class="change-suggested-by" v-if="change.summary?.suggestedBy">
              &nbsp;suggested by
              <a :href="getUserUrl(change.summary.suggestedBy)">{{ change.summary.suggestedBy }}</a>
            </span>
          </span>
          <span class="change-timestamp">
            <a v-if="change.pageName" target="_blank" :href="getRevisionUrl(change.id, change.pageName)">{{
              formatTimestamp(change.timestamp)
            }}</a>
          </span>
          <div class="change-comment" v-html="change?.summary?.comment"></div>
        </div>

        <footer>
          <a v-if="change.pageName" target="_blank" :href="getRevisionUrl(change.id, change.pageName)">
            <CdxIcon :icon="cdxIconLinkExternal" />
          </a>
          <a target="_blank" :href="getThankUrl(change.id)">
            <CdxIcon :icon="cdxIconHeart" />
          </a>
        </footer>
      </div>
    </section>
  </main>
</template>

<style scoped>
.change {
  padding: 1rem 0rem;
  display: flex;
  border-top: 0.5px solid var(--border-color-subtle);
  align-items: flex-start;
  gap: 0.5rem;
}

.change-comment {
  padding-top: 0.4rem;
}

.changes {
  margin: 0.5rem 0;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
}

.changes p {
  margin: 0;
}

.change-body {
  flex: 1;
  display: flex;
  flex-direction: column;
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

.inputs-group {
  display: flex;
  gap: 0.8rem 2rem;
  flex-wrap: wrap;
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

.input-controls {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  flex-wrap: wrap;
}

.page-indicator {
  flex-shrink: 0;
}

.page-error {
  color: var(--color-destructive);
  font-size: 0.875rem;
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

form footer {
  display: flex;
  /* flex-direction: column; */
  gap: 0.25rem;
  flex-wrap: wrap;
  /* align-items: center; */
  padding-top: 1rem;
}

.change-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-top: -0.2rem;
}

.change-user-name {
  color: var(--color-progressive);
}

.change-user-name:hover {
  color: var(--color-progressive--hover);
}

.change-suggested-by {
  color: var(--color-subtle);
  display: block;
  margin-top: -0.1rem;
}

.change-comment {
  color: var(--color-subtle);
  overflow-x: break-word;
}

.change-timestamp {
  color: var(--color-subtle);
  font-size: 0.8rem;
  margin-top: -0.2rem;
}

.change-timestamp a {
  color: var(--color-subtle);
}

.change-page-name-and-delta {
  margin-top: -0.3rem;
}

.change-thumbnail {
  width: 3rem;
  height: 3rem;
  border-radius: 2px;
  object-fit: cover;
  flex-shrink: 0;
}

.change-thumbnail-placeholder {
  width: 3rem;
  height: 3rem;
  border-radius: 2px;
  flex-shrink: 0;
  background-color: var(--background-color-interactive-subtle);
  border: 1px solid var(--border-color-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}

.change-thumbnail-placeholder .cdx-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.change footer {
  display: flex;
  flex-wrap: wrap;
  row-gap: 0px;
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
  color: var(--color-progressive);
  text-decoration: underline var(--color-progressive);
}

.change-page-name {
  color: var(--color-base);
  font-weight: bold;
}

.change-page-name:hover {
  color: var(--color-base);
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

.change-thumbnail-placeholder .cdx-icon svg {
  color: var(--color-icon-notice);
}
</style>
