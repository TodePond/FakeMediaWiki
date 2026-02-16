<template>
	<main>
		<component v-if="PrototypeComponent" :is="PrototypeComponent" />
		<p v-else>Prototype "{{ prototypeName }}" not found</p>
	</main>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import { computed, shallowRef, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = shallowRef<Component | undefined>(undefined)

watch(
	prototypeName,
	async newName => {
		PrototypeComponent.value = getPrototypeComponent(newName)
	},
	{ immediate: true }
)
</script>

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
