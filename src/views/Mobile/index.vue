<template>
	<main class="mobile-view">
		<!-- When viewport is small: fullscreen like FullscreenView -->
		<div class="mobile-view__fullscreen view">
			<component v-if="PrototypeComponent" :is="PrototypeComponent" />
			<p v-else>Prototype "{{ prototypeName }}" not found</p>
		</div>
		<!-- When viewport is large: prototype inside phone outline (412×892px, 20:9 ratio) -->
		<div class="mobile-view__frame">
			<div class="mobile-view__scale-buttons">
				<CdxButton @click="applyScaleToFit">Scale to fit</CdxButton>
				<CdxButton @click="appliedScale = 1">Scale to 100%</CdxButton>
			</div>
			<div class="mobile-view__phone-wrapper" :style="phoneWrapperStyle">
				<div class="mobile-view__phone" :style="phoneTransformStyle">
					<div class="mobile-view__chrome-top" />
					<div class="mobile-view__chrome-below-top">
						<div class="mobile-view__address-bar">
							<span class="mobile-view__address-bar-url"></span>
						</div>
					</div>
					<div class="mobile-view__screen view">
						<component v-if="PrototypeComponent" :is="PrototypeComponent" />
						<p v-else>Prototype "{{ prototypeName }}" not found</p>
					</div>
					<div class="mobile-view__chrome-bottom" />
				</div>
			</div>
		</div>
	</main>
</template>

<script setup lang="ts">
import { CdxButton } from "@wikimedia/codex"
import type { Component } from "vue"
import { computed, onMounted, ref, shallowRef, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../../prototypes/registry"

const PHONE_WIDTH = 412
const PHONE_HEIGHT = 892
const FRAME_PADDING = 32 // 1rem each side

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = shallowRef<Component | undefined>(undefined)

const appliedScale = ref(1)

function getScaleToFit(): number {
	const availableWidth = window.innerWidth - FRAME_PADDING
	const availableHeight = window.innerHeight - FRAME_PADDING
	if (availableWidth <= 0 || availableHeight <= 0) return 1
	const scaleX = availableWidth / PHONE_WIDTH
	const scaleY = availableHeight / PHONE_HEIGHT
	const scale = Math.min(scaleX, scaleY)
	return Number.isFinite(scale) ? scale : 1
}

function applyScaleToFit() {
	appliedScale.value = getScaleToFit()
}

const phoneWrapperStyle = computed(() => ({
	width: `${PHONE_WIDTH * appliedScale.value}px`,
	height: `${PHONE_HEIGHT * appliedScale.value}px`,
}))

const phoneTransformStyle = computed(() => ({
	transform: `scale(${appliedScale.value})`,
}))

watch(
	prototypeName,
	async newName => {
		PrototypeComponent.value = getPrototypeComponent(newName)
	},
	{ immediate: true }
)

onMounted(() => {
	applyScaleToFit()
})
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
