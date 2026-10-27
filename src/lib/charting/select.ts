/**
 * Chart selection (TRD §5). Pure: given schemas + rows, produce a scored,
 * diversity-capped list of at most MAX_CHARTS chart specs with precomputed data.
 */

import type { ChartSpec, ColumnSchema, Row } from '../types';
import { analyzeDateColumn } from '../inference/dates';
import { parseNumeric } from '../inference/ratios';
import {
  BAR_MAX_CATEGORIES,
  HISTOGRAM_MAX_BINS,
  HISTOGRAM_MIN_BINS,
  MAX_CHARTS,
  MAX_CHARTS_PER_COLUMN,
  SCATTER_MAX_POINTS,
} from './config';
import {
  categoricalBalanceScore,
  groupDifferentiationScore,
  numericSpreadScore,
  pearsonAbs,
  timeCoverageScore,
  withNullPenalty,
} from './scoring';

// ---- chart-ready data shapes (consumed by components/charts) ----
export interface HistogramDatum { label: string; count: number; x0: number; x1: number; }
export interface BarDatum { name: string; count: number; }
export interface LineDatum { x: string; y: number; }
export interface GroupedBarDatum { name: string; value: number; }
export interface ScatterDatum { x: number; y: number; }

// ---- value extraction ----
function numericValues(rows: Row[], col: string): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const raw = r[col];
    if (raw == null) continue;
    const n = parseNumeric(raw);
    if (n !== null) out.push(n);
  }
  return out;
}

function categoryCounts(rows: Row[], col: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const raw = r[col];
    if (raw == null || raw.trim() === '') continue;
    const v = raw.trim();
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

// ---- data builders ----
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function buildHistogram(values: number[]): HistogramDatum[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [{ label: String(min), count: values.length, x0: min, x1: max }];

  // Freedman–Diaconis bin width, clamped to a sane bin count.
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const fdWidth = iqr > 0 ? (2 * iqr) / Math.cbrt(values.length) : 0;
  let bins = fdWidth > 0 ? Math.ceil((max - min) / fdWidth) : HISTOGRAM_MIN_BINS;
  bins = Math.max(HISTOGRAM_MIN_BINS, Math.min(HISTOGRAM_MAX_BINS, bins));

  const width = (max - min) / bins;
  const out: HistogramDatum[] = [];
  for (let i = 0; i < bins; i++) {
    const x0 = min + i * width;
    const x1 = i === bins - 1 ? max : x0 + width;
    out.push({ label: `${fmt(x0)}–${fmt(x1)}`, count: 0, x0, x1 });
  }
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    out[idx].count++;
  }
  return out;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function buildBarCounts(rows: Row[], col: string): BarDatum[] {
  return [...categoryCounts(rows, col).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, BAR_MAX_CATEGORIES)
    .map(([name, count]) => ({ name, count }));
}

/** Group a date column against a numeric column into a time series (mean). */
export function buildLine(rows: Row[], dateCol: string, numCol: string): { data: LineDatum[]; coverage: number } {
  const isoAll = analyzeDateColumn(rows.map((r) => r[dateCol] ?? '')).isoValues;
  const pairs: { iso: string; y: number }[] = [];
  rows.forEach((r, i) => {
    const iso = isoAll[i];
    const y = r[numCol] != null ? parseNumeric(r[numCol]!) : null;
    if (iso && y !== null) pairs.push({ iso, y });
  });
  if (pairs.length === 0) return { data: [], coverage: 0 };

  // Bucket by day; if too many days, bucket by month.
  const distinctDays = new Set(pairs.map((p) => p.iso)).size;
  const byMonth = distinctDays > 60;
  const key = (iso: string) => (byMonth ? iso.slice(0, 7) : iso);

  const sums = new Map<string, { sum: number; n: number }>();
  for (const p of pairs) {
    const k = key(p.iso);
    const cur = sums.get(k) ?? { sum: 0, n: 0 };
    cur.sum += p.y;
    cur.n++;
    sums.set(k, cur);
  }
  const data = [...sums.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([x, { sum, n }]) => ({ x, y: sum / n }));

  const coverage = timeCoverageScore(data.length, Math.max(data.length, distinctDays === 0 ? 1 : distinctDays));
  return { data, coverage };
}

/** Mean of a numeric column per category. */
export function buildGroupedBar(rows: Row[], catCol: string, numCol: string): GroupedBarDatum[] {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const cat = r[catCol];
    const num = r[numCol] != null ? parseNumeric(r[numCol]!) : null;
    if (cat == null || cat.trim() === '' || num === null) continue;
    const k = cat.trim();
    const cur = sums.get(k) ?? { sum: 0, n: 0 };
    cur.sum += num;
    cur.n++;
    sums.set(k, cur);
  }
  return [...sums.entries()]
    .map(([name, { sum, n }]) => ({ name, value: sum / n }))
    .sort((a, b) => b.value - a.value)
    .slice(0, BAR_MAX_CATEGORIES);
}

export function buildScatter(rows: Row[], xCol: string, yCol: string): { data: ScatterDatum[]; r: number } {
  const all: ScatterDatum[] = [];
  for (const row of rows) {
    const x = row[xCol] != null ? parseNumeric(row[xCol]!) : null;
    const y = row[yCol] != null ? parseNumeric(row[yCol]!) : null;
    if (x !== null && y !== null) all.push({ x, y });
  }
  const r = pearsonAbs(all.map((p) => p.x), all.map((p) => p.y));
  // Downsample for rendering (§8) but score on the full set above.
  const data = downsample(all, SCATTER_MAX_POINTS);
  return { data, r };
}

function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[Math.floor(i)]);
  return out;
}

