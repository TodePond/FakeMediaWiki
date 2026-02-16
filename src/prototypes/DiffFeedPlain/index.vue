<template>
	<main class="diff-feed-plain">
		<form @submit.prevent="search">
			<div class="inputs-group">
				<div class="inputs">
					<CdxLabel input-id="page-name-1">Followed pages</CdxLabel>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[0]"
							input-type="search"
							id="page-name-1"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[1]"
							input-type="search"
							id="page-name-2"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[2]"
							input-type="search"
							id="page-name-3"
						/>
					</div>
				</div>
				<div class="inputs">
					<CdxLabel input-id="user-1">Followed users</CdxLabel>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[0]"
							input-type="search"
							id="user-1"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[1]"
							input-type="search"
							id="user-2"
						/>
					</div>
					<div class="input-group">
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[2]"
							input-type="search"
							id="user-3"
						/>
					</div>
				</div>
			</div>
			<footer>
				<CdxButton :disabled="isAnyLoading">Refresh feed</CdxButton>
			</footer>
		</form>

		<section class="changes">
			<div v-if="errors.length > 0" class="error">
				<div v-for="(error, index) in errors" :key="index">{{ error }}</div>
			</div>
			<div
				class="change"
				v-for="change in allRevisions"
				:key="`${change.pageName}-${change.timestamp}`"
			>
				<div class="change-body">
					<span class="change-page-name-and-delta">
						<a
							target="_blank"
							:href="wiki.getPageUrl(change.pageName!)"
							class="change-page-name"
						>
							{{ change.pageName }} </a
						>&nbsp;<span :class="wiki.getDeltaClass(change.delta ?? 0)">{{
							change.delta ?? 0
						}}</span>
					</span>
					<span class="change-header">
						<a
							class="change-user-name"
							target="_blank"
							:href="wiki.getUserUrl(change.user.name)"
						>
							<strong>{{ change.user.name }}</strong>
						</a>
						<span class="change-suggested-by" v-if="change.summary?.suggestedBy">
							&nbsp;suggested by
							<a :href="wiki.getUserUrl(change.summary?.suggestedBy)">{{
								change.summary?.suggestedBy
							}}</a>
						</span>
					</span>
					<span class="change-timestamp">
						<a
							target="_blank"
							:href="wiki.getRevisionUrl(change.id, change.pageName!)"
							>{{ formatTimestamp(change.timestamp) }}</a
						>
					</span>
					<div class="change-comment" v-html="change?.summary?.comment"></div>
					<div v-if="change.diff?.diff?.length" class="change-diff">
						<div
							v-for="(line, lineIdx) in change.diff.diff"
							:key="lineIdx"
							:class="['diff-line', getDiffLineClass(line.type)]"
						>
							<span class="diff-line-prefix">{{
								line.type === 1 ? "+" : line.type === 2 ? "-" : " "
							}}</span>
							<span class="diff-line-text">
								<template
									v-if="
										(line.type === 3 || line.type === 4 || line.type === 5) &&
										line.highlightRanges?.length
									"
								>
									<template
										v-for="(seg, segIdx) in getDiffLineSegments(line)"
										:key="segIdx"
									>
										<span v-if="seg.type === 'add'" class="diff-char-add">{{
											seg.text
										}}</span>
										<span
											v-else-if="seg.type === 'remove'"
											class="diff-char-remove"
											>{{ seg.text }}</span
										>
										<template v-else>{{ seg.text }}</template>
									</template>
								</template>
								<template v-else>{{ line.text || " " }}</template>
							</span>
						</div>
					</div>
					<footer>
						<a target="_blank" :href="wiki.getRevisionUrl(change.id, change.pageName!)">
							<CdxIcon :icon="cdxIconLinkExternal" />View change </a
						>&nbsp;|<a target="_blank" :href="wiki.getThankUrl(change.id)">
							<CdxIcon :icon="cdxIconHeart" />Give thanks
						</a>
					</footer>
				</div>
			</div>
		</section>
	</main>
</template>

<script setup lang="ts">
import { CdxButton, CdxIcon, CdxLabel, CdxTextInput } from "@wikimedia/codex"
import { cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
import { computed, onMounted, ref, type Ref } from "vue"
import { WikiApi } from "../../wiki-api/WikiApi"
import type { DiffLine, Result, Revision } from "../../wiki-api/types"

const wiki = new WikiApi()
const PROTOTYPE_NAME = "DiffFeedThumbnailDiffFeed"

const pageStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "pageQuery", 3)
const userStorageKeys = wiki.getStorageKeys(PROTOTYPE_NAME, "userQuery", 3)

const pageSearchQueries = ref<string[]>([
	localStorage.getItem(pageStorageKeys[0]!) ?? "Wikipedia",
	localStorage.getItem(pageStorageKeys[1]!) ?? "Wet Leg",
	localStorage.getItem(pageStorageKeys[2]!) ?? "Water",
])
const userSearchQueries = ref<string[]>([
	localStorage.getItem(userStorageKeys[0]!) ?? "Samwalton9",
	localStorage.getItem(userStorageKeys[1]!) ?? "Humbugtheman",
	localStorage.getItem(userStorageKeys[2]!) ?? "Todepond",
])

