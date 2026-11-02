/** Cohesive, restrained chart palette shared by all charts. */

/** Single-series accent (histogram, line, scatter). */
export const SERIES = '#4f46e5'; // accent-600

/** Harmonized categorical hues — distinct but tonally even, for a calm grid. */
export const CATEGORICAL = [
  '#4f46e5', // indigo
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#64748b', // slate
];

/** Hairline gridlines and muted axis text keep charts quiet. */
export const GRID = '#f4f4f5'; // zinc-100
export const AXIS = '#a1a1aa'; // zinc-400

/** Shared Recharts tooltip look — soft, rounded, lightly shadowed. */
export const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: '1px solid #e4e4e7',
  boxShadow: '0 4px 14px rgb(0 0 0 / 0.06)',
  padding: '6px 10px',
} as const;

/** Faint accent wash behind the hovered bar. */
export const CURSOR_FILL = 'rgba(79, 70, 229, 0.05)';
