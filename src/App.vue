<template>
	<RouterView v-slot="{ Component, route }">
		<RouterViewOutlet :component="Component" :route-key="route.path" />
	</RouterView>
</template>

<script setup lang="ts">
import RouterViewOutlet from "@/views/RouterViewOutlet/RouterViewOutlet.vue"
import { RouterView } from "vue-router"
</script>

<style lang="less">
@import (reference) "@wikimedia/codex-design-tokens/theme-wikimedia-ui.less";
@import (reference) "@wikimedia/codex/mixins/link.less";

a {
	.cdx-mixin-link();
}

.cdx-docs-link {
	.cdx-mixin-link();
}
</style>