// Store results using Result type (revisions may have diff attached)
const pageResults = wiki.createResults<Revision>(3).map(r => ref(r))
const userResults = wiki.createResults<Revision>(3).map(r => ref(r))

onMounted(search)

function saveSearchQueries(): void {
	pageSearchQueries.value.forEach((query, index) => {
		const key = pageStorageKeys[index]
		if (key) localStorage.setItem(key, query)
	})
	userSearchQueries.value.forEach((query, index) => {
		const key = userStorageKeys[index]
		if (key) localStorage.setItem(key, query)
	})
}

async function search(): Promise<void> {
	const loadPromises: Promise<void>[] = []

	for (let i = 0; i < pageSearchQueries.value.length; i++) {
		const query = pageSearchQueries.value[i]
		const result = pageResults[i]
		if (!result) continue
		if (query?.trim()) {
			loadPromises.push(loadPage(query, result))
		} else {
			result.value = { data: [], loading: false, error: null }
		}
	}

	for (let i = 0; i < userSearchQueries.value.length; i++) {
		const query = userSearchQueries.value[i]
		const result = userResults[i]
		if (!result) continue
		if (query?.trim()) {
			loadPromises.push(loadUser(query, result))
		} else {
			result.value = { data: [], loading: false, error: null }
		}
	}

	await Promise.all(loadPromises)
	saveSearchQueries()
}

async function loadUser(userName: string, resultRef: Ref<Result<Revision>>): Promise<void> {
	resultRef.value.loading = true
	resultRef.value.error = null

	try {
		const _history = (await wiki.getUserHistory(userName, { limit: 10 })) as {
			revisions?: Array<{
				comment?: string
				pageName?: string
				title?: string
				user: { name: string }
				id: number
				timestamp: string
				delta: number
			}>
		}

		if (!_history.revisions) {
			resultRef.value = { data: [], loading: false, error: null }
			return
		}

		// Limit to only the first 10 revisions
		const limitedRevisions = _history.revisions.slice(0, 10)

		const processedRevisions = await Promise.all(
			limitedRevisions.map(async revision => {
				const pageName = revision.pageName || revision.title || ""
				const _summary = wiki.preprocessEditSummary(revision.comment || "", pageName)
				const toolbar = wiki.parseToolbarComment(_summary)
				const summary = toolbar
					? toolbar
					: {
							comment: _summary,
							hashtags: [],
							other: [],
							suggestedBy: null,
							useThisBot: null,
							reportBugs: null,
						}
				summary.comment = summary.comment
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const processedRevision: Revision = {
					...revision,
					comment: revision.comment || "",
					summary,
					pageName,
					thumbnailUrl: null,
				}
				return processedRevision
			})
		)

		resultRef.value = { data: processedRevisions, loading: false, error: null }

		processedRevisions.forEach(revision => {
			loadThumbnailForRevision(revision, resultRef)
		})
		// Load diffs: get revision diff (parent vs current) for each revision.
		for (const revision of processedRevisions) {
			if (!revision.pageName) continue
			loadDiffForRevision(revision, resultRef)
		}
	} catch (e) {
		const errorObj = e as Error
		const errorMsg = errorObj.message.includes("404")
			? `${userName}: User not found`
			: `${userName}: ${errorObj.message}`
		resultRef.value = { data: [], loading: false, error: errorMsg }
	}
}

async function loadPage(pageName: string, resultRef: Ref<Result<Revision>>): Promise<void> {
	resultRef.value.loading = true
	resultRef.value.error = null

	try {
		const _history = (await wiki.getPageHistory(pageName, { limit: 10 })) as {
			revisions?: Array<{
				comment: string
				user: { name: string }
				id: number
				timestamp: string
				delta: number
			}>
		}

		if (!_history.revisions) {
			resultRef.value = { data: [], loading: false, error: null }
			return
		}

		// Limit to only the first 10 revisions
		const limitedRevisions = _history.revisions.slice(0, 10)

		const processedRevisions = await Promise.all(
			limitedRevisions.map(async revision => {
				const _summary = wiki.preprocessEditSummary(revision.comment, pageName)
				const toolbar = wiki.parseToolbarComment(_summary)
				const summary = toolbar
					? toolbar
					: {
							comment: _summary,
							hashtags: [],
							other: [],
							suggestedBy: null,
							useThisBot: null,
							reportBugs: null,
						}
				summary.comment = summary.comment
					? await wiki.transformWikitextToHtml(summary.comment, pageName)
					: ""
				summary.hashtags = Array.isArray(summary.hashtags)
					? summary.hashtags.join(" ")
					: summary.hashtags
				const processedRevision: Revision = {
					...revision,
					summary,
					pageName,
					thumbnailUrl: null,
				}
				return processedRevision
			})
		)

		resultRef.value = { data: processedRevisions, loading: false, error: null }

		processedRevisions.forEach(revision => {
			loadThumbnailForRevision(revision, resultRef)
		})
		// Load diffs for each revision.
		for (const revision of processedRevisions) {
			if (!revision.pageName) continue
			loadDiffForRevision(revision, resultRef)
		}
	} catch (e) {
		const errorObj = e as Error
		const errorMsg = errorObj.message.includes("404")
			? `${pageName}: Page not found`
			: `${pageName}: ${errorObj.message}`
		resultRef.value = { data: [], loading: false, error: errorMsg }
	}
}

