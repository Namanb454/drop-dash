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
    <section className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">How we read this file</span>
        <span className="text-xs text-slate-500">{open ? 'Hide' : `Show ${schemas.length} columns`}</span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <p className="px-4 pt-3 text-xs text-slate-400">
            Got a column wrong? Change its type below and the charts update instantly.
          </p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Column</th>
                <th scope="col" className="px-4 py-2 font-medium">Type</th>
                <th scope="col" className="px-4 py-2 font-medium" title="Share of values that parse as numbers">Numeric</th>
                <th scope="col" className="px-4 py-2 font-medium" title="Share of values that parse as dates">Date</th>
                <th scope="col" className="px-4 py-2 font-medium" title="Distinct ÷ non-null">Distinct</th>
                <th scope="col" className="px-4 py-2 font-medium" title="Share of values that are empty/null">Null</th>
                <th scope="col" className="px-4 py-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schemas.map((s) => (
                <tr key={s.name} className="align-top">
                  <td className="px-4 py-2 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Type for ${s.name}`}
                        value={s.type}
                        onChange={(e) => setColumnType(s.name, e.target.value as ColumnType)}
                        className={[
                          'rounded border px-1.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                          typeOverrides[s.name]
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-700',
                        ].join(' ')}
                      >
                        {ALL_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {typeOverrides[s.name] && (
                        <span title="Manually overridden" className="text-[10px] font-medium uppercase text-indigo-500">
                          set
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-slate-600">{pct(s.ratios.numericRatio)}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-600">{pct(s.ratios.dateRatio)}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-600">{pct(s.ratios.cardinalityRatio)}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-600">{pct(s.ratios.nullRatio)}</td>
                  <td className="px-4 py-2 text-slate-500">{s.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
