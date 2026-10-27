/**
 * Column type inference (TRD §4). Pure and framework-agnostic:
 * `inferColumn` classifies one column, `inferSchema` runs the whole table.
 */

import type { ColumnSchema, ColumnStats, ColumnType, InferenceRatios, Row } from '../types';
import { analyzeDateColumn } from './dates';
import {
  booleanAnalysis,
  distinctCount as countDistinct,
  isNumeric,
  normalizeColumn,
  numericRatio,
  parseNumeric,
  topValues,
} from './ratios';
import {
  CATEGORICAL_MAX_CARDINALITY,
  CATEGORICAL_MAX_DISTINCT,
  CATEGORICAL_NAME_HINT,
  IDENTIFIER_CARDINALITY,
  IDENTIFIER_MIN_ROWS,
  IDENTIFIER_NAME_HINT,
  INFERENCE_SAMPLE_ROWS,
  NUMERIC_CATEGORICAL_MAX_DISTINCT,
  NUMERIC_CATEGORICAL_MAX_FRACTION,
  RATIO_STRONG,
  TOP_VALUES_LIMIT,
} from './config';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_HEX_RE = /^[0-9a-f]{16,}$/i;

/** Deterministic uniform (stride) sample — reproducible, unlike RNG. */
function strideSample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[Math.floor(i)]);
  return out;
}

function looksLikeId(nonNull: string[]): boolean {
  // Sample a handful; if most look like uuids/long hashes, treat as identifier.
  const sample = nonNull.slice(0, 50);
  let hits = 0;
  for (const v of sample) {
    if (UUID_RE.test(v) || LONG_HEX_RE.test(v)) hits++;
  }
  return hits >= sample.length * 0.8;
}

function numericStats(nonNull: string[]): Pick<ColumnStats, 'min' | 'max' | 'mean'> {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let n = 0;
  for (const v of nonNull) {
    const num = parseNumeric(v);
    if (num === null) continue;
    if (num < min) min = num;
    if (num > max) max = num;
    sum += num;
    n++;
  }
  if (n === 0) return {};
  return { min, max, mean: sum / n };
}

interface ClassifyResult {
  type: ColumnType;
  rationale: string;
}

function classify(
  name: string,
  ratios: InferenceRatios,
  distinct: number,
  distinctCI: number,
  count: number,
  boolMatched: boolean,
  idLike: boolean,
): ClassifyResult {
  const { numericRatio: numR, dateRatio: dateR, cardinalityRatio: cardR } = ratios;
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  // 1. boolean (distinct compared case-insensitively, e.g. Y/y/N/n = 2)
  if (boolMatched && distinctCI <= 2) {
    return { type: 'boolean', rationale: `Only ${distinctCI} distinct value(s) from a true/false vocabulary.` };
  }

  // 2. date
  if (dateR >= RATIO_STRONG) {
    return { type: 'date', rationale: `${pct(dateR)} of values parse as dates.` };
  }

  // 3. identifier
  if (cardR >= IDENTIFIER_CARDINALITY && count >= IDENTIFIER_MIN_ROWS && (IDENTIFIER_NAME_HINT.test(name) || idLike)) {
    return { type: 'identifier', rationale: `Nearly unique (${pct(cardR)} distinct) — treated as an ID, excluded from charts.` };
  }

  // 4. numeric-but-categorical guard (keeps ZIP codes out of histograms)
  if (numR >= RATIO_STRONG) {
    const lowAbsolute = distinct <= NUMERIC_CATEGORICAL_MAX_DISTINCT && distinct <= count * NUMERIC_CATEGORICAL_MAX_FRACTION;
    const nameSaysCategory = CATEGORICAL_NAME_HINT.test(name) && cardR < CATEGORICAL_MAX_CARDINALITY;
    if (lowAbsolute || nameSaysCategory) {
      return {
        type: 'categorical',
        rationale: `${pct(numR)} numeric, but only ${distinct} distinct value(s)${nameSaysCategory ? ' and a code-like name' : ''} → treated as a category.`,
      };
    }
    // 5. numeric
    return { type: 'numeric', rationale: `${pct(numR)} of values are numbers.` };
  }

  // 6. categorical
  if (cardR <= CATEGORICAL_MAX_CARDINALITY || distinct <= CATEGORICAL_MAX_DISTINCT) {
    return { type: 'categorical', rationale: `${distinct} repeating value(s) (${pct(cardR)} distinct).` };
  }

  // 7. unknown
  return { type: 'unknown', rationale: `High-cardinality free text (${pct(cardR)} distinct) — no clear type.` };
}

