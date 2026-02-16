<template>
	<p>Count: {{ count }}</p>
	<CdxButton @click="increment">Increment</CdxButton>
</template>

<script setup lang="ts">
import { CdxButton } from "@wikimedia/codex"
import { ref } from "vue"

const count = ref(0)

const increment = (): void => {
	count.value += 1
}
</script>
