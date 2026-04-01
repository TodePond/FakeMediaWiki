declare module "diff-match-patch" {
	/** -1 = delete, 0 = equal, 1 = insert */
	type DiffOp = -1 | 0 | 1
	type Diff = [DiffOp, string]

	export default class DiffMatchPatch {
		diff_main(text1: string, text2: string, checkLines?: boolean, deadline?: number): Diff[]
		diff_cleanupSemantic(diffs: Diff[]): void
	}
}
