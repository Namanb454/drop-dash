/**
 * Tunable inference thresholds (TRD §4.5, §8). Centralized so the classifier's
 * behavior can be adjusted in one place.
 */

/** A ratio at/above this counts as "essentially all" (numeric, date). */
export const RATIO_STRONG = 0.95;

/** Cardinality at/above this (with enough rows) suggests an identifier. */
export const IDENTIFIER_CARDINALITY = 0.99;

/** Minimum rows before the identifier rule is allowed to fire. */
export const IDENTIFIER_MIN_ROWS = 20;

/** Max distinct values for a numeric column to be re-read as categorical. */
export const NUMERIC_CATEGORICAL_MAX_DISTINCT = 20;

/** ...and distinct must also be within this fraction of the row count. */
export const NUMERIC_CATEGORICAL_MAX_FRACTION = 0.1;

/** A column with cardinalityRatio at/below this reads as categorical. */
export const CATEGORICAL_MAX_CARDINALITY = 0.5;

/** ...or with distinctCount at/below this. */
export const CATEGORICAL_MAX_DISTINCT = 50;

/** Above this row count, infer types from a sample rather than all rows (TRD §8). */
export const INFERENCE_SAMPLE_ROWS = 50_000;

/** How many top values to retain for categorical/boolean summaries. */
export const TOP_VALUES_LIMIT = 10;

/** Null-ish tokens, normalized to null before ratios (TRD §4.1). */
export const NULL_TOKENS = new Set(
  ['', 'na', 'n/a', 'null', 'none', 'nil', '-', '—', 'nan', 'undefined'].map((t) => t),
);

/** Boolean value pairs (TRD §4.4). Any column whose values all fall in ONE pair. */
export const BOOLEAN_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['true', 'false'],
  ['t', 'f'],
  ['yes', 'no'],
  ['y', 'n'],
  ['1', '0'],
  ['on', 'off'],
];

/** Column-name hints that push a low-cardinality numeric toward categorical. */
export const CATEGORICAL_NAME_HINT = /(zip|postal|phone|fips|ssn|year|code|category|cat|id)/i;

/** Column-name hints that a column is an identifier. */
export const IDENTIFIER_NAME_HINT = /(^|_)(id|uuid|guid|key)$/i;
