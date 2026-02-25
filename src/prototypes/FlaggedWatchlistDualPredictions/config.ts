import { cdxIconHeart, cdxIconUnStar } from "@wikimedia/codex-icons"
import type { UserCategory, UserTypeConfig } from "./types"

export const PROTOTYPE_NAME = "FlaggedWatchlistDualPredictions"
export const HEART_RISE_DURATION_MS = 2500

export const defaultPageSearchQueries = [
	"Wikipedia",
	"Wet Leg",
	"Jade Thirlwall",
	"Jools Holland",
	"Rizzle Kicks",
	"Water",
	"Confidence Man (band)",
	"Algorave",
]

export const defaultUserSearchQueries = ["Todepond", "Samwalton9"]

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
