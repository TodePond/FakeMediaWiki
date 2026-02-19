<template>
	<section class="api-playground">
		<div class="playground-layout">
			<aside class="sidebar">
				<div class="filter-row">
					<CdxTextInput
						v-model="filterQuery"
						input-type="search"
						placeholder="Filter methods..."
						class="filter-input"
					/>
				</div>
				<nav class="method-list" aria-label="API methods">
					<button
						v-for="method in filteredMethods"
						:key="method.name"
						type="button"
						class="method-item"
						:class="{ 'method-item--selected': selectedMethod?.name === method.name }"
						@click="selectMethod(method)"
					>
						<span class="method-item__name">{{ method.name }}</span>
						<span v-if="method.description" class="method-item__desc">{{ method.description.split('\n')[0] }}</span>
					</button>
				</nav>
			</aside>
			<main class="main">
				<template v-if="selectedMethod">
					<div class="form-section">
						<h2 class="method-title">{{ selectedMethod.name }}</h2>
						<p v-if="selectedMethod.description" class="method-description">
							{{ selectedMethod.description }}
						</p>
						<form v-if="selectedMethod.params.length > 0" class="param-form" @submit.prevent="run">
							<div
								v-for="param in selectedMethod.params"
								:key="param.key"
								class="field-row"
							>
								<CdxLabel :input-id="`param-${param.key}`">
									{{ param.label ?? param.key }}
								</CdxLabel>
								<CdxTextInput
									v-if="param.type === 'string' || param.type === 'date'"
									:id="`param-${param.key}`"
									v-model="(paramValues[param.key] as string)"
									:placeholder="param.type === 'date' ? 'YYYY/MM/DD or MM/DD' : ''"
								/>
								<CdxTextInput
									v-else-if="param.type === 'number'"
									:id="`param-${param.key}`"
									v-model="(paramValues[param.key] as number)"
									input-type="number"
								/>
								<CdxSelect
									v-else-if="param.type === 'enum' && param.options"
									:id="`param-${param.key}`"
									v-model:selected="(paramValues[param.key] as string)"
									:menu-items="param.options.map((o) => ({ value: o, label: o }))"
								/>
								<input
									v-else-if="param.type === 'boolean'"
									:id="`param-${param.key}`"
									v-model="(paramValues[param.key] as boolean)"
									type="checkbox"
									class="param-checkbox"
								/>
								<CdxTextInput
									v-else
									:id="`param-${param.key}`"
									v-model="(paramValues[param.key] as string)"
									:placeholder="param.type === 'stringArray' ? 'Comma-separated' : param.type === 'numberArray' ? 'Comma-separated numbers' : ''"
								/>
							</div>
							<div class="button-row">
								<CdxButton type="submit" :disabled="isLoading">Run</CdxButton>
								<CdxProgressIndicator v-if="isLoading" aria-label="Loading" />
							</div>
						</form>
						<div v-else class="button-row">
							<CdxButton @click="run" :disabled="isLoading">Run</CdxButton>
							<CdxProgressIndicator v-if="isLoading" aria-label="Loading" />
						</div>
					</div>
					<div v-if="error" class="result-error">{{ error }}</div>
					<div v-else-if="result !== undefined" class="result-area">
						<component
							:is="resultRenderer"
							:data="result"
							:method-name="selectedMethod.name"
						/>
					</div>
				</template>
				<p v-else class="no-selection">Select a method from the list.</p>
			</main>
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressIndicator, CdxSelect, CdxTextInput } from "@wikimedia/codex"
import { computed, ref, watch } from "vue"
import { FakeWiki } from "fakewiki"
import { playgroundMethods } from "./playground-data"
import type { MethodDescriptor } from "./playground-data"
import ResultTable from "./ResultTable.vue"
import ResultTablesByKey from "./ResultTablesByKey.vue"
import ResultObject from "./ResultObject.vue"
import ResultCode from "./ResultCode.vue"
import ResultImage from "./ResultImage.vue"
import ResultJson from "./ResultJson.vue"

const wiki = new FakeWiki()

const filterQuery = ref("")
const selectedMethod = ref<MethodDescriptor | null>(null)
const paramValues = ref<Record<string, unknown>>({})
const isLoading = ref(false)
const error = ref<string | null>(null)
const result = ref<unknown>(undefined)

