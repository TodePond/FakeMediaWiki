export function isInteractiveClickTarget(target: HTMLElement): boolean {
	return (
		target.tagName === "A" ||
		target.tagName === "BUTTON" ||
		Boolean(target.closest("a")) ||
		Boolean(target.closest("button"))
	)
}
