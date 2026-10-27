import type { ReactNode } from 'react';

/**
 * Shared chart frame: title, an accessible description (aria-label per PRD §11),
 * and a fixed-height body for the Recharts ResponsiveContainer.
 */
export default function ChartCard({
  title,
  ariaLabel,
  hint,
  children,
}: {
  title: string;
  ariaLabel: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </figcaption>
      <div className="h-64 w-full" role="img" aria-label={ariaLabel}>
        {children}
      </div>
    </figure>
  );
}
