import type { ReviewChangesSource } from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { computed, ref, watch } from "vue"

const STORAGE_PREFIX = "review-changes-module-"
const LEGACY_PREFIX = "review-changes-"

const SHOW_REVERT_RISK_KEY = `${STORAGE_PREFIX}show-revert-risk`
const SHOW_DELTA_KEY = `${STORAGE_PREFIX}show-delta`
const SHOW_SOURCE_ICONS_KEY = `${STORAGE_PREFIX}show-source-icons`
const SHOW_SOURCE_SUBTITLES_KEY = `${STORAGE_PREFIX}show-source-subtitles`
const SHOW_USERNAME_AT_PREFIX_KEY = `${STORAGE_PREFIX}show-username-at-prefix`
const SHOW_USER_ICON_KEY = `${STORAGE_PREFIX}show-user-icon`
const SUMMARY_CUTOUT_KEY = `${STORAGE_PREFIX}summary-cutout`
const FEED_SOURCE_KEY = `${STORAGE_PREFIX}feed-source`
const MIXED_RECENT_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}mixed-recent-changes-ratio`
const MIXED_PAGES_AND_USERS_RATIO_KEY = `${STORAGE_PREFIX}mixed-pages-and-users-ratio`
const MIXED_RELATED_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}mixed-related-changes-ratio`
const MIXED_COLLABORATORS_RATIO_KEY = `${STORAGE_PREFIX}mixed-collaborators-ratio-v2`
const STANDALONE_RECENT_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}standalone-recent-changes-ratio`
const STANDALONE_PAGES_AND_USERS_RATIO_KEY = `${STORAGE_PREFIX}standalone-pages-and-users-ratio`
const STANDALONE_RELATED_CHANGES_RATIO_KEY = `${STORAGE_PREFIX}standalone-related-changes-ratio`
const STANDALONE_COLLABORATORS_RATIO_KEY = `${STORAGE_PREFIX}standalone-collaborators-ratio-v2`

const LEGACY_KEYS: Record<string, string> = {
	[SHOW_REVERT_RISK_KEY]: `${LEGACY_PREFIX}show-revert-risk`,
	[SHOW_DELTA_KEY]: `${LEGACY_PREFIX}show-delta`,
	[SHOW_SOURCE_ICONS_KEY]: `${LEGACY_PREFIX}show-source-icons`,
	[SHOW_SOURCE_SUBTITLES_KEY]: `${LEGACY_PREFIX}show-source-subtitles`,
	[SHOW_USERNAME_AT_PREFIX_KEY]: `${LEGACY_PREFIX}show-username-at-prefix`,
	[SHOW_USER_ICON_KEY]: `${LEGACY_PREFIX}show-user-icon`,
	[SUMMARY_CUTOUT_KEY]: `${LEGACY_PREFIX}summary-cutout`,
	[FEED_SOURCE_KEY]: `${LEGACY_PREFIX}feed-source`,
	[MIXED_RECENT_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}recent-changes-ratio`,
	[MIXED_PAGES_AND_USERS_RATIO_KEY]: `${LEGACY_PREFIX}pages-and-users-ratio`,
	[MIXED_RELATED_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}related-changes-ratio`,
	[STANDALONE_RECENT_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}standalone-recent-changes-ratio`,
	[STANDALONE_PAGES_AND_USERS_RATIO_KEY]: `${LEGACY_PREFIX}standalone-pages-and-users-ratio`,
	[STANDALONE_RELATED_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}standalone-related-changes-ratio`,
	[MIXED_COLLABORATORS_RATIO_KEY]: `${STORAGE_PREFIX}mixed-collaborators-ratio`,
	[STANDALONE_COLLABORATORS_RATIO_KEY]: `${STORAGE_PREFIX}standalone-collaborators-ratio`,
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
		stored === "relatedChanges" ||
		stored === "collaborators"
	) {
		return stored
	}
	return "recentChanges"
}

export const sourceOptions: Array<{
	value: "recentChanges" | "pagesAndUsers" | "mixed" | "relatedChanges" | "collaborators"
	label: string
}> = [
	{ value: "recentChanges", label: "Recent changes" },
	{ value: "pagesAndUsers", label: "Watchlist" },
	{ value: "collaborators", label: "Collaborators" },
	{ value: "relatedChanges", label: "Related changes" },
	{ value: "mixed", label: "Mixed" },
]

export const reviewChangesSourceId = "review-changes-module-source"
export const recentChangesSliderId = "review-changes-module-recent-slider"
export const pagesAndUsersSliderId = "review-changes-module-pages-slider"
export const relatedChangesSliderId = "review-changes-module-related-slider"
export const collaboratorsSliderId = "review-changes-module-collaborators-slider"

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
	const showUsernameAtPrefix = ref(
		getStoredBoolean(SHOW_USERNAME_AT_PREFIX_KEY, LEGACY_KEYS[SHOW_USERNAME_AT_PREFIX_KEY], false)
	)
	const showUserIcon = ref(
		getStoredBoolean(SHOW_USER_ICON_KEY, LEGACY_KEYS[SHOW_USER_ICON_KEY], false)
	)
	const summaryCutout = ref(
		getStoredBoolean(SUMMARY_CUTOUT_KEY, LEGACY_KEYS[SUMMARY_CUTOUT_KEY], true)
	)
	const feedSource = ref<ReviewChangesSource>(getStoredFeedSource())
	const mixedRecentChangesRatio = ref(
		getStoredRatio(
			MIXED_RECENT_CHANGES_RATIO_KEY,
			LEGACY_KEYS[MIXED_RECENT_CHANGES_RATIO_KEY],
			20
		)
	)
	const mixedPagesAndUsersRatio = ref(
		getStoredRatio(
			MIXED_PAGES_AND_USERS_RATIO_KEY,
			LEGACY_KEYS[MIXED_PAGES_AND_USERS_RATIO_KEY],
			20
		)
	)
	const mixedRelatedChangesRatio = ref(
		getStoredRatio(
			MIXED_RELATED_CHANGES_RATIO_KEY,
			LEGACY_KEYS[MIXED_RELATED_CHANGES_RATIO_KEY],
			20
		)
	)
	const mixedCollaboratorsRatio = ref(
		getStoredRatio(
			MIXED_COLLABORATORS_RATIO_KEY,
			LEGACY_KEYS[MIXED_COLLABORATORS_RATIO_KEY],
			20
		)
	)
	const standaloneRecentChangesRatio = ref(
		getStoredRatio(
			STANDALONE_RECENT_CHANGES_RATIO_KEY,
			LEGACY_KEYS[STANDALONE_RECENT_CHANGES_RATIO_KEY],
			100
		)
	)
	const standalonePagesAndUsersRatio = ref(
		getStoredRatio(
			STANDALONE_PAGES_AND_USERS_RATIO_KEY,
			LEGACY_KEYS[STANDALONE_PAGES_AND_USERS_RATIO_KEY],
			100
		)
	)
	const standaloneRelatedChangesRatio = ref(
		getStoredRatio(
			STANDALONE_RELATED_CHANGES_RATIO_KEY,
			LEGACY_KEYS[STANDALONE_RELATED_CHANGES_RATIO_KEY],
			100
		)
	)
	const standaloneCollaboratorsRatio = ref(
		getStoredRatio(
			STANDALONE_COLLABORATORS_RATIO_KEY,
			LEGACY_KEYS[STANDALONE_COLLABORATORS_RATIO_KEY],
			100
		)
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

	watch(showUsernameAtPrefix, enabled => {
		try {
			localStorage.setItem(SHOW_USERNAME_AT_PREFIX_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showUserIcon, enabled => {
		try {
			localStorage.setItem(SHOW_USER_ICON_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(summaryCutout, enabled => {
		try {
			localStorage.setItem(SUMMARY_CUTOUT_KEY, String(enabled))
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
	watch(mixedRelatedChangesRatio, value => {
		try {
			localStorage.setItem(MIXED_RELATED_CHANGES_RATIO_KEY, String(value))
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
	watch(standaloneRelatedChangesRatio, value => {
		try {
			localStorage.setItem(STANDALONE_RELATED_CHANGES_RATIO_KEY, String(value))
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
	watch(standaloneCollaboratorsRatio, value => {
		try {
			localStorage.setItem(STANDALONE_COLLABORATORS_RATIO_KEY, String(value))
		} catch {
			// ignore
		}
	})

	return {
		feedSource,
		mixedRecentChangesRatio,
		mixedPagesAndUsersRatio,
		mixedRelatedChangesRatio,
		mixedCollaboratorsRatio,
		standaloneRecentChangesRatio,
		standalonePagesAndUsersRatio,
		standaloneRelatedChangesRatio,
		standaloneCollaboratorsRatio,
		recentChangesRatio,
		pagesAndUsersRatio,
		relatedChangesRatio,
		collaboratorsRatio,
		showRevertRiskInFeed,
		showDelta,
		showSourceIcons,
		showSourceSubtitles,
		showUsernameAtPrefix,
		showUserIcon,
		summaryCutout,
		sourceOptions,
		reviewChangesSourceId,
		recentChangesSliderId,
		pagesAndUsersSliderId,
		relatedChangesSliderId,
		collaboratorsSliderId,
	}
}
