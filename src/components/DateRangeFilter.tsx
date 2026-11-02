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

  const inputCls =
    'rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:border-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40';

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500">{schema.name}</p>
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label={`${schema.name} from`}
          value={from}
          min={schema.stats.minDate}
          max={schema.stats.maxDate}
          onChange={(e) => update({ from: e.target.value })}
          className={inputCls}
        />
        <span className="text-xs text-zinc-400">→</span>
        <input
          type="date"
          aria-label={`${schema.name} to`}
          value={to}
          min={schema.stats.minDate}
          max={schema.stats.maxDate}
          onChange={(e) => update({ to: e.target.value })}
          className={inputCls}
        />
      </div>
    </div>
  );
}
