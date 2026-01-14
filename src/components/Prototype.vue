<script setup>
defineProps({
  component: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <main class="prototype-box">
    <component :is="component" />
  </main>
</template>

<style scoped>
main {
  border: 2px solid #ccc;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  background-color: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
