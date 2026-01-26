<script setup>
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons";
import { computed, onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

/** @type {[string, string, string]} */
const pageStorageKeys = ["searchQueryFeed1", "searchQueryFeed2", "searchQueryFeed3"];
/** @type {[string, string, string]} */
const userStorageKeys = ["searchQueryFeed4", "searchQueryFeed5", "searchQueryFeed6"];
/** @type {any} */
const pageSearchQueries = ref([
  sessionStorage.getItem(pageStorageKeys[0]) || "Wikipedia",
  sessionStorage.getItem(pageStorageKeys[1]) || "Life",
  sessionStorage.getItem(pageStorageKeys[2]) || "Water",
]);
/** @type {any} */
const userSearchQueries = ref([
  sessionStorage.getItem(userStorageKeys[0]) || "Samwalton9",
  sessionStorage.getItem(userStorageKeys[1]) || "GearsDatapack",
  sessionStorage.getItem(userStorageKeys[2]) || "TrademarkedTWOrantula",
]);

// Store results separately for each page
/** @type {any} */
const pageResults = [ref([]), ref([]), ref([])];
/** @type {any} */
const userResults = [ref([]), ref([]), ref([])];
/** @type {any} */
const pageLoading = [ref(false), ref(false), ref(false)];
/** @type {any} */
const userLoading = [ref(false), ref(false), ref(false)];
/** @type {any} */
const pageError = [ref(null), ref(null), ref(null)];
/** @type {any} */
const userError = [ref(null), ref(null), ref(null)];
onMounted(search);

function saveSearchQueries() {
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

async function search() {
  const pageNames = pageSearchQueries.value.filter((name) => name.trim() !== "");

  if (pageNames.length === 0) {
    pageResults.forEach((result) => {
      result.value = [];
    });
    return;
  }

  // Load each page independently
  const loadPromises = [];
  for (let i = 0; i < pageSearchQueries.value.length; i++) {
    const query = pageSearchQueries.value[i];
    const results = pageResults[i];
    const loading = pageLoading[i];
    const error = pageError[i];
    if (query && results && loading && error) {
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
    if (query && results && loading && error) {
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

async function loadUser(userNum, userName, resultsRef, loadingRef, errorRef) {
  loadingRef.value = true;
  errorRef.value = null;

  try {
    const _history = await wiki.getUserHistory(userName, { limit: 5 });

    // Process revisions - but don't await avatar loading
    const processedRevisions = await Promise.all(
      _history.revisions.map(async (revision) => {
        const pageName = revision.pageName || revision.title || "";
        const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName);
        const toolbar = wiki.parseToolbarComment(_summary);
        const summary = toolbar ? toolbar : { comment: _summary };
        summary.comment = summary.comment
          ? await wiki.transformWikitextToHtml(summary.comment, pageName)
          : "";
        summary.hashtags = summary.hashtags ? summary.hashtags.join(" ") : "";
        revision.summary = summary;
        revision.pageName = pageName;
        // Don't await avatar - load it asynchronously
        revision.avatarUrl = null; // Will be loaded separately
        return revision;
      }),
    );

    // Store revisions immediately
    resultsRef.value = processedRevisions;
    loadingRef.value = false;

    // Load avatars asynchronously - don't block UI
    processedRevisions.forEach((revision) => {
      loadAvatarForRevision(userNum, revision, resultsRef);
    });
  } catch (/** @type {any} */ e) {
    loadingRef.value = false;
    if (e.message.includes("404")) {
      errorRef.value = `${userName}: User not found`;
    } else {
      errorRef.value = `${userName}: ${e.message}`;
    }
    resultsRef.value = [];
  }
}

async function loadPage(pageNum, pageName, resultsRef, loadingRef, errorRef) {
  loadingRef.value = true;
  errorRef.value = null;

  try {
    const _history = await wiki.getPageHistory(pageName, { limit: 5 });

    // Process revisions - but don't await avatar loading
    const processedRevisions = await Promise.all(
      _history.revisions.map(async (revision) => {
        const _summary = wiki.preprocessEditSummary(revision.comment, pageName);
        const toolbar = wiki.parseToolbarComment(_summary);
        const summary = toolbar ? toolbar : { comment: _summary };
        summary.comment = summary.comment
          ? await wiki.transformWikitextToHtml(summary.comment, pageName)
          : "";
        summary.hashtags = summary.hashtags ? summary.hashtags.join(" ") : "";
        revision.summary = summary;
        revision.pageName = pageName;
        // Don't await avatar - load it asynchronously
        revision.avatarUrl = null; // Will be loaded separately
        return revision;
      }),
    );

    // Store revisions immediately
    resultsRef.value = processedRevisions;
    loadingRef.value = false;

    // Load avatars asynchronously - don't block UI
    processedRevisions.forEach((revision) => {
      loadAvatarForRevision(pageNum, revision, resultsRef);
    });
  } catch (/** @type {any} */ e) {
    loadingRef.value = false;
    if (e.message.includes("404")) {
      errorRef.value = `${pageName}: Page not found`;
    } else {
      errorRef.value = `${pageName}: ${e.message}`;
    }
    resultsRef.value = [];
  }
}

// Load avatar asynchronously and update the revision
async function loadAvatarForRevision(pageNum, revision, resultsRef) {
  try {
    const avatarUrl = await wiki.getUserAvatar(revision.user.name);
    // Update the revision in the results array
    const revIndex = resultsRef.value.findIndex((r) => r.id === revision.id);
    if (revIndex !== -1) {
      resultsRef.value[revIndex].avatarUrl = avatarUrl;
      // Trigger reactivity by reassigning
      resultsRef.value = [...resultsRef.value];
    }
  } catch (e) {
    console.error("Failed to load avatar", e);
    // Avatar will remain null, placeholder will show
  }
}

// Combined view of all revisions from all pages and users, sorted by timestamp
/** @type {import('vue').ComputedRef<any[]>} */
const allRevisions = computed(() => {
  /** @type {any[]} */
  const revisions = [];
  const seenIds = new Set();
  
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
    pageLoading.some((loading) => loading.value) ||
    userLoading.some((loading) => loading.value)
  );
});

const errors = computed(() => {
  const errs = [];
  pageError.forEach((error) => {
    if (error.value) errs.push(error.value);
  });
  userError.forEach((error) => {
    if (error.value) errs.push(error.value);
  });
  return errs;
});

function formatTimestamp(timestamp) {
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

function getDeltaClass(delta) {
  if (delta > 0) {
    return "positive";
  } else if (delta < 0) {
    return "negative";
  } else {
    return "neutral";
  }
}

function getUserUrl(userName) {
  return `https://en.wikipedia.org/wiki/User:${encodeURIComponent(userName)}`;
}

function getRevisionUrl(id, pageName) {
  return `https://en.wikipedia.org/w/index.php?title=${pageName}&diff=${id}`;
}

function getPageUrl(pageName) {
  return `https://en.wikipedia.org/wiki/${pageName}`;
}

function getThankUrl(id) {
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
        <img
          v-if="change.avatarUrl"
          class="change-avatar"
          :src="change.avatarUrl"
          :alt="`Avatar for ${change.user.name}`"
        />
        <div v-else class="change-avatar-placeholder"></div>
        <div class="change-body">
          <span class="change-header">
            <a class="change-user-name" target="_blank" :href="getUserUrl(change.user.name)">
              <strong>{{ change.user.name }}</strong>
            </a>
            <span class="change-suggested-by" v-if="change.summary.suggestedBy">
              &nbsp;suggested by
              <a :href="getUserUrl(change.summary.suggestedBy)">{{ change.summary.suggestedBy }}</a>
            </span>
          </span>
          <span class="change-page-name-and-delta">
            <a target="_blank" :href="getPageUrl(change.pageName)" class="change-page-name">
              {{ change.pageName }} </a
            >&nbsp;<span :class="getDeltaClass(change.delta)">{{ change.delta }}</span>
          </span>
          <span class="change-timestamp">
            <a target="_blank" :href="getRevisionUrl(change.id, change.pageName)">{{
              formatTimestamp(change.timestamp)
            }}</a>
          </span>
          <div class="change-comment" v-html="change?.summary?.comment"></div>
        </div>
        <footer>
          <a target="_blank" :href="getRevisionUrl(change.id, change.pageName)">
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
  margin-top: -0.2rem;
}

.change-comment {
  color: var(--color-subtle);
  overflow-x: break-word;
}

.change-timestamp {
  color: var(--color-subtle);
  font-size: 0.8rem;
  margin-top: -0.3rem;
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
  flex-shrink: 0;
}

.change-avatar-placeholder {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  margin-right: 0.5rem;
  flex-shrink: 0;
  background-color: var(--background-color-interactive-subtle);
  border: 1px solid var(--border-color-subtle);
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
</style>
