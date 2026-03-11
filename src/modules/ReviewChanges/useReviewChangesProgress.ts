import type { FWRevision } from "fakewiki/types"
import { ref } from "vue"

const VIEWED_REVISIONS_STORAGE_KEY = "review-changes-viewed-revisions"
const DISMISSED_REVISIONS_STORAGE_KEY = "review-changes-dismissed-revisions"

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

function saveRevisionIds(key: string, ids: Set<number>): void {
	try {
		localStorage.setItem(key, JSON.stringify([...ids]))
	} catch {
		// Ignore quota/security errors
	}
}

let progressInstance: ReturnType<typeof createReviewChangesProgress> | null = null

function createReviewChangesProgress() {
	const viewedRevisionIds = ref<Set<number>>(loadRevisionIds(VIEWED_REVISIONS_STORAGE_KEY))
	const dismissedRevisionIds = ref<Set<number>>(loadRevisionIds(DISMISSED_REVISIONS_STORAGE_KEY))

	function isRevisionViewed(change: FWRevision): boolean {
		return viewedRevisionIds.value.has(change.id)
	}

	function markRevisionAsViewed(change: FWRevision): void {
		const next = new Set(viewedRevisionIds.value)
		next.add(change.id)
		viewedRevisionIds.value = next
		saveRevisionIds(VIEWED_REVISIONS_STORAGE_KEY, next)
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
		try {
			localStorage.removeItem(VIEWED_REVISIONS_STORAGE_KEY)
			localStorage.removeItem(DISMISSED_REVISIONS_STORAGE_KEY)
		} catch {
			// Ignore
		}
	}

	return {
		viewedRevisionIds,
		dismissedRevisionIds,
		isRevisionViewed,
		markRevisionAsViewed,
		isRevisionDismissed,
		dismissRevision,
		resetProgress,
	}
}

export function useReviewChangesProgress() {
	if (!progressInstance) {
		progressInstance = createReviewChangesProgress()
	}
	return progressInstance
}
