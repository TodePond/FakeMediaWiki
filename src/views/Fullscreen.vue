<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../prototypes/registry"
import type { Component } from "vue"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = ref<Component | undefined>(undefined)

watch(
	prototypeName,
	async newName => {
		PrototypeComponent.value = getPrototypeComponent(newName)
	},
	{ immediate: true }
)
</script>

<template>
	<main>
		<component v-if="PrototypeComponent" :is="PrototypeComponent" />
		<p v-else>Prototype "{{ prototypeName }}" not found</p>
	</main>
</template>

<style scoped>
main {
	flex: 1;
	display: flex;
	flex-direction: column;
}
</style>

<style scoped>
body {
	max-width: 100%;
}
</style>
