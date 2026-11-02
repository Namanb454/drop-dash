import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart as ReScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { ScatterDatum } from '../../lib/charting/select';
import { AXIS, GRID, SERIES, TOOLTIP_STYLE } from './palette';

export default function ScatterChart({ data, xName, yName }: { data: ScatterDatum[]; xName: string; yName: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReScatterChart margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis type="number" dataKey="x" name={xName} tick={{ fontSize: 11, fill: AXIS }} />
        <YAxis type="number" dataKey="y" name={yName} tick={{ fontSize: 11, fill: AXIS }} />
        <ZAxis range={[24, 24]} />
        <Tooltip cursor={{ strokeDasharray: '3 3', stroke: AXIS }} contentStyle={TOOLTIP_STYLE} />
        <Scatter data={data} fill={SERIES} fillOpacity={0.55} />
      </ReScatterChart>
    </ResponsiveContainer>
  );
}
