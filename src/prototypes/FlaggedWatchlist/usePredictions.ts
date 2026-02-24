import type { Icon } from "@wikimedia/codex-icons"
import { cdxIconAlert, cdxIconEllipsis, cdxIconError, cdxIconSuccess } from "@wikimedia/codex-icons"
import type { FakeWiki } from "fakewiki"
import type { FWLiftWingPrediction } from "fakewiki/types"
import { ref } from "vue"

type PredictionMap = Map<
	number,
	{
		damaging?: FWLiftWingPrediction
		goodfaith?: FWLiftWingPrediction
	}
>

export interface PredictionIconState {
	icon: Icon | null
	color: string
	isLoading: boolean
	isError?: boolean
}

export function usePredictions(wiki: FakeWiki) {
	/** Cache of revision predictions (damaging and goodfaith) */
	const revisionPredictions = ref<PredictionMap>(new Map())
	/** Revision IDs currently loading predictions */
	const loadingPredictions = ref<Set<number>>(new Set())
	/** Revision IDs that failed to load (service error) */
	const failedPredictions = ref<Set<number>>(new Set())

	/** Lazily load predictions for a revision */
	async function loadPrediction(revisionId: number): Promise<void> {
		// Skip if already loaded, currently loading, or previously failed
		if (
			revisionPredictions.value.has(revisionId) ||
			loadingPredictions.value.has(revisionId) ||
			failedPredictions.value.has(revisionId)
		) {
			return
		}

		loadingPredictions.value.add(revisionId)

		try {
			const predictions = await wiki.getRevisionPredictions([revisionId])
			const pred = predictions[revisionId]
			if (pred && (pred.damaging ?? pred.goodfaith)) {
				revisionPredictions.value.set(revisionId, pred)
			} else {
				// Service returned no usable data (e.g. 500)
				failedPredictions.value.add(revisionId)
			}
		} catch (error) {
			console.error(`Failed to load prediction for revision ${revisionId}:`, error)
			failedPredictions.value.add(revisionId)
		} finally {
			loadingPredictions.value.delete(revisionId)
		}
	}

	/** Get prediction icon and color for a revision */
	function getPredictionIcon(revisionId: number): PredictionIconState {
		if (failedPredictions.value.has(revisionId)) {
			return {
				icon: cdxIconError,
				color: "var(--color-destructive)",
				isLoading: false,
				isError: true,
			}
		}

		if (loadingPredictions.value.has(revisionId)) {
			return {
				icon: cdxIconEllipsis,
				color: "var(--color-subtle)",
				isLoading: true,
			}
		}

		const predictions = revisionPredictions.value.get(revisionId)
		if (!predictions) {
			// No predictions available yet - trigger lazy load and show ellipsis
			void loadPrediction(revisionId)
			return {
				icon: cdxIconEllipsis,
				color: "var(--color-subtle)",
				isLoading: true,
			}
		}

		// No usable scores (shouldn't happen if we only set when we have data)
		if (!predictions.damaging && !predictions.goodfaith) {
			return {
				icon: cdxIconError,
				color: "var(--color-destructive)",
				isLoading: false,
				isError: true,
			}
		}

		const damaging = predictions.damaging
		const goodfaith = predictions.goodfaith

		// Check for biggest risks (very likely have problems OR very likely bad faith)
		const damagingProb = damaging?.probability?.true ?? 0
		const goodfaithProb = goodfaith?.probability?.false ?? 0 // false = bad faith

		if (damagingProb > 0.9 || goodfaithProb > 0.9) {
			return {
				icon: cdxIconAlert,
				color: "var(--color-destructive)",
				isLoading: false,
			}
		}

		// Check for slight risks (may have problems OR may be bad faith)
		if (damagingProb > 0.3 || goodfaithProb > 0.3) {
			return {
				icon: cdxIconAlert,
				color: "var(--color-warning)",
				isLoading: false,
			}
		}

		// Check if fairly sure it's good (very likely good AND very likely good faith)
		const notDamagingProb = damaging?.probability?.false ?? 0
		const isGoodfaithProb = goodfaith?.probability?.true ?? 0

		if (notDamagingProb > 0.99 && isGoodfaithProb > 0.99) {
			return {
				icon: cdxIconSuccess,
				color: "var(--color-success)",
				isLoading: false,
			}
		}

		return {
			icon: cdxIconSuccess,
			color: "var(--color-progressive)",
			isLoading: false,
		}
	}

	/** Get prediction text description for a revision */
	function getPredictionText(revisionId: number): string | null {
		if (failedPredictions.value.has(revisionId)) {
			return "There was an error when getting a prediction for this change."
		}

		const predictions = revisionPredictions.value.get(revisionId)
		if (!predictions) {
			return null
		}

		if (!predictions.damaging && !predictions.goodfaith) {
			return "There was an error when getting a prediction for this change."
		}

		const damaging = predictions.damaging
		const goodfaith = predictions.goodfaith
		const damagingProb = damaging?.probability?.true ?? 0
		const goodfaithProb = goodfaith?.probability?.false ?? 0 // false = bad faith

		if (damagingProb > 0.9 || goodfaithProb > 0.9) {
			if (damagingProb > 0.9 && goodfaithProb > 0.9) {
				return "It's likely that this edit is damaging and made in bad faith"
			} else if (damagingProb > 0.9) {
				return "It's likely that this edit is damaging"
			}
			return "It's likely that this edit was made in bad faith"
		}

		if (damagingProb > 0.3 || goodfaithProb > 0.3) {
			if (damagingProb > 0.3 && goodfaithProb > 0.3) {
				return "It's possible that this edit has a problem or made in bad faith"
			} else if (damagingProb > 0.3) {
				return "It's possible that this edit has a problem"
			}
			return "It's possible that this edit was made in bad faith"
		}

		const notDamagingProb = damaging?.probability?.false ?? 0
		const isGoodfaithProb = goodfaith?.probability?.true ?? 0

		if (notDamagingProb > 0.9 && isGoodfaithProb > 0.9) {
			return "It's likely that this edit is good and made in good faith"
		}

		return "It's possible that this edit is okay"
	}

	return {
		revisionPredictions,
		loadingPredictions,
		getPredictionIcon,
		getPredictionText,
	}
}
