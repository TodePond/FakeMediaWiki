import type { Icon } from "@wikimedia/codex-icons"
import { cdxIconAlert, cdxIconEllipsis, cdxIconError, cdxIconSuccess } from "@wikimedia/codex-icons"
import type { FakeWiki } from "fakewiki"
import type { FWLiftWingPrediction, FWPredictionByModel, FWPredictionModel } from "fakewiki/types"
import type { Ref } from "vue"
import { ref, unref } from "vue"

type PredictionMap = Map<number, FWPredictionByModel>

export interface PredictionIconState {
	icon: Icon | null
	color: string
	isLoading: boolean
	isError?: boolean
}

export type PredictionSource = "liftwing" | "ores"

export interface PredictionThresholdConfig {
	/** Lower bound for strongest "good" signal (green). */
	lowerTight: number
	/** Lower bound for softer "good" signal (blue). */
	lowerLoose: number
	/** Upper bound for softer "problem" signal (yellow). */
	upperLoose: number
	/** Upper bound for strongest "problem" signal (red). */
	upperTight: number
}

export interface PredictionThresholdOverride {
	lowerTight?: number
	lowerLoose?: number
	upperLoose?: number
	upperTight?: number
	/** Back-compat alias for lowerTight (legacy symmetric thresholds). */
	tightThreshold?: number
	/** Back-compat alias for lowerLoose (legacy symmetric thresholds). */
	looseThreshold?: number
}

export interface UsePredictionsOptions {
	source?: PredictionSource
	models?: FWPredictionModel[]
	/** Legacy/global thresholds used for aggregate (non-model-specific) states. */
	tightThreshold?: number
	looseThreshold?: number
	/** Optional explicit global upper thresholds (asymmetric support). */
	upperLooseThreshold?: number
	upperTightThreshold?: number
	/** Debug mode: show percentages + unclear items in combined points. */
	debug?: boolean | Ref<boolean>
	/** Per-model threshold overrides. Falls back to per-model defaults. */
	thresholdOverrides?: Partial<Record<FWPredictionModel, PredictionThresholdOverride>>
}

export type PredictionModel = FWPredictionModel
export interface CombinedPredictionPoint {
	model: PredictionModel
	text: string
}

export interface PredictionPercentages {
	/** P(damaging) */
	damaging: number
	/** P(good faith) */
	goodfaith: number
}

const DEFAULT_MODELS: FWPredictionModel[] = ["damaging", "goodfaith"]
const DEFAULT_GLOBAL_THRESHOLDS: PredictionThresholdConfig = {
	lowerTight: 0.1,
	lowerLoose: 0.3,
	upperLoose: 0.7,
	upperTight: 0.9,
}
const DEFAULT_MODEL_THRESHOLDS: Record<FWPredictionModel, PredictionThresholdConfig> = {
	damaging: { ...DEFAULT_GLOBAL_THRESHOLDS },
	goodfaith: { ...DEFAULT_GLOBAL_THRESHOLDS },
	revertrisk: {
		// lowerTight: 0.4,
		// lowerLoose: 0.6,
		lowerTight: 0.5,
		lowerLoose: 0.8,
		upperLoose: 0.9,
		upperTight: 0.95,
	},
}

type PredictionBand = "error" | "loading" | "high" | "mediumHigh" | "mediumLow" | "low" | "neutral"

function getBestProbability(prediction: FWLiftWingPrediction): number {
	const trueProbability = prediction.probability.true
	if (typeof trueProbability === "number") {
		return trueProbability
	}
	const values = Object.values(prediction.probability).filter(
		(value): value is number => typeof value === "number"
	)
	if (values.length === 0) {
		return 0
	}
	return Math.max(...values)
}

function getRiskForModel(model: PredictionModel, prediction: FWLiftWingPrediction): number {
	if (model === "goodfaith") {
		return prediction.probability.false ?? 0
	}
	return getBestProbability(prediction)
}

