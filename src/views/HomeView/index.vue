<template>
	<main>
		<h1>Prototypes</h1>
		<p class="subtle">
			Hello, I'm <a href="https://wikimedia.enterprise.slack.com/team/U0A4XK2020H">Lu</a>, and
			this is my work-in-progress prototyping system. The source code is
			<a href="https://github.com/todepond/fakemediawiki">here</a>. The prototypes are below.
		</p>

		<!-- <br /> -->
		<p class="filter-bar">
			<CdxField>
				<template #default>
					<CdxChipInput
						v-model:input-value="filterInputValue"
						:input-chips="chips"
						placeholder="Add a filter..."
						@update:input-chips="onChipsUpdate"
					/>
					<div class="filter-dropdowns">
						<CdxSelect
							v-model:selected="selectedStatusFilter"
							:menu-items="statusFilterOptions"
							default-label="status"
							:default-icon="cdxIconAdd"
							class="filter-dropdown"
						/>
						<CdxSelect
							v-model:selected="selectedCategoryFilter"
							:menu-items="categoryFilterOptions"
							default-label="category"
							:default-icon="cdxIconAdd"
							class="filter-dropdown"
						/>
						<CdxSelect
							v-model:selected="selectedWrapperFilter"
							:menu-items="wrapperFilterOptions"
							default-label="wrapper"
							:default-icon="cdxIconAdd"
							class="filter-dropdown"
						/>
						<CdxSelect
							v-model:selected="selectedFeaturedFilter"
							:menu-items="featuredFilterOptions"
							default-label="featured"
							:default-icon="cdxIconAdd"
							class="filter-dropdown"
						/>
					</div>
				</template>
			</CdxField>
		</p>
		<br />

		<div
			v-for="category in filteredCategoriesWithPrototypes"
			:key="category.id"
			class="category-section"
		>
			<h2>{{ category.name }}</h2>
			<p class="category-description">{{ category.description }}</p>
			<ul>
				<li v-for="group in getFilteredGroupsForCategory(category.id)" :key="group.id">
					<template v-if="group.type === 'prototype'">
						<RouterLink
							:to="`/${group.wrapper}/${group.id}`"
							:class="['prototype-card', { featured: group.featured }]"
						>
							<div class="prototype-header">
								<span class="prototype-header-item">
									<CdxIcon
										v-if="group.featured"
										:icon="cdxIconBookmark"
										size="small"
										class="prototype-featured-icon"
										aria-label="Featured"
									/><span class="prototype-name">{{ group.name }}</span>
									<span
										v-if="group.status"
										:class="['badge', `badge-${group.status}`]"
										>{{ statusLabel(group.status) }}</span
									>
								</span>
								<span
									v-if="group.wrapper"
									class="prototype-header-item badge badge-wrapper"
									>{{ getWrapperName(group.wrapper) }}</span
								>
							</div>
							<p class="prototype-description" v-html="group.description"></p>
						</RouterLink>
					</template>
					<template v-else>
						<div class="prototype-group">
							<div class="prototype-header">
								<span class="prototype-name">{{ group.name }}</span>
								<span
									v-if="group.status"
									:class="['badge', `badge-${group.status}`]"
									>{{ statusLabel(group.status) }}</span
								>
							</div>
							<p class="prototype-description" v-html="group.description"></p>
							<ul class="variant-list">
								<li
									v-for="variant in getFilteredVariants(group)"
									:key="variant.id"
									class="variant-item"
								>
									<RouterLink
										:to="`/${variant.wrapper}/${variant.id}`"
										:class="['prototype-card', { featured: variant.featured }]"
									>
										<div class="prototype-header">
											<span class="prototype-header-item">
												<CdxIcon
													v-if="variant.featured"
													:icon="cdxIconBookmark"
													size="small"
													class="prototype-featured-icon"
													aria-label="Featured"
												/><span class="prototype-name">{{
													variant.name
												}}</span>
												<span
													v-if="variant.status"
													:class="['badge', `badge-${variant.status}`]"
													>{{ statusLabel(variant.status) }}</span
												>
											</span>
											<span
												v-if="variant.wrapper"
												class="prototype-header-item badge badge-wrapper"
												>{{ getWrapperName(variant.wrapper) }}</span
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

		<p v-if="hasFilters" class="filter-footer">
			There are more prototypes.
			<button type="button" class="filter-footer-link" @click="removeFilters">
				Remove filters?
			</button>
		</p>
	</main>
</template>

