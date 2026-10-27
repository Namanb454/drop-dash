/**
 * Value-level parsing and the primary ratios (TRD §4.1, §4.2). All pure.
 */

import { BOOLEAN_PAIRS, NULL_TOKENS } from './config';

/**
 * Normalize a raw cell to either null (if it's a null-ish token) or its trimmed
 * string. Original casing is preserved for display; the null check is
 * case-insensitive (TRD §4.1).
 */
export function normalizeValue(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return NULL_TOKENS.has(trimmed.toLowerCase()) ? null : trimmed;
}

/** Non-null, normalized values from a raw column. */
export function normalizeColumn(values: (string | null | undefined)[]): {
  nonNull: string[];
  nullCount: number;
} {
  const nonNull: string[] = [];
  let nullCount = 0;
  for (const v of values) {
    const n = normalizeValue(v);
    if (n === null) nullCount++;
    else nonNull.push(n);
  }
  return { nonNull, nullCount };
}

const NUMERIC_RE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * Parse a value as a number, tolerating a leading currency symbol, thousands
 * separators, and a trailing percent sign (TRD §4.2). Returns null if not
 * numeric. A trailing `%` divides by 100.
 */
export function parseNumeric(value: string): number | null {
  let s = value.trim();
  if (s === '') return null;

  let percent = false;
  if (s.endsWith('%')) {
    percent = true;
    s = s.slice(0, -1).trim();
  }
  // Strip a single leading currency symbol.
  s = s.replace(/^[$€£¥]\s?/, '');
  // Strip thousands separators (commas between digits).
  s = s.replace(/,/g, '');
  // Parentheses accounting negatives, e.g. (1,234) → -1234.
  if (/^\(.*\)$/.test(s)) s = `-${s.slice(1, -1)}`;

  if (!NUMERIC_RE.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return percent ? n / 100 : n;
}

export function isNumeric(value: string): boolean {
  return parseNumeric(value) !== null;
}

/** Fraction of non-null values that parse as numbers. */
export function numericRatio(nonNull: string[]): number {
  if (nonNull.length === 0) return 0;
  let n = 0;
  for (const v of nonNull) if (isNumeric(v)) n++;
  return n / nonNull.length;
}

/**
 * Boolean analysis (TRD §4.4). A column is boolean only if EVERY non-null value
 * falls within a single true/false pair. Returns the ratio of matched values for
 * the best-fitting pair plus whether the column fully matched one pair.
 */
export function booleanAnalysis(nonNull: string[]): { ratio: number; matched: boolean } {
  if (nonNull.length === 0) return { ratio: 0, matched: false };
  const lower = nonNull.map((v) => v.toLowerCase());

  let best = 0;
  let matched = false;
  for (const pair of BOOLEAN_PAIRS) {
    const set = new Set(pair);
    let inPair = 0;
    for (const v of lower) if (set.has(v)) inPair++;
    const ratio = inPair / lower.length;
    if (ratio > best) best = ratio;
    if (inPair === lower.length) matched = true;
  }
  return { ratio: best, matched };
}

/** Distinct-value count over non-null values. */
export function distinctCount(nonNull: string[]): number {
  return new Set(nonNull).size;
}

/** Top-N values by frequency. */
export function topValues(nonNull: string[], limit: number): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of nonNull) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}
