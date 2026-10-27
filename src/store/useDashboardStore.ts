import { useMemo } from 'react';
import { create } from 'zustand';
import type { ChartSpec, ColumnSchema, ColumnType, Filter, Row } from '../lib/types';
import { analyzeDateColumn } from '../lib/inference/dates';
import { parseNumeric } from '../lib/inference/ratios';
import { buildStats, normalizeColumn, overrideColumnType } from '../lib/inference/infer';
import { selectCharts } from '../lib/charting/select';

/**
 * Global dashboard state (TRD §7). Raw rows are never mutated; the filtered view
 * is a memoized selector derived from rawRows + activeFilters.
 */

export type Status = 'idle' | 'parsing' | 'ready' | 'error';

interface ParsedPayload {
  fileName: string;
  rows: Row[];
  columnSchemas: ColumnSchema[];
  charts: ChartSpec[];
  truncated: boolean;
  totalRows: number;
}

interface DashboardState {
  status: Status;
  error: string | null;
  fileName: string | null;
  progressRows: number;

  rawRows: Row[];
  columnSchemas: ColumnSchema[];
  charts: ChartSpec[];

  /** As-inferred schemas, before any manual type override. */
  baseSchemas: ColumnSchema[];
  /** User overrides of a column's inferred type (PRD §12). */
  typeOverrides: Record<string, ColumnType>;

  /** True if the file exceeded the row cap and was truncated (TRD §8). */
  truncated: boolean;
  /** Row count seen before the cap. */
  totalRows: number;

  activeFilters: Filter[];

  // actions
  setParsing: (fileName: string) => void;
  setProgress: (rows: number) => void;
  loadParsed: (payload: ParsedPayload) => void;
  setError: (message: string) => void;
  reset: () => void;

  /** Manually re-type a column; re-derives stats and re-runs chart selection. */
  setColumnType: (column: string, type: ColumnType) => void;
  /** Clear a manual override, reverting to the inferred type. */
  resetColumnType: (column: string) => void;

  addFilter: (filter: Filter) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
  /** Add a categorical filter, or toggle a value into an existing one. */
  toggleCategoryValue: (column: string, value: string) => void;
}

const initial = {
  status: 'idle' as Status,
  error: null,
  fileName: null,
  progressRows: 0,
  rawRows: [] as Row[],
  columnSchemas: [] as ColumnSchema[],
  charts: [] as ChartSpec[],
  baseSchemas: [] as ColumnSchema[],
  typeOverrides: {} as Record<string, ColumnType>,
  truncated: false,
  totalRows: 0,
  activeFilters: [] as Filter[],
};

