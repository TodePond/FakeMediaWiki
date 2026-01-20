<script setup>
import {
  CdxButton,
  CdxCard,
  CdxLabel,
  CdxProgressIndicator,
  CdxSelect,
  CdxTextInput,
} from "@wikimedia/codex";
import { onMounted, ref } from "vue";
import { WikiApi } from "../../WikiApi";

const wiki = new WikiApi();

const type = ref("events");
const dateInput = ref("");
/** @type {any} */
const content = ref(null);
const isLoading = ref(false);
const error = ref(null);

const typeOptions = [
  { value: "events", label: "Events" },
  { value: "births", label: "Births" },
  { value: "deaths", label: "Deaths" },
  { value: "holidays", label: "Holidays" },
];

const loadContent = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const date = dateInput.value ? new Date(dateInput.value) : new Date();
    const data = await wiki.getOnThisDay(type.value, date);
    content.value = data;
  } catch (/** @type {any} */ err) {
    error.value = err.message;
    content.value = null;
  } finally {
    isLoading.value = false;
  }
};

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

onMounted(() => {
  dateInput.value = getTodayDate() ?? "";
  loadContent();
});

const getPageUrl = (title) => {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
};
</script>

<template>
  <section>
    <form @submit.prevent="loadContent">
      <CdxLabel input-id="type-select">Type</CdxLabel>
      <CdxSelect v-model:selected="type" :menu-items="typeOptions" />
      <CdxLabel input-id="date-input">Date</CdxLabel>
      <span>
        <CdxTextInput v-model="dateInput" input-type="date" id="date-input" />
        <CdxButton>Load</CdxButton>
        <CdxProgressIndicator v-if="isLoading" aria-label="Loading content" />
      </span>
    </form>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="content" class="content">
      <div v-if="content.events && content.events.length > 0" class="section">
        <h3>Events</h3>
        <div class="items">
          <CdxCard
            v-for="(event, index) in content.events"
            :key="index"
            :url="getPageUrl(event.pages[0]?.title || '')"
          >
            <template #title>{{ event.text }}</template>
            <template #description v-if="event.year">Year: {{ event.year }}</template>
          </CdxCard>
        </div>
      </div>
      <div v-if="content.births && content.births.length > 0" class="section">
        <h3>Births</h3>
        <div class="items">
          <CdxCard
            v-for="(birth, index) in content.births"
            :key="index"
            :url="getPageUrl(birth.pages[0]?.title || '')"
          >
            <template #title>{{ birth.text }}</template>
            <template #description v-if="birth.year">Year: {{ birth.year }}</template>
          </CdxCard>
        </div>
      </div>
      <div v-if="content.deaths && content.deaths.length > 0" class="section">
        <h3>Deaths</h3>
        <div class="items">
          <CdxCard
            v-for="(death, index) in content.deaths"
            :key="index"
            :url="getPageUrl(death.pages[0]?.title || '')"
          >
            <template #title>{{ death.text }}</template>
            <template #description v-if="death.year">Year: {{ death.year }}</template>
          </CdxCard>
        </div>
      </div>
      <div v-if="content.holidays && content.holidays.length > 0" class="section">
        <h3>Holidays</h3>
        <div class="items">
          <CdxCard
            v-for="(holiday, index) in content.holidays"
            :key="index"
            :url="getPageUrl(holiday.pages[0]?.title || '')"
          >
            <template #title>{{ holiday.text }}</template>
          </CdxCard>
        </div>
      </div>
      <div v-if="content.selected && content.selected.length > 0" class="section">
        <h3>Selected</h3>
        <div class="items">
          <CdxCard
            v-for="(item, index) in content.selected"
            :key="index"
            :url="getPageUrl(item.pages[0]?.title || '')"
          >
            <template #title>{{ item.text }}</template>
            <template #description v-if="item.year">Year: {{ item.year }}</template>
          </CdxCard>
        </div>
      </div>
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

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section h3 {
  margin: 0 0 1rem 0;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error {
  color: var(--color-destructive);
  padding: 0.5rem;
  border: 1px solid var(--color-destructive);
  background-color: var(--background-color-destructive-subtle);
}
</style>
