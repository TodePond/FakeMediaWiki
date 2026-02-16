<template>
	<section class="history-cache-inspector">
		<div class="controls">
			<div class="field-row">
				<CdxLabel input-id="page-name">Page name</CdxLabel>
				<CdxTextInput id="page-name" v-model="pageName" />
			</div>

			<div class="field-row">
				<CdxLabel input-id="user-name">User name</CdxLabel>
				<CdxTextInput id="user-name" v-model="userName" />
			</div>

			<div class="field-row">
				<CdxLabel input-id="older-than">older_than</CdxLabel>
				<CdxTextInput
					id="older-than"
					v-model="olderThan"
					placeholder="Revision ID (page) or timestamp (user)"
				/>
			</div>

			<div class="field-row">
				<CdxLabel input-id="newer-than">newer_than</CdxLabel>
				<CdxTextInput id="newer-than" v-model="newerThan" placeholder="Optional cursor" />
			</div>

			<div class="field-row">
				<CdxLabel input-id="limit">Limit</CdxLabel>
				<CdxTextInput id="limit" v-model="limit" input-type="number" />
			</div>

			<div class="button-row">
				<CdxButton @click="fetchPageHistory" :disabled="isLoading"
					>Fetch page history</CdxButton
				>
				<CdxButton @click="fetchUserHistory" :disabled="isLoading"
					>Fetch user history</CdxButton
				>
				<CdxButton @click="refreshSnapshot" action="progressive"
					>Refresh snapshot</CdxButton
				>
				<CdxButton @click="clearPageCache" action="destructive">Clear page cache</CdxButton>
			</div>
		</div>

		<CdxProgressBar v-if="isLoading" />
		<p v-if="error" class="error">{{ error }}</p>

		<div class="results">
			<div class="result-card" v-if="lastPageHistoryCount !== null">
				<strong>Last page fetch</strong>
				<p>{{ lastPageHistoryCount }} revisions returned</p>
			</div>
			<div class="result-card" v-if="lastUserHistoryCount !== null">
				<strong>Last user fetch</strong>
				<p>{{ lastUserHistoryCount }} revisions returned</p>
			</div>
		</div>

		<div class="snapshot">
			<h3>Snapshot</h3>
			<pre>{{ snapshotText }}</pre>
		</div>

		<div class="fetched-results">
			<div class="fetched-panel">
				<h3>Page results</h3>
				<p v-if="lastPageResults.length === 0" class="empty">No page results yet.</p>
				<ul v-else class="revision-list">
					<li v-for="rev in lastPageResults" :key="`page-${rev.id}`">
						<strong>#{{ rev.id }}</strong>
						<span>{{ rev.timestamp }}</span>
						<span>delta: {{ rev.delta ?? 0 }}</span>
						<span>{{ rev.user.name }}</span>
						<span>{{ rev.comment || "(no comment)" }}</span>
					</li>
				</ul>
			</div>
			<div class="fetched-panel">
				<h3>User results</h3>
				<p v-if="lastUserResults.length === 0" class="empty">No user results yet.</p>
				<ul v-else class="revision-list">
					<li v-for="rev in lastUserResults" :key="`user-${rev.id}`">
						<strong>#{{ rev.id }}</strong>
						<span>{{ rev.timestamp }}</span>
						<span>delta: {{ rev.delta ?? 0 }}</span>
						<span>{{ rev.pageName || "(unknown page)" }}</span>
						<span>{{ rev.comment || "(no comment)" }}</span>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxLabel, CdxProgressBar, CdxTextInput } from "@wikimedia/codex"
import { computed, onMounted, ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"
import type { HistoryCacheSnapshot, HistoryOptions, PageHistoryRevision } from "../../wiki-api/types"

const wiki = new WikiApi()

const pageName = ref("Rogue (Marvel Comics)")
const userName = ref("Todepond")
const olderThan = ref("")
const newerThan = ref("")
const limit = ref("20")
const isLoading = ref(false)
const error = ref<string | null>(null)
const snapshot = ref<HistoryCacheSnapshot>({ pages: {}, users: {} })
const lastPageHistoryCount = ref<number | null>(null)
const lastUserHistoryCount = ref<number | null>(null)
type DisplayRevision = PageHistoryRevision & { pageName?: string }
const lastPageResults = ref<DisplayRevision[]>([])
const lastUserResults = ref<DisplayRevision[]>([])

const snapshotText = computed(() => JSON.stringify(snapshot.value, null, 2))

function buildOptions(): HistoryOptions {
	const options: HistoryOptions = {}
	const parsedLimit = parseInt(limit.value, 10)
	if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
		options.limit = parsedLimit
	}
	if (olderThan.value.trim()) {
		options.older_than = olderThan.value.trim()
	}
	if (newerThan.value.trim()) {
		options.newer_than = newerThan.value.trim()
	}
	return options
}

function refreshSnapshot(): void {
	snapshot.value = wiki.inspectHistoryCache({
		pageNames: pageName.value.trim() ? [pageName.value.trim()] : undefined,
		userNames: userName.value.trim() ? [userName.value.trim()] : undefined,
	})
}

async function fetchPageHistory(): Promise<void> {
	if (!pageName.value.trim()) return
	isLoading.value = true
	error.value = null
	try {
		const history = await wiki.getPageHistory(pageName.value.trim(), buildOptions())
		lastPageResults.value = (history.revisions || []) as DisplayRevision[]
		lastPageHistoryCount.value = lastPageResults.value.length
		refreshSnapshot()
	} catch (err) {
		error.value = (err as Error).message
	} finally {
		isLoading.value = false
	}
}

async function fetchUserHistory(): Promise<void> {
	if (!userName.value.trim()) return
	isLoading.value = true
	error.value = null
	try {
		const history = await wiki.getUserHistory(userName.value.trim(), buildOptions())
		lastUserResults.value = (history.revisions || []) as DisplayRevision[]
		lastUserHistoryCount.value = lastUserResults.value.length
		refreshSnapshot()
	} catch (err) {
		error.value = (err as Error).message
	} finally {
		isLoading.value = false
	}
}

function clearPageCache(): void {
	if (!pageName.value.trim()) {
		wiki.clearPageHistoryCache()
	} else {
		wiki.clearPageHistoryCache(pageName.value.trim())
	}
	refreshSnapshot()
}

onMounted(() => {
	refreshSnapshot()
})
</script>

<style scoped>
@import "./style.css";
</style>
