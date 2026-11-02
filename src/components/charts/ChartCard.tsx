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
    <figure className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-soft transition-colors hover:border-zinc-300">
      <figcaption className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
        {hint && <p className="shrink-0 text-xs text-zinc-400">{hint}</p>}
      </figcaption>
      <div className="h-60 w-full" role="img" aria-label={ariaLabel}>
        {children}
      </div>
    </figure>
  );
}
