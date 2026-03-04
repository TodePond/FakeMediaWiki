<template>
	<div class="view">
		<main>
			<component v-if="PrototypeComponent" :is="PrototypeComponent" :key="prototypeName" />
			<p v-else>Prototype "{{ prototypeName }}" not found</p>
		</main>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = computed(() => getPrototypeComponent(prototypeName.value))
</script>

<style scoped>
@import "./style.css";
</style>
