import { ref } from "vue"
import { userTypeConfig } from "./config"
import type { UserCategory, UserTypeConfig } from "./types"

export function useUser() {
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
