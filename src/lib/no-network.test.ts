import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCsvFile } from './csv/parse';
import { inferSchema } from './inference/infer';
import { selectCharts } from './charting/select';
import { applyFilters } from '../store/useDashboardStore';

/**
 * The no-network guarantee (PRD §9, TRD §11), enforced as a test: every network
 * egress API is stubbed, then the full data path (parse → infer → select →
 * filter) is exercised. If anything tries to touch the network, a spy fires and
 * the test fails. Complements the CSP `connect-src 'none'` in the shipped build.
 */
describe('no network egress during the data pipeline', () => {
  const spies: ReturnType<typeof vi.fn>[] = [];

  beforeEach(() => {
    spies.length = 0;
    const trap = (name: string) => {
      const fn = vi.fn(() => {
        throw new Error(`network call attempted via ${name}`);
      });
      spies.push(fn);
      return fn;
    };
    vi.stubGlobal('fetch', trap('fetch'));
    vi.stubGlobal('XMLHttpRequest', class {
      open = trap('XMLHttpRequest.open');
      send = trap('XMLHttpRequest.send');
      setRequestHeader = () => {};
    });
    vi.stubGlobal('WebSocket', trap('WebSocket'));
    vi.stubGlobal('EventSource', trap('EventSource'));
    if (typeof navigator !== 'undefined') {
      navigator.sendBeacon = trap('navigator.sendBeacon') as unknown as typeof navigator.sendBeacon;
    }
  });

  afterEach(() => vi.unstubAllGlobals());

  it('parses, infers, charts, and filters a real fixture without any network call', async () => {
    const content = readFileSync(join(process.cwd(), 'fixtures', 'sales.csv'));
    const file = new File([content], 'sales.csv', { type: 'text/csv' });

    const parsed = await parseCsvFile(file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const schema = inferSchema(parsed.value.rows, parsed.value.columns);
    const charts = selectCharts(schema, parsed.value.rows);
    expect(charts.length).toBeGreaterThan(0);

    const filtered = applyFilters(parsed.value.rows, [
      { id: 'cat:city', kind: 'categorical', column: 'city', values: ['New York'] },
    ]);
    expect(filtered.length).toBeGreaterThan(0);

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
