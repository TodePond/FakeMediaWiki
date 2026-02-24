import { cdxIconHeart, cdxIconUnStar } from "@wikimedia/codex-icons"
import type { UserCategory, UserTypeConfig } from "./types"

export const PROTOTYPE_NAME = "RelatedRecommendations"

/** Duration for thank heart animation (ms). */
export const HEART_RISE_DURATION_MS = 2500

/** User type display configuration */
export const userTypeConfig: Record<UserCategory, UserTypeConfig> = {
	unregistered: {
		icon: null,
		color: "var(--color-subtle)",
	},
	newcomer: {
		icon: cdxIconHeart,
		color: "var(--green400)",
	},
	learner: {
		icon: null,
		color: "var(--yellow400)",
	},
	experienced: {
		icon: cdxIconUnStar,
		color: "var(--yellow400)",
	},
}

/** Default "keep top N%" for getTopRelatedPages (debug slider). */
export const DEFAULT_TOP_PERCENT = 2

/** Max recommended pages to fetch history for. */
export const RECOMMENDATION_MAX_PAGES = 12

/** Number of revisions to fetch per recommended page (same order of magnitude as watchlist). */
export const RECOMMENDATION_HISTORY_LIMIT = 20

/** Concurrency for getPageHistory when loading recommendation revisions. */
export const RECOMMENDATION_HISTORY_CONCURRENCY = 2

/** Concurrency for processing revisions (summary HTML, user category). */
export const RECOMMENDATION_PROCESS_CONCURRENCY = 3
