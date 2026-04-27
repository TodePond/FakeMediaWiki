/**
 * Sort order for `@category` labels (TSDoc on `FakeWiki` public methods; see `doc-parse.ts`).
 * ApiPlayground, AGENTS.md, and `llms.txt` use `comparePlaygroundCategoryOrder` for section order.
 */
export const PLAYGROUND_CATEGORY_ORDER = [
	"Pages and content",
	"Revisions and diffs",
	"Structured deltas",
	"Search",
	"Users",
	"Recommendations",
	"Predictions",
	"Suggestions",
	"Formatting",
	"URLs",
	"Prototyping",
	"Requests",
	"Utilities",
	"Cache and diagnostics",
	"Persistence",
	"Hooks",
] as const

const PLAYGROUND_CATEGORY_ORDER_INDEX = new Map<string, number>(
	PLAYGROUND_CATEGORY_ORDER.map((name, index) => [name, index])
)

/** Same sort as ApiPlayground `groupedFilteredMethods`. */
export function comparePlaygroundCategoryOrder(a: string, b: string): number {
	const ia = PLAYGROUND_CATEGORY_ORDER_INDEX.get(a)
	const ib = PLAYGROUND_CATEGORY_ORDER_INDEX.get(b)
	if (ia !== undefined && ib !== undefined) return ia - ib
	if (ia !== undefined) return -1
	if (ib !== undefined) return 1
	return a.localeCompare(b)
}
