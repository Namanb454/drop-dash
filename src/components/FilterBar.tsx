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
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-soft">
      <span className="text-xs font-medium text-zinc-400">Active</span>
      {activeFilters.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700"
        >
          {label(f)}
          <button
            type="button"
            aria-label={`Remove filter ${label(f)}`}
            onClick={() => removeFilter(f.id)}
            className="-mr-0.5 grid h-3.5 w-3.5 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearFilters}
        className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
      >
        Reset all
      </button>
    </div>
  );
}
