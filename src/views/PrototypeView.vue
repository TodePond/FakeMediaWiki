<script setup>
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const prototypeName = computed(() => route.params.name);

const PrototypeComponent = computed(() => {
  return defineAsyncComponent(
    () => import(/* @vite-ignore */ `../prototypes/${prototypeName.value}/index.vue`),
  );
});
</script>

<template>
  <header>
    <RouterLink to="/">Home</RouterLink>
  </header>

  <main>
    <h1>Prototype: {{ prototypeName }}</h1>
    <Suspense>
      <template #default>
        <component :is="PrototypeComponent" />
      </template>
      <template #fallback></template>
    </Suspense>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
