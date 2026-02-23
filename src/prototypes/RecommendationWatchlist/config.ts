import { cdxIconHeart, cdxIconUnStar } from "@wikimedia/codex-icons"
import type { UserCategory, UserTypeConfig } from "./types"

export const PROTOTYPE_NAME = "RecommendationWatchlist"
export const HEART_RISE_DURATION_MS = 2500

/** Insert one recommendation revision every N main feed entries. */
export const RECOMMENDATION_INTERVAL = 5
/** Language code for getMultiPageListBuilding (seed pages from watchlist). */
export const RECOMMENDATION_LANG = "en"
/** Max recommended pages to fetch history for (avoids too many parallel requests). */
export const RECOMMENDATION_MAX_PAGES = 12
/** Concurrency for getPageHistory when loading recommendation revisions. */
export const RECOMMENDATION_HISTORY_CONCURRENCY = 2
/** Concurrency for processing revisions (summary HTML, user category). */
export const RECOMMENDATION_PROCESS_CONCURRENCY = 3

export const defaultPageSearchQueries = [
	"Little Mix",
	"Wet Leg",
	"Wolf Alice",
	"Jade Thirlwall",
	"Confidence Man (band)",
	"PinkPantheress",
	"Rizzle Kicks",
]

export const defaultUserSearchQueries = ["Samwalton9", "Todepond", "Humbugtheman"]

/** User type display configuration */
export const userTypeConfig: Record<UserCategory, UserTypeConfig> = {
	unregistered: {
		icon: null, // No icon for unregistered users
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
