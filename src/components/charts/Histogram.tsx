import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistogramDatum } from '../../lib/charting/select';
import { AXIS, CURSOR_FILL, GRID, SERIES, TOOLTIP_STYLE } from './palette';

export default function Histogram({ data }: { data: HistogramDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} allowDecimals={false} />
        <Tooltip cursor={{ fill: CURSOR_FILL }} contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}
