<script setup lang="ts">
import {
	CdxButton,
	CdxCard,
	CdxLabel,
	CdxProgressIndicator,
	CdxSelect,
	CdxTextInput,
} from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi, type OnThisDayEvent, type OnThisDayResponse } from "../../wiki-api/WikiApi"

const wiki = new WikiApi()

const type = ref<"events" | "births" | "deaths" | "holidays" | "selected">("events")
const dateInput = ref("")
const content = ref<OnThisDayResponse | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const typeOptions = [
	{ value: "events", label: "Events" },
	{ value: "births", label: "Births" },
	{ value: "deaths", label: "Deaths" },
	{ value: "holidays", label: "Holidays" },
]

const loadContent = async (): Promise<void> => {
	isLoading.value = true
	error.value = null
	try {
		const date = dateInput.value ? new Date(dateInput.value) : new Date()
		const data = await wiki.getOnThisDay(type.value, date)
		content.value = data
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		content.value = null
	} finally {
		isLoading.value = false
	}
}

const getEventPageUrl = (event: OnThisDayEvent | { pages?: Array<{ title: string }> }): string => {
	return wiki.getPageUrl(event.pages?.[0]?.title || "")
}

const getTodayDate = (): string => {
	const today = new Date()
	const dateStr = today.toISOString().split("T")[0]
	return dateStr || ""
}

onMounted(() => {
	dateInput.value = getTodayDate()
	loadContent()
})
</script>

<template>
	<section>
		<form @submit.prevent="loadContent">
			<CdxLabel input-id="type-select">Type</CdxLabel>
			<CdxSelect v-model:selected="type" :menu-items="typeOptions" />
			<p>
				<CdxLabel input-id="date-input">Date</CdxLabel>
				<span>
					<CdxTextInput v-model="dateInput" input-type="date" id="date-input" />
					<CdxButton>Load</CdxButton>
					<CdxProgressIndicator v-if="isLoading" aria-label="Loading content" />
				</span>
			</p>
		</form>
		<div v-if="error" class="error">{{ error }}</div>
		<div v-if="content" class="content">
			<div v-if="content.events && content.events.length > 0" class="section">
				<div class="items">
					<CdxCard
						v-for="(event, index) in content.events"
						:key="index"
						:url="getEventPageUrl(event)"
					>
						<template #title>{{ event.text }}</template>
						<template #description v-if="event.year">Year: {{ event.year }}</template>
					</CdxCard>
				</div>
			</div>
			<div v-if="content.births && content.births.length > 0" class="section">
				<div class="items">
					<CdxCard
						v-for="(birth, index) in content.births"
						:key="index"
						:url="getEventPageUrl(birth)"
					>
						<template #title>{{ birth.text }}</template>
						<template #description v-if="birth.year">Year: {{ birth.year }}</template>
					</CdxCard>
				</div>
			</div>
			<div v-if="content.deaths && content.deaths.length > 0" class="section">
				<div class="items">
					<CdxCard
						v-for="(death, index) in content.deaths"
						:key="index"
						:url="getEventPageUrl(death)"
					>
						<template #title>{{ death.text }}</template>
						<template #description v-if="death.year">Year: {{ death.year }}</template>
					</CdxCard>
				</div>
			</div>
			<div v-if="content.holidays && content.holidays.length > 0" class="section">
				<div class="items">
					<CdxCard
						v-for="(holiday, index) in content.holidays"
						:key="index"
						:url="getEventPageUrl(holiday)"
					>
						<template #title>{{ holiday.text }}</template>
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

form span {
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
