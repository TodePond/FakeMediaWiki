<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { prototypeMap } from '../prototypes/registry.js';

const route = useRoute();
const prototypeName = computed(() => route.params.name);

const PrototypeComponent = computed(() => {
  return prototypeMap.get(prototypeName.value);
});
</script>

<template>
  <component v-if="PrototypeComponent" :is="PrototypeComponent" />
  <p v-else>Prototype "{{ prototypeName }}" not found</p>
</template>
