import { describe, expect, it } from 'vitest';
import { buildHistogram, selectCharts } from './select';
import { inferSchema } from '../inference/infer';
import type { Row } from '../types';

function makeRows(n: number, fn: (i: number) => Row): Row[] {
  return Array.from({ length: n }, (_, i) => fn(i));
}

describe('buildHistogram', () => {
  it('bins numeric values into a clamped bin count', () => {
    const bins = buildHistogram(Array.from({ length: 100 }, (_, i) => i));
    expect(bins.length).toBeGreaterThanOrEqual(5);
    expect(bins.length).toBeLessThanOrEqual(30);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(100);
  });
  it('handles a constant column', () => {
    const bins = buildHistogram([7, 7, 7]);
    expect(bins).toHaveLength(1);
    expect(bins[0].count).toBe(3);
  });
});

describe('selectCharts — type → chart mapping (TRD §5.2)', () => {
  // Each mapping is checked with a focused, minimal dataset so the diversity cap
  // doesn't mask the underlying capability.
  it('single numeric → histogram', () => {
    const rows = makeRows(60, (i) => ({ price: String(10 + (i % 50)) }));
    const charts = selectCharts(inferSchema(rows, ['price']), rows);
    expect(charts.some((c) => c.chartType === 'histogram' && c.columns[0] === 'price')).toBe(true);
  });

  it('single categorical → bar', () => {
    const rows = makeRows(60, (i) => ({ city: ['NYC', 'LA', 'SF'][i % 3] }));
    const charts = selectCharts(inferSchema(rows, ['city']), rows);
    expect(charts.some((c) => c.chartType === 'bar' && c.columns[0] === 'city')).toBe(true);
  });

  it('date + numeric → line', () => {
    const rows = makeRows(60, (i) => ({
      day: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`,
      price: String(10 + ((i * 7) % 40)),
    }));
    const charts = selectCharts(inferSchema(rows, ['day', 'price']), rows);
    expect(charts.some((c) => c.chartType === 'line')).toBe(true);
  });

  it('categorical + numeric → grouped bar', () => {
    const rows = makeRows(60, (i) => ({
      city: ['NYC', 'LA', 'SF'][i % 3],
      price: String(10 + (i % 3) * 20 + (i % 5)),
    }));
    const charts = selectCharts(inferSchema(rows, ['city', 'price']), rows);
    expect(charts.some((c) => c.chartType === 'groupedBar')).toBe(true);
  });

  it('only emits known chart types', () => {
    const rows = makeRows(60, (i) => ({
      price: String(10 + (i % 50)),
      city: ['NYC', 'LA', 'SF'][i % 3],
      day: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    const charts = selectCharts(inferSchema(rows, ['price', 'city', 'day']), rows);
    for (const c of charts) {
      expect(['histogram', 'bar', 'line', 'scatter', 'groupedBar']).toContain(c.chartType);
    }
  });
});

describe('selectCharts — scatter for numeric pairs', () => {
  it('creates a scatter for two numeric columns', () => {
    const rows = makeRows(40, (i) => ({ x: String(i), y: String(i * 2 + (i % 3)) }));
    const schema = inferSchema(rows, ['x', 'y']);
    const charts = selectCharts(schema, rows);
    const scatter = charts.find((c) => c.chartType === 'scatter');
    expect(scatter).toBeDefined();
    expect(scatter!.columns.sort()).toEqual(['x', 'y']);
  });
});

describe('selectCharts — caps and ordering', () => {
  it('never returns more than 8 charts', () => {
    // Many numeric columns → many candidate scatters/histograms.
    const cols = Array.from({ length: 8 }, (_, i) => `n${i}`);
    const rows = makeRows(50, (i) => {
      const r: Row = {};
      for (let c = 0; c < cols.length; c++) r[cols[c]] = String((i * (c + 1)) % 97);
      return r;
    });
    const schema = inferSchema(rows, cols);
    const charts = selectCharts(schema, rows);
    expect(charts.length).toBeLessThanOrEqual(8);
  });

  it('is sorted by score descending', () => {
    const rows = makeRows(60, (i) => ({
      price: String(10 + (i % 50)),
      city: ['NYC', 'LA', 'SF'][i % 3],
      day: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    const schema = inferSchema(rows, ['price', 'city', 'day']);
    const charts = selectCharts(schema, rows);
    for (let i = 1; i < charts.length; i++) {
      expect(charts[i - 1].score).toBeGreaterThanOrEqual(charts[i].score);
    }
  });

  it('enforces per-column diversity (a column appears in ≤3 charts)', () => {
    const cols = Array.from({ length: 6 }, (_, i) => `n${i}`);
    const rows = makeRows(50, (i) => {
      const r: Row = {};
      for (let c = 0; c < cols.length; c++) r[cols[c]] = String((i * (c + 3)) % 89);
      return r;
    });
    const schema = inferSchema(rows, cols);
    const charts = selectCharts(schema, rows);
    const use = new Map<string, number>();
    for (const ch of charts) for (const col of ch.columns) use.set(col, (use.get(col) ?? 0) + 1);
    for (const count of use.values()) expect(count).toBeLessThanOrEqual(3);
  });

  it('excludes identifier columns from charts', () => {
    const rows = makeRows(30, (i) => ({ user_id: `u_${1000 + i}`, score: String(i % 20) }));
    const schema = inferSchema(rows, ['user_id', 'score']);
    const charts = selectCharts(schema, rows);
    expect(charts.every((c) => !c.columns.includes('user_id'))).toBe(true);
  });
});
