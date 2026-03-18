#!/usr/bin/env npx tsx
/**
 * Test script for the Tone Check model API endpoint.
 * Run: npx tsx packages/fakewiki/scripts/test-tone-check-api.ts
 *
 * Uses the Lift Wing edit-check model with check_type=tone to detect
 * promotional, derogatory, or subjective language in text.
 * See: https://meta.wikimedia.org/wiki/Machine_learning_models/Production/Tone_Check
 */

const TONE_CHECK_URL =
	"https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict"

const API_USER_AGENT = "FakeMediaWiki-tone-check-test (https://github.com/todepond/FakeMediaWiki)"

interface ToneCheckInstance {
	lang: string
	check_type: "tone"
	page_title: string
	original_text: string
	modified_text: string
}

interface ToneCheckPrediction {
	status_code?: number
	model_name?: string
	model_version?: string
	check_type?: string
	language?: string
	page_title?: string
	prediction?: boolean
	probability?: number
	details?: Record<string, unknown>
}

interface ToneCheckResponse {
	predictions?: ToneCheckPrediction[]
}

async function callToneCheck(instances: ToneCheckInstance[]): Promise<ToneCheckResponse> {
	const response = await fetch(TONE_CHECK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Api-User-Agent": API_USER_AGENT,
		},
		body: JSON.stringify({ instances }),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Tone Check API error ${response.status}: ${text}`)
	}

	return (await response.json()) as ToneCheckResponse
}

async function main() {
	console.log("Testing Tone Check model API endpoint...\n")
	console.log(`URL: ${TONE_CHECK_URL}\n`)

	// Test cases from the model card and variations
	const testCases: Array<{ name: string; instance: ToneCheckInstance }> = [
		{
			name: "Promotional text (from model card)",
			instance: {
				lang: "en",
				check_type: "tone",
				page_title: "this is a test",
				original_text: "text",
				modified_text: "this is a great example of work",
			},
		},
		{
			name: "Neutral text",
			instance: {
				lang: "en",
				check_type: "tone",
				page_title: "Test article",
				original_text: "The city has a population of 100,000.",
				modified_text: "The city has a population of 100,000 and is located in the north.",
			},
		},
		{
			name: "Potentially peacock language",
			instance: {
				lang: "en",
				check_type: "tone",
				page_title: "Example band",
				original_text: "The band formed in 2020.",
				modified_text: "The band is the most talented and revolutionary group of our generation.",
			},
		},
	]

	for (const { name, instance } of testCases) {
		console.log(`--- ${name} ---`)
		console.log("Input:", JSON.stringify(instance, null, 2))
		try {
			const result = await callToneCheck([instance])
			const pred = result.predictions?.[0]
			if (pred) {
				console.log("Response:", JSON.stringify(pred, null, 2))
				console.log(
					`→ prediction: ${pred.prediction}, probability: ${pred.probability?.toFixed(3) ?? "N/A"}`
				)
			} else {
				console.log("Response:", JSON.stringify(result, null, 2))
			}
		} catch (err) {
			console.error("Error:", err instanceof Error ? err.message : err)
		}
		console.log()
	}

	console.log("Done.")
}

main().catch(console.error)
