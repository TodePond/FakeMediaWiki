<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import { prototypeMap } from "../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)

const PrototypeComponent = computed(() => {
	return prototypeMap.get(prototypeName.value)
})
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
