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

export type PredictionSource = "liftwing" | "ores"

export interface UsePredictionsOptions {
	source?: PredictionSource
	/** Threshold above which we show success (default 0.9). */
	successThreshold?: number
	/** Threshold above which we show warning (default 0.3). */
	warningThreshold?: number
}

export type PredictionModel = "damaging" | "goodfaith"

export interface PredictionPercentages {
	/** P(damaging) */
	damaging: number
	/** P(good faith) */
	goodfaith: number
}

const DEFAULT_SUCCESS_THRESHOLD = 0.9
const DEFAULT_WARNING_THRESHOLD = 0.3

export function usePredictions(wiki: FakeWiki, options?: UsePredictionsOptions) {
	const source = options?.source ?? "liftwing"
	const successThreshold = options?.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD
	const warningThreshold = options?.warningThreshold ?? DEFAULT_WARNING_THRESHOLD

	/** Cache of revision predictions (damaging and goodfaith) */
	const revisionPredictions = ref<PredictionMap>(new Map())
	/** Revision IDs currently loading predictions */
	const loadingPredictions = ref<Set<number>>(new Set())
	/** Revision IDs that failed to load (service error) */
	const failedPredictions = ref<Set<number>>(new Set())

	/** Lazily load predictions for a revision */
	async function loadPrediction(revisionId: number): Promise<void> {
		if (
			revisionPredictions.value.has(revisionId) ||
			loadingPredictions.value.has(revisionId) ||
			failedPredictions.value.has(revisionId)
		) {
			return
		}

		loadingPredictions.value.add(revisionId)

		try {
			const predictions =
				source === "ores"
					? await wiki.getRevisionPredictionsFromOres([revisionId])
					: await wiki.getRevisionPredictions([revisionId])
			const pred = predictions[revisionId]
			if (pred && (pred.damaging ?? pred.goodfaith)) {
				revisionPredictions.value.set(revisionId, pred)
			} else {
				failedPredictions.value.add(revisionId)
			}
		} catch (error) {
			console.error(`Failed to load prediction for revision ${revisionId}:`, error)
			failedPredictions.value.add(revisionId)
		} finally {
			loadingPredictions.value.delete(revisionId)
		}
	}

	function getPredictionIcon(revisionId: number): PredictionIconState {
		if (failedPredictions.value.has(revisionId)) {
			return {
				icon: cdxIconError,
				color: "var(--color-subtle)",
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
			void loadPrediction(revisionId)
			return {
				icon: cdxIconEllipsis,
				color: "var(--color-subtle)",
				isLoading: true,
			}
		}

		if (!predictions.damaging && !predictions.goodfaith) {
			return {
				icon: cdxIconError,
				color: "var(--color-subtle)",
				isLoading: false,
				isError: true,
			}
		}

		const damaging = predictions.damaging
		const goodfaith = predictions.goodfaith
		const damagingProb = damaging?.probability?.true ?? 0
		const badFaithProb = goodfaith?.probability?.false ?? 0
		const risk = Math.max(damagingProb, badFaithProb)

		if (risk > successThreshold) {
			return {
				icon: cdxIconAlert,
				color: "var(--color-destructive)",
				isLoading: false,
			}
		}

		if (risk > warningThreshold) {
			return {
				icon: cdxIconAlert,
				color: "var(--color-warning)",
				isLoading: false,
			}
		}

		if (risk < 1 - successThreshold) {
			return {
				icon: cdxIconSuccess,
				color: "var(--color-success)",
				isLoading: false,
			}
		}

		if (risk < 1 - warningThreshold) {
			return {
				icon: cdxIconSuccess,
				color: "var(--color-progressive)",
				isLoading: false,
			}
		}

		return {
			icon: cdxIconSuccess,
			color: "var(--color-subtle)",
			isLoading: false,
		}
	}

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
		const badFaithProb = goodfaith?.probability?.false ?? 0
		const risk = Math.max(damagingProb, badFaithProb)

		if (risk > successThreshold) {
			return "This change probably has a problem."
		}

		if (risk > warningThreshold) {
			return "This change might have a problem."
		}

		if (risk < 1 - successThreshold) {
			return "This change is probably okay."
		}

		if (risk < 1 - warningThreshold) {
			return "This change is probably okay."
		}

		return "This change might be okay."
	}

	function getPredictionIconForModel(
		revisionId: number,
		model: PredictionModel
	): PredictionIconState {
		if (failedPredictions.value.has(revisionId)) {
			return {
				icon: cdxIconError,
				color: "var(--color-subtle)",
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
			void loadPrediction(revisionId)
			return {
				icon: cdxIconEllipsis,
				color: "var(--color-subtle)",
				isLoading: true,
			}
		}

		if (
			(model === "damaging" && !predictions.damaging) ||
			(model === "goodfaith" && !predictions.goodfaith)
		) {
			return {
				icon: cdxIconError,
				color: "var(--color-subtle)",
				isLoading: false,
				isError: true,
			}
		}

		const risk =
			model === "damaging"
				? (predictions.damaging?.probability?.true ?? 0)
				: (predictions.goodfaith?.probability?.false ?? 0)

		if (risk > successThreshold) {
			return {
				icon: cdxIconAlert,
				color: "var(--color-destructive)",
				isLoading: false,
			}
		}

		if (risk > warningThreshold) {
			return {
				icon: cdxIconAlert,
				color: "var(--color-warning)",
				isLoading: false,
			}
		}

		if (risk < 1 - successThreshold) {
			return {
				icon: cdxIconSuccess,
				color: "var(--color-success)",
				isLoading: false,
			}
		}

		if (risk < 1 - warningThreshold) {
			return {
				icon: cdxIconSuccess,
				color: "var(--color-progressive)",
				isLoading: false,
			}
		}

		return {
			icon: cdxIconSuccess,
			color: "var(--color-subtle)",
			isLoading: false,
		}
	}

	function getPredictionPercentages(revisionId: number): PredictionPercentages | null {
		if (failedPredictions.value.has(revisionId)) {
			return null
		}

		const predictions = revisionPredictions.value.get(revisionId)
		if (!predictions || (!predictions.damaging && !predictions.goodfaith)) {
			return null
		}

		return {
			damaging: predictions.damaging?.probability?.true ?? 0,
			goodfaith: predictions.goodfaith?.probability?.true ?? 0,
		}
	}

	return {
		revisionPredictions,
		loadingPredictions,
		getPredictionIcon,
		getPredictionText,
		getPredictionIconForModel,
		getPredictionPercentages,
	}
}