// ---- candidate generation + selection ----
const isChartableCategorical = (s: ColumnSchema) =>
  (s.type === 'categorical' || s.type === 'boolean') && s.stats.distinctCount <= BAR_MAX_CATEGORIES && s.stats.distinctCount >= 1;

export function selectCharts(schemas: ColumnSchema[], rows: Row[]): ChartSpec[] {
  const numeric = schemas.filter((s) => s.type === 'numeric');
  const categorical = schemas.filter(isChartableCategorical);
  const dates = schemas.filter((s) => s.type === 'date');

  const candidates: ChartSpec[] = [];
  const add = (spec: Omit<ChartSpec, 'id'>) => {
    if ((spec.data as unknown[]).length === 0) return;
    candidates.push({ ...spec, id: `${spec.chartType}:${spec.columns.join('~')}` });
  };

  // single numeric → histogram
  for (const s of numeric) {
    const vals = numericValues(rows, s.name);
    add({
      chartType: 'histogram',
      title: `Distribution of ${s.name}`,
      columns: [s.name],
      data: buildHistogram(vals),
      score: withNullPenalty(numericSpreadScore(vals), s.ratios.nullRatio),
    });
  }

  // single categorical / boolean → bar (counts)
  for (const s of categorical) {
    const data = buildBarCounts(rows, s.name);
    add({
      chartType: 'bar',
      title: `Count by ${s.name}`,
      columns: [s.name],
      data,
      score: withNullPenalty(categoricalBalanceScore(data.map((d) => d.count)), s.ratios.nullRatio),
    });
  }

  // date + numeric → line
  for (const d of dates) {
    for (const n of numeric) {
      const { data, coverage } = buildLine(rows, d.name, n.name);
      add({
        chartType: 'line',
        title: `${n.name} over ${d.name}`,
        columns: [d.name, n.name],
        data,
        score: withNullPenalty(coverage * numericSpreadScore(data.map((p) => p.y)), n.ratios.nullRatio),
      });
    }
  }

  // categorical + numeric → grouped bar (mean)
  for (const c of categorical) {
    for (const n of numeric) {
      const data = buildGroupedBar(rows, c.name, n.name);
      add({
        chartType: 'groupedBar',
        title: `Average ${n.name} by ${c.name}`,
        columns: [c.name, n.name],
        data,
        score: withNullPenalty(groupDifferentiationScore(data.map((d) => d.value)), n.ratios.nullRatio),
      });
    }
  }

  // numeric + numeric → scatter (unique unordered pairs)
  for (let i = 0; i < numeric.length; i++) {
    for (let j = i + 1; j < numeric.length; j++) {
      const a = numeric[i];
      const b = numeric[j];
      const { data, r } = buildScatter(rows, a.name, b.name);
      add({
        chartType: 'scatter',
        title: `${a.name} vs ${b.name}`,
        columns: [a.name, b.name],
        data,
        score: withNullPenalty(r, Math.max(a.ratios.nullRatio, b.ratios.nullRatio)),
      });
    }
  }

  // Select in phases so important chart kinds aren't crowded out of their
  // diversity budget by whichever candidates happen to score highest:
  //   1. univariate distribution views (histogram / count bar)
  //   2. one "temporal primary" line per date column — time series is the
  //      expected default for dated data, so it gets priority over scatters
  //   3. all remaining bivariate charts, by score
  // Every phase respects the per-column diversity cap and the global cap.
  const byScore = (a: ChartSpec, b: ChartSpec) => b.score - a.score;
  const isUnivariate = (c: ChartSpec) => c.chartType === 'histogram' || c.chartType === 'bar';

  const univariate = candidates.filter(isUnivariate).sort(byScore);

  const temporalPrimary: ChartSpec[] = [];
  const seenDateCol = new Set<string>();
  for (const line of candidates.filter((c) => c.chartType === 'line').sort(byScore)) {
    const dateCol = line.columns[0];
    if (!seenDateCol.has(dateCol)) {
      seenDateCol.add(dateCol);
      temporalPrimary.push(line);
    }
  }

  const rest = candidates
    .filter((c) => !isUnivariate(c) && !temporalPrimary.includes(c))
    .sort(byScore);

  const chosen: ChartSpec[] = [];
  const columnUse = new Map<string, number>();
  const take = (specs: ChartSpec[]) => {
    for (const spec of specs) {
      if (chosen.length >= MAX_CHARTS) break;
      const overused = spec.columns.some((c) => (columnUse.get(c) ?? 0) >= MAX_CHARTS_PER_COLUMN);
      if (overused) continue;
      chosen.push(spec);
      for (const c of spec.columns) columnUse.set(c, (columnUse.get(c) ?? 0) + 1);
    }
  };
  take(univariate);
  take(temporalPrimary);
  take(rest);
  // Present in score order (selection priority above is independent of display).
  return chosen.sort((a, b) => b.score - a.score);
}

/**
 * Recompute a chart's data for a (possibly filtered) row set, keeping the chart
 * selection itself stable. Used so filters update charts without reshuffling the
 * dashboard (TRD §7).
 */
export function computeChartData(spec: ChartSpec, rows: Row[]): unknown[] {
  const [a, b] = spec.columns;
  switch (spec.chartType) {
    case 'histogram':
      return buildHistogram(numericValues(rows, a));
    case 'bar':
      return buildBarCounts(rows, a);
    case 'line':
      return buildLine(rows, a, b).data;
    case 'groupedBar':
      return buildGroupedBar(rows, a, b);
    case 'scatter':
      return buildScatter(rows, a, b).data;
    default:
      return spec.data as unknown[];
  }
}
