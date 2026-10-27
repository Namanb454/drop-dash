/**
 * Interestingness heuristics (TRD §5.3). Each returns a score in ~[0,1]; higher
 * means "more worth showing". All pure, array-in / number-out.
 */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

/**
 * Numeric spread: a constant column is boring (0); a well-dispersed one is
 * interesting. Uses std normalized by range so it's scale-independent.
 */
export function numericSpreadScore(values: number[]): number {
  if (values.length < 2) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  if (range === 0) return 0;
  return clamp01((std(values) / range) * 2.5);
}

/**
 * Categorical balance: normalized Shannon entropy. A column that's 99% one value
 * scores near 0; an evenly split one scores near 1.
 */
export function categoricalBalanceScore(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  const k = counts.filter((c) => c > 0).length;
  if (total === 0 || k <= 1) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log(p);
  }
  return clamp01(h / Math.log(k));
}

/** Absolute Pearson correlation between two equal-length numeric arrays. */
export function pearsonAbs(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return clamp01(Math.abs(num / Math.sqrt(dx * dy)));
}

/** Time coverage: fraction of time buckets that actually contain data. */
export function timeCoverageScore(bucketsWithData: number, totalBuckets: number): number {
  if (totalBuckets <= 0) return 0;
  return clamp01(bucketsWithData / totalBuckets);
}

/** Group differentiation: do per-group aggregates actually differ? */
export function groupDifferentiationScore(groupMeans: number[]): number {
  if (groupMeans.length < 2) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of groupMeans) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  if (range === 0) return 0;
  return clamp01((std(groupMeans) / range) * 2.5);
}

/** Apply the null penalty from §5.3. */
export function withNullPenalty(score: number, nullRatio: number): number {
  return score * (1 - nullRatio);
}
