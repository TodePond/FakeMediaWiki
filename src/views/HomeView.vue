<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <h1>MediaWiki prototypes</h1>
  <main>
    <RouterLink to="/prototypes">Prototypes</RouterLink>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
