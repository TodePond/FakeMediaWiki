<template>
	<div class="router-view-outlet">
		<component v-if="currentComponent" :is="currentComponent" :key="outletKey" />
	</div>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import { nextTick, ref, watch } from "vue"

const props = defineProps<{
	component: Component | null
	routeKey: string
}>()

const currentComponent = ref<Component | null>(null)
const outletKey = ref(0)

watch(
	() => [props.component, props.routeKey] as const,
	async ([newComponent]) => {
		currentComponent.value = null
		await nextTick()
		currentComponent.value = newComponent ?? null
		outletKey.value += 1
	},
	{ immediate: true }
)
</script>

<style scoped>
.router-view-outlet {
	display: contents;
}
</style>
