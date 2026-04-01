<template>
	<ReviewChangesPlusFeed v-bind="reviewChangesPlusFeedProps" />
</template>

<script setup lang="ts">
import ReviewChangesPlusFeed from "@/modules/ReviewChangesPlus/components/ReviewChangesPlusFeed/ReviewChangesPlusFeed.vue"
import { reviewChangesPlusFeedProps } from "@/modules/ReviewChangesPlus/reviewChangesPlusFeedProps"
</script>

<style>
@import "./global.css";
</style>
