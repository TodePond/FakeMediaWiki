import type { FWUserCategory, FWUserTypeConfig } from "fakewiki/types"
import type { FakeWiki } from "fakewiki"

/**
 * Thin wrapper that returns getUserCategoryDisplay (async) and getCachedUserCategoryDisplay (sync) from the given FakeWiki instance.
 * In templates where the feed has already loaded (and populated the user category cache), use getCachedUserCategoryDisplay for synchronous access.
 * Use getUserCategoryDisplay when you need to ensure the user is loaded (e.g. await in script).
 * @param wiki - `FakeWiki` instance
 * @param options - Optional `userTypeConfig` override map for display icons and colors
 * @example
 * ```ts
 * const wiki = new FakeWiki()
 * const { getCachedUserCategoryDisplay, getUserCategoryDisplay } = useUser(wiki)
 * getCachedUserCategoryDisplay("Example")
 * ```
 */
export function useUser(
	wiki: FakeWiki,
	options?: { userTypeConfig?: Partial<Record<FWUserCategory, FWUserTypeConfig>> }
) {
	return {
		getUserCategoryDisplay: (userName: string) =>
			wiki.getUserCategoryDisplay(userName, options),
		getCachedUserCategoryDisplay: (userName: string) =>
			wiki.getCachedUserCategoryDisplay(userName, options),
	}
}
