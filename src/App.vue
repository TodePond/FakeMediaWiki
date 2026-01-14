<script setup>
import { RouterView } from 'vue-router';
import './assets/main.css';
</script>

<template>
  <RouterView />
</template>

<style lang="less">
@import (reference) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';
@import (reference) '@wikimedia/codex/mixins/link.less';

.cdx-docs-link {
  .cdx-mixin-link();
}
</style>
