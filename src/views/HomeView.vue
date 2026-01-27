<script setup lang="ts">
import { computed } from "vue"
import { RouterLink } from "vue-router"
import { categories, getPrototypeGroupsByCategory } from "../prototypes/registry"

const prototypeGroupsByCategory = getPrototypeGroupsByCategory()

const categoriesWithPrototypes = computed(() => {
	return categories.filter(category => (prototypeGroupsByCategory[category.id]?.length ?? 0) > 0)
})
</script>

<template>
	<main>
		<h1>Prototypes</h1>
		<div
			v-for="category in categoriesWithPrototypes"
			:key="category.id"
			class="category-section"
		>
			<h2>{{ category.name }}</h2>
			<p class="category-description">{{ category.description }}</p>
			<ul>
				<li v-for="group in prototypeGroupsByCategory[category.id]!" :key="group.id">
					<template v-if="group.type === 'prototype'">
						<RouterLink :to="`/${group.wrapper}/${group.id}`" class="prototype-card">
							<div class="prototype-header">
								<span class="prototype-name">{{ group.name }}</span>
								<span v-if="group.new" class="badge badge-new">New</span>
								<span v-if="group.updated" class="badge badge-updated"
									>Updated</span
								>
							</div>
							<p class="prototype-description" v-html="group.description"></p>
						</RouterLink>
					</template>
					<template v-else>
						<div class="prototype-group">
							<div class="prototype-header">
								<span class="prototype-name">{{ group.name }}</span>
								<span v-if="group.new" class="badge badge-new">New</span>
								<span v-if="group.updated" class="badge badge-updated"
									>Updated</span
								>
							</div>
							<p class="prototype-description" v-html="group.description"></p>
							<ul class="variant-list">
								<li
									v-for="variant in group.variants"
									:key="variant.id"
									class="variant-item"
								>
									<RouterLink
										:to="`/${variant.wrapper}/${variant.id}`"
										class="prototype-card"
									>
										<div class="prototype-header">
											<span class="prototype-name">{{ variant.name }}</span>
											<span v-if="variant.new" class="badge badge-new"
												>New</span
											>
											<span v-if="variant.updated" class="badge badge-updated"
												>Updated</span
											>
										</div>
										<p
											class="prototype-description"
											v-html="variant.description"
										></p>
									</RouterLink>
								</li>
							</ul>
						</div>
					</template>
				</li>
			</ul>
		</div>
	</main>
</template>

<style scoped>
ul {
	list-style-type: none;
	margin-left: 0;
	/* margin-bottom: 1rem; */
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

main {
	/* max-width: 800px; */
	max-width: var(--min-width-breakpoint-tablet);
	margin: 0 auto;
}

.category-section {
	margin-bottom: 2rem;
}

.category-section h2 {
	margin-bottom: 0.25rem;
	/* font-size: 1.2em; */
}

.category-description {
	margin: 0 0 1rem 0;
	color: var(--color-base--subtle, #54595d);
	font-size: 0.9em;
}

/* This should be a more specific to avoid affecting other links */
a.prototype-card {
	display: block;
	padding-left: 1rem;
	padding-right: 1rem;
	padding-top: 1rem;
	padding-bottom: 1rem;

	border: 1px solid var(--border-color-subtle);
	/* border: 1px solid var(--border-color-muted); */
	border-radius: 2px;
	text-decoration: none;
	color: inherit;
	background-color: var(--background-color-base);
}

a.prototype-card:hover {
	background-color: var(--background-color-interactive);
	color: var(--color-base);
}

.prototype-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.5rem;
	flex-wrap: wrap;
}

h2 {
	border: none;
}

h1 {
	margin-bottom: 1.5rem;
}

/* .prototype-group > .prototype-header > .prototype-name {
	font-weight: 600;
	font-size: 0.9em;
} */

.prototype-name {
	font-weight: 600;
	font-size: 1.1em;
}

.prototype-name:not(.prototype-group > .prototype-header > .prototype-name) {
	color: var(--color-progressive);
}

.badge {
	padding: 0rem 0.5rem;
	border-radius: 2px;
	font-size: 0.75em;
	font-weight: 600;
	text-transform: uppercase;
}

.badge-new {
	background-color: var(--background-color-success-subtle, #d5fdf4);
	color: var(--color-success, #00af89);
}

.badge-updated {
	background-color: var(--background-color-progressive-subtle);
	color: var(--color-progressive);
}

.prototype-description {
	margin: 0;
	color: var(--color-base--subtle, #54595d);
	font-size: 0.9em;
	line-height: 1.4;
}

.prototype-group {
	padding: 1rem;
	border: 1px solid var(--border-color-subtle);
	/* border: 1px solid var(--border-color-muted); */
	/* border-radius: 2px; */
	/* padding-bottom: 0.001rem; */
	/* padding-bottom: auto; */
	border-radius: 2px;
	background-color: var(--background-color-neutral-subtle);
}

.variant-item {
	margin-bottom: 0rem;
}

.variant-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding-top: 1rem;
}
</style>
