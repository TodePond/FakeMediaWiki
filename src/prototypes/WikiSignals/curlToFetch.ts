/**
 * Parse a `curl` command string from the docs into a browser `fetch` and run it.
 * - Wikimedia: append `origin=*` for CORS (see `fakewiki` `FakeWiki._handleRestApiRequest` /
 *   `_handleActionApiRequest`).
 * - `w/index.php?action=raw&title=…` is rewritten to `w/rest.php/v1/page/…` like `getPageSource`
 *   in `fakewiki` (raw index does not CORS the same way as the MediaWiki REST `page` route).
 */
const DEFAULT_UA = "FakeMediaWiki-WikiSignals/1.0 (https://github.com/wikimedia/fake-mediawiki; docs)"

/** Indent for pretty-printed JSON (matches `tab-size` on code blocks). */
const JSON_INDENT = 4

/**
 * If `text` looks like a single JSON value, return a pretty-printed string; otherwise return as-is.
 * Some APIs omit `application/json` or use a generic content-type while still returning JSON.
 */
function formatResponseBodyIfJson(text: string): string {
	const t = text.replace(/^\uFEFF/, "").trim()
	if (t.length === 0 || (t[0] !== "{" && t[0] !== "[")) {
		return text
	}
	try {
		return JSON.stringify(JSON.parse(t), null, JSON_INDENT)
	} catch {
		return text
	}
}

function fixPlaceholderUAs(headers: Record<string, string>) {
	for (const key of Object.keys(headers)) {
		if (
			(key === "User-Agent" || key === "user-agent" || key === "Api-User-Agent") &&
			(headers[key].includes("<your tool name>") || headers[key].includes("<contact:"))
		) {
			headers[key] = DEFAULT_UA
		}
	}
}

/**
 * Unescape a double-quoted JSON-style string
 */
function unescapeDoubleString(inner: string): string {
	return inner.replace(/\\"/g, '"').replace(/\\\\/g, "\\")
}

function parseQuotedH(s: string, start: number, quote: '"' | "'"): { end: number; value: string } {
	if (s[start] !== quote) return { end: start, value: "" }
	let p = start + 1
	if (quote === "'") {
		const e = s.indexOf("'", p)
		if (e < 0) return { end: s.length, value: s.slice(p) }
		return { end: e + 1, value: s.slice(p, e) }
	}
	// double
	let out = ""
	while (p < s.length) {
		if (s[p] === "\\" && s[p + 1] === '"') {
			out += '"'
			p += 2
			continue
		}
		if (s[p] === '"') return { end: p + 1, value: out }
		out += s[p]
		p++
	}
	return { end: s.length, value: out }
}

/**
 * One line, continuations already collapsed
 */
function parseCurlLine(s: string): { url: string; init: RequestInit } {
	const methodMatch = s.match(/(?:^|\s)-X\s+(\S+)/i)
	const method = methodMatch ? methodMatch[1].toUpperCase() : "GET"

	const headers: Record<string, string> = {}
	// -H "Key: value"
	let search = 0
	while (true) {
		const m = s.indexOf("-H", search)
		if (m < 0) break
		const after = s.slice(m + 2).match(/^\s*"/)
		if (!after) {
			search = m + 2
			continue
		}
		const q0 = s.indexOf('"', m + 2)
		if (q0 < 0) break
		const { end, value } = parseQuotedH(s, q0, '"')
		const c = value.indexOf(":")
		if (c > 0) {
			headers[value.slice(0, c).trim()] = value.slice(c + 1).trim()
		}
		search = end
	}

	let data: string | undefined
	{
		const m = s.match(/\s-d(?:\s+|\s*=\s*)|\s--data-raw(?:\s+|\s*=\s*)/)
		if (m && m.index !== undefined) {
			let p2 = m.index + m[0].length
			while (p2 < s.length && /\s/.test(s[p2])) p2++
			if (s[p2] === '"') {
				data = unescapeDoubleString(parseQuotedH(s, p2, '"').value)
			} else if (s[p2] === "'") {
				data = parseQuotedH(s, p2, "'").value
			}
		}
	}

	// find URL: first "https" in double quotes, else single-quoted
	let url = ""
	{
		const m = s.match(/"(https?:\/\/[^"]+)"/)
		if (m) url = m[1]
	}
	if (!url) {
		const m2 = s.match(/'(https?:\/\/[^']+)'/)
		if (m2) url = m2[1]
	}
	if (!url) {
		// ORES style?
		const m3 = s.match(/"(https?:\/\/[^?]+\?[^"]+)"/)
		if (m3) url = m3[1]
	}
	if (!url) throw new Error("Could not find http(s) URL in curl command")

	fixPlaceholderUAs(headers)

	const finalHeaders: Record<string, string> = {}
	for (const [k, v] of Object.entries(headers)) {
		const kn = k.toLowerCase() === "user-agent" || k === "User-Agent" ? "User-Agent" : k
		finalHeaders[kn === "user-agent" ? "User-Agent" : kn] = v
	}
	// fix duplicate
	if (finalHeaders["user-agent"] && !finalHeaders["User-Agent"])
		finalHeaders["User-Agent"] = finalHeaders["user-agent"] as string
	delete (finalHeaders as Record<string, string>)["user-agent"]
	if (finalHeaders["Api-User-Agent"] && /<\s*your tool/.test(String(finalHeaders["Api-User-Agent"])))
		finalHeaders["Api-User-Agent"] = DEFAULT_UA

	// ORES uses Api-User-Agent in some; ensure Api-User-Agent
	if (url.includes("ores.wikimedia.org") && !finalHeaders["User-Agent"] && !finalHeaders["Api-User-Agent"]) {
		finalHeaders["User-Agent"] = DEFAULT_UA
	}

	let m = method
	if (data !== undefined && m === "GET") m = "POST"
	if (data !== undefined) {
		const t = data.trim()
		if ((t.startsWith("{") || t.startsWith("[")) && !finalHeaders["Content-Type"] && !finalHeaders["content-type"])
			finalHeaders["Content-Type"] = "application/json"
	}

	// WMF CSRF: none for read APIs

	return {
		url,
		init: {
			method: m,
			headers: finalHeaders,
			redirect: "follow",
			body: m === "GET" || m === "HEAD" ? undefined : data,
		},
	}
}

