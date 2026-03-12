import type { ReviewChangesSource } from "@/components/ReviewChangesFeed/ReviewChangesFeed.vue"
import { computed, ref, watch } from "vue"

const STORAGE_PREFIX = "review-changes-module-"
const LEGACY_PREFIX = "review-changes-"

const SHOW_REVERT_RISK_KEY = `${STORAGE_PREFIX}show-revert-risk`
const SHOW_REVERT_RISK_FLAGS_KEY = `${STORAGE_PREFIX}show-revert-risk-flags`
const REVERT_RISK_FLAGS_IN_BOX_KEY = `${STORAGE_PREFIX}revert-risk-flags-in-box`
const SHOW_REVERTED_FLAG_KEY = `${STORAGE_PREFIX}show-reverted-flag`
const VERBOSE_FLAGS_KEY = `${STORAGE_PREFIX}verbose-flags`
const SHOW_DELTA_KEY = `${STORAGE_PREFIX}show-delta`
const SHOW_SOURCE_ICONS_KEY = `${STORAGE_PREFIX}show-source-icons`
const SHOW_SOURCE_SUBTITLES_KEY = `${STORAGE_PREFIX}show-source-subtitles`
const SHOW_USERNAME_AT_PREFIX_KEY = `${STORAGE_PREFIX}show-username-at-prefix`
const SHOW_USER_ICON_KEY = `${STORAGE_PREFIX}show-user-icon`
const SUMMARY_CUTOUT_KEY = `${STORAGE_PREFIX}summary-cutout`
const SHOW_MODULE_BORDER_KEY = `${STORAGE_PREFIX}show-module-border`
const LEGACY_HIDE_OUTER_BORDER_KEY = `${LEGACY_PREFIX}hide-outer-border`
const SHOW_REVIEW_BUTTON_KEY = `${STORAGE_PREFIX}show-review-button`
const LEGACY_CARD_AS_LINK_KEY = `${LEGACY_PREFIX}card-as-link`
const SHOW_EMPTY_EDIT_SUMMARY_KEY = `${STORAGE_PREFIX}show-empty-edit-summary`
const LEGACY_HIDE_EMPTY_SUMMARY_KEY = `${LEGACY_PREFIX}hide-empty-summary`
const SHOW_RECOMMENDATION_FLAGS_KEY = `${STORAGE_PREFIX}show-recommendation-flags`
const SHOW_DISMISS_BUTTON_KEY = `${STORAGE_PREFIX}show-dismiss-button`
const SHOW_HIGHLIGHT_UNVIEWED_KEY = `${STORAGE_PREFIX}show-highlight-unviewed`
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
	[SHOW_REVERT_RISK_FLAGS_KEY]: `${STORAGE_PREFIX}show-revert-risk-flags`,
	[REVERT_RISK_FLAGS_IN_BOX_KEY]: `${STORAGE_PREFIX}revert-risk-flags-in-box`,
	[SHOW_REVERTED_FLAG_KEY]: `${STORAGE_PREFIX}show-reverted-flag`,
	[VERBOSE_FLAGS_KEY]: `${STORAGE_PREFIX}verbose-flags`,
	[SHOW_DELTA_KEY]: `${LEGACY_PREFIX}show-delta`,
	[SHOW_SOURCE_ICONS_KEY]: `${LEGACY_PREFIX}show-source-icons`,
	[SHOW_SOURCE_SUBTITLES_KEY]: `${LEGACY_PREFIX}show-source-subtitles`,
	[SHOW_USERNAME_AT_PREFIX_KEY]: `${LEGACY_PREFIX}show-username-at-prefix`,
	[SHOW_USER_ICON_KEY]: `${LEGACY_PREFIX}show-user-icon`,
	[SUMMARY_CUTOUT_KEY]: `${LEGACY_PREFIX}summary-cutout`,
	[SHOW_MODULE_BORDER_KEY]: LEGACY_HIDE_OUTER_BORDER_KEY,
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

function getStoredShowReviewButton(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_REVIEW_BUTTON_KEY)
		if (stored !== null) return stored === "true"
		const legacy = localStorage.getItem(LEGACY_CARD_AS_LINK_KEY)
		if (legacy !== null) {
			const migrated = legacy === "true" ? "false" : "true"
			localStorage.setItem(SHOW_REVIEW_BUTTON_KEY, migrated)
			return migrated === "true"
		}
	} catch {
		// ignore
	}
	return false
}

