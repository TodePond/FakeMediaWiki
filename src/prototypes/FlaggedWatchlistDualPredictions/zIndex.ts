interface RevisionDateGroup {
	dateKey: string
	revisions: unknown[]
}

export function getRevisionItemZIndex(
	dateGroups: RevisionDateGroup[],
	dateKey: string,
	changeIndex: number
): number {
	let cumulativeIndex = 0
	for (const group of dateGroups) {
		if (group.dateKey === dateKey) {
			return 10 + cumulativeIndex + changeIndex
		}
		cumulativeIndex += group.revisions.length
	}
	return 10 + cumulativeIndex + changeIndex
}
