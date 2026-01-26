<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { prototypeMap } from "../prototypes/registry.js";

const route = useRoute();
/** @type {any} */
const prototypeName = computed(() => route.params.name);

const PrototypeComponent = computed(() => {
  return prototypeMap.get(prototypeName.value);
});
</script>

<template>
  <main>
    <component v-if="PrototypeComponent" :is="PrototypeComponent" />
    <p v-else>Prototype "{{ prototypeName }}" not found</p>
  </main>
</template>

<style scoped>
main {
  max-width: var(--min-width-breakpoint-tablet);
  margin: 0 auto;
}
</style>
