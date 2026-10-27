import type { ColumnSchema, Filter } from '../lib/types';
import { useDashboardStore } from '../store/useDashboardStore';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Min/max range control for one numeric column (Tier 1). Bounds seed the inputs. */
export default function NumericRangeFilter({ schema }: { schema: ColumnSchema }) {
  const addFilter = useDashboardStore((s) => s.addFilter);
  const removeFilter = useDashboardStore((s) => s.removeFilter);
  const activeFilters = useDashboardStore((s) => s.activeFilters);

  const id = `num:${schema.name}`;
  const active = activeFilters.find((f) => f.id === id && f.kind === 'numericRange');
  const min = active && active.kind === 'numericRange' ? active.min : undefined;
  const max = active && active.kind === 'numericRange' ? active.max : undefined;

  const update = (next: { min?: number; max?: number }) => {
    const merged = { min, max, ...next };
    const cleanMin = Number.isFinite(merged.min) ? merged.min : undefined;
    const cleanMax = Number.isFinite(merged.max) ? merged.max : undefined;
    if (cleanMin === undefined && cleanMax === undefined) {
      removeFilter(id);
      return;
    }
    const filter: Filter = { id, kind: 'numericRange', column: schema.name, min: cleanMin, max: cleanMax };
    addFilter(filter);
  };

  const parse = (v: string): number | undefined => (v === '' ? undefined : Number(v));

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">{schema.name}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          aria-label={`${schema.name} minimum`}
          placeholder={schema.stats.min != null ? `min ${fmt(schema.stats.min)}` : 'min'}
          value={min ?? ''}
          onChange={(e) => update({ min: parse(e.target.value) })}
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        <span className="text-xs text-slate-400">–</span>
        <input
          type="number"
          aria-label={`${schema.name} maximum`}
          placeholder={schema.stats.max != null ? `max ${fmt(schema.stats.max)}` : 'max'}
          value={max ?? ''}
          onChange={(e) => update({ max: parse(e.target.value) })}
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>
    </div>
  );
}
