export const PROTOTYPE_NAME = "RelatedRecommendations"

/** Duration for thank heart animation (ms). */
export const HEART_RISE_DURATION_MS = 2500

/** Default "keep top N%" for getTopRelatedPages (debug slider). */
export const DEFAULT_TOP_PERCENT = 3

/** Max recommended pages to fetch history for. */
export const RECOMMENDATION_MAX_PAGES = 12

/** Concurrency for getPageHistory when loading recommendation revisions. */
export const RECOMMENDATION_HISTORY_CONCURRENCY = 2

/** Concurrency for processing revisions (summary HTML, user category). */
export const RECOMMENDATION_PROCESS_CONCURRENCY = 3
