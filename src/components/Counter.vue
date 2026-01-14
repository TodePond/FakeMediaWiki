<script setup>
import { CdxButton } from '@wikimedia/codex'
import { ref } from 'vue'

const count = ref(0)

const increment = () => {
  count.value += 1
}
</script>

<template>
  <section>
    <p>Count: {{ count }}</p>
    <CdxButton @click="increment">Increment</CdxButton>
  </section>
</template>

<style scoped>
section {
  padding: 1rem;
  border: 1px solid #ccc;
}
</style>
