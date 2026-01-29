<script setup lang="ts">
import type { ChipInputItem } from "@wikimedia/codex"
import { CdxChipInput, CdxField, CdxSelect } from "@wikimedia/codex"
import { cdxIconAdd } from "@wikimedia/codex-icons"
import { ref, watch } from "vue"
import { wrappers } from "../registry"

type FilterOption = "wip" | "new" | "updated"

const filterOptions: { value: FilterOption; label: string }[] = [
	{ value: "new", label: "New" },
	{ value: "updated", label: "Updated" },
	{ value: "wip", label: "WIP" },
]

const wrapperOptions = wrappers.map(w => ({ value: w.id, label: w.name }))

// CdxSelect shows defaultIcon only when selected is null (no menu item selected)
const statusMenuItems = filterOptions
const wrapperMenuItems = wrapperOptions

const chips = ref<ChipInputItem[]>([])
const selectedFilter = ref<FilterOption | null>(null)
const selectedWrapper = ref<string | null>(null)

function wrapperChipValue(id: string): string {
	return `wrapper:${id.toLowerCase()}`
}

// Force value and label to lowercase and identical
function toLowerChip(c: ChipInputItem): ChipInputItem {
	const normalized = String(c.label != null ? c.label : c.value).toLowerCase()
	return { ...c, value: normalized, label: normalized }
}

// Only auto-format when user typed "Status:" or "Wrapper:" prefix; plain "New" etc. stay as-is
function normalizeChip(c: ChipInputItem): ChipInputItem {
	const raw = (c.label != null ? String(c.label) : String(c.value)).trim()
	const lower = raw.toLowerCase()

	// Status: only when prefix "Status:" then new / wip / updated
	if (lower.startsWith("status:")) {
		const rest = raw.slice(7).trim().toLowerCase()
		if (rest === "new") {
			return { value: "status:new", label: "status:new", className: "chip-filter-new" }
		}
		if (rest === "wip") {
			return { value: "status:wip", label: "status:wip", className: "chip-filter-wip" }
		}
		if (rest === "updated") {
			return {
				value: "status:updated",
				label: "status:updated",
				className: "chip-filter-updated",
			}
		}
	}

	// Wrapper: only when prefix "Wrapper:" then match wrapper id or name
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

	return toLowerChip(c)
}

function normalizeChips(list: ChipInputItem[]): ChipInputItem[] {
	return list.map(normalizeChip)
}

function onChipsUpdate(newChips: ChipInputItem[]) {
	chips.value = normalizeChips(newChips)
}

// When user picks a status filter, add it only if not already present, then reset to null so icon shows
watch(selectedFilter, val => {
	if (val !== null) {
		const value = `status:${val}`
		const alreadyAdded = chips.value.some(c => c.value === value)
		if (!alreadyAdded) {
			chips.value = [...chips.value, { value, label: value, className: `chip-filter-${val}` }]
		}
		selectedFilter.value = null
	}
})

// When user picks a wrapper filter, add it only if not already present, then reset to null so icon shows
watch(selectedWrapper, val => {
	if (val !== null) {
		const chipValue = wrapperChipValue(val)
		const alreadyAdded = chips.value.some(c => c.value === chipValue)
		if (!alreadyAdded) {
			chips.value = [
				...chips.value,
				{ value: chipValue, label: chipValue, className: "chip-filter-wrapper" },
			]
		}
		selectedWrapper.value = null
	}
})
</script>

<template>
	<section class="chip-demo">
		<CdxField>
			<CdxChipInput :input-chips="chips" placeholder="" @update:input-chips="onChipsUpdate" />
			<CdxSelect
				v-model:selected="selectedFilter"
				:menu-items="statusMenuItems"
				default-label="Filter by status"
				:default-icon="cdxIconAdd"
			/>
			<CdxSelect
				v-model:selected="selectedWrapper"
				:menu-items="wrapperMenuItems"
				default-label="Filter by wrapper"
				:default-icon="cdxIconAdd"
			/>
		</CdxField>
	</section>
</template>

<style scoped>
/* Color-coded filter chips: WIP = red, New = green, Updated = blue */
.chip-demo :deep(.chip-filter-wip) {
	background-color: var(--background-color-destructive-subtle);
	color: var(--color-destructive);
	border-color: var(--border-color-destructive);
}

.chip-demo :deep(.chip-filter-new) {
	background-color: var(--background-color-success-subtle, #d5fdf4);
	color: var(--color-success, #00af89);
	border-color: var(--color-success, #00af89);
}

.chip-demo :deep(.chip-filter-updated) {
	background-color: var(--background-color-progressive-subtle);
	color: var(--color-progressive);
	border-color: var(--border-color-progressive);
}

/* Wrapper chips: neutral/muted */
.chip-demo :deep(.chip-filter-wrapper) {
	background-color: var(--background-color-neutral-subtle);
	color: var(--color-base--subtle, #54595d);
	border-color: var(--border-color-subtle);
}
</style>
