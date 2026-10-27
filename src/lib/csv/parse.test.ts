import { describe, expect, it } from 'vitest';
import { parseCsvFile } from './parse';

function csvFile(content: string, name = 'data.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('parseCsvFile — guards', () => {
  it('rejects an empty file', async () => {
    const r = await parseCsvFile(csvFile(''));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/i);
  });

  it('rejects a non-CSV extension', async () => {
    const r = await parseCsvFile(new File(['a,b\n1,2'], 'photo.png', { type: 'image/png' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/csv|tsv/i);
  });
});

describe('parseCsvFile — parsing', () => {
  it('parses a simple CSV into rows + columns', async () => {
    const r = await parseCsvFile(csvFile('name,age\nAda,36\nGrace,45\n'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.columns).toEqual(['name', 'age']);
      expect(r.value.rows).toHaveLength(2);
      expect(r.value.rows[0]).toEqual({ name: 'Ada', age: '36' });
      expect(r.value.truncated).toBe(false);
    }
  });

  it('auto-detects TSV delimiter', async () => {
    const r = await parseCsvFile(csvFile('a\tb\n1\t2\n', 'data.tsv'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.columns).toEqual(['a', 'b']);
  });

  it('reports a header-only file as having no data rows', async () => {
    const r = await parseCsvFile(csvFile('a,b,c\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no data rows/i);
  });

  it('truncates beyond the row hard cap and flags it', async () => {
    const body = Array.from({ length: 50 }, (_, i) => `${i},x`).join('\n');
    const r = await parseCsvFile(csvFile(`id,label\n${body}\n`), { rowHardCap: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.rows).toHaveLength(10);
      expect(r.value.truncated).toBe(true);
      expect(r.value.totalRows).toBeGreaterThan(10);
    }
  });
});
