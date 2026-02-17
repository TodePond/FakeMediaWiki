import { cdxIconHeart, cdxIconUnStar } from "@wikimedia/codex-icons"
import type { UserCategory, UserTypeConfig } from "./types"

export const PROTOTYPE_NAME = "FlaggedWatchlist"
export const HEART_RISE_DURATION_MS = 2500

export const defaultPageSearchQueries = [
	"Wikipedia",
	"Wet Leg",
	"Water",
	"Confidence Man (band)",
	"Algorave",
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
