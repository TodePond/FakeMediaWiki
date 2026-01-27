<script setup lang="ts">
import { CdxIcon } from "@wikimedia/codex"
import { cdxIconPushPin } from "@wikimedia/codex-icons"
import { RouterLink } from "vue-router"
import { getPinnedPrototypes, getUnpinnedPrototypes } from "../prototypes/registry"

const pinnedPrototypes = getPinnedPrototypes()
const unpinnedPrototypes = getUnpinnedPrototypes()
</script>

<template>
	<main>
		<h1>Prototypes</h1>
		<ul>
			<li v-for="prototype in pinnedPrototypes" :key="prototype.id" class="pinned">
				<RouterLink :to="`/${prototype.wrapper}/${prototype.id}`">
					<CdxIcon :icon="cdxIconPushPin" /> {{ prototype.wrapper }}:{{ prototype.id }}
				</RouterLink>
			</li>
		</ul>
		<ul>
			<li v-for="prototype in unpinnedPrototypes" :key="prototype.id">
				<RouterLink :to="`/${prototype.wrapper}/${prototype.id}`"
					>{{ prototype.wrapper }}:{{ prototype.id }}</RouterLink
				>
			</li>
		</ul>
	</main>
</template>

<style scoped>
ul {
	list-style-type: none;
	margin-left: 0;
	margin-bottom: 1rem;
}

main {
	max-width: var(--min-width-breakpoint-tablet);
	margin: 0 auto;
}
</style>
