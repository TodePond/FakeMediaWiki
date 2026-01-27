<script setup lang="ts">
import { computed } from "vue"
import { RouterLink } from "vue-router"
import { categories, getPrototypesByCategory } from "../prototypes/registry"

const prototypesByCategory = getPrototypesByCategory()

const categoriesWithPrototypes = computed(() => {
	return categories.filter(category => (prototypesByCategory[category.id]?.length ?? 0) > 0)
})
</script>

<template>
	<main>
		<h1>MediaWiki Prototypes</h1>
		<div
			v-for="category in categoriesWithPrototypes"
			:key="category.id"
			class="category-section"
		>
			<h2>{{ category.name }}</h2>
			<p class="category-description">{{ category.description }}</p>
			<ul>
				<li v-for="prototype in prototypesByCategory[category.id]!" :key="prototype.id">
					<RouterLink :to="`/${prototype.wrapper}/${prototype.id}`">
						<div class="prototype-header">
							<span class="prototype-name">{{ prototype.name }}</span>
							<span v-if="prototype.new" class="badge badge-new">New</span>
							<span v-if="prototype.updated" class="badge badge-updated"
								>Updated</span
							>
						</div>
						<p class="prototype-description" v-html="prototype.description"></p>
					</RouterLink>
				</li>
			</ul>
		</div>
	</main>
</template>

<style scoped>
ul {
	list-style-type: none;
	margin-left: 0;
	margin-bottom: 1rem;
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

li {
	margin-bottom: 1rem;
}

a {
	display: block;
	padding: 1rem;
	border: 1px solid var(--border-color-base, #a7a7a7);
	border-radius: 2px;
	text-decoration: none;
	color: inherit;
}

a:hover {
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

.prototype-name {
	font-weight: 600;
	font-size: 1.1em;
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
</style>