<script setup lang="ts">
import type { ChipInputItem } from "@wikimedia/codex"
import { CdxChipInput, CdxField, CdxIcon, CdxSelect } from "@wikimedia/codex"
import { cdxIconAdd, cdxIconBookmark } from "@wikimedia/codex-icons"
import { computed, onMounted, ref, watch } from "vue"
import { RouterLink } from "vue-router"
import type { PrototypeDefinition, PrototypeStatus } from "../../prototypes/prototypes"
import {
	categories,
	getPrototypeGroupsByCategory,
	getWrapperName,
	wrappers,
} from "../../prototypes/registry"

const prototypeGroupsByCategory = getPrototypeGroupsByCategory()

type StatusFilterValue = PrototypeStatus | "none"

// Chip filter: status (incl. none), wrapper, category
const statusFilterOptions: { value: StatusFilterValue; label: string }[] = [
	{ value: "new", label: "New" },
	{ value: "wip", label: "WIP" },
	{ value: "updated", label: "Updated" },
	{ value: "none", label: "None" },
]
const wrapperFilterOptions = wrappers.map(w => ({ value: w.id, label: w.name }))
const categoryFilterOptions = categories.map(c => ({ value: c.id, label: c.name }))

type FeaturedFilterValue = "featured" | "unfeatured"
const featuredFilterOptions: { value: FeaturedFilterValue; label: string }[] = [
	{ value: "featured", label: "Featured" },
	{ value: "unfeatured", label: "Unfeatured" },
]

const FILTER_STORAGE_KEY = "fakemediawiki-home-filters"

const defaultChips: ChipInputItem[] = [
	{ value: "featured:yes", label: "featured:yes", className: "chip-filter-featured" },
]

function loadFiltersFromStorage(): ChipInputItem[] {
	try {
		const raw = localStorage.getItem(FILTER_STORAGE_KEY)
		// Only default to featured when nothing is stored at all (first visit)
		if (raw == null) return defaultChips
		const parsed = JSON.parse(raw) as ChipInputItem[]
		if (!Array.isArray(parsed)) return defaultChips
		return parsed
	} catch {
		return defaultChips
	}
}

function saveFiltersToStorage() {
	try {
		localStorage.setItem(
			FILTER_STORAGE_KEY,
			JSON.stringify(
				chips.value.map(c => ({ value: c.value, label: c.label, className: c.className }))
			)
		)
	} catch {
		// ignore storage errors
	}
}

const chips = ref<ChipInputItem[]>([])
const filterInputValue = ref<string>("")
const selectedStatusFilter = ref<StatusFilterValue | null>(null)
const selectedWrapperFilter = ref<string | null>(null)
const selectedCategoryFilter = ref<string | null>(null)
const selectedFeaturedFilter = ref<FeaturedFilterValue | null>(null)

function wrapperChipValue(id: string): string {
	return `wrapper:${id.toLowerCase()}`
}

function categoryChipValue(id: string): string {
	return `category:${id.toLowerCase()}`
}

function toLowerChip(c: ChipInputItem): ChipInputItem {
	const normalized = String(c.label != null ? c.label : c.value).toLowerCase()
	return { ...c, value: normalized, label: normalized }
}

function normalizeChip(c: ChipInputItem): ChipInputItem {
	const raw = (c.label != null ? String(c.label) : String(c.value)).trim()
	const lower = raw.toLowerCase()

	// Status:
	if (lower.startsWith("status:")) {
		const rest = raw.slice(7).trim().toLowerCase()
		if (rest === "new" || rest === "wip" || rest === "updated" || rest === "none") {
			const value = `status:${rest}`
			const statusClass = rest === "none" ? "chip-filter-no-status" : `chip-filter-${rest}`
			return { value, label: value, className: statusClass }
		}
	}

	// Wrapper:
	if (lower.startsWith("wrapper:")) {
		const rest = raw.slice(8).trim()
		const wrapper = wrappers.find(
			w =>
				w.id.toLowerCase() === rest.toLowerCase() ||
				w.name.toLowerCase() === rest.toLowerCase()
		)
		if (wrapper) {
			const value = wrapperChipValue(wrapper.id)
			return { value, label: value, className: "chip-filter-wrapper" }
		}
	}

	// Category:
	if (lower.startsWith("category:")) {
		const rest = raw.slice(9).trim()
		const category = categories.find(
			c =>
				c.id.toLowerCase() === rest.toLowerCase() ||
				c.name.toLowerCase() === rest.toLowerCase()
		)
		if (category) {
			const value = categoryChipValue(category.id)
			return { value, label: value, className: "chip-filter-category" }
		}
	}

	// Featured:
	if (lower.startsWith("featured:")) {
		const rest = raw.slice(9).trim().toLowerCase()
		if (rest === "yes" || rest === "featured") {
			return {
				value: "featured:yes",
				label: "featured:yes",
				className: "chip-filter-featured",
			}
		}
		if (rest === "no" || rest === "unfeatured") {
			return { value: "featured:no", label: "featured:no", className: "chip-filter-featured" }
		}
	}

	return toLowerChip(c)
}

