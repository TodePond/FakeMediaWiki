import { ref } from "vue"
import { cdxIconHeart, cdxIconUnStar } from "@wikimedia/codex-icons"
import type { UserCategory, UserTypeConfig } from "./types"

/** Default user type display configuration for watchlist-style prototypes. */
export const defaultUserTypeConfig: Record<UserCategory, UserTypeConfig> = {
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

export interface UseUserOptions {
	userTypeConfig?: Record<UserCategory, UserTypeConfig>
}

export function useUser(options?: UseUserOptions) {
	const userTypeConfig = options?.userTypeConfig ?? defaultUserTypeConfig

	/** Cache of user categories by username for reactive UI reads */
	const userCategories = ref<Map<string, UserCategory>>(new Map())

	function cacheUserCategory(userName: string, category: UserCategory): void {
		userCategories.value = new Map(userCategories.value).set(userName, category)
	}

	function getCachedUserCategory(userName: string): UserCategory | null {
		return userCategories.value.get(userName) ?? null
	}

	function getUserTypeConfig(userName: string): UserTypeConfig | null {
		const category = getCachedUserCategory(userName)
		return category ? userTypeConfig[category] : null
	}

	return {
		userCategories,
		cacheUserCategory,
		getCachedUserCategory,
		getUserTypeConfig,
	}
}
