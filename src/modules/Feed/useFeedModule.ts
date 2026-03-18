import type { ReviewChangesSource } from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { computed, ref, watch } from "vue"

const STORAGE_PREFIX = "feed-module-"

const SHOW_REVERT_RISK_KEY = `${STORAGE_PREFIX}show-revert-risk`
const SHOW_REVERT_RISK_FLAGS_KEY = `${STORAGE_PREFIX}show-revert-risk-flags`
const SHOW_REVERTED_FLAG_KEY = `${STORAGE_PREFIX}show-reverted-flag`
const SHOW_RECOMMENDATION_FLAGS_KEY = `${STORAGE_PREFIX}show-recommendation-flags`
const SHOW_EDIT_CHECK_OTHER_FLAG_KEY = `${STORAGE_PREFIX}show-edit-check-other-flag`
const SHOW_TONE_CHECK_FLAG_KEY = `${STORAGE_PREFIX}show-tone-check-flag`
const SHOW_DEBUG_CHECKS_KEY = `${STORAGE_PREFIX}show-debug-checks`
const SHOW_ON_WATCHLIST_LABEL_KEY = `${STORAGE_PREFIX}show-on-watchlist-label`
const FEED_SOURCE_KEY = `${STORAGE_PREFIX}feed-source`
const MIXED_RECENT_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}mixed-recent-changes-ratio`
const MIXED_PAGES_AND_USERS_RATIO_KEY = `${STORAGE_PREFIX}mixed-pages-and-users-ratio`
const MIXED_PAGES_AND_USERS_LATEST_RATIO_KEY = `${STORAGE_PREFIX}mixed-pages-and-users-latest-ratio`
const MIXED_RELATED_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}mixed-related-changes-ratio`
const MIXED_COLLABORATORS_RATIO_KEY = `${STORAGE_PREFIX}mixed-collaborators-ratio-v2`
const STANDALONE_RECENT_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}standalone-recent-changes-ratio`
const STANDALONE_PAGES_AND_USERS_RATIO_KEY = `${STORAGE_PREFIX}standalone-pages-and-users-ratio`
const STANDALONE_PAGES_AND_USERS_LATEST_RATIO_KEY = `${STORAGE_PREFIX}standalone-pages-and-users-latest-ratio`
const STANDALONE_RELATED_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}standalone-related-changes-ratio`
const STANDALONE_COLLABORATORS_RATIO_KEY = `${STORAGE_PREFIX}standalone-collaborators-ratio-v2`

function getStored(key: string, fallback: string): string {
	try {
		const stored = localStorage.getItem(key)
		if (stored !== null) return stored
	} catch {
		// ignore
	}
	return fallback
}

function getStoredBoolean(key: string, fallback: boolean): boolean {
	const stored = getStored(key, String(fallback))
	return stored === "true"
}

function getStoredRatio(key: string, fallback: number): number {
	const stored = getStored(key, String(fallback))
	const n = Number(stored)
	return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : fallback
}

function getStoredFeedSource(): ReviewChangesSource {
	const stored = getStored(FEED_SOURCE_KEY, "recentChanges")
	if (
		stored === "recentChanges" ||
		stored === "pagesAndUsers" ||
		stored === "pagesAndUsersLatest" ||
		stored === "mixed" ||
		stored === "relatedChanges" ||
		stored === "collaborators"
	) {
		return stored
	}
	return "recentChanges"
}

export const sourceOptions: Array<{
	value:
		| "recentChanges"
		| "pagesAndUsers"
		| "pagesAndUsersLatest"
		| "mixed"
		| "relatedChanges"
		| "collaborators"
	label: string
}> = [
	{ value: "recentChanges", label: "Risky" },
	{ value: "pagesAndUsers", label: "Watchlist" },
	{ value: "pagesAndUsersLatest", label: "Watchlist (latest revision)" },
	{ value: "collaborators", label: "Mentor" },
	{ value: "relatedChanges", label: "Related changes" },
	{ value: "mixed", label: "Mixed" },
]

export const feedSourceId = "feed-module-source"
export const recentChangesSliderId = "feed-module-recent-slider"
export const pagesAndUsersSliderId = "feed-module-pages-slider"
export const pagesAndUsersLatestSliderId = "feed-module-pages-latest-slider"
export const relatedChangesSliderId = "feed-module-related-slider"
export const collaboratorsSliderId = "feed-module-collaborators-slider"

