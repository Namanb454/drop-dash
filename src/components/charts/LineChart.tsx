import { CartesianGrid, Line, LineChart as ReLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LineDatum } from '../../lib/charting/select';
import { AXIS, GRID, SERIES, TOOLTIP_STYLE } from './palette';

export default function LineChart({ data }: { data: LineDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReLineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Line type="monotone" dataKey="y" stroke={SERIES} strokeWidth={2} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} />
      </ReLineChart>
    </ResponsiveContainer>
  );
}