/**
 * Classify a single column from its raw values. For very large columns, ratios
 * and cardinality are estimated from a uniform sample while summary stats still
 * use all values (TRD §8).
 */
export function inferColumn(rawValues: (string | null)[], name: string, index: number): ColumnSchema {
  const totalRows = rawValues.length;

  // Full pass: used for stats and the null ratio.
  const { nonNull: fullNonNull, nullCount } = normalizeColumn(rawValues);

  // Sample pass: used for the ratios / cardinality that drive classification.
  const sampled = totalRows > INFERENCE_SAMPLE_ROWS;
  const sampleNonNull = sampled
    ? normalizeColumn(strideSample(rawValues, INFERENCE_SAMPLE_ROWS)).nonNull
    : fullNonNull;

  const count = sampleNonNull.length;
  const distinctSample = countDistinct(sampleNonNull);
  const distinctCI = countDistinct(sampleNonNull.map((v) => v.toLowerCase()));
  const dateAnalysis = analyzeDateColumn(sampleNonNull);
  const bool = booleanAnalysis(sampleNonNull);

  const ratios: InferenceRatios = {
    numericRatio: numericRatio(sampleNonNull),
    dateRatio: dateAnalysis.ratio,
    cardinalityRatio: count === 0 ? 0 : distinctSample / count,
    nullRatio: totalRows === 0 ? 0 : nullCount / totalRows,
    booleanRatio: bool.ratio,
  };

  // Empty column short-circuit (TRD §4.6).
  if (fullNonNull.length === 0) {
    return {
      name,
      index,
      type: 'unknown',
      ratios,
      stats: { count: 0, nullCount, distinctCount: 0 },
      rationale: 'Column is entirely empty.',
    };
  }

  const idLike = looksLikeId(sampleNonNull);
  const { type, rationale } = classify(name, ratios, distinctSample, distinctCI, count, bool.matched, idLike);

  return { name, index, type, ratios, stats: buildStats(type, fullNonNull, nullCount), rationale };
}

/**
 * Build the summary stats for a column, tailored to its type. Reused for the
 * initial inference, manual type overrides, and recomputing stats over a
 * filtered row set.
 */
export function buildStats(type: ColumnType, nonNull: string[], nullCount: number): ColumnStats {
  const stats: ColumnStats = {
    count: nonNull.length,
    nullCount,
    distinctCount: countDistinct(nonNull),
  };
  if (type === 'numeric') {
    Object.assign(stats, numericStats(nonNull));
  } else if (type === 'date') {
    const isoAll = analyzeDateColumn(nonNull).isoValues.filter((v): v is string => v !== null).sort();
    stats.minDate = isoAll[0];
    stats.maxDate = isoAll[isoAll.length - 1];
  } else if (type === 'categorical' || type === 'boolean') {
    stats.topValues = topValues(nonNull, TOP_VALUES_LIMIT);
  }
  return stats;
}

/**
 * Return a copy of a column schema re-typed to `type` (manual override, TRD §12
 * / PRD §12). Stats are recomputed for the forced type; ratios are preserved.
 */
export function overrideColumnType(schema: ColumnSchema, rawValues: (string | null)[], type: ColumnType): ColumnSchema {
  const { nonNull, nullCount } = normalizeColumn(rawValues);
  return {
    ...schema,
    type,
    stats: buildStats(type, nonNull, nullCount),
    rationale: `Manually set to ${type}.`,
  };
}

/** Infer a schema for every column of a parsed table. */
export function inferSchema(rows: Row[], columns: string[]): ColumnSchema[] {
  return columns.map((name, index) => {
    const values = rows.map((r) => r[name] ?? null);
    return inferColumn(values, name, index);
  });
}

// Re-export shared helpers so callers (filters, filtered stats) reuse them.
export { isNumeric, parseNumeric, normalizeColumn };
