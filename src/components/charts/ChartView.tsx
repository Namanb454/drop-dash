import { useMemo } from 'react';
import type { ChartSpec, Row } from '../../lib/types';
import {
  computeChartData,
  type BarDatum,
  type GroupedBarDatum,
  type HistogramDatum,
  type LineDatum,
  type ScatterDatum,
} from '../../lib/charting/select';
import ChartCard from './ChartCard';
import Histogram from './Histogram';
import BarChart from './BarChart';
import LineChart from './LineChart';
import ScatterChart from './ScatterChart';
import GroupedBarChart from './GroupedBarChart';

/** Human-readable summary of a chart for screen readers (PRD §11). */
function describe(spec: ChartSpec, data: unknown[]): string {
  switch (spec.chartType) {
    case 'histogram':
      return `Histogram of ${spec.columns[0]} across ${data.length} bins.`;
    case 'bar':
      return `Bar chart of record counts by ${spec.columns[0]}, ${data.length} categories.`;
    case 'line':
      return `Line chart of ${spec.columns[1]} over ${spec.columns[0]}.`;
    case 'groupedBar':
      return `Bar chart of average ${spec.columns[1]} by ${spec.columns[0]}.`;
    case 'scatter':
      return `Scatter plot of ${spec.columns[0]} versus ${spec.columns[1]}, ${data.length} points.`;
    default:
      return spec.title;
  }
}

const HINTS: Partial<Record<ChartSpec['chartType'], string>> = {
  bar: 'Click a bar to filter',
  groupedBar: 'Click a bar to filter',
};

export default function ChartView({ spec, rows }: { spec: ChartSpec; rows: Row[] }) {
  const data = useMemo(() => computeChartData(spec, rows), [spec, rows]);

  const body = (() => {
    switch (spec.chartType) {
      case 'histogram':
        return <Histogram data={data as HistogramDatum[]} />;
      case 'bar':
        return <BarChart data={data as BarDatum[]} column={spec.columns[0]} />;
      case 'line':
        return <LineChart data={data as LineDatum[]} />;
      case 'groupedBar':
        return <GroupedBarChart data={data as GroupedBarDatum[]} column={spec.columns[0]} />;
      case 'scatter':
        return <ScatterChart data={data as ScatterDatum[]} xName={spec.columns[0]} yName={spec.columns[1]} />;
      default:
        return null;
    }
  })();

  return (
    <ChartCard title={spec.title} ariaLabel={describe(spec, data)} hint={HINTS[spec.chartType]}>
      {body}
    </ChartCard>
  );
}
