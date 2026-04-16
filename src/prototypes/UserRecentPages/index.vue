<template>
	<section class="user-recent-pages">
		<form class="user-recent-pages__form" @submit.prevent="loadRecentPages">
			<CdxLabel input-id="user-recent-pages-user-name">User name</CdxLabel>
			<CdxTextInput id="user-recent-pages-user-name" v-model="userName" />
			<CdxButton :disabled="isLoading">Load recently edited pages</CdxButton>
			<CdxProgressIndicator v-if="isLoading" aria-label="Loading recent pages" />
		</form>

		<p v-if="error">{{ error }}</p>
		<p v-else-if="hasLoaded">{{ recentPages.length }} pages found</p>

		<div v-if="recentPages.length > 0" class="user-recent-pages__list">
			<div v-for="page in recentPages" :key="page.pageName" class="user-recent-pages__row">
				<div class="user-recent-pages__thumbnail-wrap">
					<a
						class="user-recent-pages__thumbnail-link"
						:href="wiki.getPageUrl(page.pageName)"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img
							v-if="page.thumbnailUrl"
							class="user-recent-pages__thumbnail"
							:src="page.thumbnailUrl"
							:alt="`${page.pageName} thumbnail`"
						/>
						<div v-else class="user-recent-pages__thumbnail-placeholder">
							<CdxIcon
								:icon="cdxIconImage"
								size="medium"
								class="user-recent-pages__thumbnail-placeholder-icon"
							/>
						</div>
					</a>
				</div>
				<div class="user-recent-pages__content">
					<a
						class="user-recent-pages__page-link"
						:href="wiki.getPageUrl(page.pageName)"
						target="_blank"
						rel="noopener noreferrer"
					>
						{{ page.pageName }}
					</a>
					<div
						v-if="page.recentHistoryIn7Days !== 0"
						class="user-recent-pages__edits-this-week"
					>
						<template v-if="page.recentHistoryIn7Days === null">…</template>
						<template v-else-if="page.recentHistoryIn7Days < 0">—</template>
						<a
							v-else-if="page.recentHistoryIn7Days === 1"
							class="user-recent-pages__edits-link"
							:href="wiki.getHistoryUrl(page.pageName)"
							target="_blank"
							rel="noopener noreferrer"
						>
							1 edit this week
						</a>
						<a
							v-else
							class="user-recent-pages__edits-link"
							:href="wiki.getHistoryUrl(page.pageName)"
							target="_blank"
							rel="noopener noreferrer"
						>
							{{ page.recentHistoryIn7Days }} edits this week
						</a>
					</div>
				</div>
			</div>
		</div>
		<p v-else-if="hasLoaded && !isLoading">No pages found.</p>
	</section>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxProgressIndicator, CdxTextInput } from "@wikimedia/codex"
import { cdxIconImage } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import { onMounted, ref } from "vue"

type UserHistoryRevision = {
	pageName?: string
	title?: string
	timestamp: string
}

type RecentPage = {
	pageName: string
	thumbnailUrl: string | null
	/**
	 * Among one `getPageHistory` response: revisions in the last 7 days whose editor is not
	 * the loaded user (case-insensitive).
	 * null while loading; -1 if the request failed.
	 */
	recentHistoryIn7Days: number | null
	/** Revisions returned by that history call (at most the API page size). */
	recentHistoryFetched: number | null
}

const wiki = new FakeWiki()
const DEFAULT_USER_NAME = "Todepond"
const STORAGE_KEY = "userRecentPages.userName"
const SNAPSHOT_VERSION = "v2"
const USER_HISTORY_LIMIT = 200
const MAX_RECENT_PAGES = 20
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const PAGE_HISTORY_COUNT_CONCURRENCY = 4

