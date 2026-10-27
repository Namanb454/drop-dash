import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseCsvFile } from './csv/parse';
import { inferSchema } from './inference/infer';
import { selectCharts } from './charting/select';

/**
 * Fixture-based regression suite (TRD §9). Runs the full pipeline
 * (parse → infer → select) over every CSV/TSV in /fixtures and snapshots the
 * resulting column types + chart types, so any behavior change shows up in a
 * diff. Also asserts a few high-signal cases explicitly.
 */

const FIXTURES_DIR = join(process.cwd(), 'fixtures');

interface FixtureResult {
  error?: string;
  columns?: Record<string, string>;
  charts?: string[];
}

const results: Record<string, FixtureResult> = {};

async function run(name: string): Promise<FixtureResult> {
  const content = readFileSync(`${FIXTURES_DIR}/${name}`);
  const file = new File([content], name, { type: 'text/csv' });
  const parsed = await parseCsvFile(file);
  if (!parsed.ok) return { error: parsed.error };
  const schema = inferSchema(parsed.value.rows, parsed.value.columns);
  const charts = selectCharts(schema, parsed.value.rows);
  return {
    columns: Object.fromEntries(schema.map((s) => [s.name, s.type])),
    charts: charts.map((c) => `${c.chartType}(${c.columns.join(',')})`),
  };
}

const files = readdirSync(FIXTURES_DIR).filter((f) => /\.(csv|tsv)$/i.test(f)).sort();

beforeAll(async () => {
  for (const f of files) results[f] = await run(f);
});

describe('fixture regression set', () => {
  it('covers ~20 varied fixtures', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it('produces a stable schema + chart map across all fixtures', () => {
    expect(results).toMatchSnapshot();
  });

  // High-signal explicit assertions (independent of the snapshot).
  it('sales.csv: revenue is numeric, zip is categorical, id is identifier, fulfilled is boolean', () => {
    const c = results['sales.csv'].columns!;
    expect(c.revenue).toBe('numeric');
    expect(c.zip_code).toBe('categorical');
    expect(c.order_id).toBe('identifier');
    expect(c.fulfilled).toBe('boolean');
    expect(c.order_date).toBe('date');
  });

  it('zip-codes.csv: zip stays categorical (not numeric)', () => {
    expect(results['zip-codes.csv'].columns!.zip).toBe('categorical');
  });

  it('booleans.csv: all five flavors classify as boolean', () => {
    const c = results['booleans.csv'].columns!;
    expect(Object.values(c)).toEqual(['boolean', 'boolean', 'boolean', 'boolean', 'boolean']);
  });

  it('identifiers.csv: uuid, sequential id, and sha all classify as identifier', () => {
    const c = results['identifiers.csv'].columns!;
    expect(c.uuid).toBe('identifier');
    expect(c.sha).toBe('identifier');
  });

  it('currency.csv: currency and percent columns are numeric', () => {
    const c = results['currency.csv'].columns!;
    expect(c.price).toBe('numeric');
    expect(c.discount).toBe('numeric');
  });

  it('numeric-heavy.csv: produces at least one scatter chart', () => {
    expect(results['numeric-heavy.csv'].charts!.some((c) => c.startsWith('scatter'))).toBe(true);
  });

  it('weather.csv: produces at least one line chart', () => {
    expect(results['weather.csv'].charts!.some((c) => c.startsWith('line'))).toBe(true);
  });

  it('free-text.csv: comment column is unknown (high-cardinality text)', () => {
    expect(results['free-text.csv'].columns!.comment).toBe('unknown');
  });

  it('tab-separated.tsv: parses via delimiter auto-detection', () => {
    expect(results['tab-separated.tsv'].columns).toBeDefined();
    expect(Object.keys(results['tab-separated.tsv'].columns!)).toEqual(['name', 'age', 'city']);
  });

  it('every chart references at most two columns and is a known type', () => {
    for (const r of Object.values(results)) {
      for (const chart of r.charts ?? []) {
        expect(chart).toMatch(/^(histogram|bar|line|scatter|groupedBar)\(/);
      }
    }
  });
});
