<script setup lang="ts">
import { CdxButton } from "@wikimedia/codex"
import type { Component } from "vue"
import { computed, onMounted, ref, shallowRef, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../prototypes/registry"

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

<template>
	<main class="mobile-view">
		<!-- When viewport is small: fullscreen like FullscreenView -->
		<div class="mobile-view__fullscreen">
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
					<div class="mobile-view__screen">
						<component v-if="PrototypeComponent" :is="PrototypeComponent" />
						<p v-else>Prototype "{{ prototypeName }}" not found</p>
					</div>
					<div class="mobile-view__chrome-bottom" />
				</div>
			</div>
		</div>
	</main>
</template>

<style scoped>
.mobile-view {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	height: 100vh;
}

/* Small viewport: show fullscreen content only */
.mobile-view__fullscreen {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.mobile-view__frame {
	display: none;
}

/* Large viewport: show phone frame, hide fullscreen */
@media (min-width: 481px) {
	.mobile-view__fullscreen {
		display: none;
	}

	.mobile-view__frame {
		flex: 1;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		min-height: 0;
		padding: 1rem;
		background: var(--color-base-subtle);
		overflow: auto;
		height: 100%;
		position: relative;
	}

	.mobile-view__scale-buttons {
		position: fixed;
		top: 0.5rem;
		left: 0.5rem;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mobile-view__phone-wrapper {
		flex-shrink: 0;
		/* overflow: hidden; */
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
	}

	.mobile-view__phone {
		/* 412×892px (20:9 ratio) */
		width: 412px;
		height: 892px;
		flex-shrink: 0;
		border-radius: 18px;
		outline: 6px solid #000;
		background: #fff;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transform-origin: top left;
	}

	.mobile-view__screen {
		flex: 1;
		overflow: auto;
		display: flex;
		flex-direction: column;
		min-height: 0;
		scrollbar-width: none; /* Firefox */
		-ms-overflow-style: none; /* IE/Edge */
	}

	.mobile-view__screen::-webkit-scrollbar {
		display: none; /* Chrome, Safari, Opera */
	}

	.mobile-view__chrome-top {
		flex-shrink: 0;
		height: 52px;
		background: #f7f7f7;
		border-bottom: 1px solid #e0e0e0;
	}

	.mobile-view__chrome-below-top {
		flex-shrink: 0;
		height: 58px;
		background: #f7f7f7;
		border-bottom: 1px solid #e0e0e0;
		display: flex;
		align-items: center;
		padding: 0 12px;
	}

	.mobile-view__address-bar {
		width: 66%;
		height: 42px;
		margin-left: 20px;
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: var(--border-radius-pill);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 14px;
	}

	.mobile-view__address-bar-lock {
		font-size: 14px;
		line-height: 1;
		flex-shrink: 0;
	}

	.mobile-view__address-bar-url {
		font-size: 15px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mobile-view__chrome-bottom {
		flex-shrink: 0;
		height: 24px;
		background: #f7f7f7;
		border-top: 1px solid #e0e0e0;
	}
}
</style>

<style>
body:has(.mobile-view__frame) {
	background: var(--color-base-subtle);
}
</style>
