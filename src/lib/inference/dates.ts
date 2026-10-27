/**
 * Date parsing (TRD §4.3). Deliberately does NOT use `new Date(string)` — engine
 * behavior there is inconsistent. We accept an explicit format list and resolve
 * MM/DD vs DD/MM ambiguity at the column level.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Calendar validity, accounting for month lengths and leap years. */
function isValidYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(y, m, 0).getDate(); // day 0 of month m+1
  return d <= daysInMonth;
}

const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const RE_YM = /^(\d{4})-(\d{2})$/;
const RE_YMD_SLASH = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
const RE_NUM_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/; // ambiguous MM/DD vs DD/MM
const RE_MON_D_Y = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/; // Jan 5, 2025
const RE_D_MON_Y = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$/; // 5 Jan 2025

/**
 * Parse one value to an ISO date string (`YYYY-MM-DD`) or null. `dayFirst`
 * controls interpretation of ambiguous numeric d/m/y values.
 */
export function parseDate(value: string, dayFirst = false): string | null {
  const s = value.trim();
  if (s === '') return null;

  let m: RegExpMatchArray | null;

  if ((m = s.match(RE_ISO))) {
    const [, y, mo, d] = m;
    const yy = +y, mm = +mo, dd = +d;
    return isValidYMD(yy, mm, dd) ? iso(yy, mm, dd) : null;
  }

  if ((m = s.match(RE_YM))) {
    const yy = +m[1], mm = +m[2];
    return isValidYMD(yy, mm, 1) ? iso(yy, mm, 1) : null;
  }

  if ((m = s.match(RE_YMD_SLASH))) {
    const yy = +m[1], mm = +m[2], dd = +m[3];
    return isValidYMD(yy, mm, dd) ? iso(yy, mm, dd) : null;
  }

  if ((m = s.match(RE_NUM_DMY))) {
    const a = +m[1], b = +m[2], yy = +m[3];
    const mm = dayFirst ? b : a;
    const dd = dayFirst ? a : b;
    return isValidYMD(yy, mm, dd) ? iso(yy, mm, dd) : null;
  }

  if ((m = s.match(RE_MON_D_Y))) {
    const mm = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const dd = +m[2], yy = +m[3];
    return mm && isValidYMD(yy, mm, dd) ? iso(yy, mm, dd) : null;
  }

  if ((m = s.match(RE_D_MON_Y))) {
    const dd = +m[1];
    const mm = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const yy = +m[3];
    return mm && isValidYMD(yy, mm, dd) ? iso(yy, mm, dd) : null;
  }

  return null;
}

export interface DateColumnAnalysis {
  /** Fraction of the provided (non-null) values that parsed as dates. */
  ratio: number;
  /** Whether ambiguous numeric dates were read day-first. */
  dayFirst: boolean;
  /** Per-value ISO strings (null where a value didn't parse). */
  isoValues: (string | null)[];
}

/**
 * Analyze a whole column of non-null values. Resolves MM/DD vs DD/MM once for
 * the column: if any ambiguous value's first component exceeds 12, the column is
 * read day-first (TRD §4.3).
 */
export function analyzeDateColumn(values: string[]): DateColumnAnalysis {
  let dayFirst = false;
  for (const v of values) {
    const m = v.trim().match(RE_NUM_DMY);
    if (m && +m[1] > 12 && +m[2] <= 12) {
      dayFirst = true;
      break;
    }
  }

  const isoValues = values.map((v) => parseDate(v, dayFirst));
  const parsed = isoValues.reduce((n, iv) => (iv !== null ? n + 1 : n), 0);
  const ratio = values.length === 0 ? 0 : parsed / values.length;

  return { ratio, dayFirst, isoValues };
}