function normalizeChips(list: ChipInputItem[]): ChipInputItem[] {
	return list.map(normalizeChip)
}

function onChipsUpdate(newChips: ChipInputItem[]) {
	chips.value = normalizeChips(newChips)
}

const hasFilters = computed(() => chips.value.length > 0)

function removeFilters() {
	chips.value = []
	window.scrollTo({ top: 0 })
}

onMounted(() => {
	chips.value = normalizeChips(loadFiltersFromStorage())
})

watch(chips, () => saveFiltersToStorage(), { deep: true })

// Derive active filters from chips (status:*, wrapper:*, category:*)
const selectedStatuses = computed<Set<string>>(() => {
	const set = new Set<string>()
	chips.value.forEach(c => {
		const v = String(c.value)
		if (v.startsWith("status:")) set.add(v.slice(7))
	})
	return set
})
const selectedWrappers = computed<Set<string>>(() => {
	const set = new Set<string>()
	chips.value.forEach(c => {
		const v = String(c.value)
		if (v.startsWith("wrapper:")) set.add(v.slice(8))
	})
	return set
})
const selectedCategories = computed<Set<string>>(() => {
	const set = new Set<string>()
	chips.value.forEach(c => {
		const v = String(c.value)
		if (v.startsWith("category:")) set.add(v.slice(9))
	})
	return set
})
const selectedFeatureds = computed<Set<string>>(() => {
	const set = new Set<string>()
	chips.value.forEach(c => {
		const v = String(c.value)
		if (v === "featured:yes") set.add("featured")
		if (v === "featured:no") set.add("unfeatured")
	})
	return set
})

// Plain (manually typed) chips + current input text: filter by name/description match
const plainChipQueries = computed<Set<string>>(() => {
	const set = new Set<string>()
	chips.value.forEach(c => {
		const v = String(c.value).trim()
		if (
			v &&
			!v.startsWith("status:") &&
			!v.startsWith("wrapper:") &&
			!v.startsWith("category:") &&
			!v.startsWith("featured:")
		) {
			set.add(v.toLowerCase())
		}
	})
	// Include text currently in the input (before user presses Enter)
	const typed = String(filterInputValue.value).trim().toLowerCase()
	if (
		typed &&
		!typed.startsWith("status:") &&
		!typed.startsWith("wrapper:") &&
		!typed.startsWith("category:") &&
		!typed.startsWith("featured:")
	) {
		set.add(typed)
	}
	return set
})

watch(selectedStatusFilter, val => {
	if (val !== null) {
		const value = `status:${val}`
		if (!chips.value.some(c => c.value === value)) {
			const className = val === "none" ? "chip-filter-no-status" : `chip-filter-${val}`
			chips.value = [...chips.value, { value, label: value, className }]
		}
		selectedStatusFilter.value = null
	}
})

watch(selectedWrapperFilter, val => {
	if (val !== null) {
		const value = wrapperChipValue(val)
		if (!chips.value.some(c => c.value === value)) {
			chips.value = [
				...chips.value,
				{ value, label: value, className: "chip-filter-wrapper" },
			]
		}
		selectedWrapperFilter.value = null
	}
})

watch(selectedCategoryFilter, val => {
	if (val !== null) {
		const value = categoryChipValue(val)
		if (!chips.value.some(c => c.value === value)) {
			chips.value = [
				...chips.value,
				{ value, label: value, className: "chip-filter-category" },
			]
		}
		selectedCategoryFilter.value = null
	}
})

watch(selectedFeaturedFilter, val => {
	if (val !== null) {
		const value = val === "featured" ? "featured:yes" : "featured:no"
		if (!chips.value.some(c => c.value === value)) {
			chips.value = [
				...chips.value,
				{ value, label: value, className: "chip-filter-featured" },
			]
		}
		selectedFeaturedFilter.value = null
	}
})

function statusLabel(status: PrototypeStatus): string {
	const labels: Record<PrototypeStatus, string> = {
		new: "New",
		updated: "Updated",
		wip: "WIP",
	}
	return labels[status]
}

function effectiveStatus(item: { status?: PrototypeStatus }): StatusFilterValue {
	return item.status ?? "none"
}

function groupMatchesStatusFilter(group: PrototypeDefinition<"prototype" | "variants">): boolean {
	const statuses = selectedStatuses.value
	if (statuses.size === 0) return true
	if (group.type === "prototype") {
		return statuses.has(effectiveStatus(group))
	}
	return group.variants.some(v => statuses.has(effectiveStatus(v)))
}

