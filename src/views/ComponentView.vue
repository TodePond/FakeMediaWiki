<script setup lang="ts">
import type { Component } from "vue"
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../prototypes/registry"

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
	<div class="tablet-view">
		<component v-if="PrototypeComponent" :is="PrototypeComponent" />
		<p v-else>Prototype "{{ prototypeName }}" not found</p>
	</div>
</template>

<style scoped>
.tablet-view {
	max-width: var(--min-width-breakpoint-tablet);
	margin: 0 auto;
	padding: var(--spacing-100);
}
</style>