function getStoredShowEmptyEditSummary(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_EMPTY_EDIT_SUMMARY_KEY)
		if (stored !== null) return stored === "true"
		const legacy = localStorage.getItem(LEGACY_HIDE_EMPTY_SUMMARY_KEY)
		if (legacy !== null) {
			const migrated = legacy === "true" ? "false" : "true"
			localStorage.setItem(SHOW_EMPTY_EDIT_SUMMARY_KEY, migrated)
			return migrated === "true"
		}
	} catch {
		// ignore
	}
	return true
}

function getStoredShowModuleBorder(): boolean {
	try {
		const stored = localStorage.getItem(SHOW_MODULE_BORDER_KEY)
		if (stored !== null) return stored === "true"
		const legacy = localStorage.getItem(LEGACY_HIDE_OUTER_BORDER_KEY)
		if (legacy !== null) {
			const migrated = legacy === "true" ? "false" : "true"
			localStorage.setItem(SHOW_MODULE_BORDER_KEY, migrated)
			return migrated === "true"
		}
	} catch {
		// ignore
	}
	return true
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

/**
 * Single source of truth for prototype setting checkboxes.
 * Add new controls here – they will appear in both ReviewChangesModule and PersonalDashboardClone.
 * Use prototypeOnly: true for controls that only make sense in dashboard context (e.g. Module border).
 * Prototype-only controls are listed at the bottom.
 */
export const REVIEW_CHANGES_CHECKBOX_CONFIG = [
	{ key: "showDelta", label: "Delta" },
	{ key: "showSourceIcons", label: "Source icon" },
	{ key: "showSourceSubtitles", label: "Source subtitle" },
	{ key: "showRecommendationFlags", label: "Recommendation flags" },
	{ key: "showRevertRiskInFeed", label: "Debug revert risk" },
	{ key: "showRevertRiskFlags", label: "Revert risk flags" },
	{ key: "revertRiskFlagsInBox", label: "Flags in box" },
	{ key: "verboseFlags", label: "Verbose flags" },
	{ key: "showRevertedFlag", label: "Reverted flag" },
	{ key: "showUsernameAtPrefix", label: "@ username" },
	{ key: "showUserIcon", label: "User icon" },
	{ key: "summaryCutout", label: "Cutout" },
	{ key: "showEmptyEditSummary", label: "Empty edit summary" },
	{ key: "showReviewButton", label: "Review button" },
	{ key: "showDismissButton", label: "Dismiss button" },
	{ key: "showHighlightUnviewed", label: "Highlight unviewed" },
	{ key: "showModuleBorder", label: "Module border", prototypeOnly: true },
] as const

let moduleInstance: ReturnType<typeof createReviewChangesModule> | null = null

function createReviewChangesModule() {
	const showRevertRiskInFeed = ref(
		getStoredBoolean(SHOW_REVERT_RISK_KEY, LEGACY_KEYS[SHOW_REVERT_RISK_KEY], false)
	)
	const showRevertRiskFlags = ref(
		getStoredBoolean(SHOW_REVERT_RISK_FLAGS_KEY, LEGACY_KEYS[SHOW_REVERT_RISK_FLAGS_KEY], false)
	)
	const revertRiskFlagsInBox = ref(
		getStoredBoolean(REVERT_RISK_FLAGS_IN_BOX_KEY, LEGACY_KEYS[REVERT_RISK_FLAGS_IN_BOX_KEY], true)
	)
	const showRevertedFlag = ref(
		getStoredBoolean(SHOW_REVERTED_FLAG_KEY, LEGACY_KEYS[SHOW_REVERTED_FLAG_KEY], false)
	)
	const verboseFlags = ref(
		getStoredBoolean(VERBOSE_FLAGS_KEY, LEGACY_KEYS[VERBOSE_FLAGS_KEY], false)
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
		getStoredBoolean(SUMMARY_CUTOUT_KEY, LEGACY_KEYS[SUMMARY_CUTOUT_KEY], false)
	)
	const showModuleBorder = ref(getStoredShowModuleBorder())
	const showReviewButton = ref(getStoredShowReviewButton())
	const showEmptyEditSummary = ref(getStoredShowEmptyEditSummary())
	const showRecommendationFlags = ref(
		getStoredBoolean(SHOW_RECOMMENDATION_FLAGS_KEY, SHOW_RECOMMENDATION_FLAGS_KEY, false)
	)
	const showDismissButton = ref(
		getStoredBoolean(SHOW_DISMISS_BUTTON_KEY, SHOW_DISMISS_BUTTON_KEY, false)
	)
	const showHighlightUnviewed = ref(
		getStoredBoolean(SHOW_HIGHLIGHT_UNVIEWED_KEY, SHOW_HIGHLIGHT_UNVIEWED_KEY, false)
	)
	const feedSource = ref<ReviewChangesSource>(getStoredFeedSource())
	const mixedRecentChangesRatio = ref(
		getStoredRatio(
			MIXED_RECENT_CHANGES_RATIO_KEY,
			LEGACY_KEYS[MIXED_RECENT_CHANGES_RATIO_KEY],
			60
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
			60
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

	watch(showRevertRiskFlags, enabled => {
		try {
			localStorage.setItem(SHOW_REVERT_RISK_FLAGS_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(revertRiskFlagsInBox, enabled => {
		try {
			localStorage.setItem(REVERT_RISK_FLAGS_IN_BOX_KEY, String(enabled))
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

	watch(verboseFlags, enabled => {
		try {
			localStorage.setItem(VERBOSE_FLAGS_KEY, String(enabled))
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

	watch(showModuleBorder, enabled => {
		try {
			localStorage.setItem(SHOW_MODULE_BORDER_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showReviewButton, enabled => {
		try {
			localStorage.setItem(SHOW_REVIEW_BUTTON_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showEmptyEditSummary, enabled => {
		try {
			localStorage.setItem(SHOW_EMPTY_EDIT_SUMMARY_KEY, String(enabled))
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

	watch(showDismissButton, enabled => {
		try {
			localStorage.setItem(SHOW_DISMISS_BUTTON_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showHighlightUnviewed, enabled => {
		try {
			localStorage.setItem(SHOW_HIGHLIGHT_UNVIEWED_KEY, String(enabled))
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

	function resetToDefaults(): void {
		showRevertRiskInFeed.value = false
		showRevertRiskFlags.value = false
		revertRiskFlagsInBox.value = true
		showRevertedFlag.value = false
		verboseFlags.value = false
		showDelta.value = true
		showSourceIcons.value = false
		showSourceSubtitles.value = false
		showUsernameAtPrefix.value = false
		showUserIcon.value = false
		summaryCutout.value = false
		showModuleBorder.value = true
		showReviewButton.value = false
		showEmptyEditSummary.value = true
		showRecommendationFlags.value = false
		showDismissButton.value = false
		showHighlightUnviewed.value = false
		feedSource.value = "recentChanges"
		mixedRecentChangesRatio.value = 60
		mixedPagesAndUsersRatio.value = 20
		mixedRelatedChangesRatio.value = 20
		mixedCollaboratorsRatio.value = 20
		standaloneRecentChangesRatio.value = 60
		standalonePagesAndUsersRatio.value = 100
		standaloneRelatedChangesRatio.value = 100
		standaloneCollaboratorsRatio.value = 100
	}

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
		showRevertRiskFlags,
		revertRiskFlagsInBox,
		verboseFlags,
		showRevertedFlag,
		showDelta,
		showSourceIcons,
		showSourceSubtitles,
		showUsernameAtPrefix,
		showUserIcon,
		summaryCutout,
		showModuleBorder,
		showReviewButton,
		showDismissButton,
		showHighlightUnviewed,
		showEmptyEditSummary,
		showRecommendationFlags,
		sourceOptions,
		reviewChangesSourceId,
		recentChangesSliderId,
		pagesAndUsersSliderId,
		relatedChangesSliderId,
		collaboratorsSliderId,
		resetToDefaults,
	}
}

export function useReviewChangesModule() {
	if (!moduleInstance) {
		moduleInstance = createReviewChangesModule()
	}
	return moduleInstance
}