export function parseCurlToFetch(bash: string): { url: string; init: RequestInit } {
	const oneLine = bash
		.replace(/\\\r?\n[ \t]*/g, " ")
		.split(/\r?\n/)
		.map(l => l.trim())
		.filter(Boolean)
		.join(" ")
	return parseCurlLine(oneLine)
}

function isWikimediaFamilyHost(hostname: string): boolean {
	return (
		hostname.endsWith(".wikipedia.org") ||
		hostname.endsWith(".wikimedia.org") ||
		hostname === "wikimedia.org" ||
		hostname === "wikipedia.org"
	)
}

/**
 * Add `origin=*` for browser CORS (see MediaWiki CORS + FakeWiki `&origin=*` on REST/Action).
 * Skips if the URL already has an `origin` query parameter.
 */
function withWikimediaCorsOrigin(href: string): string {
	let u: URL
	try {
		u = new URL(href)
	} catch {
		return href
	}
	if (u.searchParams.has("origin")) {
		return href
	}
	if (!isWikimediaFamilyHost(u.hostname)) {
		return href
	}
	u.searchParams.set("origin", "*")
	return u.href
}

/** Same as `fakewiki` `FakeWiki.encodeForUrl` — page title in REST path segments. */
function encodePageTitleForRestPath(pageTitle: string): string {
	return encodeURIComponent(String(pageTitle).replace(/ /g, "_"))
}

/**
 * Map `w/index.php?action=raw&title=…` to MediaWiki `GET w/rest.php/v1/page/…?origin=*` (see `getPageSource`).
 * Returns `null` when the URL is not that pattern (including when `oldid` etc. are present).
 */
function rewriteWikimediaIndexRawToRestPageUrl(href: string): string | null {
	let u: URL
	try {
		u = new URL(href)
	} catch {
		return null
	}
	if (!isWikimediaFamilyHost(u.hostname)) {
		return null
	}
	if (u.searchParams.get("action") !== "raw") {
		return null
	}
	if (!u.pathname.toLowerCase().includes("index.php")) {
		return null
	}
	const title = u.searchParams.get("title")
	if (!title) {
		return null
	}
	// Parity with getPageSource: only latest page content, not ?oldid= or revision-raw.
	if ([...u.searchParams.keys()].some(k => k === "oldid" || k === "direction")) {
		return null
	}
	const pathSeg = encodePageTitleForRestPath(title)
	return `${u.origin}/w/rest.php/v1/page/${pathSeg}`
}

/**
 * The REST `page` response is JSON; `source` is the wikitext / JSON file body (what `action=raw` returns as text).
 */
function extractSourceFromMediaWikiPageRestResponse(text: string): string {
	const t = text.replace(/^\uFEFF/, "").trim()
	if (!t.startsWith("{")) {
		return text
	}
	try {
		const o = JSON.parse(t) as Record<string, unknown>
		if (typeof o.source === "string" && (typeof o.id === "number" || o.key != null)) {
			return o.source
		}
	} catch {
		// keep body
	}
	return text
}

export async function runCurlBash(
	bash: string
): Promise<{ ok: true; text: string; contentType: string } | { ok: false; error: string }> {
	try {
		const { url, init } = parseCurlToFetch(bash)
		const restPageUrl = rewriteWikimediaIndexRawToRestPageUrl(url)
		const fetchUrl = withWikimediaCorsOrigin(restPageUrl ?? url)
		const usedRestPage = restPageUrl != null

		let r: Response
		if (usedRestPage) {
			// Match `fakewiki` `FakeWiki._handleRestApiRequest` (GET, mediawiki / JSON).
			r = await fetch(fetchUrl, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"Api-User-Agent": DEFAULT_UA,
				},
				redirect: init.redirect ?? "follow",
			})
		} else {
			const headers = new Headers(init.headers as HeadersInit)
			const wmf = isWikimediaFamilyHost(new URL(url).hostname)
			if (!headers.get("User-Agent") && !headers.get("Api-User-Agent")) {
				headers.set("User-Agent", DEFAULT_UA)
			}
			if (wmf && !headers.get("Api-User-Agent")) {
				headers.set("Api-User-Agent", DEFAULT_UA)
			}
			r = await fetch(fetchUrl, { ...init, headers })
		}
		const ct = r.headers.get("content-type") || "text/plain"
		let text = await r.text()
		if (!r.ok) {
			return { ok: false, error: `HTTP ${r.status} ${r.statusText}\n\n${text.slice(0, 4000)}` }
		}
		if (usedRestPage) {
			text = extractSourceFromMediaWikiPageRestResponse(text)
		}
		return { ok: true, text: formatResponseBodyIfJson(text), contentType: ct }
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) }
	}
}
