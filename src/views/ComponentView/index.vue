<template>
	<div class="view">
		<div class="component-view">
			<h1>{{ prototype?.title }}</h1>
			<component v-if="PrototypeComponent" :is="PrototypeComponent" :key="prototypeName" />
			<p v-else>Prototype "{{ prototypeName }}" not found</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { PrototypeDefinition } from "@/prototypes/prototypes"
import { computed } from "vue"
import { useRoute } from "vue-router"
import { getPrototype, getPrototypeComponent } from "../../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = computed(() => getPrototypeComponent(prototypeName.value))
const prototype = computed<PrototypeDefinition<"prototype" | "variant"> | undefined>(() =>
	getPrototype(prototypeName.value)
)
</script>

<style scoped>
@import "./style.css";
</style>
