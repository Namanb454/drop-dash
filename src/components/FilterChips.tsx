import type { ColumnSchema } from '../lib/types';
import { useDashboardStore } from '../store/useDashboardStore';

/**
 * Toggleable value chips for one categorical/boolean column (M4). Selecting
 * chips ORs values within the column; clearing all removes the filter.
 */
export default function FilterChips({ schema }: { schema: ColumnSchema }) {
  const toggle = useDashboardStore((s) => s.toggleCategoryValue);
  const activeFilters = useDashboardStore((s) => s.activeFilters);
  const active = activeFilters.find((f) => f.id === `cat:${schema.name}` && f.kind === 'categorical');
  const selected = active && active.kind === 'categorical' ? active.values : [];

  const values = schema.stats.topValues ?? [];
  if (values.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">{schema.name}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Filter by ${schema.name}`}>
        {values.map(({ value, count }) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(schema.name, value)}
              className={[
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                on
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400',
              ].join(' ')}
            >
              {value} <span className={on ? 'text-indigo-100' : 'text-slate-400'}>· {count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
