import type { FWRevision } from "fakewiki/types"
import { ref } from "vue"

type RevisionsCallback = () => FWRevision[]

const VIEWED_REVISIONS_STORAGE_KEY = "review-changes-plus-viewed-revisions"
const DISMISSED_REVISIONS_STORAGE_KEY = "review-changes-plus-dismissed-revisions"
const LAST_CLICKED_REVISION_KEY = "review-changes-plus-last-clicked-revision"

function loadRevisionIds(key: string): Set<number> {
	try {
		const stored = localStorage.getItem(key)
		if (!stored) return new Set()
		const parsed = JSON.parse(stored) as number[]
		return new Set(Array.isArray(parsed) ? parsed : [])
	} catch {
		return new Set()
	}
}

function loadLastClickedRevisionId(): number | null {
	try {
		const stored = localStorage.getItem(LAST_CLICKED_REVISION_KEY)
		if (!stored) return null
		const n = Number(stored)
		return Number.isFinite(n) ? n : null
	} catch {
		return null
	}
}

function saveLastClickedRevisionId(id: number | null): void {
	try {
		if (id === null) {
			localStorage.removeItem(LAST_CLICKED_REVISION_KEY)
		} else {
			localStorage.setItem(LAST_CLICKED_REVISION_KEY, String(id))
		}
	} catch {
		// ignore
	}
}

function saveRevisionIds(key: string, ids: Set<number>): void {
	try {
		localStorage.setItem(key, JSON.stringify([...ids]))
	} catch {
		// Ignore quota/security errors
	}
}

let progressInstance: ReturnType<typeof createReviewChangesPlusProgress> | null = null

let revisionsCallback: RevisionsCallback | null = null

export function setRevisionsCallback(cb: RevisionsCallback): void {
	revisionsCallback = cb
}

export function clearRevisionsCallback(): void {
	revisionsCallback = null
}

function createReviewChangesPlusProgress() {
	const viewedRevisionIds = ref<Set<number>>(loadRevisionIds(VIEWED_REVISIONS_STORAGE_KEY))
	const dismissedRevisionIds = ref<Set<number>>(loadRevisionIds(DISMISSED_REVISIONS_STORAGE_KEY))
	const lastClickedRevisionId = ref<number | null>(loadLastClickedRevisionId())

	function isRevisionViewed(change: FWRevision): boolean {
		return viewedRevisionIds.value.has(change.id)
	}

	function markRevisionAsViewed(change: FWRevision): void {
		const next = new Set(viewedRevisionIds.value)
		next.add(change.id)
		viewedRevisionIds.value = next
		saveRevisionIds(VIEWED_REVISIONS_STORAGE_KEY, next)
		lastClickedRevisionId.value = change.id
		saveLastClickedRevisionId(change.id)
	}

	function markRevisionsAsViewed(revisions: FWRevision[]): void {
		if (revisions.length === 0) return
		const next = new Set(viewedRevisionIds.value)
		for (const r of revisions) {
			next.add(r.id)
		}
		viewedRevisionIds.value = next
		saveRevisionIds(VIEWED_REVISIONS_STORAGE_KEY, next)
		lastClickedRevisionId.value = null
		saveLastClickedRevisionId(null)
	}

	function completeProgress(): void {
		const revisions = revisionsCallback?.() ?? []
		markRevisionsAsViewed(revisions)
	}

	function clearLastClickedRevisionId(): void {
		lastClickedRevisionId.value = null
		saveLastClickedRevisionId(null)
	}

	/** Clears viewed state (and last-clicked highlight); dismissals unchanged. */
	function clearViewedRevisions(): void {
		viewedRevisionIds.value = new Set()
		lastClickedRevisionId.value = null
		try {
			localStorage.removeItem(VIEWED_REVISIONS_STORAGE_KEY)
			localStorage.removeItem(LAST_CLICKED_REVISION_KEY)
		} catch {
			// Ignore
		}
	}

	function isRevisionDismissed(change: FWRevision): boolean {
		return dismissedRevisionIds.value.has(change.id)
	}

	function dismissRevision(change: FWRevision): void {
		const next = new Set(dismissedRevisionIds.value)
		next.add(change.id)
		dismissedRevisionIds.value = next
		saveRevisionIds(DISMISSED_REVISIONS_STORAGE_KEY, next)
	}

	function resetProgress(): void {
		viewedRevisionIds.value = new Set()
		dismissedRevisionIds.value = new Set()
		lastClickedRevisionId.value = null
		try {
			localStorage.removeItem(VIEWED_REVISIONS_STORAGE_KEY)
			localStorage.removeItem(DISMISSED_REVISIONS_STORAGE_KEY)
			localStorage.removeItem(LAST_CLICKED_REVISION_KEY)
		} catch {
			// Ignore
		}
	}

	return {
		viewedRevisionIds,
		dismissedRevisionIds,
		lastClickedRevisionId,
		clearLastClickedRevisionId,
		clearViewedRevisions,
		isRevisionViewed,
		markRevisionAsViewed,
		markRevisionsAsViewed,
		completeProgress,
		isRevisionDismissed,
		dismissRevision,
		resetProgress,
	}
}

export function useReviewChangesPlusProgress() {
	if (!progressInstance) {
		progressInstance = createReviewChangesPlusProgress()
	}
	return progressInstance
}
