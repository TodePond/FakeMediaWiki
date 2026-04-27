/**
 * Pre-renders AGENTS.md to HTML; written to `public/llms.html` and embedded in
 * `src/prototypes/FakeWikiReference/generated/llms-body.ts` for the reference prototype.
 */
import MarkdownIt from "markdown-it"
import anchor from "markdown-it-anchor"

const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: true })
md.use(anchor, { level: [2, 3, 4] })

export function renderAgentsMarkdownToHtml(markdownSource: string): string {
	const stripped = markdownSource.replace(/<!--[\s\S]*?-->/g, "").trimStart()
	return md.render(stripped)
}
