<template>
	<main class="diff-feed-thumbnail">
		<form @submit.prevent="search">
			<div class="inputs-group">
				<div class="inputs">
					<CdxLabel :input-id="getPageInputId(0)">Followed pages</CdxLabel>
					<div
						class="input-group"
						v-for="(_, index) in pageSearchQueries"
						:key="`page-${index}`"
					>
						<CdxTextInput
							autocomplete="off"
							v-model="pageSearchQueries[index]"
							input-type="search"
							:id="getPageInputId(index)"
						/>
					</div>
					<div class="input-list-actions">
						<CdxButton type="button" @click="addPage">Add page</CdxButton>
						<CdxButton
							type="button"
							@click="removePage"
							:disabled="pageSearchQueries.length === 0"
						>
							Remove page
						</CdxButton>
					</div>
				</div>
				<div class="inputs">
					<CdxLabel :input-id="getUserInputId(0)">Followed users</CdxLabel>
					<div
						class="input-group"
						v-for="(_, index) in userSearchQueries"
						:key="`user-${index}`"
					>
						<CdxTextInput
							autocomplete="off"
							v-model="userSearchQueries[index]"
							input-type="search"
							:id="getUserInputId(index)"
						/>
					</div>
					<div class="input-list-actions">
						<CdxButton type="button" @click="addUser">Add user</CdxButton>
						<CdxButton
							type="button"
							@click="removeUser"
							:disabled="userSearchQueries.length === 0"
						>
							Remove user
						</CdxButton>
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
				<a v-if="change.pageName" target="_blank" :href="wiki.getPageUrl(change.pageName)">
					<img
						v-if="change.thumbnailUrl"
						class="change-thumbnail"
						:src="change.thumbnailUrl"
						:alt="`Thumbnail for ${change.pageName}`"
					/>
					<div v-else class="change-thumbnail-placeholder">
						<CdxIcon :icon="cdxIconArticle" />
					</div>
				</a>
				<div v-else class="change-thumbnail-placeholder">
					<CdxIcon :icon="cdxIconArticle" />
				</div>
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
import { cdxIconArticle, cdxIconHeart, cdxIconLinkExternal } from "@wikimedia/codex-icons"
import { FakeWiki } from "fakewiki"
import type { FWDiffLine, FWResult, FWRevision } from "fakewiki/types"
import { computed, onMounted, ref, type Ref } from "vue"

const wiki = new FakeWiki()
const PROTOTYPE_NAME = "DiffFeedThumbnail"

const pageStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "pageQueries")
const userStorageKey = wiki.getStorageKey(PROTOTYPE_NAME, "userQueries")
const defaultPageSearchQueries = ["Wikipedia", "Wet Leg", "Water"]
const defaultUserSearchQueries = ["Todepond", "Samwalton9"]
const pageSearchQueries = ref<string[]>(loadSearchQueries(pageStorageKey, defaultPageSearchQueries))
const userSearchQueries = ref<string[]>(loadSearchQueries(userStorageKey, defaultUserSearchQueries))

// Store results using Result type (revisions may have diff attached)
const pageResults = wiki
	.createResults<FWRevision>(pageSearchQueries.value.length)
	.map(result => ref(result))
const userResults = wiki
	.createResults<FWRevision>(userSearchQueries.value.length)
	.map(result => ref(result))

onMounted(search)

function saveSearchQueries(): void {
	localStorage.setItem(pageStorageKey, JSON.stringify(pageSearchQueries.value))
	localStorage.setItem(userStorageKey, JSON.stringify(userSearchQueries.value))
}

function loadSearchQueries(key: string, defaultValues: string[]): string[] {
	const savedSearchQueries = localStorage.getItem(key)
	if (!savedSearchQueries) {
		return defaultValues
	}
	try {
		const parsed = JSON.parse(savedSearchQueries)
		if (Array.isArray(parsed) && parsed.every(value => typeof value === "string")) {
			return parsed
		}
	} catch {
		// Ignore invalid stored values and fallback.
	}
	return defaultValues
}

function createEmptyResult(): FWResult<FWRevision> {
	return { data: [], loading: false, error: null }
}

function addPage(): void {
	pageSearchQueries.value.push("")
	pageResults.push(ref(createEmptyResult()))
	saveSearchQueries()
}

function removePage(): void {
	if (pageSearchQueries.value.length === 0) {
		return
	}
	pageSearchQueries.value.pop()
	pageResults.pop()
	saveSearchQueries()
}

function addUser(): void {
	userSearchQueries.value.push("")
	userResults.push(ref(createEmptyResult()))
	saveSearchQueries()
}

function removeUser(): void {
	if (userSearchQueries.value.length === 0) {
		return
	}
	userSearchQueries.value.pop()
	userResults.pop()
	saveSearchQueries()
}

function getPageInputId(index: number): string {
	return `page-name-${index + 1}`
}

function getUserInputId(index: number): string {
	return `user-${index + 1}`
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

async function loadUser(userName: string, resultRef: Ref<FWResult<FWRevision>>): Promise<void> {
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
				const toolbar = wiki.parseToolbarEditSummary(_summary)
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
				const processedRevision: FWRevision = {
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

async function loadPage(pageName: string, resultRef: Ref<FWResult<FWRevision>>): Promise<void> {
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
				const toolbar = wiki.parseToolbarEditSummary(_summary)
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
				const processedRevision: FWRevision = {
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
	revision: FWRevision,
	resultRef: Ref<FWResult<FWRevision>>
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
	revision: FWRevision,
	resultRef: Ref<FWResult<FWRevision>>
): Promise<void> {
	if (!revision.pageName) return
	try {
		const response = await wiki.getDiffSource(revision.pageName, revision.id)
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
function getDiffLineSegments(line: FWDiffLine): DiffSegment[] {
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

const allRevisions = computed<FWRevision[]>(() => {
	const revisions: FWRevision[] = []
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
	return wiki.formatRelativeTimestamp(timestamp, {
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
