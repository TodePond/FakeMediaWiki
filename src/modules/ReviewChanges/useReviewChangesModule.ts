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
const SHOW_EDIT_CHECK_TONE_FLAG_KEY = `${STORAGE_PREFIX}show-edit-check-tone-flag`
const SHOW_EDIT_CHECK_PASTE_FLAG_KEY = `${STORAGE_PREFIX}show-edit-check-paste-flag`
const SHOW_EDIT_CHECK_OTHER_FLAG_KEY = `${STORAGE_PREFIX}show-edit-check-other-flag`
const SHOW_DISMISS_BUTTON_KEY = `${STORAGE_PREFIX}show-dismiss-button`
const SHOW_HIGHLIGHT_UNVIEWED_KEY = `${STORAGE_PREFIX}show-highlight-unviewed`
const SHOW_UNVIEWED_BORDER_KEY = `${STORAGE_PREFIX}show-unviewed-border`
const SHOW_VIEWED_BORDER_KEY = `${STORAGE_PREFIX}show-viewed-border`
const SHOW_LAST_CLICKED_HIGHLIGHT_KEY = `${STORAGE_PREFIX}show-last-clicked-highlight`
const SHOW_ARROW_IN_TOP_RIGHT_KEY = `${STORAGE_PREFIX}show-arrow-in-top-right`
const SHOW_SHORT_DESCRIPTION_KEY = `${STORAGE_PREFIX}show-short-description`
const SHOW_SHORT_DESCRIPTION_SEPARATOR_KEY = `${STORAGE_PREFIX}show-short-description-separator`
const FLAGS_BELOW_USERNAME_KEY = `${STORAGE_PREFIX}flags-below-username`
const SIMPLIFIED_TIMESTAMP_KEY = `${STORAGE_PREFIX}simplified-timestamp`
const TIMESTAMP_POSITION_KEY = `${STORAGE_PREFIX}timestamp-position`
const LEGACY_TIMESTAMP_RIGHT_OF_USERNAME_KEY = `${STORAGE_PREFIX}timestamp-right-of-username`
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
	[MIXED_PAGES_AND_USERS_LATEST_RATIO_KEY]: `${STORAGE_PREFIX}mixed-pages-and-users-latest-ratio`,
	[MIXED_RELATED_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}related-changes-ratio`,
	[STANDALONE_RECENT_CHANGES_RATIO_KEY]: `${LEGACY_PREFIX}standalone-recent-changes-ratio`,
	[STANDALONE_PAGES_AND_USERS_RATIO_KEY]: `${LEGACY_PREFIX}standalone-pages-and-users-ratio`,
	[STANDALONE_PAGES_AND_USERS_LATEST_RATIO_KEY]: `${STORAGE_PREFIX}standalone-pages-and-users-latest-ratio`,
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
	{ value: "recentChanges", label: "Recent changes" },
	{ value: "pagesAndUsers", label: "Watchlist" },
	{ value: "pagesAndUsersLatest", label: "Watchlist (latest revision)" },
	{ value: "collaborators", label: "Mentor" },
	{ value: "relatedChanges", label: "Related changes" },
	{ value: "mixed", label: "Mixed" },
]

export const reviewChangesSourceId = "review-changes-module-source"
export const recentChangesSliderId = "review-changes-module-recent-slider"
export const pagesAndUsersSliderId = "review-changes-module-pages-slider"
export const pagesAndUsersLatestSliderId = "review-changes-module-pages-latest-slider"
export const relatedChangesSliderId = "review-changes-module-related-slider"
export const collaboratorsSliderId = "review-changes-module-collaborators-slider"
export const timestampPositionId = "review-changes-module-timestamp-position"

export type TimestampPosition = "topRight" | "rightOfUsername" | "belowUsername"

export const timestampPositionOptions: Array<{ value: TimestampPosition; label: string }> = [
	{ value: "topRight", label: "Top-right" },
	{ value: "rightOfUsername", label: "Right of username" },
	{ value: "belowUsername", label: "Below username" },
]

function getStoredTimestampPosition(): TimestampPosition {
	try {
		const stored = localStorage.getItem(TIMESTAMP_POSITION_KEY)
		if (stored !== null) {
			if (
				stored === "topRight" ||
				stored === "rightOfUsername" ||
				stored === "belowUsername"
			) {
				return stored
			}
		}
		const legacy = localStorage.getItem(LEGACY_TIMESTAMP_RIGHT_OF_USERNAME_KEY)
		if (legacy !== null) {
			const migrated = legacy === "true" ? "rightOfUsername" : "topRight"
			localStorage.setItem(TIMESTAMP_POSITION_KEY, migrated)
			return migrated
		}
	} catch {
		// ignore
	}
	return "rightOfUsername"
}

/**
 * Single source of truth for prototype setting checkboxes.
 * Add new controls here – they will appear in both ReviewChangesModule and PersonalDashboardClone.
 * Use prototypeOnly: true for controls that only make sense in dashboard context (e.g. Module border).
 * Use section to group related controls under a titled header.
 */
export const REVIEW_CHANGES_CHECKBOX_CONFIG = [
	{ key: "showDelta", label: "Delta", section: "Structured information" },
	{ key: "showShortDescription", label: "Short description", section: "Structured information" },
	{ key: "showShortDescriptionSeparator", label: "Short description separator", section: "Structured information" },
	{ key: "showSourceIcons", label: "Source icon", section: "Source" },
	{ key: "showSourceSubtitles", label: "Source subtitle", section: "Source" },
	{ key: "showRevertRiskInFeed", label: "Debug revert risk", section: "Flag types" },
	{ key: "showRevertRiskFlags", label: "Revert risk flags", section: "Flag types" },
	{ key: "showRecommendationFlags", label: "Recommendation flags", section: "Flag types" },
	{ key: "showRevertedFlag", label: "Reverted flag", section: "Flag types" },
	{ key: "showEditCheckToneFlag", label: "Tone check flag", section: "Flag types" },
	{ key: "showEditCheckPasteFlag", label: "Paste check flag", section: "Flag types" },
	{ key: "showEditCheckOtherFlag", label: "Reference check flag", section: "Flag types" },
	{ key: "revertRiskFlagsInBox", label: "Flags in box", section: "Flag appearance" },
	{ key: "verboseFlags", label: "Verbose flags", section: "Flag appearance" },
	{ key: "showUsernameAtPrefix", label: "@ username", section: "User" },
	{ key: "showUserIcon", label: "User icon", section: "User" },
	{ key: "flagsBelowUsername", label: "Flags below username", section: "User" },
	{ key: "simplifiedTimestamp", label: "Simplified timestamp", section: "Timestamp" },
	{ key: "summaryCutout", label: "Cutout", section: "Edit summary" },
	{ key: "showEmptyEditSummary", label: "Empty edit summary", section: "Edit summary" },
	{ key: "showReviewButton", label: "Open button", section: "Actions" },
	{ key: "showArrowInTopRight", label: "Arrow", section: "Actions" },
	{ key: "showDismissButton", label: "Dismiss button", section: "Actions" },
	{ key: "showHighlightUnviewed", label: "Unopened highlight", section: "Open state" },
	{ key: "showUnviewedBorder", label: "Unopened border", section: "Open state" },
	{ key: "showViewedBorder", label: "Last opened border", section: "Open state" },
	{ key: "showLastClickedHighlight", label: "Last opened highlight", section: "Open state" },
	{ key: "showModuleBorder", label: "Module border", section: "Module", prototypeOnly: true },
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
		getStoredBoolean(
			REVERT_RISK_FLAGS_IN_BOX_KEY,
			LEGACY_KEYS[REVERT_RISK_FLAGS_IN_BOX_KEY],
			true
		)
	)
	const showRevertedFlag = ref(
		getStoredBoolean(SHOW_REVERTED_FLAG_KEY, LEGACY_KEYS[SHOW_REVERTED_FLAG_KEY], false)
	)
	const verboseFlags = ref(
		getStoredBoolean(VERBOSE_FLAGS_KEY, LEGACY_KEYS[VERBOSE_FLAGS_KEY], false)
	)
	const showDelta = ref(getStoredBoolean(SHOW_DELTA_KEY, LEGACY_KEYS[SHOW_DELTA_KEY], true))
	const showShortDescription = ref(
		getStoredBoolean(SHOW_SHORT_DESCRIPTION_KEY, SHOW_SHORT_DESCRIPTION_KEY, true)
	)
	const showShortDescriptionSeparator = ref(
		getStoredBoolean(SHOW_SHORT_DESCRIPTION_SEPARATOR_KEY, SHOW_SHORT_DESCRIPTION_SEPARATOR_KEY, true)
	)
	const showSourceIcons = ref(
		getStoredBoolean(SHOW_SOURCE_ICONS_KEY, LEGACY_KEYS[SHOW_SOURCE_ICONS_KEY], false)
	)
	const showSourceSubtitles = ref(
		getStoredBoolean(SHOW_SOURCE_SUBTITLES_KEY, LEGACY_KEYS[SHOW_SOURCE_SUBTITLES_KEY], false)
	)
	const showUsernameAtPrefix = ref(
		getStoredBoolean(
			SHOW_USERNAME_AT_PREFIX_KEY,
			LEGACY_KEYS[SHOW_USERNAME_AT_PREFIX_KEY],
			false
		)
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
	const showEditCheckToneFlag = ref(
		getStoredBoolean(SHOW_EDIT_CHECK_TONE_FLAG_KEY, SHOW_EDIT_CHECK_TONE_FLAG_KEY, false)
	)
	const showEditCheckPasteFlag = ref(
		getStoredBoolean(SHOW_EDIT_CHECK_PASTE_FLAG_KEY, SHOW_EDIT_CHECK_PASTE_FLAG_KEY, false)
	)
	const showEditCheckOtherFlag = ref(
		getStoredBoolean(SHOW_EDIT_CHECK_OTHER_FLAG_KEY, SHOW_EDIT_CHECK_OTHER_FLAG_KEY, false)
	)
	const showDismissButton = ref(
		getStoredBoolean(SHOW_DISMISS_BUTTON_KEY, SHOW_DISMISS_BUTTON_KEY, false)
	)
	const showHighlightUnviewed = ref(
		getStoredBoolean(SHOW_HIGHLIGHT_UNVIEWED_KEY, SHOW_HIGHLIGHT_UNVIEWED_KEY, false)
	)
	const showUnviewedBorder = ref(
		getStoredBoolean(SHOW_UNVIEWED_BORDER_KEY, SHOW_UNVIEWED_BORDER_KEY, false)
	)
	const showViewedBorder = ref(
		getStoredBoolean(SHOW_VIEWED_BORDER_KEY, SHOW_VIEWED_BORDER_KEY, false)
	)
	const showLastClickedHighlight = ref(
		getStoredBoolean(SHOW_LAST_CLICKED_HIGHLIGHT_KEY, SHOW_LAST_CLICKED_HIGHLIGHT_KEY, false)
	)
	const showArrowInTopRight = ref(
		getStoredBoolean(SHOW_ARROW_IN_TOP_RIGHT_KEY, SHOW_ARROW_IN_TOP_RIGHT_KEY, false)
	)
	const flagsBelowUsername = ref(
		getStoredBoolean(FLAGS_BELOW_USERNAME_KEY, FLAGS_BELOW_USERNAME_KEY, true)
	)
	const simplifiedTimestamp = ref(
		getStoredBoolean(SIMPLIFIED_TIMESTAMP_KEY, SIMPLIFIED_TIMESTAMP_KEY, false)
	)
	const timestampPosition = ref<TimestampPosition>(getStoredTimestampPosition())
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
			0
		)
	)
	const mixedPagesAndUsersLatestRatio = ref(
		getStoredRatio(
			MIXED_PAGES_AND_USERS_LATEST_RATIO_KEY,
			LEGACY_KEYS[MIXED_PAGES_AND_USERS_LATEST_RATIO_KEY],
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
	const standalonePagesAndUsersLatestRatio = ref(
		getStoredRatio(
			STANDALONE_PAGES_AND_USERS_LATEST_RATIO_KEY,
			LEGACY_KEYS[STANDALONE_PAGES_AND_USERS_LATEST_RATIO_KEY],
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

	watch(showShortDescription, enabled => {
		try {
			localStorage.setItem(SHOW_SHORT_DESCRIPTION_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showShortDescriptionSeparator, enabled => {
		try {
			localStorage.setItem(SHOW_SHORT_DESCRIPTION_SEPARATOR_KEY, String(enabled))
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

	watch(showEditCheckToneFlag, enabled => {
		try {
			localStorage.setItem(SHOW_EDIT_CHECK_TONE_FLAG_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showEditCheckPasteFlag, enabled => {
		try {
			localStorage.setItem(SHOW_EDIT_CHECK_PASTE_FLAG_KEY, String(enabled))
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

	watch(showUnviewedBorder, enabled => {
		try {
			localStorage.setItem(SHOW_UNVIEWED_BORDER_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showViewedBorder, enabled => {
		try {
			localStorage.setItem(SHOW_VIEWED_BORDER_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showLastClickedHighlight, enabled => {
		try {
			localStorage.setItem(SHOW_LAST_CLICKED_HIGHLIGHT_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(showArrowInTopRight, enabled => {
		try {
			localStorage.setItem(SHOW_ARROW_IN_TOP_RIGHT_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(flagsBelowUsername, enabled => {
		try {
			localStorage.setItem(FLAGS_BELOW_USERNAME_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(simplifiedTimestamp, enabled => {
		try {
			localStorage.setItem(SIMPLIFIED_TIMESTAMP_KEY, String(enabled))
		} catch {
			// ignore
		}
	})

	watch(timestampPosition, value => {
		try {
			localStorage.setItem(TIMESTAMP_POSITION_KEY, value)
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
		showShortDescription.value = true
		showShortDescriptionSeparator.value = true
		showSourceIcons.value = false
		showSourceSubtitles.value = false
		showUsernameAtPrefix.value = false
		showUserIcon.value = false
		summaryCutout.value = false
		showModuleBorder.value = true
		showReviewButton.value = false
		showEmptyEditSummary.value = true
		showRecommendationFlags.value = false
		showEditCheckToneFlag.value = false
		showEditCheckPasteFlag.value = false
		showEditCheckOtherFlag.value = false
		showDismissButton.value = false
		showHighlightUnviewed.value = false
		showUnviewedBorder.value = false
		showViewedBorder.value = false
		showLastClickedHighlight.value = false
		showArrowInTopRight.value = false
		flagsBelowUsername.value = true
		simplifiedTimestamp.value = false
		timestampPosition.value = "rightOfUsername"
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
		revertRiskFlagsInBox,
		verboseFlags,
		showRevertedFlag,
		showDelta,
		showShortDescription,
		showShortDescriptionSeparator,
		showSourceIcons,
		showSourceSubtitles,
		showUsernameAtPrefix,
		showUserIcon,
		summaryCutout,
		showModuleBorder,
		showReviewButton,
		showDismissButton,
		showHighlightUnviewed,
		showUnviewedBorder,
		showViewedBorder,
		showLastClickedHighlight,
		showArrowInTopRight,
		flagsBelowUsername,
		simplifiedTimestamp,
		timestampPosition,
		showEmptyEditSummary,
		showRecommendationFlags,
		showEditCheckToneFlag,
		showEditCheckPasteFlag,
		showEditCheckOtherFlag,
		sourceOptions,
		reviewChangesSourceId,
		recentChangesSliderId,
		pagesAndUsersSliderId,
		pagesAndUsersLatestSliderId,
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