const userName = ref(localStorage.getItem(STORAGE_KEY) || DEFAULT_USER_NAME)
const recentPages = ref<RecentPage[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasLoaded = ref(false)
let latestLoadRequestId = 0

function snapshotStorageKey(forUser: string): string {
	return `userRecentPages.snapshot.${SNAPSHOT_VERSION}:${encodeURIComponent(forUser)}`
}

function readCachedPages(forUser: string): RecentPage[] | null {
	if (!forUser) return null
	try {
		const raw = localStorage.getItem(snapshotStorageKey(forUser))
		if (!raw) return null
		const data = JSON.parse(raw) as { pages?: RecentPage[] }
		if (!Array.isArray(data.pages)) return null
		const complete = data.pages.every(
			(p: RecentPage) => p.recentHistoryIn7Days !== null && p.recentHistoryFetched !== null
		)
		if (!complete) return null
		return data.pages
	} catch {
		return null
	}
}

function writeCachedPages(forUser: string, pages: RecentPage[]): void {
	if (!forUser) return
	try {
		localStorage.setItem(snapshotStorageKey(forUser), JSON.stringify({ pages }))
	} catch {
		// Ignore quota or private mode failures.
	}
}

function normalizeWikiUserName(name: string): string {
	return name.trim().replace(/ /g, "_").toLowerCase()
}

function revisionIsByUser(rev: { user?: { name?: string } }, canonicalUser: string): boolean {
	const editor = rev.user?.name?.trim()
	if (!editor) return false
	return normalizeWikiUserName(editor) === canonicalUser
}

function isFilteredNamespacePage(pageName: string): boolean {
	const normalized = pageName.toLowerCase()
	return (
		normalized.startsWith("talk:") ||
		normalized.startsWith("mediawiki talk:") ||
		normalized.startsWith("mediawiki:") ||
		normalized.startsWith("user talk:") ||
		normalized.startsWith("user:") ||
		normalized.startsWith("wikipedia:") ||
		normalized.startsWith("file:")
	)
}

async function loadRecentPages(): Promise<void> {
	const requestId = ++latestLoadRequestId
	const trimmedUserName = userName.value.trim()
	if (!trimmedUserName) return

	localStorage.setItem(STORAGE_KEY, trimmedUserName)
	isLoading.value = true
	error.value = null

	try {
		const history = (await wiki.getUserHistory(trimmedUserName, {
			limit: USER_HISTORY_LIMIT,
		})) as { revisions?: UserHistoryRevision[] }

		const mostRecentEditByPageName = new Map<string, string>()
		for (const revision of history.revisions ?? []) {
			const pageName = (revision.pageName || revision.title || "").trim()
			if (!pageName) continue
			if (isFilteredNamespacePage(pageName)) continue
			const previousTimestamp = mostRecentEditByPageName.get(pageName)
			if (!previousTimestamp || revision.timestamp > previousTimestamp) {
				mostRecentEditByPageName.set(pageName, revision.timestamp)
			}
		}

		recentPages.value = [...mostRecentEditByPageName.entries()]
			.sort((a, b) => b[1].localeCompare(a[1]))
			.slice(0, MAX_RECENT_PAGES)
			.map(([pageName]) => ({
				pageName,
				thumbnailUrl: null,
				recentHistoryIn7Days: null,
				recentHistoryFetched: null,
			}))
		hasLoaded.value = true
		const excludeUser = normalizeWikiUserName(trimmedUserName)
		await Promise.all([
			loadSevenDayHistoryCounts(requestId, excludeUser),
			loadThumbnailsForPages(requestId),
		])
		if (requestId === latestLoadRequestId) {
			writeCachedPages(trimmedUserName, recentPages.value)
		}
	} catch (err) {
		error.value = (err as Error).message
		recentPages.value = []
		hasLoaded.value = true
	} finally {
		isLoading.value = false
	}
}

async function loadSevenDayHistoryCounts(
	requestId: number,
	excludeUserCanonical: string
): Promise<void> {
	const cutoffMs = Date.now() - SEVEN_DAYS_MS
	const entries = [...recentPages.value]
	await wiki.runWithConcurrency(entries, PAGE_HISTORY_COUNT_CONCURRENCY, async entry => {
		try {
			const history = await wiki.getPageHistory(entry.pageName)
			const revs = history.revisions ?? []
			let inWindow = 0
			for (const rev of revs) {
				if (revisionIsByUser(rev, excludeUserCanonical)) continue
				if (new Date(rev.timestamp).getTime() >= cutoffMs) inWindow++
			}
			if (requestId !== latestLoadRequestId) return
			recentPages.value = recentPages.value.map(page =>
				page.pageName === entry.pageName
					? {
							...page,
							recentHistoryIn7Days: inWindow,
							recentHistoryFetched: revs.length,
						}
					: page
			)
		} catch {
			if (requestId !== latestLoadRequestId) return
			recentPages.value = recentPages.value.map(page =>
				page.pageName === entry.pageName
					? { ...page, recentHistoryIn7Days: -1, recentHistoryFetched: 0 }
					: page
			)
		}
	})
}

async function loadThumbnailsForPages(requestId: number): Promise<void> {
	const entries = [...recentPages.value]
	await Promise.all(
		entries.map(async entry => {
			try {
				const thumbnailUrl = await wiki.getPageThumbnail(entry.pageName)
				if (requestId !== latestLoadRequestId) return
				recentPages.value = recentPages.value.map(page =>
					page.pageName === entry.pageName
						? { ...page, thumbnailUrl: thumbnailUrl ?? null }
						: page
				)
			} catch {
				// Ignore thumbnail failures so page rows still render.
			}
		})
	)
}

onMounted(() => {
	const cached = readCachedPages(userName.value.trim())
	if (cached) {
		recentPages.value = cached
		hasLoaded.value = true
	}
})
</script>

<style scoped>
@import "./style.css";
</style>
