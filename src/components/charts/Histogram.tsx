import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistogramDatum } from '../../lib/charting/select';
import { AXIS, GRID, SERIES } from './palette';

export default function Histogram({ data }: { data: HistogramDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(99,102,241,0.08)' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${GRID}` }}
        />
        <Bar dataKey="count" fill={SERIES} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