/** Re-derive effective schemas from base + overrides, then re-run selection. */
function deriveFromOverrides(
  baseSchemas: ColumnSchema[],
  rawRows: Row[],
  overrides: Record<string, ColumnType>,
): { columnSchemas: ColumnSchema[]; charts: ChartSpec[] } {
  const columnSchemas = baseSchemas.map((s) => {
    const forced = overrides[s.name];
    if (!forced || forced === s.type) return s;
    return overrideColumnType(s, rawRows.map((r) => r[s.name] ?? null), forced);
  });
  return { columnSchemas, charts: selectCharts(columnSchemas, rawRows) };
}

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initial,

  setParsing: (fileName) => set({ ...initial, status: 'parsing', fileName }),
  setProgress: (rows) => set({ progressRows: rows }),

  loadParsed: ({ fileName, rows, columnSchemas, charts, truncated, totalRows }) =>
    set({
      status: 'ready',
      error: null,
      fileName,
      rawRows: rows,
      columnSchemas,
      charts,
      baseSchemas: columnSchemas,
      typeOverrides: {},
      truncated,
      totalRows,
      activeFilters: [],
    }),

  setError: (message) => set({ ...initial, status: 'error', error: message }),
  reset: () => set({ ...initial }),

  setColumnType: (column, type) =>
    set((s) => {
      const base = s.baseSchemas.find((b) => b.name === column);
      // Clearing back to the inferred type just drops the override.
      const overrides = { ...s.typeOverrides };
      if (base && base.type === type) delete overrides[column];
      else overrides[column] = type;
      return { typeOverrides: overrides, ...deriveFromOverrides(s.baseSchemas, s.rawRows, overrides) };
    }),

  resetColumnType: (column) =>
    set((s) => {
      if (!(column in s.typeOverrides)) return {};
      const overrides = { ...s.typeOverrides };
      delete overrides[column];
      return { typeOverrides: overrides, ...deriveFromOverrides(s.baseSchemas, s.rawRows, overrides) };
    }),

  addFilter: (filter) =>
    set((s) => ({ activeFilters: [...s.activeFilters.filter((f) => f.id !== filter.id), filter] })),
  removeFilter: (id) => set((s) => ({ activeFilters: s.activeFilters.filter((f) => f.id !== id) })),
  clearFilters: () => set({ activeFilters: [] }),

  toggleCategoryValue: (column, value) =>
    set((s) => {
      const id = `cat:${column}`;
      const existing = s.activeFilters.find(
        (f): f is Extract<Filter, { kind: 'categorical' }> => f.id === id && f.kind === 'categorical',
      );
      if (!existing) {
        return { activeFilters: [...s.activeFilters, { id, kind: 'categorical', column, values: [value] }] };
      }
      const has = existing.values.includes(value);
      const values = has ? existing.values.filter((v) => v !== value) : [...existing.values, value];
      const rest = s.activeFilters.filter((f) => f.id !== id);
      return { activeFilters: values.length ? [...rest, { ...existing, values }] : rest };
    }),
}));

// ---- filtering (pure) ----

/**
 * Apply all active filters to the raw rows. Filters combine with AND; a
 * categorical filter's values combine with OR (TRD §7). Never mutates input.
 */
export function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  if (filters.length === 0) return rows;

  // Precompute ISO dates once per date-range column being filtered.
  const isoByColumn = new Map<string, (string | null)[]>();
  for (const f of filters) {
    if (f.kind === 'dateRange' && !isoByColumn.has(f.column)) {
      isoByColumn.set(f.column, analyzeDateColumn(rows.map((r) => r[f.column] ?? '')).isoValues);
    }
  }

  return rows.filter((row, i) =>
    filters.every((f) => {
      if (f.kind === 'categorical') {
        if (f.values.length === 0) return true;
        const v = row[f.column];
        return v != null && f.values.includes(v.trim());
      }
      if (f.kind === 'dateRange') {
        const iso = isoByColumn.get(f.column)?.[i] ?? null;
        if (iso === null) return false;
        if (f.from && iso < f.from) return false;
        if (f.to && iso > f.to) return false;
        return true;
      }
      // numericRange
      const raw = row[f.column];
      const n = raw != null ? parseNumeric(raw) : null;
      if (n === null) return false;
      if (f.min != null && n < f.min) return false;
      if (f.max != null && n > f.max) return false;
      return true;
    }),
  );
}

/**
 * Memoized filtered-rows selector (TRD §7). Recomputes only when rawRows or
 * activeFilters change identity.
 */
export function useFilteredRows(): Row[] {
  const rawRows = useDashboardStore((s) => s.rawRows);
  const activeFilters = useDashboardStore((s) => s.activeFilters);
  return useMemo(() => applyFilters(rawRows, activeFilters), [rawRows, activeFilters]);
}

/**
 * Schemas whose summary stats reflect the current filter (min/mean/max, top
 * values, date range all follow the filtered rows). When nothing is filtered,
 * the precomputed full-data schemas are returned as-is.
 */
export function useDisplaySchemas(): ColumnSchema[] {
  const schemas = useDashboardStore((s) => s.columnSchemas);
  const activeFilters = useDashboardStore((s) => s.activeFilters);
  const filtered = useFilteredRows();
  return useMemo(() => {
    if (activeFilters.length === 0) return schemas;
    return schemas.map((s) => {
      const { nonNull, nullCount } = normalizeColumn(filtered.map((r) => r[s.name] ?? null));
      return { ...s, stats: buildStats(s.type, nonNull, nullCount) };
    });
  }, [schemas, filtered, activeFilters]);
}
