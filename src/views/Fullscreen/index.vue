<template>
	<div class="view">
		<main>
			<component v-if="PrototypeComponent" :is="PrototypeComponent" />
			<p v-else>Prototype "{{ prototypeName }}" not found</p>
		</main>
	</div>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import { computed, shallowRef, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../../prototypes/registry"

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
@import "./style.css";
</style>
