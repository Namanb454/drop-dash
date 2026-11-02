import type { ColumnSchema } from '../lib/types';

const fmtNum = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Headline stat per column (TRD §5.5). */
function headline(s: ColumnSchema): { label: string; value: string } {
  switch (s.type) {
    case 'numeric':
      return {
        label: 'min · mean · max',
        value:
          s.stats.min != null
            ? `${fmtNum(s.stats.min)} · ${fmtNum(s.stats.mean ?? 0)} · ${fmtNum(s.stats.max ?? 0)}`
            : '—',
      };
    case 'date':
      return { label: 'range', value: s.stats.minDate ? `${s.stats.minDate} → ${s.stats.maxDate}` : '—' };
    case 'boolean': {
      const top = s.stats.topValues?.[0];
      const share = top ? Math.round((top.count / s.stats.count) * 100) : 0;
      return { label: 'most common', value: top ? `${top.value} (${share}%)` : '—' };
    }
    case 'categorical': {
      const top = s.stats.topValues?.[0];
      return { label: `${s.stats.distinctCount} distinct · top`, value: top ? `${top.value} (${top.count})` : '—' };
    }
    case 'identifier':
      return { label: 'unique keys', value: `${s.stats.distinctCount.toLocaleString()}` };
    default:
      return { label: 'values', value: `${s.stats.count.toLocaleString()}` };
  }
}

const TYPE_DOT: Record<string, string> = {
  numeric: 'bg-accent-500',
  categorical: 'bg-emerald-500',
  date: 'bg-violet-500',
  boolean: 'bg-amber-500',
  identifier: 'bg-zinc-400',
  unknown: 'bg-zinc-300',
};

export default function StatCard({ schema }: { schema: ColumnSchema }) {
  const { label, value } = headline(schema);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-soft transition-colors hover:border-zinc-300">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[schema.type] ?? 'bg-zinc-300'}`} aria-hidden="true" />
        <p className="truncate text-sm font-medium text-zinc-700" title={schema.name}>
          {schema.name}
        </p>
      </div>
      <p className="mt-2.5 truncate text-lg font-semibold tracking-tight text-zinc-900" title={value}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-400">{label}</p>
    </div>
  );
}
