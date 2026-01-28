<script setup lang="ts">
import { PrototypeDefinition } from "@/prototypes/prototypes"
import { CdxButton, CdxIcon, CdxSearchInput } from "@wikimedia/codex"
import {
	cdxIconAppearance,
	cdxIconBell,
	cdxIconHelpNotice,
	cdxIconListBullet,
	cdxIconMenu,
	cdxIconTray,
	cdxIconUserAvatar,
	cdxIconWatchlist,
} from "@wikimedia/codex-icons"
import type { Component } from "vue"
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { getPrototype, getPrototypeComponent } from "../prototypes/registry"

const route = useRoute()
const prototypeName = computed(() => route.params.name as string)
const PrototypeComponent = ref<Component | undefined>(undefined)
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

<template>
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
				<a href="https://github.com/todepond/fakemediawiki" class="nav-button-text"
					>Todepond</a
				>
				<CdxButton weight="quiet" aria-label="Reading preferences">
					<CdxIcon :icon="cdxIconAppearance" />
				</CdxButton>
				<CdxButton weight="quiet" class="nav-button-bell" aria-label="Notifications">
					<CdxIcon :icon="cdxIconBell" />
					<span class="nav-badge">1</span>
				</CdxButton>
				<CdxButton weight="quiet" aria-label="Notices">
					<CdxIcon :icon="cdxIconTray" />
				</CdxButton>
				<CdxButton weight="quiet" aria-label="Watchlist">
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
				<CdxIcon :icon="cdxIconListBullet" />
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
</template>

<style scoped>
/* Copied from Special:SpecialPages */
.special-view {
	max-width: 99.75rem;
	margin: 0 auto;
	padding: 0rem 2.75rem;
}

.notice-container {
	background-color: var(--background-color-notice);
	height: 12px;
}

nav {
	/* 50px height + 8px padding */
	height: 66px;
	padding: 8px 0px;
	display: flex;
	gap: 16px;
	/* align-items: center; */
	/* justify-content: space-between; */
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 8px;
	height: 50px;
	/* height: 100%; */
}

.nav-item-search {
	padding-left: 26px;
	flex-grow: 1;
	gap: 0px;
	max-width: 474px;
}

.nav-item-search .cdx-search-input {
	width: 100%;
}

.nav-item-search .cdx-button {
	border-left: none;
	border-radius: 0px 2px 2px 0px;
}

.nav-item-right {
	margin-left: auto;
	gap: 0.2rem;
}

.nav-item-right .cdx-button {
	min-width: var(--size-icon-medium);
	height: var(--size-icon-medium);
	/* padding: var(--size-50); */
	padding: 0.5rem 0.4rem;
}

.nav-item-right .nav-button-text {
	color: var(--color-progressive);
}

.nav-item-right .nav-button-bell {
	position: relative;
}

.nav-item-right > a {
	margin-right: 10px;
}

.nav-item-right .nav-button-bell .nav-badge {
	position: absolute;
	bottom: 2px;
	right: 0;
	background-color: var(--background-color-progressive);
	color: var(--color-inverted);
	font-size: 0.75rem;
	font-weight: var(--font-weight-bold);
	line-height: 1;
	border-radius: 2px;
	min-width: 16px;
	border: 1px solid var(--color-inverted);
	text-align: center;
}

.nav-item-right .nav-button-user {
	display: inline-flex;
	gap: var(--size-25);
}

.nav-wordmark {
	height: 100%;
	flex-direction: column;
	justify-content: space-between;
	margin-left: 25px;
	width: 152px;
	display: flex;
	/* width: 300px; */
	padding-left: 12px;
	padding-top: 3px;
	padding-bottom: 3px;
	/* width: fit-content; */
}

.nav-item img {
	flex-grow: 1;
	/* margin-top: -8px; */
	/* height: 100%; */
}

header {
	display: flex;
	width: 100%;
	border-bottom: 1px solid var(--border-color-subtle);
	margin-bottom: var(--spacing-100);
	align-items: baseline;
	justify-content: space-between;
}

.header-item {
	display: flex;
	margin-bottom: 0px;
	align-items: baseline;
	gap: 14px;
}

.dropdown-icon {
	width: 20px;
	height: 20px;
	mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="%23000"><path d="m17.5 4.75-7.5 7.5-7.5-7.5L1 6.25l9 9 9-9z"/></svg>');
	background-color: var(--color-base);
	transform: scale(0.5);
}

.header-link {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 14px;
	margin-left: 0.5rem;
	padding-left: 0.3rem;
	padding-right: 0.3rem;
	margin-right: -0.3rem;
}

h1 {
	border: none;
	margin-bottom: 0px;
	font-size: 1.8rem;
	line-height: 1.2;
	padding-bottom: 2px;
}

@media (max-width: 1120px) {
	.special-view {
		padding: 0rem 1.5rem;
	}

	.nav-item-search {
		display: none;
	}
}
</style>

<style>
.nav-item-search .cdx-text-input {
	/* border-right: none; */
	border-radius: 2px 0px 0px 2px;
}
</style>
