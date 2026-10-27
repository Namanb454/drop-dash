import { describe, expect, it } from 'vitest';
import { buildStats, inferColumn, inferSchema, overrideColumnType } from './infer';
import { parseDate, analyzeDateColumn } from './dates';
import { parseNumeric, booleanAnalysis, normalizeValue } from './ratios';

const col = (values: (string | null)[], name = 'c') => inferColumn(values, name, 0);

describe('parseNumeric', () => {
  it('parses plain, currency, percent, thousands, and accounting negatives', () => {
    expect(parseNumeric('42')).toBe(42);
    expect(parseNumeric('-3.5')).toBe(-3.5);
    expect(parseNumeric('$1,234.50')).toBe(1234.5);
    expect(parseNumeric('50%')).toBe(0.5);
    expect(parseNumeric('(1,000)')).toBe(-1000);
    expect(parseNumeric('1e3')).toBe(1000);
  });
  it('rejects non-numbers', () => {
    expect(parseNumeric('abc')).toBeNull();
    expect(parseNumeric('')).toBeNull();
    expect(parseNumeric('12px')).toBeNull();
  });
});

describe('parseDate', () => {
  it('parses ISO, slashes, and month names', () => {
    expect(parseDate('2025-01-05')).toBe('2025-01-05');
    expect(parseDate('2025-01-05T13:30:00Z')).toBe('2025-01-05');
    expect(parseDate('2025/01/05')).toBe('2025-01-05');
    expect(parseDate('Jan 5, 2025')).toBe('2025-01-05');
    expect(parseDate('5 Jan 2025')).toBe('2025-01-05');
    expect(parseDate('2025-01')).toBe('2025-01-01');
  });
  it('respects day-first for ambiguous numeric dates', () => {
    expect(parseDate('05/01/2025', false)).toBe('2025-05-01'); // month-first
    expect(parseDate('05/01/2025', true)).toBe('2025-01-05'); // day-first
  });
  it('does NOT treat a bare 4-digit year as a date', () => {
    expect(parseDate('2024')).toBeNull();
  });
  it('rejects invalid calendar dates', () => {
    expect(parseDate('2025-02-30')).toBeNull();
    expect(parseDate('2025-13-01')).toBeNull();
  });
  it('detects day-first at the column level when a day > 12 appears', () => {
    const a = analyzeDateColumn(['13/01/2025', '05/02/2025']);
    expect(a.dayFirst).toBe(true);
    expect(a.isoValues).toEqual(['2025-01-13', '2025-02-05']);
  });
});

describe('null normalization (mixed representations)', () => {
  it('treats common null tokens as null', () => {
    for (const t of ['', 'NA', 'n/a', 'NULL', '-', 'NaN', 'undefined']) {
      expect(normalizeValue(t)).toBeNull();
    }
    expect(normalizeValue('  0  ')).toBe('0'); // 0 is a real value, not null
  });
  it('computes nullRatio across mixed null representations', () => {
    const c = col(['1', 'NA', '', '-', '2', 'n/a']);
    expect(c.ratios.nullRatio).toBeCloseTo(4 / 6, 5);
    expect(c.stats.count).toBe(2);
  });
});

