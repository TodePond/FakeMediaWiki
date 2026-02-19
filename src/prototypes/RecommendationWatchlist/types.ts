import type { Icon } from "@wikimedia/codex-icons"
import type { FWPageHistoryRevision } from "fakewiki/types"

export type UserCategory = "unregistered" | "newcomer" | "learner" | "experienced"

/** Configuration for user type icons and colors */
export interface UserTypeConfig {
	icon: Icon | null
	color: string
}

/** History revision with edit summary rendered as HTML */
export interface HistoryRevisionWithHtml extends FWPageHistoryRevision {
	commentHtml: string
}

/** Rising heart particle state for thanks animation */
export interface RisingHeart {
	id: number
	x: number
	y: number
	type: "thank" | "unthank"
}
