<template>
	<div class="component-view">
		<h1>{{ prototype?.title }}</h1>
		<component v-if="PrototypeComponent" :is="PrototypeComponent" />
		<p v-else>Prototype "{{ prototypeName }}" not found</p>
	</div>
</template>

<script setup lang="ts">
import { PrototypeDefinition } from "@/prototypes/prototypes"
import type { Component } from "vue"
import { computed, ref, shallowRef, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototype, getPrototypeComponent } from "../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = shallowRef<Component | undefined>(undefined)
const prototype = ref<PrototypeDefinition<"prototype" | "variant"> | undefined>(undefined)

watch(
	prototypeName,
	async newName => {
		PrototypeComponent.value = getPrototypeComponent(newName)
		prototype.value = getPrototype(newName)
	},
	{ immediate: true }
)
</script>

<style scoped>
h1 {
	padding-bottom: var(--spacing-50);
}

.component-view {
	max-width: var(--min-width-breakpoint-tablet);
	margin: 0 auto;
	padding: var(--spacing-100);
}
</style>