describe('inferColumn — required fixture cases (TRD §9)', () => {
  it('plain numeric → numeric', () => {
    const c = col(['10.5', '20.1', '3.14', '99', '0.5', '42.0', '7', '88.8']);
    expect(c.type).toBe('numeric');
    expect(c.stats.min).toBeCloseTo(0.5);
    expect(c.stats.max).toBeCloseTo(99);
    expect(typeof c.stats.mean).toBe('number');
  });

  it('ZIP-code-like numeric-but-categorical → categorical', () => {
    // low distinct count, numeric, code-like name
    const zips = ['90210', '10001', '90210', '60614', '10001', '90210', '60614', '10001'];
    const c = col(zips, 'zip_code');
    expect(c.ratios.numericRatio).toBe(1);
    expect(c.type).toBe('categorical');
  });

  it('dates in 2+ formats → date', () => {
    const c = col(['2025-01-01', 'Jan 2, 2025', '2025/01/03', '2025-01-04', 'Jan 5, 2025']);
    expect(c.type).toBe('date');
    expect(c.ratios.dateRatio).toBeGreaterThanOrEqual(0.95);
    expect(c.stats.minDate).toBe('2025-01-01');
    expect(c.stats.maxDate).toBe('2025-01-05');
  });

  it('ID column → identifier (excluded from charts)', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `user_${1000 + i}`);
    const c = col(ids, 'user_id');
    expect(c.type).toBe('identifier');
  });

  it('uuid column without id-name → identifier', () => {
    const uuids = Array.from({ length: 25 }, (_, i) =>
      `550e8400-e29b-41d4-a716-${String(446655440000 + i).padStart(12, '0')}`,
    );
    const c = col(uuids, 'ref');
    expect(c.type).toBe('identifier');
  });

  it('boolean-like Y/N → boolean', () => {
    const c = col(['Y', 'N', 'Y', 'Y', 'N', 'n', 'y', 'N'], 'active');
    expect(c.type).toBe('boolean');
    expect(c.ratios.booleanRatio).toBe(1);
  });

  it('true/false → boolean', () => {
    expect(col(['true', 'false', 'TRUE', 'False']).type).toBe('boolean');
  });

  it('low-cardinality strings → categorical', () => {
    const c = col(['red', 'green', 'blue', 'red', 'green', 'red', 'blue', 'green']);
    expect(c.type).toBe('categorical');
    expect(c.stats.topValues?.[0].count).toBeGreaterThan(1);
  });

  it('empty column → unknown', () => {
    const c = col(['', 'NA', null, 'n/a']);
    expect(c.type).toBe('unknown');
    expect(c.stats.count).toBe(0);
  });
});

describe('inferSchema', () => {
  it('classifies every column of a table', () => {
    const rows = [
      { id: '1', city: 'NYC', temp: '30.2', d: '2025-01-01', ok: 'yes' },
      { id: '2', city: 'LA', temp: '55.1', d: '2025-01-02', ok: 'no' },
      { id: '3', city: 'NYC', temp: '48.0', d: '2025-01-03', ok: 'yes' },
    ];
    const schema = inferSchema(rows, ['id', 'city', 'temp', 'd', 'ok']);
    const byName = Object.fromEntries(schema.map((s) => [s.name, s.type]));
    expect(byName.city).toBe('categorical');
    expect(byName.temp).toBe('numeric');
    expect(byName.d).toBe('date');
    expect(byName.ok).toBe('boolean');
  });
});

describe('booleanAnalysis', () => {
  it('requires all values in a single pair', () => {
    expect(booleanAnalysis(['yes', 'no', 'yes']).matched).toBe(true);
    expect(booleanAnalysis(['yes', 'no', 'maybe']).matched).toBe(false);
  });
});

describe('overrideColumnType (manual override)', () => {
  it('re-types a column and recomputes stats for the forced type', () => {
    // "units" 1..20 over many rows infers as categorical; user forces numeric.
    const values = Array.from({ length: 400 }, (_, i) => String((i % 20) + 1));
    const inferred = inferColumn(values, 'units', 0);
    expect(inferred.type).toBe('categorical');

    const forced = overrideColumnType(inferred, values, 'numeric');
    expect(forced.type).toBe('numeric');
    expect(forced.stats.min).toBe(1);
    expect(forced.stats.max).toBe(20);
    expect(typeof forced.stats.mean).toBe('number');
    expect(forced.rationale).toMatch(/manually set/i);
  });
});

describe('buildStats over a filtered subset', () => {
  it('recomputes numeric stats for a narrower row set', () => {
    const all = ['10', '20', '30', '40'];
    const subset = ['10', '20'];
    expect(buildStats('numeric', all, 0).max).toBe(40);
    expect(buildStats('numeric', subset, 0).max).toBe(20);
    expect(buildStats('numeric', subset, 0).mean).toBe(15);
  });
});