export function usePredictions(wiki: FakeWiki, options?: UsePredictionsOptions) {
	const source = options?.source ?? "liftwing"
	const models = options?.models ?? DEFAULT_MODELS
	const thresholdOverrides = options?.thresholdOverrides ?? {}
	const isDebugEnabled = (): boolean => Boolean(unref(options?.debug))
	const canUseOres =
		source === "ores" && models.every(model => model === "damaging" || model === "goodfaith")

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
			const predictions = canUseOres
				? await wiki.getRevisionPredictionsFromOres([revisionId])
				: await wiki.getRevisionPredictions([revisionId], models)
			const pred = predictions[revisionId]
			if (pred && Object.values(pred).some(Boolean)) {
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

	function getThresholds(model: PredictionModel): {
		lowerTight: number
		lowerLoose: number
		upperLoose: number
		upperTight: number
	} {
		const defaults = DEFAULT_MODEL_THRESHOLDS[model] ?? DEFAULT_GLOBAL_THRESHOLDS
		const overrides = thresholdOverrides[model]
		const lowerTight =
			overrides?.lowerTight ??
			overrides?.tightThreshold ??
			options?.tightThreshold ??
			defaults.lowerTight
		const lowerLoose =
			overrides?.lowerLoose ??
			overrides?.looseThreshold ??
			options?.looseThreshold ??
			defaults.lowerLoose
		const upperLoose =
			overrides?.upperLoose ?? options?.upperLooseThreshold ?? defaults.upperLoose
		const upperTight =
			overrides?.upperTight ?? options?.upperTightThreshold ?? defaults.upperTight
		return {
			lowerTight,
			lowerLoose,
			upperLoose,
			upperTight,
		}
	}

	function getRiskBand(
		risk: number,
		thresholds: {
			lowerTight: number
			lowerLoose: number
			upperLoose: number
			upperTight: number
		}
	): PredictionBand {
		if (risk > thresholds.upperTight) return "high"
		if (risk > thresholds.upperLoose) return "mediumHigh"
		if (risk < thresholds.lowerTight) return "low"
		if (risk < thresholds.lowerLoose) return "mediumLow"
		return "neutral"
	}

	function getPredictionIconFromBand(band: PredictionBand): PredictionIconState {
		if (band === "error") {
			return {
				icon: cdxIconError,
				color: "var(--color-subtle)",
				isLoading: false,
				isError: true,
			}
		}
		if (band === "loading") {
			return {
				icon: cdxIconEllipsis,
				color: "var(--color-subtle)",
				isLoading: true,
			}
		}
		if (band === "high") {
			return {
				icon: cdxIconAlert,
				color: "var(--color-destructive)",
				isLoading: false,
			}
		}
		if (band === "mediumHigh") {
			return {
				icon: cdxIconAlert,
				color: "var(--color-warning)",
				isLoading: false,
			}
		}
		if (band === "low") {
			return {
				icon: cdxIconSuccess,
				color: "var(--color-success)",
				isLoading: false,
			}
		}
		if (band === "mediumLow") {
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

	function getWorstBand(bands: PredictionBand[]): PredictionBand {
		if (bands.length === 0) {
			return "error"
		}
		const severity: Record<PredictionBand, number> = {
			error: 5,
			loading: 4,
			high: 4,
			mediumHigh: 3,
			neutral: 2,
			mediumLow: 1,
			low: 0,
		}
		return bands.reduce((worst, current) =>
			severity[current] > severity[worst] ? current : worst
		)
	}

	function getAvailableModelBands(
		predictions: FWPredictionByModel
	): Partial<Record<PredictionModel, PredictionBand>> {
		const result: Partial<Record<PredictionModel, PredictionBand>> = {}
		for (const predictionModel of models) {
			const prediction = predictions[predictionModel]
			if (!prediction) continue
			const risk = getRiskForModel(predictionModel, prediction)
			result[predictionModel] = getRiskBand(risk, getThresholds(predictionModel))
		}
		return result
	}

	function getPredictionIcon(revisionId: number, model?: PredictionModel): PredictionIconState {
		if (failedPredictions.value.has(revisionId)) {
			return getPredictionIconFromBand("error")
		}

		if (loadingPredictions.value.has(revisionId)) {
			return getPredictionIconFromBand("loading")
		}

		const predictions = revisionPredictions.value.get(revisionId)
		if (!predictions) {
			void loadPrediction(revisionId)
			return getPredictionIconFromBand("loading")
		}

		if (model) {
			const modelPrediction = predictions[model]
			if (!modelPrediction) {
				return getPredictionIconFromBand("error")
			}
			return getPredictionIconFromBand(
				getRiskBand(getRiskForModel(model, modelPrediction), getThresholds(model))
			)
		}

		const bands = Object.values(getAvailableModelBands(predictions))
		return getPredictionIconFromBand(getWorstBand(bands))
	}

	function getCombinedPredictionText(revisionId: number): string | null {
		const points = getCombinedPredictionPoints(revisionId)
		if (!points) return null
		if (points.length === 0) return "This change might be okay."
		return points.map(point => point.text).join("\n")
	}

	function getCombinedPredictionPoints(revisionId: number): CombinedPredictionPoint[] | null {
		if (failedPredictions.value.has(revisionId)) {
			return [
				{
					model: "damaging",
					text: "There was an error when getting a prediction for this change.",
				},
			]
		}

		const predictions = revisionPredictions.value.get(revisionId)
		if (!predictions) {
			return null
		}

		const byModel = getAvailableModelBands(predictions)
		const bands = Object.values(byModel)
		if (bands.length === 0) {
			return [
				{
					model: "damaging",
					text: "There was an error when getting a prediction for this change.",
				},
			]
		}

		const points: CombinedPredictionPoint[] = []
		const withPercent = (model: PredictionModel, sentence: string): string => {
			if (!isDebugEnabled()) return sentence
			const prediction = predictions[model]
			if (!prediction) return sentence
			return `${sentence} (${Math.round(getBestProbability(prediction) * 100)}%)`
		}

		const goodfaithBand = byModel.goodfaith
		if (goodfaithBand === "high" || goodfaithBand === "mediumHigh") {
			points.push({
				model: "goodfaith",
				text: withPercent("goodfaith", "This change is probably done in bad faith."),
			})
		} else if (goodfaithBand === "low") {
			points.push({
				model: "goodfaith",
				text: withPercent("goodfaith", "This change is probably done in good faith."),
			})
		} else if (goodfaithBand === "mediumLow") {
			points.push({
				model: "goodfaith",
				text: withPercent("goodfaith", "This change might be done in good faith."),
			})
		} else if (goodfaithBand === "neutral" && isDebugEnabled()) {
			points.push({
				model: "goodfaith",
				text: withPercent("goodfaith", "This change has unclear good-faith signals."),
			})
		}

		const damagingBand = byModel.damaging
		if (damagingBand === "high") {
			points.push({
				model: "damaging",
				text: withPercent("damaging", "This change is probably damaging."),
			})
		} else if (damagingBand === "mediumHigh") {
			points.push({
				model: "damaging",
				text: withPercent("damaging", "This change might be damaging."),
			})
		} else if (damagingBand === "low") {
			points.push({
				model: "damaging",
				text: withPercent("damaging", "This change is probably constructive."),
			})
		} else if (damagingBand === "mediumLow") {
			points.push({
				model: "damaging",
				text: withPercent("damaging", "This change might be constructive."),
			})
		} else if (damagingBand === "neutral" && isDebugEnabled()) {
			points.push({
				model: "damaging",
				text: withPercent("damaging", "This change has unclear damaging signals."),
			})
		}

		const revertriskBand = byModel.revertrisk
		if (revertriskBand === "high") {
			points.push({
				model: "revertrisk",
				text: withPercent("revertrisk", "This change has very high revert risk."),
			})
		} else if (revertriskBand === "mediumHigh") {
			points.push({
				model: "revertrisk",
				text: withPercent("revertrisk", "This change has high revert risk."),
			})
		} else if (revertriskBand === "low") {
			points.push({
				model: "revertrisk",
				text: withPercent("revertrisk", "This change has very low revert risk."),
			})
		} else if (revertriskBand === "mediumLow") {
			points.push({
				model: "revertrisk",
				text: withPercent("revertrisk", "This change has low revert risk."),
			})
		} else if (revertriskBand === "neutral" && isDebugEnabled()) {
			points.push({
				model: "revertrisk",
				text: withPercent("revertrisk", "This change has an unclear revert risk."),
			})
		}

		return points
	}

	function getPredictionText(revisionId: number): string | null {
		return getCombinedPredictionText(revisionId)
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

	function getPrediction(
		revisionId: number,
		model: PredictionModel
	): FWLiftWingPrediction | null {
		if (failedPredictions.value.has(revisionId)) {
			return null
		}
		const predictions = revisionPredictions.value.get(revisionId)
		if (!predictions) {
			void loadPrediction(revisionId)
			return null
		}
		return predictions[model] ?? null
	}

	function getPredictionDisplayProbabilityForModel(
		revisionId: number,
		model: PredictionModel
	): number | null {
		const prediction = getPrediction(revisionId, model)
		if (!prediction) {
			return null
		}
		return getBestProbability(prediction)
	}

	return {
		revisionPredictions,
		loadingPredictions,
		getPredictionIcon,
		getPredictionText,
		getCombinedPredictionText,
		getCombinedPredictionPoints,
		getPredictionPercentages,
		getPrediction,
		getPredictionDisplayProbabilityForModel,
	}
}
