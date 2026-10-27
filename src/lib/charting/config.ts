/** Charting tunables (TRD §5). */

/** Maximum charts shown on the dashboard (TRD §5.4). */
export const MAX_CHARTS = 8;

/** A single column may appear in at most this many charts (diversity, §5.4). */
export const MAX_CHARTS_PER_COLUMN = 3;

/** Histogram bin bounds; Freedman–Diaconis count is clamped into this (§5.2). */
export const HISTOGRAM_MIN_BINS = 5;
export const HISTOGRAM_MAX_BINS = 30;

/** Scatter plots render at most this many points, downsampled (§8). */
export const SCATTER_MAX_POINTS = 2_000;

/** Categorical columns above this cardinality are not charted as bars. */
export const BAR_MAX_CATEGORIES = 30;
