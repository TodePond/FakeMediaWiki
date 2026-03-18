#!/usr/bin/env npx tsx
/**
 * Test script for edit check / tags support across all feed endpoints.
 * Run: npx tsx packages/fakewiki/scripts/test-edit-check-endpoints.ts
 *
 * Verifies which endpoints return revision tags (needed for edit check flags:
 * editcheck-paste-shown, editcheck-references, etc.)
 */

import { FakeWiki } from "../FakeWiki"

const BASE = "https://en.wikipedia.org/"
const PAGE_NAMES = ["Confidence Man (band)", "Algorave"]
const USER_NAMES = ["Samwalton9"]

function hasTags(rev: { tags?: string[] }): boolean {
	return Array.isArray(rev.tags) && rev.tags.length > 0
}

function hasEditCheckTags(rev: { tags?: string[] }): boolean {
	const tags = rev.tags ?? []
	const EDIT_CHECK_TAGS = [
		"editcheck-paste-shown",
		"editcheck-references",
		"editcheck-newreference",
		"editcheck-references-shown",
	]
	return tags.some(t => EDIT_CHECK_TAGS.includes(t))
}

async function main() {
	const wiki = new FakeWiki(BASE)
	const results: Array<{ endpoint: string; hasTags: boolean; sampleWithTags?: number; editCheckFound?: boolean }> = []

	console.log("Testing edit check / tags support across feed endpoints...\n")

	// 1. getRecentChanges (Action API list=recentchanges)
	try {
		const rc = await wiki.getRecentChanges({ limit: 5, onlyNeedsReview: false })
		const withTags = rc.revisions.filter(r => hasTags(r))
		const withEditCheck = rc.revisions.filter(r => hasEditCheckTags(r))
		results.push({
			endpoint: "getRecentChanges",
			hasTags: withTags.length > 0,
			sampleWithTags: withTags[0]?.id,
			editCheckFound: withEditCheck.length > 0,
		})
		console.log(`✓ getRecentChanges: ${rc.revisions.length} revs, ${withTags.length} with tags, ${withEditCheck.length} with edit-check tags`)
	} catch (e) {
		console.error("✗ getRecentChanges failed:", e)
		results.push({ endpoint: "getRecentChanges", hasTags: false })
	}

	// 2. getCombinedFeed (pages) - uses getPageHistory (REST API)
	try {
		const feed = await wiki.getCombinedFeed({ pageNames: PAGE_NAMES, limit: 5 })
		const withTags = feed.filter(r => hasTags(r))
		const withEditCheck = feed.filter(r => hasEditCheckTags(r))
		results.push({
			endpoint: "getCombinedFeed (pages)",
			hasTags: withTags.length > 0,
			sampleWithTags: withTags[0]?.id,
			editCheckFound: withEditCheck.length > 0,
		})
		console.log(`✓ getCombinedFeed (pages): ${feed.length} revs, ${withTags.length} with tags, ${withEditCheck.length} with edit-check tags`)
	} catch (e) {
		console.error("✗ getCombinedFeed (pages) failed:", e)
		results.push({ endpoint: "getCombinedFeed (pages)", hasTags: false })
	}

	// 3. getCombinedFeed (users) - uses getUserHistory (Action API usercontribs)
	try {
		const feed = await wiki.getCombinedFeed({ userNames: USER_NAMES, limit: 5 })
		const withTags = feed.filter(r => hasTags(r))
		const withEditCheck = feed.filter(r => hasEditCheckTags(r))
		results.push({
			endpoint: "getCombinedFeed (users)",
			hasTags: withTags.length > 0,
			sampleWithTags: withTags[0]?.id,
			editCheckFound: withEditCheck.length > 0,
		})
		console.log(`✓ getCombinedFeed (users): ${feed.length} revs, ${withTags.length} with tags, ${withEditCheck.length} with edit-check tags`)
	} catch (e) {
		console.error("✗ getCombinedFeed (users) failed:", e)
		results.push({ endpoint: "getCombinedFeed (users)", hasTags: false })
	}

	// 4. getPageHistory (REST API) - used by loadWatchlistLatestRevisions, loadRelatedChangesRevisions
	try {
		const history = await wiki.getPageHistory(PAGE_NAMES[0]!, { limit: 5 })
		const revs = history.revisions ?? []
		const withTags = revs.filter(r => hasTags(r as { tags?: string[] }))
		const withEditCheck = revs.filter(r => hasEditCheckTags(r as { tags?: string[] }))
		results.push({
			endpoint: "getPageHistory (REST)",
			hasTags: withTags.length > 0,
			sampleWithTags: withTags[0] ? (withTags[0] as { id: number }).id : undefined,
			editCheckFound: withEditCheck.length > 0,
		})
		console.log(`✓ getPageHistory: ${revs.length} revs, ${withTags.length} with tags, ${withEditCheck.length} with edit-check tags`)
	} catch (e) {
		console.error("✗ getPageHistory failed:", e)
		results.push({ endpoint: "getPageHistory", hasTags: false })
	}

	// 5. getRevisionTags (Action API) - fallback for enriching revisions
	try {
		// Use real rev IDs from getRecentChanges to verify the API works
		const rcForIds = await wiki.getRecentChanges({ limit: 3 })
		const revIds = rcForIds.revisions.map(r => r.id).filter(id => id > 0)
		const tagsMap = await wiki.getRevisionTags(revIds)
		results.push({
			endpoint: "getRevisionTags",
			hasTags: tagsMap.size > 0,
		})
		console.log(`✓ getRevisionTags: fetches tags for ${revIds.length} rev(s), got ${tagsMap.size} with tags`)
	} catch (e) {
		console.error("✗ getRevisionTags failed:", e)
		results.push({ endpoint: "getRevisionTags", hasTags: false })
	}

	// Summary
	console.log("\n--- Summary ---")
	const needsEnrichment = results.filter(r => !r.hasTags && r.endpoint !== "getRevisionTags")
	if (needsEnrichment.length > 0) {
		console.log("Endpoints that do NOT include tags (require enrichRevisionsWithTags):")
		needsEnrichment.forEach(r => console.log(`  - ${r.endpoint}`))
	}
	const withTagsNative = results.filter(r => r.hasTags)
	console.log("\nEndpoints that include tags natively:")
	withTagsNative.forEach(r => console.log(`  - ${r.endpoint}`))
}

main().catch(console.error)
