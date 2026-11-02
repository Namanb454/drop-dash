import { useDashboardStore, useDisplaySchemas, useFilteredRows } from '../store/useDashboardStore';
import StatCard from './StatCard';
import InferencePanel from './InferencePanel';
import FilterChips from './FilterChips';
import DateRangeFilter from './DateRangeFilter';
import NumericRangeFilter from './NumericRangeFilter';
import FilterBar from './FilterBar';
import ChartView from './charts/ChartView';

export default function Dashboard() {
  const schemas = useDashboardStore((s) => s.columnSchemas);
  const charts = useDashboardStore((s) => s.charts);
  const rawRows = useDashboardStore((s) => s.rawRows);
  const truncated = useDashboardStore((s) => s.truncated);
  const totalRows = useDashboardStore((s) => s.totalRows);
  const activeFilters = useDashboardStore((s) => s.activeFilters);
  const filteredRows = useFilteredRows();
  const displaySchemas = useDisplaySchemas();

  const categoricalCols = schemas.filter((s) => s.type === 'categorical' || s.type === 'boolean');
  const dateCols = schemas.filter((s) => s.type === 'date');
  const numericCols = schemas.filter((s) => s.type === 'numeric');
  const isFiltered = activeFilters.length > 0;

  const typeCounts = schemas.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      {/* Summary header */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {isFiltered ? filteredRows.length.toLocaleString() : rawRows.length.toLocaleString()}
        </h2>
        <span className="text-sm text-zinc-500">
          {isFiltered ? `of ${rawRows.length.toLocaleString()} rows` : 'rows'}
        </span>
        <span className="text-zinc-300">·</span>
        <span className="text-sm text-zinc-500">{schemas.length} columns</span>
        <span className="ml-auto hidden text-xs text-zinc-400 sm:inline">
          {Object.entries(typeCounts).map(([t, n]) => `${n} ${t}`).join('  ·  ')}
        </span>
      </div>

      {truncated && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700" role="status">
          This file had {totalRows.toLocaleString()} rows — showing the first{' '}
          {rawRows.length.toLocaleString()} to stay interactive.
        </div>
      )}

      {/* Summary stat cards (stats follow the active filter) */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Overview</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {displaySchemas.map((s) => (
            <StatCard key={s.name} schema={s} />
          ))}
        </div>
      </section>

      {/* Filters */}
      {(categoricalCols.length > 0 || dateCols.length > 0 || numericCols.length > 0) && (
        <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-soft">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Filters</h3>
          {categoricalCols.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {categoricalCols.map((s) => (
                <FilterChips key={s.name} schema={s} />
              ))}
            </div>
          )}
          {(dateCols.length > 0 || numericCols.length > 0) && (
            <div className="grid gap-5 sm:grid-cols-2">
              {dateCols.map((s) => (
                <DateRangeFilter key={s.name} schema={s} />
              ))}
              {numericCols.map((s) => (
                <NumericRangeFilter key={s.name} schema={s} />
              ))}
            </div>
          )}
        </section>
      )}

      <FilterBar />

      {/* Chart grid */}
      {charts.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Charts</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {charts.map((spec) => (
              <ChartView key={spec.id} spec={spec} rows={filteredRows} />
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          No charts to show — the columns didn’t have enough structure to plot. The
          overview above still summarizes the file.
        </p>
      )}

      <InferencePanel schemas={schemas} />
    </div>
  );
}
