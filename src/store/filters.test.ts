import { describe, expect, it } from 'vitest';
import { applyFilters } from './useDashboardStore';
import type { Filter, Row } from '../lib/types';

const rows: Row[] = [
  { city: 'NYC', price: '100', day: '2025-01-05' },
  { city: 'LA', price: '250', day: '2025-02-10' },
  { city: 'NYC', price: '400', day: '2025-03-15' },
  { city: 'SF', price: '150', day: '2025-04-20' },
];

describe('applyFilters', () => {
  it('returns all rows when no filters', () => {
    expect(applyFilters(rows, [])).toHaveLength(4);
  });

  it('categorical filter matches OR within values', () => {
    const f: Filter = { id: 'cat:city', kind: 'categorical', column: 'city', values: ['NYC', 'SF'] };
    const out = applyFilters(rows, [f]);
    expect(out.map((r) => r.city)).toEqual(['NYC', 'NYC', 'SF']);
  });

  it('numeric range filter', () => {
    const f: Filter = { id: 'num:price', kind: 'numericRange', column: 'price', min: 150, max: 300 };
    const out = applyFilters(rows, [f]);
    expect(out.map((r) => r.price)).toEqual(['250', '150']);
  });

  it('date range filter (inclusive ISO bounds)', () => {
    const f: Filter = { id: 'date:day', kind: 'dateRange', column: 'day', from: '2025-02-01', to: '2025-03-31' };
    const out = applyFilters(rows, [f]);
    expect(out.map((r) => r.day)).toEqual(['2025-02-10', '2025-03-15']);
  });

  it('multiple filters combine with AND', () => {
    const filters: Filter[] = [
      { id: 'cat:city', kind: 'categorical', column: 'city', values: ['NYC'] },
      { id: 'num:price', kind: 'numericRange', column: 'price', min: 200 },
    ];
    const out = applyFilters(rows, filters);
    expect(out).toHaveLength(1);
    expect(out[0].price).toBe('400');
  });
});
