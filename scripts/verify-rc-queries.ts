/**
 * Verification script for recent changes segment queries.
 * Run with: npx tsx scripts/verify-rc-queries.ts
 *
 * Tests that getRecentChanges with rcstart/rcend returns changes within the expected time range.
 */
import { FakeWiki } from "../packages/fakewiki/FakeWiki.ts"

const wiki = new FakeWiki()

async function verify() {
	console.log("Verifying recent changes segment queries...\n")

	// Simulate watchlist time range: 2 days ago to now
	const now = Date.now()
	const twoDaysMs = 2 * 24 * 60 * 60 * 1000
	const earliest = now - twoDaysMs
	const latest = now
	const bufferMs = 12 * 60 * 60 * 1000
	const rangeStart = earliest - bufferMs
	const rangeEnd = latest + bufferMs
	const NUM_SEGMENTS = 4
	const rangeMs = rangeEnd - rangeStart
	const segmentDuration = rangeMs / NUM_SEGMENTS

	const queries = Array.from({ length: NUM_SEGMENTS }, (_, i) => {
		const segEnd = rangeStart + (i + 1) * segmentDuration
		const segStart = rangeStart + i * segmentDuration
		return {
			rcstart: new Date(segEnd).toISOString(),
			rcend: new Date(segStart).toISOString(),
			segStart: new Date(segStart).toISOString(),
			segEnd: new Date(segEnd).toISOString(),
		}
	})

	console.log("Segment time ranges (rcstart > rcend for rcdir=older):")
	queries.forEach((q, i) => {
		console.log(`  Segment ${i}: rcend=${q.rcend} → rcstart=${q.rcstart}`)
	})

	try {
		const results = await Promise.all(
			queries.map((q, i) =>
				wiki.getRecentChanges({
					limit: 5,
					onlyNeedsReview: false, // More likely to get results without ores filter
					rcstart: q.rcstart,
					rcend: q.rcend,
				}).then(r => ({ segment: i, revisions: r.revisions }))
			)
		)

		let allOk = true
		results.forEach(({ segment, revisions }) => {
			const count = revisions.length
			const timestamps = revisions.map(r => r.timestamp).filter(Boolean)
			const inRange = timestamps.every(ts => {
				const t = new Date(ts).getTime()
				const segStart = rangeStart + segment * segmentDuration
				const segEnd = rangeStart + (segment + 1) * segmentDuration
				return t >= segStart && t <= segEnd
			})
			console.log(`\nSegment ${segment}: ${count} revisions, timestamps in range: ${inRange ? "✓" : "✗"}`)
			if (timestamps.length > 0) {
				console.log(`  Sample: ${timestamps[0]} ... ${timestamps[timestamps.length - 1]}`)
			}
			if (!inRange && timestamps.length > 0) allOk = false
		})

		console.log(allOk ? "\n✓ All segment queries returned in-range results" : "\n✗ Some timestamps outside expected range (API may use inclusive/exclusive bounds)")
	} catch (err) {
		console.error("\n✗ Error:", err)
		process.exit(1)
	}
}

verify()
