import type { Filter } from '../lib/types';
import { useDashboardStore } from '../store/useDashboardStore';

function label(f: Filter): string {
  if (f.kind === 'categorical') return `${f.column}: ${f.values.join(', ')}`;
  if (f.kind === 'dateRange') return `${f.column}: ${f.from ?? '…'} → ${f.to ?? '…'}`;
  return `${f.column}: ${f.min ?? '…'} – ${f.max ?? '…'}`;
}

/** Active-filter bar with per-filter removal and one-click reset (M4). */
export default function FilterBar() {
  const activeFilters = useDashboardStore((s) => s.activeFilters);
  const removeFilter = useDashboardStore((s) => s.removeFilter);
  const clearFilters = useDashboardStore((s) => s.clearFilters);

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
      <span className="text-xs font-medium text-indigo-700">Active filters:</span>
      {activeFilters.map((f) => (
        <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm">
          {label(f)}
          <button
            type="button"
            aria-label={`Remove filter ${label(f)}`}
            onClick={() => removeFilter(f.id)}
            className="ml-0.5 rounded-full text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ✕
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearFilters}
        className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Reset all
      </button>
    </div>
  );
}
