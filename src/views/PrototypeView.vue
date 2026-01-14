<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <h1>Fake MediaWiki</h1>
  <p>Welcome.</p>

  <main>
    <Prototype :component="Counter" />
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
