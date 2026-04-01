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

// Watch routeKey only (primitive) so we don't fire on every parent re-render.
// The [component, routeKey] array creates a new reference each render, causing
// spurious remounts when only the query changes (e.g. ApiPlayground ?method=).
watch(
	() => props.routeKey,
	async (newRouteKey, oldRouteKey) => {
		if (oldRouteKey !== undefined && newRouteKey === oldRouteKey) return
		currentComponent.value = null
		await nextTick()
		currentComponent.value = props.component ?? null
		outletKey.value += 1
	},
	{ immediate: true }
)
// Sync component when it loads asynchronously (lazy routes); routeKey watch alone
// would miss component going from undefined → resolved.
watch(
	() => props.component,
	comp => {
		if (currentComponent.value !== comp) currentComponent.value = comp ?? null
	},
	{ immediate: true }
)
</script>

<style scoped>
.router-view-outlet {
	display: contents;
}
</style>
