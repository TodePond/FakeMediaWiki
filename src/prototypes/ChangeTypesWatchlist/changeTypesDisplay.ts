/**
 * Shared helpers for displaying edit-types summary (type + action + count rows).
 * Used by both ChangeTypesWatchlist (summary) and ChangeTypesWatchlistDetails (summary + details).
 */

/** Summary shape: type name -> action -> count. API may return this at root or under "summary". */
export type EditTypesSummaryShape = Record<string, Record<string, number>>

const ACTION_DISPLAY: Record<string, { symbol: string; deltaClass: string }> = {
	insert: { symbol: "+", deltaClass: "change-types-delta-add" },
	remove: { symbol: "-", deltaClass: "change-types-delta-remove" },
	change: { symbol: "↻", deltaClass: "change-types-delta-change" },
	move: { symbol: "↻", deltaClass: "change-types-delta-change" },
}

/**
 * Extract the simple diff summary for display. The API may return the summary
 * directly or wrapped (e.g. under a "summary" key). We only use entries that are
 * action maps (type -> { insert, change, ... }).
 */
export function getSummaryForDisplay(
	raw: Record<string, unknown> | null
): EditTypesSummaryShape | null {
	if (!raw || typeof raw !== "object") return null
	const summary = (raw as { summary?: Record<string, Record<string, number>> }).summary
	if (summary && typeof summary === "object") return summary
	const result: EditTypesSummaryShape = {}
	for (const [typeName, value] of Object.entries(raw)) {
		if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			Object.values(value).every(v => typeof v === "number")
		) {
			result[typeName] = value as Record<string, number>
		}
	}
	return Object.keys(result).length > 0 ? result : null
}

export interface ChangeTypeRow {
	key: string
	typeName: string
	symbol: string
	count: number
	deltaClass: string
}

/** One row per type+action for the list: type name, symbol (+ / - / ↻), count, delta class. */
export function getChangeTypeRows(summary: EditTypesSummaryShape): ChangeTypeRow[] {
	const rows: ChangeTypeRow[] = []
	for (const [typeName, actions] of Object.entries(summary)) {
		for (const [action, count] of Object.entries(actions)) {
			if (count <= 0) continue
			const key = action.toLowerCase()
			const display = ACTION_DISPLAY[key] ?? { symbol: action, deltaClass: "change-types-delta-change" }
			rows.push({
				key: `${typeName}-${action}`,
				typeName,
				symbol: display.symbol,
				count,
				deltaClass: display.deltaClass,
			})
		}
	}
	return rows
}
