import type { Icon } from "@wikimedia/codex-icons"
import type { FWUserCategory } from "../types"

/** User experience category (alias for FWUserCategory). */
export type UserCategory = FWUserCategory

/** Configuration for user type icons and colors in watchlist-style prototypes. */
export interface UserTypeConfig {
	icon: Icon | null
	color: string
}
