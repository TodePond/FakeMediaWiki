<script setup lang="ts">
import { CdxCard } from "@wikimedia/codex"

const thumbnail = {
	url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Wet_Leg_O2_Academy_Brixton_2025-05-24_-29.jpg/1920px-Wet_Leg_O2_Academy_Brixton_2025-05-24_-29.jpg",
}

const url = "https://en.wikipedia.org/wiki/Wet_Leg"
const title = "Card title"
const description = "Card description"
const supportingText = "Card supporting text"
</script>

<template>
	<CdxCard :thumbnail="thumbnail" :url="url">
		<template #title>{{ title }}</template>
		<template #description>{{ description }}</template>
		<template #supporting-text>{{ supportingText }}</template>
	</CdxCard>
</template>
