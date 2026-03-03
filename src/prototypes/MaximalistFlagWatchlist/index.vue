<template>
	<FlaggedWatchlistDualPredictions
		:predictor-models="predictorModels"
		prototype-name="MaximalistFlagWatchlist"
		heading="Multiple flag watchlist"
	/>
</template>

<script setup lang="ts">
import type { FWPredictionModel } from "fakewiki/types"
import FlaggedWatchlistDualPredictions from "../FlaggedWatchlistDualPredictions/index.vue"

const predictorModels: FWPredictionModel[] = [
	"damaging",
	"goodfaith",
	"revertrisk",
	"revertrisk-multilingual",
]
</script>
