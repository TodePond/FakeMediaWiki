#!/usr/bin/env node
/**
 * Ensures every root-level *.ts file in this package is included in the npm publish tarball.
 * Uses `npm pack --dry-run --json` (same contents npm would publish).
 *
 * Run from repo root: node packages/fakewiki/scripts/verify-root-ts-packed.mjs
 * Or via fakewiki prepublishOnly (cwd irrelevant; resolves package root from this file).
 */
import { execFileSync } from "node:child_process"
import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const rootTs = readdirSync(pkgRoot).filter((f) => f.endsWith(".ts"))

let stdout
try {
	stdout = execFileSync("npm", ["pack", "--dry-run", "--json"], {
		cwd: pkgRoot,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	})
} catch (err) {
	const stderr = err && typeof err === "object" && "stderr" in err ? String(err.stderr) : ""
	console.error("verify-root-ts-packed: npm pack --dry-run failed:", stderr || err)
	process.exit(1)
}

let packedPaths
try {
	const rows = JSON.parse(stdout.trim())
	const entry = Array.isArray(rows) ? rows[0] : rows
	packedPaths = new Set(entry.files.map((f) => f.path))
} catch {
	console.error(
		"verify-root-ts-packed: could not parse npm pack --json output:\n",
		stdout.slice(0, 500),
	)
	process.exit(1)
}

const missing = rootTs.filter((f) => !packedPaths.has(f))
if (missing.length > 0) {
	console.error(
		`verify-root-ts-packed: these root .ts files exist on disk but are not in the npm pack (fix package.json "files"):\n  ${missing.join("\n  ")}`,
	)
	process.exit(1)
}

console.log(`verify-root-ts-packed: ok (${rootTs.length} root .ts file(s) in pack)`)
