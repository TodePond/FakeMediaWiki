<script setup>
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex";
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons";
import { computed, onMounted, ref } from "vue";
import { WikiApi } from "../../wiki-api/WikiApi";

const wiki = new WikiApi();

const storageKey1 = "searchQueryFeed1";
const storageKey2 = "searchQueryFeed2";
const storageKey3 = "searchQueryFeed3";
const storageKey4 = "searchQueryFeed4";
const storageKey5 = "searchQueryFeed5";
const storageKey6 = "searchQueryFeed6";
const searchQuery1 = ref(sessionStorage.getItem(storageKey1) ?? "Wikipedia");
const searchQuery2 = ref(sessionStorage.getItem(storageKey2) ?? "Life");
const searchQuery3 = ref(sessionStorage.getItem(storageKey3) ?? "Water");
const searchQuery4 = ref(sessionStorage.getItem(storageKey4) ?? "Samwalton9");
const searchQuery5 = ref(sessionStorage.getItem(storageKey5) ?? "GearsDatapack");
const searchQuery6 = ref(sessionStorage.getItem(storageKey6) ?? "TrademarkedTWOrantula");

// Store results separately for each page
const page1Results = ref([]);
const page2Results = ref([]);
const page3Results = ref([]);
const user1Results = ref([]);
const user2Results = ref([]);
const user3Results = ref([]);
const page1Loading = ref(false);
const page2Loading = ref(false);
const page3Loading = ref(false);
const user1Loading = ref(false);
const user2Loading = ref(false);
const user3Loading = ref(false);
const page1Error = ref(null);
const page2Error = ref(null);
const page3Error = ref(null);
const user1Error = ref(null);
const user2Error = ref(null);
const user3Error = ref(null);
onMounted(search);

function saveSearchQueries() {
  sessionStorage.setItem(storageKey1, searchQuery1.value);
  sessionStorage.setItem(storageKey2, searchQuery2.value);
  sessionStorage.setItem(storageKey3, searchQuery3.value);
  sessionStorage.setItem(storageKey4, searchQuery4.value);
  sessionStorage.setItem(storageKey5, searchQuery5.value);
  sessionStorage.setItem(storageKey6, searchQuery6.value);
}

async function search() {
  const pageNames = [searchQuery1.value, searchQuery2.value, searchQuery3.value].filter(
    (name) => name.trim() !== "",
  );

  if (pageNames.length === 0) {
    page1Results.value = [];
    page2Results.value = [];
    page3Results.value = [];
    return;
  }

  // Load each page independently
  const loadPromises = [];
  if (searchQuery1.value.trim()) {
    loadPromises.push(loadPage(1, searchQuery1.value, page1Results, page1Loading, page1Error));
  } else {
    page1Results.value = [];
    page1Loading.value = false;
    page1Error.value = null;
  }
  if (searchQuery2.value.trim()) {
    loadPromises.push(loadPage(2, searchQuery2.value, page2Results, page2Loading, page2Error));
  } else {
    page2Results.value = [];
    page2Loading.value = false;
    page2Error.value = null;
  }
  if (searchQuery3.value.trim()) {
    loadPromises.push(loadPage(3, searchQuery3.value, page3Results, page3Loading, page3Error));
  } else {
    page3Results.value = [];
    page3Loading.value = false;
    page3Error.value = null;
  }
  if (searchQuery4.value.trim()) {
    loadPromises.push(loadUser(1, searchQuery4.value, user1Results, user1Loading, user1Error));
  } else {
    user1Results.value = [];
    user1Loading.value = false;
    user1Error.value = null;
  }
  if (searchQuery5.value.trim()) {
    loadPromises.push(loadUser(2, searchQuery5.value, user2Results, user2Loading, user2Error));
  } else {
    user2Results.value = [];
    user2Loading.value = false;
    user2Error.value = null;
  }
  if (searchQuery6.value.trim()) {
    loadPromises.push(loadUser(3, searchQuery6.value, user3Results, user3Loading, user3Error));
  } else {
    user3Results.value = [];
    user3Loading.value = false;
    user3Error.value = null;
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
  page1Results.value.forEach((revision) => revisions.push(revision));
  page2Results.value.forEach((revision) => revisions.push(revision));
  page3Results.value.forEach((revision) => revisions.push(revision));
  user1Results.value.forEach((revision) => revisions.push(revision));
  user2Results.value.forEach((revision) => revisions.push(revision));
  user3Results.value.forEach((revision) => revisions.push(revision));
  // Sort by timestamp (most recent first)
  return revisions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
});

const isAnyLoading = computed(() => {
  return (
    page1Loading.value ||
    page2Loading.value ||
    page3Loading.value ||
    user1Loading.value ||
    user2Loading.value ||
    user3Loading.value
  );
});

const errors = computed(() => {
  const errs = [];
  if (page1Error.value) errs.push(page1Error.value);
  if (page2Error.value) errs.push(page2Error.value);
  if (page3Error.value) errs.push(page3Error.value);
  if (user1Error.value) errs.push(user1Error.value);
  if (user2Error.value) errs.push(user2Error.value);
  if (user3Error.value) errs.push(user3Error.value);
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
              v-model="searchQuery1"
              input-type="search"
              id="page-name-1"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="searchQuery2"
              input-type="search"
              id="page-name-2"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="searchQuery3"
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
              v-model="searchQuery4"
              input-type="search"
              id="user-1"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="searchQuery5"
              input-type="search"
              id="user-2"
            />
          </div>
          <div class="input-group">
            <CdxTextInput
              autocomplete="off"
              v-model="searchQuery6"
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
