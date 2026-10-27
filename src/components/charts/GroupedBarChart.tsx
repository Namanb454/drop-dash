import { Bar, BarChart as ReBarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GroupedBarDatum } from '../../lib/charting/select';
import { AXIS, CATEGORICAL, GRID } from './palette';
import { useDashboardStore } from '../../store/useDashboardStore';

/** Mean of a numeric column per category; clicking a bar filters that group. */
export default function GroupedBarChart({ data, column }: { data: GroupedBarDatum[]; column: string }) {
  const toggle = useDashboardStore((s) => s.toggleCategoryValue);
  const activeFilters = useDashboardStore((s) => s.activeFilters);
  const active = activeFilters.find((f) => f.id === `cat:${column}` && f.kind === 'categorical');
  const activeValues = active && active.kind === 'categorical' ? active.values : [];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReBarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: AXIS }} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 48 : 24} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} />
        <Tooltip cursor={{ fill: 'rgba(99,102,241,0.08)' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${GRID}` }} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} onClick={(d: GroupedBarDatum) => toggle(column, d.name)} className="cursor-pointer">
          {data.map((d, i) => {
            const dim = activeValues.length > 0 && !activeValues.includes(d.name);
            return <Cell key={d.name} fill={CATEGORICAL[i % CATEGORICAL.length]} fillOpacity={dim ? 0.3 : 1} />;
          })}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