export const FEED_CHECKBOX_CONFIG = [
	{ key: "showRevertRiskInFeed", label: "Debug revert risk", section: "Flag types" },
	{ key: "showDebugChecks", label: "Debug checks", section: "Flag types" },
	{ key: "showOnWatchlistLabel", label: "On watchlist label", section: "Flag types" },
	{ key: "showRevertRiskFlags", label: "Revert risk flags", section: "Flag types" },
	{ key: "showRecommendationFlags", label: "Recommendation flags", section: "Flag types" },
	{ key: "showRevertedFlag", label: "Reverted flag", section: "Flag types" },
	{ key: "showEditCheckOtherFlag", label: "Reference check flag", section: "Flag types" },
	{ key: "showToneCheckFlag", label: "Tone check flag", section: "Flag types" },
] as const

let moduleInstance: ReturnType<typeof createFeedModule> | null = null

function createFeedModule() {
	const showRevertRiskInFeed = ref(getStoredBoolean(SHOW_REVERT_RISK_KEY, false))
	const showRevertRiskFlags = ref(getStoredBoolean(SHOW_REVERT_RISK_FLAGS_KEY, false))
	const showRevertedFlag = ref(getStoredBoolean(SHOW_REVERTED_FLAG_KEY, false))
	const showOnWatchlistLabel = ref(getStoredBoolean(SHOW_ON_WATCHLIST_LABEL_KEY, false))
	const showRecommendationFlags = ref(getStoredBoolean(SHOW_RECOMMENDATION_FLAGS_KEY, false))
	const showEditCheckOtherFlag = ref(getStoredBoolean(SHOW_EDIT_CHECK_OTHER_FLAG_KEY, false))
	const showToneCheckFlag = ref(getStoredBoolean(SHOW_TONE_CHECK_FLAG_KEY, false))
	const showDebugChecks = ref(getStoredBoolean(SHOW_DEBUG_CHECKS_KEY, false))
	const feedSource = ref<ReviewChangesSource>(getStoredFeedSource())
	const mixedRecentChangesRatio = ref(getStoredRatio(MIXED_RECENT_CHANGES_RATIO_KEY, 60))
	const mixedPagesAndUsersRatio = ref(getStoredRatio(MIXED_PAGES_AND_USERS_RATIO_KEY, 0))
	const mixedPagesAndUsersLatestRatio = ref(
		getStoredRatio(MIXED_PAGES_AND_USERS_LATEST_RATIO_KEY, 20)
	)
	const mixedRelatedChangesRatio = ref(getStoredRatio(MIXED_RELATED_CHANGES_RATIO_KEY, 20))
	const mixedCollaboratorsRatio = ref(getStoredRatio(MIXED_COLLABORATORS_RATIO_KEY, 20))
	const standaloneRecentChangesRatio = ref(
		getStoredRatio(STANDALONE_RECENT_CHANGES_RATIO_KEY, 60)
	)
	const standalonePagesAndUsersRatio = ref(
		getStoredRatio(STANDALONE_PAGES_AND_USERS_RATIO_KEY, 100)
	)
	const standalonePagesAndUsersLatestRatio = ref(
		getStoredRatio(STANDALONE_PAGES_AND_USERS_LATEST_RATIO_KEY, 100)
	)
	const standaloneRelatedChangesRatio = ref(
		getStoredRatio(STANDALONE_RELATED_CHANGES_RATIO_KEY, 100)
	)
	const standaloneCollaboratorsRatio = ref(
		getStoredRatio(STANDALONE_COLLABORATORS_RATIO_KEY, 100)
	)

	const recentChangesRatio = computed(() =>
		feedSource.value === "mixed"
			? mixedRecentChangesRatio.value
			: standaloneRecentChangesRatio.value
	)
	const pagesAndUsersRatio = computed(() =>
		feedSource.value === "mixed"
			? mixedPagesAndUsersRatio.value
			: standalonePagesAndUsersRatio.value
	)
	const pagesAndUsersLatestRatio = computed(() =>
		feedSource.value === "mixed"
			? mixedPagesAndUsersLatestRatio.value
			: standalonePagesAndUsersLatestRatio.value
	)
	const relatedChangesRatio = computed(() =>
		feedSource.value === "mixed"
			? mixedRelatedChangesRatio.value
			: standaloneRelatedChangesRatio.value
	)
	const collaboratorsRatio = computed(() =>
		feedSource.value === "mixed"
			? mixedCollaboratorsRatio.value
			: standaloneCollaboratorsRatio.value
	)

	watch(showRevertRiskInFeed, enabled => {
		try {
			localStorage.setItem(SHOW_REVERT_RISK_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showRevertRiskFlags, enabled => {
		try {
			localStorage.setItem(SHOW_REVERT_RISK_FLAGS_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showRevertedFlag, enabled => {
		try {
			localStorage.setItem(SHOW_REVERTED_FLAG_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showOnWatchlistLabel, enabled => {
		try {
			localStorage.setItem(SHOW_ON_WATCHLIST_LABEL_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showRecommendationFlags, enabled => {
		try {
			localStorage.setItem(SHOW_RECOMMENDATION_FLAGS_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showEditCheckOtherFlag, enabled => {
		try {
			localStorage.setItem(SHOW_EDIT_CHECK_OTHER_FLAG_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showToneCheckFlag, enabled => {
		try {
			localStorage.setItem(SHOW_TONE_CHECK_FLAG_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showDebugChecks, enabled => {
		try {
			localStorage.setItem(SHOW_DEBUG_CHECKS_KEY, String(enabled))
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

	watch(mixedRecentChangesRatio, value => {
		try {
			localStorage.setItem(MIXED_RECENT_CHANGES_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(mixedPagesAndUsersRatio, value => {
		try {
			localStorage.setItem(MIXED_PAGES_AND_USERS_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(mixedPagesAndUsersLatestRatio, value => {
		try {
			localStorage.setItem(MIXED_PAGES_AND_USERS_LATEST_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(mixedRelatedChangesRatio, value => {
		try {
			localStorage.setItem(MIXED_RELATED_CHANGES_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(mixedCollaboratorsRatio, value => {
		try {
			localStorage.setItem(MIXED_COLLABORATORS_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(standaloneRecentChangesRatio, value => {
		try {
			localStorage.setItem(STANDALONE_RECENT_CHANGES_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(standalonePagesAndUsersRatio, value => {
		try {
			localStorage.setItem(STANDALONE_PAGES_AND_USERS_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(standalonePagesAndUsersLatestRatio, value => {
		try {
			localStorage.setItem(STANDALONE_PAGES_AND_USERS_LATEST_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(standaloneRelatedChangesRatio, value => {
		try {
			localStorage.setItem(STANDALONE_RELATED_CHANGES_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})
	watch(standaloneCollaboratorsRatio, value => {
		try {
			localStorage.setItem(STANDALONE_COLLABORATORS_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})

	function resetToDefaults(): void {
		showRevertRiskInFeed.value = false
		showRevertRiskFlags.value = false
		showRevertedFlag.value = false
		showOnWatchlistLabel.value = false
		showRecommendationFlags.value = false
		showEditCheckOtherFlag.value = false
		showToneCheckFlag.value = false
		showDebugChecks.value = false
		feedSource.value = "recentChanges"
		mixedRecentChangesRatio.value = 60
		mixedPagesAndUsersRatio.value = 0
		mixedPagesAndUsersLatestRatio.value = 20
		mixedRelatedChangesRatio.value = 20
		mixedCollaboratorsRatio.value = 20
		standaloneRecentChangesRatio.value = 60
		standalonePagesAndUsersRatio.value = 100
		standalonePagesAndUsersLatestRatio.value = 100
		standaloneRelatedChangesRatio.value = 100
		standaloneCollaboratorsRatio.value = 100
	}

	return {
		feedSource,
		mixedRecentChangesRatio,
		mixedPagesAndUsersRatio,
		mixedPagesAndUsersLatestRatio,
		mixedRelatedChangesRatio,
		mixedCollaboratorsRatio,
		standaloneRecentChangesRatio,
		standalonePagesAndUsersRatio,
		standalonePagesAndUsersLatestRatio,
		standaloneRelatedChangesRatio,
		standaloneCollaboratorsRatio,
		recentChangesRatio,
		pagesAndUsersRatio,
		pagesAndUsersLatestRatio,
		relatedChangesRatio,
		collaboratorsRatio,
		showRevertRiskInFeed,
		showRevertRiskFlags,
		showRevertedFlag,
		showOnWatchlistLabel,
		showRecommendationFlags,
		showEditCheckOtherFlag,
		showToneCheckFlag,
		showDebugChecks,
		sourceOptions,
		feedSourceId,
		recentChangesSliderId,
		pagesAndUsersSliderId,
		pagesAndUsersLatestSliderId,
		relatedChangesSliderId,
		collaboratorsSliderId,
		resetToDefaults,
	}
}

export function useFeedModule() {
	if (!moduleInstance) {
		moduleInstance = createFeedModule()
	}
	return moduleInstance
}
