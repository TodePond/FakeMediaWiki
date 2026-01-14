<script setup>
import CounterJsx from '../components/CounterJsx.vue'
import CounterNoJsx from '../components/CounterNoJsx.vue'
import Prototype from '../components/Prototype.vue'
</script>

<template>
  <h1>Fake MediaWiki</h1>
  <p>Welcome.</p>

  <main>
    <CounterJsx />
    <CounterNoJsx />
    <Prototype :component="CounterJsx" />
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
