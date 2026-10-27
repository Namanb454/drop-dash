/**
 * Shared data model for DropDash (TRD §3). These types are the contract between
 * the pure core (inference, charting) and the React shell.
 */

export type ColumnType =
  | 'numeric'
  | 'categorical'
  | 'date'
  | 'boolean'
  | 'identifier'
  | 'unknown';

export interface ColumnStats {
  /** Number of non-null values. */
  count: number;
  nullCount: number;
  distinctCount: number;
  // numeric-only (undefined otherwise)
  min?: number;
  max?: number;
  mean?: number;
  // categorical/boolean top values
  topValues?: { value: string; count: number }[];
  // date-only (ISO strings)
  minDate?: string;
  maxDate?: string;
}

export interface InferenceRatios {
  /** 0..1 of non-null values parseable as numbers. */
  numericRatio: number;
  /** 0..1 of non-null values parseable as dates. */
  dateRatio: number;
  /** distinctCount / count. */
  cardinalityRatio: number;
  /** nullCount / totalRows. */
  nullRatio: number;
  /** 0..1 of non-null values in the boolean vocabulary. */
  booleanRatio: number;
}

export interface ColumnSchema {
  name: string;
  index: number;
  type: ColumnType;
  ratios: InferenceRatios;
  stats: ColumnStats;
  /** One-line human explanation of the classification. */
  rationale: string;
}

export type Row = Record<string, string | null>;

export type ChartType =
  | 'histogram'
  | 'bar'
  | 'line'
  | 'scatter'
  | 'groupedBar';

export interface ChartSpec {
  id: string;
  chartType: ChartType;
  title: string;
  /** 1 or 2 column names involved. */
  columns: string[];
  /** Interestingness score, higher shown first (TRD §5.3). */
  score: number;
  /** Precomputed, chart-ready rows. */
  data: unknown[];
}

export type Filter =
  | { id: string; kind: 'categorical'; column: string; values: string[] }
  | { id: string; kind: 'dateRange'; column: string; from?: string; to?: string }
  | { id: string; kind: 'numericRange'; column: string; min?: number; max?: number };
