<script setup>
import { RouterLink } from "vue-router";
import { prototypes } from "../prototypes/registry.js";
</script>

<template>
  <h1>Special:Prototypes</h1>
  <main>
    <ul>
      <li v-for="prototype in prototypes" :key="prototype.id">
        <RouterLink :to="`/Special/${prototype.id}`"
          >Special:{{ prototype.id }}</RouterLink
        >
      </li>
    </ul>
  </main>
</template>
