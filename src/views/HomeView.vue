<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <h1>Prototypes</h1>
  <main>
    <ul>
      <li>
        <RouterLink to="/prototype/counter">Counter</RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