async function loadThumbnailForRevision(
	revision: Revision,
	resultRef: Ref<Result<Revision>>
): Promise<void> {
	try {
		if (!revision.pageName) return
		const thumbnailUrl = await wiki.getPageThumbnail(revision.pageName)
		const revIndex = resultRef.value.data.findIndex(r => r.id === revision.id)
		if (revIndex !== -1 && resultRef.value.data[revIndex]) {
			resultRef.value.data[revIndex]!.thumbnailUrl = thumbnailUrl
			resultRef.value = { ...resultRef.value, data: [...resultRef.value.data] }
		}
	} catch (e) {
		console.error("Failed to load thumbnail", e)
	}
}

async function loadDiffForRevision(
	revision: Revision,
	resultRef: Ref<Result<Revision>>
): Promise<void> {
	if (!revision.pageName) return
	try {
		const response = await wiki.getRevisionDiff(revision.pageName, revision.id)
		const revIndex = resultRef.value.data.findIndex(r => r.id === revision.id)
		if (revIndex !== -1 && resultRef.value.data[revIndex]) {
			resultRef.value.data[revIndex]!.diff = response
			resultRef.value = { ...resultRef.value, data: [...resultRef.value.data] }
		}
	} catch (e) {
		console.error("Failed to load diff", e)
	}
}

/** Segment of a diff line for character-level display (API highlightRanges: type 0 = add, 1 = remove) */
interface DiffSegment {
	text: string
	type: "add" | "remove" | null
}

/** UTF-8 byte offset to character index in string */
function byteOffsetToCharIndex(str: string, byteOffset: number): number {
	let bytes = 0
	let i = 0
	while (i < str.length) {
		const c = str.codePointAt(i) ?? 0
		if (c <= 0x7f) bytes += 1
		else if (c <= 0x7ff) bytes += 2
		else if (c <= 0xffff) bytes += 3
		else bytes += 4
		if (bytes > byteOffset) return i
		i += c > 0xffff ? 2 : 1
	}
	return str.length
}

/** Split a change line into segments for add/remove character-level styling */
function getDiffLineSegments(line: DiffLine): DiffSegment[] {
	const text = line.text ?? ""
	const ranges = line.highlightRanges ?? []
	if (ranges.length === 0) {
		return [{ text, type: null }]
	}
	const sorted = [...ranges].sort((a, b) => a.start - b.start)
	const segments: DiffSegment[] = []
	let pos = 0
	for (const range of sorted) {
		const { start, length, type } = range
		const charStart = byteOffsetToCharIndex(text, start)
		const charEnd = byteOffsetToCharIndex(text, start + length)
		if (charStart > pos) {
			segments.push({ text: text.slice(pos, charStart), type: null })
		}
		segments.push({
			text: text.slice(charStart, charEnd),
			type: type === 0 ? "add" : type === 1 ? "remove" : null,
		})
		pos = charEnd
	}
	if (pos < text.length) {
		segments.push({ text: text.slice(pos), type: null })
	}
	return segments
}

function getDiffLineClass(type: number): string {
	switch (type) {
		case 0:
			return "diff-line-context"
		case 1:
			return "diff-line-add"
		case 2:
			return "diff-line-remove"
		case 3:
		case 4:
		case 5:
			return "diff-line-change"
		default:
			return "diff-line-context"
	}
}

const allRevisions = computed<Revision[]>(() => {
	const revisions: Revision[] = []
	const seenIds = new Set<number>()

	pageResults.forEach(result => {
		result.value.data.forEach(revision => {
			if (revision.id && !seenIds.has(revision.id)) {
				seenIds.add(revision.id)
				revisions.push(revision)
			}
		})
	})
	userResults.forEach(result => {
		result.value.data.forEach(revision => {
			if (revision.id && !seenIds.has(revision.id)) {
				seenIds.add(revision.id)
				revisions.push(revision)
			}
		})
	})
	return revisions.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	)
})

const isAnyLoading = computed(() => {
	return pageResults.some(r => r.value.loading) || userResults.some(r => r.value.loading)
})

const errors = computed(() => {
	const errs: string[] = []
	pageResults.forEach(result => {
		if (result.value.error) errs.push(result.value.error)
	})
	userResults.forEach(result => {
		if (result.value.error) errs.push(result.value.error)
	})
	return errs
})

function formatTimestamp(timestamp: string): string {
	return wiki.getRelativeTimestamp(timestamp, {
		seconds: "words",
		minutes: "minutes",
		hours: "hours",
		days: "days",
		weeks: "date",
		months: "date",
		years: "date",
	})
}
</script>

<style scoped>
@import "./style.css";
</style>

<style>
@import "./global.css";
</style>
