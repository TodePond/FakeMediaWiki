<template>
	<section>
		<form @submit.prevent="loadContent">
			<p>
				<CdxLabel input-id="type-select">Type</CdxLabel>
				<CdxSelect id="type-select" v-model:selected="type" :menu-items="typeOptions" />
			</p>
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
		<div v-if="content?.length" class="content">
			<div class="section">
				<OnThisDayCard v-for="(item, index) in content" :key="index" :item="item" />
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	CdxButton,
	CdxLabel,
	CdxProgressIndicator,
	CdxSelect,
	CdxTextInput,
} from "@wikimedia/codex"
import { onMounted, ref } from "vue"
import { WikiApi, type OnThisDayItem } from "../../wiki-api/WikiApi"
import OnThisDayCard from "./OnThisDayCard.vue"

const wiki = new WikiApi()

const type = ref<"events" | "births" | "deaths" | "holidays">("events")
const dateInput = ref("")
const content = ref<OnThisDayItem[] | null>(null)
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
		content.value = await wiki.getOnThisDay(type.value, date)
	} catch (err) {
		const errorObj = err as Error
		error.value = errorObj.message
		content.value = null
	} finally {
		isLoading.value = false
	}
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

<style scoped>
@import "./style.css";
</style>