const filteredMethods = computed(() => {
	const q = filterQuery.value.trim().toLowerCase()
	if (!q) return playgroundMethods
	return playgroundMethods.filter(
		(m) =>
			m.name.toLowerCase().includes(q) ||
			(m.description && m.description.toLowerCase().includes(q))
	)
})

function selectMethod(method: MethodDescriptor): void {
	selectedMethod.value = method
	error.value = null
	result.value = undefined
	const defaults: Record<string, unknown> = {}
	for (const p of method.params) {
		defaults[p.key] =
			p.default !== undefined
				? p.default
				: p.type === "number"
					? 0
					: p.type === "boolean"
						? false
						: ""
	}
	paramValues.value = defaults
}

function parseParamValue(
	param: MethodDescriptor["params"][0],
	raw: string | number | boolean
): unknown {
	if (param.type === "number") return Number(raw)
	if (param.type === "boolean") return Boolean(raw)
	if (param.type === "stringArray") {
		const s = String(raw).trim()
		return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []
	}
	if (param.type === "numberArray") {
		const s = String(raw).trim()
		return s
			? s
					.split(",")
					.map((x) => parseInt(x.trim(), 10))
					.filter((n) => !Number.isNaN(n))
			: []
	}
	if (param.type === "date") {
		const s = String(raw).trim()
		if (!s) return new Date()
		// Accept YYYY/MM/DD or MM/DD
		if (/^\d{1,2}\/\d{1,2}$/.test(s)) return s
		if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) return s
		return s as string
	}
	return raw
}

function buildArgs(method: MethodDescriptor): unknown[] {
	const optionKeys = new Set(method.optionsParamKeys ?? [])
	const positional: unknown[] = []
	let options: Record<string, unknown> | null = null

	for (const param of method.params) {
		const raw = paramValues.value[param.key]
		const value = parseParamValue(param, raw !== undefined ? raw as string | number | boolean : "")
		if (optionKeys.has(param.key)) {
			if (!options) options = {}
			if (value !== "" && value !== undefined && value !== null) {
				options[param.key] = value
			}
		} else {
			positional.push(value)
		}
	}
	if (options && Object.keys(options).length > 0) {
		positional.push(options)
	}
	return positional
}

async function run(): Promise<void> {
	if (!selectedMethod.value) return
	const method = selectedMethod.value
	isLoading.value = true
	error.value = null
	result.value = undefined
	try {
		const args = buildArgs(method)
		const fn = (wiki as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method.name]
		if (typeof fn !== "function") {
			throw new Error(`Method ${method.name} not found on FakeWiki`)
		}
		const out = await fn.apply(wiki, args)
		result.value = out
	} catch (err) {
		error.value = (err as Error).message
	} finally {
		isLoading.value = false
	}
}

const resultRenderer = computed(() => {
	const data = result.value
	const hint = selectedMethod.value?.resultHint
	const name = selectedMethod.value?.name ?? ""
	if (hint === "image") return ResultImage
	if (hint === "code") return ResultCode
	if (hint === "json") return ResultJson
	if (hint === "table") return ResultTable
	if (hint === "object") return ResultObject
	if (data === undefined || data === null) return ResultJson
	if (typeof data === "string") {
		if (name === "getPageThumbnail" || name === "getPageHero") return ResultImage
		return ResultCode
	}
	if (Array.isArray(data)) return ResultTable
	if (typeof data === "object") {
		if (data instanceof Map) return ResultJson
		const obj = data as Record<string, unknown>
		// getUsersHistory: Map/Record<username, { revisions: [...] }> → one table per user
		const plain = obj instanceof Map ? Object.fromEntries(obj) : obj
		if (name === "getUsersHistory" && isRecordOfRevisions(plain)) return ResultTablesByKey
		const arrayKey = ["pages", "revisions", "results", "items"].find((k) => Array.isArray(obj[k]))
		if (arrayKey && Array.isArray(obj[arrayKey])) return ResultTable
		return ResultObject
	}
	return ResultJson
})

function isRecordOfRevisions(obj: Record<string, unknown>): boolean {
	return Object.values(obj).every(
		(v) => v !== null && typeof v === "object" && !Array.isArray(v) && Array.isArray((v as Record<string, unknown>).revisions)
	)
}

watch(filteredMethods, (list) => {
	if (list.length > 0 && !selectedMethod.value) {
		selectMethod(list[0])
	}
}, { immediate: true })
</script>

<style>
/* Unscoped so table/result-object styles apply to child components (ResultTable, ResultObject) */
@import "./style.css";
</style>
