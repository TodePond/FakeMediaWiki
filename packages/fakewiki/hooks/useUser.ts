import type { FWUserCategory, FWUserTypeConfig } from "fakewiki/types"
import type { FakeWiki } from "fakewiki"

/**
 * Thin wrapper that returns getUserCategoryDisplay from the given FakeWiki instance.
 * User category caching is on FakeWiki; use wiki.getUserCategoryDisplay(userName) or
 * wiki.getUserCategoryDisplay(userName, { userTypeConfig }) in the template.
 * This composable exists only for call sites that destructure from useUser(wiki).
 */
export function useUser(
	wiki: FakeWiki,
	options?: { userTypeConfig?: Partial<Record<FWUserCategory, FWUserTypeConfig>> }
) {
	return {
		getUserCategoryDisplay: (userName: string) =>
			wiki.getUserCategoryDisplay(userName, options),
	}
}
