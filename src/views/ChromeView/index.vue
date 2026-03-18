<template>
	<div class="view">
		<div
			class="special-view"
			:class="{
				'special-view--review-changes': prototypeName === 'ReviewChanges',
				'special-view--feed': prototypeName === 'Feed',
			}"
		>
			<!-- Desktop/tablet nav -->
			<nav class="nav-desktop">
				<div class="nav-item">
					<CdxButton
						weight="quiet"
						aria-label="Menu"
						@click="mobileSettingsVisible = !mobileSettingsVisible"
					>
						<CdxIcon :icon="cdxIconMenu" />
					</CdxButton>
					<a class="nav-wordmark">
						<img
							src="https://en.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-en-25.svg"
							alt="Wikipedia logo"
						/>
						<img
							src="https://en.wikipedia.org/static/images/mobile/copyright/wikipedia-tagline-en-25.svg"
							alt="25 years of the free encyclopedia"
						/>
					</a>
				</div>
				<div class="nav-item nav-item-search">
					<CdxSearchInput type="search" placeholder="Search Wikipedia" />
					<CdxButton>Search</CdxButton>
				</div>
				<div class="nav-item nav-item-right">
					<CdxButton weight="quiet" aria-label="Search" class="nav-button-search">
						<CdxIcon :icon="cdxIconSearch" />
					</CdxButton>
					<a
						href="https://github.com/todepond/fakemediawiki"
						class="nav-button-text nav-button-desktop"
						>Todepond</a
					>
					<CdxButton weight="quiet" aria-label="Watchlist">
						<CdxIcon :icon="cdxIconAppearance" />
					</CdxButton>
					<CdxButton weight="quiet" class="nav-button-bell" aria-label="Notifications">
						<CdxIcon :icon="cdxIconBell" />
						<span class="nav-badge">1</span>
					</CdxButton>
					<CdxButton weight="quiet" aria-label="Notices">
						<CdxIcon :icon="cdxIconTray" />
					</CdxButton>
					<CdxButton weight="quiet" aria-label="Watchlist" class="nav-button-desktop">
						<CdxIcon :icon="cdxIconWatchlist" />
					</CdxButton>
					<CdxButton
						weight="quiet"
						href="#"
						class="nav-button-user"
						aria-label="User menu"
					>
						<CdxIcon :icon="cdxIconUserAvatar" />
						<span class="dropdown-icon"></span>
					</CdxButton>
				</div>
			</nav>
			<!-- Mobile nav -->
			<nav class="nav-mobile">
				<CdxButton
					weight="quiet"
					aria-label="Menu"
					@click="mobileSettingsVisible = !mobileSettingsVisible"
				>
					<CdxIcon :icon="cdxIconMenu" />
				</CdxButton>
				<span class="nav-mobile__wordmark">WIKIPEDIA</span>
				<div class="nav-mobile__actions">
					<CdxButton weight="quiet" aria-label="Search">
						<CdxIcon :icon="cdxIconSearch" />
					</CdxButton>
					<CdxButton weight="quiet" class="nav-button-bell" aria-label="Notifications">
						<CdxIcon :icon="cdxIconBell" />
						<span class="nav-badge">1</span>
					</CdxButton>
				</div>
			</nav>
			<div class="notice-container"></div>
			<component v-if="PrototypeComponent" :is="PrototypeComponent" :key="prototypeName" />
			<p v-else>Prototype "{{ prototypeName }}" not found</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxSearchInput } from "@wikimedia/codex"
import {
	cdxIconAppearance,
	cdxIconBell,
	cdxIconMenu,
	cdxIconSearch,
	cdxIconTray,
	cdxIconUserAvatar,
	cdxIconWatchlist,
} from "@wikimedia/codex-icons"
import { computed, onMounted, onUnmounted, provide, ref } from "vue"
import { useRoute } from "vue-router"
import { getPrototypeComponent } from "../../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = computed(() => getPrototypeComponent(prototypeName.value))

const mobileSettingsVisible = ref(true)

function checkViewport() {
	if (window.innerWidth > 640) {
		mobileSettingsVisible.value = true
	}
}

onMounted(() => {
	window.addEventListener("resize", checkViewport)
})
onUnmounted(() => {
	window.removeEventListener("resize", checkViewport)
})

provide("mobileSettingsVisible", mobileSettingsVisible)
</script>

<style scoped>
@import "../SpecialView/style.css";
</style>

<style>
@import "../SpecialView/global.css";
</style>