function groupMatchesWrapperFilter(group: PrototypeDefinition<"prototype" | "variants">): boolean {
	const wrappersSet = selectedWrappers.value
	if (wrappersSet.size === 0) return true
	if (group.type === "prototype") {
		return wrappersSet.has(group.wrapper.toLowerCase())
	}
	return group.variants.some(v => wrappersSet.has(v.wrapper.toLowerCase()))
}

function groupMatchesFeaturedFilter(group: PrototypeDefinition<"prototype" | "variants">): boolean {
	const featureds = selectedFeatureds.value
	if (featureds.size === 0) return true
	if (group.type === "prototype") {
		const isFeatured = !!group.featured
		return (
			(featureds.has("featured") && isFeatured) ||
			(featureds.has("unfeatured") && !isFeatured)
		)
	}
	return group.variants.some(v => {
		const isFeatured = !!v.featured
		return (
			(featureds.has("featured") && isFeatured) ||
			(featureds.has("unfeatured") && !isFeatured)
		)
	})
}

function textMatchesQueries(
	name: string,
	description: string,
	queries: Set<string>,
	...extra: (string | undefined)[]
): boolean {
	if (queries.size === 0) return true
	const searchable = [name, description, ...extra].filter(Boolean) as string[]
	const searchableLower = searchable.map(s => s.toLowerCase())
	return [...queries].every(q => searchableLower.some(s => s.includes(q)))
}

function groupMatchesTextFilter(group: PrototypeDefinition<"prototype" | "variants">): boolean {
	const queries = plainChipQueries.value
	if (queries.size === 0) return true
	const category = categories.find(c => c.id === group.category)
	if (group.type === "prototype") {
		return textMatchesQueries(
			group.name,
			group.description,
			queries,
			getWrapperName(group.wrapper),
			category?.name,
			category?.description
		)
	}
	// Variants: match if the group or any variant matches all queries (incl. wrapper/category)
	if (
		textMatchesQueries(
			group.name,
			group.description,
			queries,
			category?.name,
			category?.description
		)
	)
		return true
	return group.variants.some(v =>
		textMatchesQueries(v.name, v.description, queries, getWrapperName(v.wrapper))
	)
}

function variantMatchesStatusAndWrapper(variant: PrototypeDefinition<"variant">): boolean {
	const statuses = selectedStatuses.value
	const wrappersSet = selectedWrappers.value
	const featureds = selectedFeatureds.value
	if (statuses.size > 0 && !statuses.has(effectiveStatus(variant))) return false
	if (wrappersSet.size > 0 && !wrappersSet.has(variant.wrapper.toLowerCase())) return false
	if (featureds.size > 0) {
		const isFeatured = !!variant.featured
		if (
			!(featureds.has("featured") && isFeatured) &&
			!(featureds.has("unfeatured") && !isFeatured)
		)
			return false
	}
	return true
}

function variantMatchesFilters(variant: PrototypeDefinition<"variant">): boolean {
	if (!variantMatchesStatusAndWrapper(variant)) return false
	const queries = plainChipQueries.value
	if (
		queries.size > 0 &&
		!textMatchesQueries(
			variant.name,
			variant.description,
			queries,
			getWrapperName(variant.wrapper)
		)
	)
		return false
	return true
}

function getFilteredVariants(
	group: PrototypeDefinition<"variants">
): PrototypeDefinition<"variant">[] {
	const queries = plainChipQueries.value
	const category = categories.find(c => c.id === group.category)
	const groupMatchesText =
		queries.size === 0 ||
		textMatchesQueries(
			group.name,
			group.description,
			queries,
			category?.name,
			category?.description
		)
	if (groupMatchesText) {
		return group.variants.filter(variantMatchesStatusAndWrapper)
	}
	return group.variants.filter(variantMatchesFilters)
}

function groupMatchesFilters(group: PrototypeDefinition<"prototype" | "variants">): boolean {
	return (
		groupMatchesStatusFilter(group) &&
		groupMatchesWrapperFilter(group) &&
		groupMatchesFeaturedFilter(group) &&
		groupMatchesTextFilter(group)
	)
}

const filteredCategoriesWithPrototypes = computed(() => {
	const cats = selectedCategories.value
	const categoryFilter = (category: (typeof categories)[0]) =>
		cats.size === 0 || cats.has(category.id)
	return categories.filter(category => {
		if (!categoryFilter(category)) return false
		const groups = prototypeGroupsByCategory[category.id] ?? []
		const visibleGroups = groups.filter(groupMatchesFilters)
		return visibleGroups.length > 0
	})
})

function getFilteredGroupsForCategory(categoryId: string) {
	const groups = prototypeGroupsByCategory[categoryId] ?? []
	return groups.filter(groupMatchesFilters)
}
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
