import type { ColumnSchema, Filter } from '../lib/types';
import { useDashboardStore } from '../store/useDashboardStore';

/** From/to date-range control for one date column (M4). Bounds seed the inputs. */
export default function DateRangeFilter({ schema }: { schema: ColumnSchema }) {
  const addFilter = useDashboardStore((s) => s.addFilter);
  const removeFilter = useDashboardStore((s) => s.removeFilter);
  const activeFilters = useDashboardStore((s) => s.activeFilters);

  const id = `date:${schema.name}`;
  const active = activeFilters.find((f) => f.id === id && f.kind === 'dateRange');
  const from = active && active.kind === 'dateRange' ? active.from ?? '' : '';
  const to = active && active.kind === 'dateRange' ? active.to ?? '' : '';

  const update = (next: { from?: string; to?: string }) => {
    const merged = { from, to, ...next };
    const cleanFrom = merged.from || undefined;
    const cleanTo = merged.to || undefined;
    if (!cleanFrom && !cleanTo) {
      removeFilter(id);
      return;
    }
    const filter: Filter = { id, kind: 'dateRange', column: schema.name, from: cleanFrom, to: cleanTo };
    addFilter(filter);
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">{schema.name}</p>
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label={`${schema.name} from`}
          value={from}
          min={schema.stats.minDate}
          max={schema.stats.maxDate}
          onChange={(e) => update({ from: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        <span className="text-xs text-slate-400">→</span>
        <input
          type="date"
          aria-label={`${schema.name} to`}
          value={to}
          min={schema.stats.minDate}
          max={schema.stats.maxDate}
          onChange={(e) => update({ to: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>
    </div>
  );
}
