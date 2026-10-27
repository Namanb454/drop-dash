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

export default function StatCard({ schema }: { schema: ColumnSchema }) {
  const { label, value } = headline(schema);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="truncate text-sm font-medium text-slate-800" title={schema.name}>
          {schema.name}
        </p>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{schema.type}</span>
      </div>
      <p className="mt-2 truncate text-lg font-semibold text-slate-900" title={value}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}
