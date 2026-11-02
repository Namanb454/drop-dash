import { useState } from 'react';
import type { ColumnSchema, ColumnType } from '../lib/types';
import { useDashboardStore } from '../store/useDashboardStore';

const ALL_TYPES: ColumnType[] = ['numeric', 'categorical', 'date', 'boolean', 'identifier', 'unknown'];

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * "How we read this file" panel (PRD §8): the per-column inferred type plus the
 * confidence ratios that drove the decision. Seed of the polished panel.
 */
export default function InferencePanel({ schemas }: { schemas: ColumnSchema[] }) {
  const [open, setOpen] = useState(false);
  const setColumnType = useDashboardStore((s) => s.setColumnType);
  const typeOverrides = useDashboardStore((s) => s.typeOverrides);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-zinc-50/70"
      >
        <span className="text-sm font-medium text-zinc-900">How we read this file</span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          {open ? 'Hide' : `${schemas.length} columns`}
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-zinc-100">
          <p className="px-5 pt-4 text-xs text-zinc-400">
            Got a column wrong? Change its type below and the charts update instantly.
          </p>
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Column</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Type</th>
                <th scope="col" className="px-5 py-2.5 font-medium" title="Share of values that parse as numbers">Numeric</th>
                <th scope="col" className="px-5 py-2.5 font-medium" title="Share of values that parse as dates">Date</th>
                <th scope="col" className="px-5 py-2.5 font-medium" title="Distinct ÷ non-null">Distinct</th>
                <th scope="col" className="px-5 py-2.5 font-medium" title="Share of values that are empty/null">Null</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {schemas.map((s) => (
                <tr key={s.name} className="align-top transition-colors hover:bg-zinc-50/60">
                  <td className="px-5 py-2.5 font-medium text-zinc-800">{s.name}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Type for ${s.name}`}
                        value={s.type}
                        onChange={(e) => setColumnType(s.name, e.target.value as ColumnType)}
                        className={[
                          'rounded-md border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40',
                          typeOverrides[s.name]
                            ? 'border-accent-200 bg-accent-50 text-accent-700'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
                        ].join(' ')}
                      >
                        {ALL_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {typeOverrides[s.name] && (
                        <span title="Manually overridden" className="text-[10px] font-medium uppercase tracking-wide text-accent-500">
                          set
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-zinc-500">{pct(s.ratios.numericRatio)}</td>
                  <td className="px-5 py-2.5 tabular-nums text-zinc-500">{pct(s.ratios.dateRatio)}</td>
                  <td className="px-5 py-2.5 tabular-nums text-zinc-500">{pct(s.ratios.cardinalityRatio)}</td>
                  <td className="px-5 py-2.5 tabular-nums text-zinc-500">{pct(s.ratios.nullRatio)}</td>
                  <td className="px-5 py-2.5 text-zinc-400">{s.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
