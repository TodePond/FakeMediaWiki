<template>
	<div class="view">
		<div class="special-view">
			<nav>
				<div class="nav-item">
				<CdxIcon :icon="cdxIconMenu" />
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
				<CdxButton weight="quiet" href="#" class="nav-button-user" aria-label="User menu">
					<CdxIcon :icon="cdxIconUserAvatar" />
					<span class="dropdown-icon"></span>
				</CdxButton>
			</div>
		</nav>
		<div class="notice-container"></div>
		<header>
			<span class="header-item">
				<!-- <CdxIcon :icon="cdxIconListBullet" /> -->
				<h1>{{ prototype?.title }}</h1>
			</span>
			<span class="header-item">
				<a
					class="header-link"
					href="https://doc.wikimedia.org/codex/latest/components/overview.html"
				>
					<CdxIcon size="small" :icon="cdxIconHelpNotice" />
					<span>Help</span>
				</a>
			</span>
			</header>
			<component v-if="PrototypeComponent" :is="PrototypeComponent" />
			<p v-else>Prototype "{{ prototypeName }}" not found</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { PrototypeDefinition } from "@/prototypes/prototypes"
import { CdxButton, CdxIcon, CdxSearchInput } from "@wikimedia/codex"
import {
	cdxIconAppearance,
	cdxIconBell,
	cdxIconHelpNotice,
	cdxIconMenu,
	cdxIconSearch,
	cdxIconTray,
	cdxIconUserAvatar,
	cdxIconWatchlist,
} from "@wikimedia/codex-icons"
import type { Component } from "vue"
import { computed, ref, shallowRef, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototype, getPrototypeComponent } from "../../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = shallowRef<Component | undefined>(undefined)
const prototype = ref<PrototypeDefinition<"prototype" | "variant"> | undefined>(undefined)

watch(
	prototypeName,
	async newName => {
		PrototypeComponent.value = getPrototypeComponent(newName)
		prototype.value = getPrototype(newName)
	},
	{ immediate: true }
)
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
