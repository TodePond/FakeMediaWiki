import type { ReviewChangesSource } from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { ref, watch } from "vue"

const STORAGE_PREFIX = "review-changes-module-"
const LEGACY_PREFIX = "review-changes-"

const SHOW_REVERT_RISK_KEY = `${STORAGE_PREFIX}show-revert-risk`
const SHOW_DELTA_KEY = `${STORAGE_PREFIX}show-delta`
const SHOW_SOURCE_ICONS_KEY = `${STORAGE_PREFIX}show-source-icons`
const SHOW_SOURCE_SUBTITLES_KEY = `${STORAGE_PREFIX}show-source-subtitles`
const FEED_SOURCE_KEY = `${STORAGE_PREFIX}feed-source`
const RECENT_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}recent-changes-ratio`
const PAGES_AND_USERS_RATIO_KEY = `${STORAGE_PREFIX}pages-and-users-ratio`
const RELATED_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}related-changes-ratio`
const RELATED_CHANGES_REC_PERCENT_KEY = `${STORAGE_PREFIX}related-changes-rec-percent`

const LEGACY_KEYS: Record<string, string> = {
	[SHOW_REVERT_RISK_KEY]: `${LEGACY_PREFIX}show-revert-risk`,
	[SHOW_DELTA_KEY]: `${LEGACY_PREFIX}show-delta`,
	[SHOW_SOURCE_ICONS_KEY]: `${LEGACY_PREFIX}show-source-icons`,
	[SHOW_SOURCE_SUBTITLES_KEY]: `${LEGACY_PREFIX}show-source-subtitles`,
	[FEED_SOURCE_KEY]: `${LEGACY_PREFIX}feed-source`,
	[RECENT_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}recent-changes-ratio`,
	[PAGES_AND_USERS_RATIO_KEY]: `${LEGACY_PREFIX}pages-and-users-ratio`,
	[RELATED_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}related-changes-ratio`,
	[RELATED_CHANGES_REC_PERCENT_KEY]: `${LEGACY_PREFIX}related-changes-rec-percent`,
}

function getStored(key: string, legacyKey: string, fallback: string): string {
	try {
		const stored = localStorage.getItem(key)
		if (stored !== null) return stored
		const legacy = localStorage.getItem(legacyKey)
		if (legacy !== null) {
			localStorage.setItem(key, legacy)
			return legacy
		}
	} catch {
		// ignore
	}
	return fallback
}

function getStoredBoolean(key: string, legacyKey: string, fallback: boolean): boolean {
	const stored = getStored(key, legacyKey, String(fallback))
	return stored === "true"
}

function getStoredRatio(key: string, legacyKey: string, fallback: number): number {
	const stored = getStored(key, legacyKey, String(fallback))
	const n = Number(stored)
	return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : fallback
}

function getStoredFeedSource(): ReviewChangesSource {
	const stored = getStored(FEED_SOURCE_KEY, LEGACY_KEYS[FEED_SOURCE_KEY], "recentChanges")
	if (
		stored === "recentChanges" ||
		stored === "pagesAndUsers" ||
		stored === "mixed" ||
		stored === "relatedChanges"
	) {
		return stored
	}
	return "recentChanges"
}

export const sourceOptions: Array<{
	value: "recentChanges" | "pagesAndUsers" | "mixed" | "relatedChanges"
	label: string
}> = [
	{ value: "recentChanges", label: "Recent changes" },
	{ value: "pagesAndUsers", label: "Watchlist" },
	{ value: "relatedChanges", label: "Related changes" },
	{ value: "mixed", label: "Mixed" },
]

export const reviewChangesSourceId = "review-changes-module-source"
export const recentChangesSliderId = "review-changes-module-recent-slider"
export const pagesAndUsersSliderId = "review-changes-module-pages-slider"
export const relatedChangesSliderId = "review-changes-module-related-slider"
export const relatedChangesRecPercentSliderId = "review-changes-module-related-rec-percent-slider"

export function useReviewChangesModule() {
	const showRevertRiskInFeed = ref(
		getStoredBoolean(SHOW_REVERT_RISK_KEY, LEGACY_KEYS[SHOW_REVERT_RISK_KEY], false)
	)
	const showDelta = ref(
		getStoredBoolean(SHOW_DELTA_KEY, LEGACY_KEYS[SHOW_DELTA_KEY], true)
	)
	const showSourceIcons = ref(
		getStoredBoolean(SHOW_SOURCE_ICONS_KEY, LEGACY_KEYS[SHOW_SOURCE_ICONS_KEY], false)
	)
	const showSourceSubtitles = ref(
		getStoredBoolean(SHOW_SOURCE_SUBTITLES_KEY, LEGACY_KEYS[SHOW_SOURCE_SUBTITLES_KEY], false)
	)
	const feedSource = ref<ReviewChangesSource>(getStoredFeedSource())
	const recentChangesRatio = ref(
		getStoredRatio(RECENT_CHANGES_RATIO_KEY, LEGACY_KEYS[RECENT_CHANGES_RATIO_KEY], 50)
	)
	const pagesAndUsersRatio = ref(
		getStoredRatio(PAGES_AND_USERS_RATIO_KEY, LEGACY_KEYS[PAGES_AND_USERS_RATIO_KEY], 50)
	)
	const relatedChangesRatio = ref(
		getStoredRatio(RELATED_CHANGES_RATIO_KEY, LEGACY_KEYS[RELATED_CHANGES_RATIO_KEY], 33)
	)
	const relatedChangesRecPercent = ref(
		getStoredRatio(
			RELATED_CHANGES_REC_PERCENT_KEY,
			LEGACY_KEYS[RELATED_CHANGES_REC_PERCENT_KEY],
			1
		)
	)

	watch(showRevertRiskInFeed, enabled => {
		try {
			localStorage.setItem(SHOW_REVERT_RISK_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showDelta, enabled => {
		try {
			localStorage.setItem(SHOW_DELTA_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showSourceIcons, enabled => {
		try {
			localStorage.setItem(SHOW_SOURCE_ICONS_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showSourceSubtitles, enabled => {
		try {
			localStorage.setItem(SHOW_SOURCE_SUBTITLES_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(feedSource, source => {
		try {
			localStorage.setItem(FEED_SOURCE_KEY, source)
		} catch {
			// ignore
		}
	})

	watch(recentChangesRatio, value => {
		try {
			localStorage.setItem(RECENT_CHANGES_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})

	watch(pagesAndUsersRatio, value => {
		try {
			localStorage.setItem(PAGES_AND_USERS_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})

	watch(relatedChangesRatio, value => {
		try {
			localStorage.setItem(RELATED_CHANGES_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})

	watch(relatedChangesRecPercent, value => {
		try {
			localStorage.setItem(RELATED_CHANGES_REC_PERCENT_KEY, String(value))
		} catch {
			// ignore
		}
	})

	return {
		feedSource,
		recentChangesRatio,
		pagesAndUsersRatio,
		relatedChangesRatio,
		relatedChangesRecPercent,
		showRevertRiskInFeed,
		showDelta,
		showSourceIcons,
		showSourceSubtitles,
		sourceOptions,
		reviewChangesSourceId,
		recentChangesSliderId,
		pagesAndUsersSliderId,
		relatedChangesSliderId,
		relatedChangesRecPercentSliderId,
	}
}
