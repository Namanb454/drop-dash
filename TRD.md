# DropDash — Technical Requirements Document (TRD)

This document defines the architecture, algorithms, and engineering conventions
for DropDash. Where the PRD says *what*, this says *how*. Judgment-call defaults
are marked **[default]** — they are deliberate, documented choices, not accidents.

## 1. Tech stack (fixed)

- **Build/dev:** Vite
- **UI:** React 18 + TypeScript (strict)
- **CSV parsing:** Papaparse (streaming + Web Worker)
- **Charts:** Recharts
- **State:** Zustand
- **Styling:** Tailwind CSS **[chosen]**
- **Testing:** Vitest + @testing-library/react
- **Deploy:** GitHub Actions → GitHub Pages

No other runtime dependencies without updating this document.

## 2. Design principles

1. **Pure core, thin shell.** All inference and chart-selection logic lives in
   framework-agnostic pure functions under `lib/`. React only orchestrates and
   renders. This makes the core unit-testable without a DOM.
2. **Data flows one way.** Raw rows → schema (inference) → chart specs (charting)
   → components. Filters are applied as a derived selector, never by mutating raw
   rows.
3. **The browser is the whole computer.** No network calls for app function.

## 3. Data model (shared types)

```ts
// lib/types.ts
export type ColumnType =
  | 'numeric'
  | 'categorical'
  | 'date'
  | 'boolean'
  | 'identifier'
  | 'unknown';

export interface ColumnStats {
  count: number;          // non-null values
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
  numericRatio: number;      // 0..1 of non-null values parseable as numbers
  dateRatio: number;         // 0..1 of non-null values parseable as dates
  cardinalityRatio: number;  // distinctCount / count
  nullRatio: number;         // nullCount / totalRows
  booleanRatio: number;      // 0..1 of non-null values in the boolean vocabulary
}

export interface ColumnSchema {
  name: string;
  index: number;
  type: ColumnType;
  ratios: InferenceRatios;
  stats: ColumnStats;
  rationale: string;         // one-line human explanation
}

export type Row = Record<string, string | null>;
```

## 4. Type inference (`lib/inference`)

Inference is **pure**: `inferColumn(values: (string|null)[], name, index) => ColumnSchema`
and `inferSchema(rows, columnNames) => ColumnSchema[]`. No React, no I/O.

### 4.1 Null normalization

Before any ratio, normalize null-ish tokens to `null`. The null vocabulary
**[default]** (case-insensitive, trimmed):

```
"", "na", "n/a", "null", "none", "nil", "-", "—", "nan", "undefined"
```

`nullRatio = nullCount / totalValues`. All ratios below are computed over
**non-null** values only (denominator = `count`), except `nullRatio`.

### 4.2 The three primary ratios

- **numericRatio** — fraction of non-null values that parse as a finite number.
  Parsing strips a leading currency symbol (`$ € £ ¥`), thousands separators
  (`,`), and a trailing `%`. A value is numeric if, after stripping, it matches
  `^-?\d+(\.\d+)?$` (optionally with exponent) and is finite.
- **dateRatio** — fraction of non-null values that parse as a valid date against
  the accepted format list (§4.3).
- **cardinalityRatio** — `distinctCount / count`.
- **booleanRatio** — fraction of non-null values in the boolean vocabulary (§4.4).

### 4.3 Accepted date formats **[default]**

A value counts as a date if it matches one of these shapes AND produces a valid
calendar date:

- ISO: `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm(:ss)?(Z|±hh:mm)?`
- `YYYY/MM/DD`
- `MM/DD/YYYY` and `DD/MM/YYYY` (ambiguous → see below)
- `MM-DD-YYYY`
- `Mon DD, YYYY` / `DD Mon YYYY` (e.g. `Jan 5, 2025`, `5 Jan 2025`)
- `YYYY-MM`

**Ambiguity rule:** for slash/dash numeric dates, if any value in the column has
a first component > 12, the whole column is interpreted as `DD/MM` (day-first);
otherwise `MM/DD` (month-first) **[default]**. Pure 4-digit years like `2024`
are **not** treated as dates (they read as numeric) to avoid false positives.
Parsing is done with our own small parser, **not** `new Date(string)`, because
`Date` parsing is inconsistent across engines.

### 4.4 Boolean vocabulary **[default]**

Case-insensitive. A column is boolean-eligible only if **every** non-null value
is in one matched pair's value set and `distinctCount <= 2`:

```
true/false, t/f, yes/no, y/n, 1/0, on/off
```

### 4.5 Decision order

Evaluate in this exact order; first match wins:

1. **boolean** — `booleanRatio === 1` and `distinctCount <= 2`.
2. **date** — `dateRatio >= 0.95`.
3. **identifier** — high cardinality unique-ish key. Trigger if
   `cardinalityRatio >= 0.99` **and** `count >= 20` **and**
   (name matches `/(^|_)(id|uuid|guid|key)$/i` **OR** values look like
   uuids/hashes/monotonic ints). Identifiers are excluded from charting (§5).
4. **numeric-but-categorical guard** — if `numericRatio >= 0.95` **but** the
   column looks categorical, classify as **categorical**, not numeric. "Looks
   categorical" **[default]** = `distinctCount <= 20` AND `distinctCount <= count * 0.1`,
   OR the name matches `/(zip|postal|phone|fips|ssn|year|code|category|cat|id)/i`
   with low cardinality. (This is what keeps ZIP codes out of histograms.)
5. **numeric** — `numericRatio >= 0.95`.
6. **categorical** — `cardinalityRatio <= 0.5` (i.e. meaningfully repeating
   values) OR `distinctCount <= 50`.
7. **unknown** — fallback (free text, high-cardinality non-id strings).

Thresholds (`0.95`, `0.99`, `20`, `50`, `0.5`, `0.1`) live in
`lib/inference/config.ts` as named constants so they are tunable in one place.

### 4.6 Edge cases (must be handled)

- **Empty column** (all null): type `unknown`, ratios `0`, rationale noting it.
- **Single distinct value:** categorical (or boolean if in vocab).
- **Mixed null representations** (`""`, `NA`, `-`): all normalized before ratios.
- **Numbers with currency/percent/commas:** counted as numeric (see §4.2).
- **ZIP / postal / phone / leading-zero codes:** categorical via §4.5 step 4.
- **Two date formats in one column:** still date if combined `dateRatio >= 0.95`.
- **Whitespace:** every value is trimmed before classification.

Each `ColumnSchema.rationale` is a short sentence, e.g.
`"95% numeric, but only 5 distinct low values → treated as categorical (looks like a code)."`

## 5. Chart selection (`lib/charting`)

Pure functions: `selectCharts(schemas, rows) => ChartSpec[]`. No rendering here.

### 5.1 Chart spec

```ts
export type ChartType = 'histogram' | 'bar' | 'line' | 'scatter' | 'groupedBar';

export interface ChartSpec {
  id: string;
  chartType: ChartType;
  title: string;
  columns: string[];       // 1 or 2 column names involved
  score: number;           // interestingness, desc-sorted
  data: unknown[];         // precomputed, chart-ready rows
}
```

### 5.2 Column-type → chart-type table

| Involved columns                         | Chart        |
|------------------------------------------|--------------|
| single numeric                           | histogram    |
| single categorical (low cardinality)     | bar (counts) |
| single boolean                           | bar (counts) |
| date + numeric                           | line         |
| categorical (low card) + numeric         | grouped bar (aggregated mean/sum) |
| numeric + numeric                        | scatter      |
| identifier / unknown                     | (skipped)    |

Aggregation for grouped bar/line **[default]**: mean of the numeric column per
group/time-bucket. Histograms use **Freedman–Diaconis** bin count, clamped to
`[5, 30]` bins **[default]**.

### 5.3 Interestingness scoring

Each candidate chart gets a score in roughly `[0,1]`; higher = shown first.
Heuristics **[default]**:

- **Numeric spread** (histogram/scatter): higher variance-to-range / coefficient
  of variation → more interesting. Degenerate (all-equal) → ~0.
- **Categorical balance** (bar): entropy of the category distribution normalized
  by `log(distinctCount)`; a column that's 99% one value scores low. Penalize
  very high cardinality.
- **Relationship strength** (scatter): `|pearson r|` between the two numerics.
- **Time coverage** (line): fraction of the date range with data; more complete
  → higher.
- **Group differentiation** (grouped bar): variance of per-group means; groups
  that all look identical score low.
- **Null penalty:** multiply by `(1 - nullRatio)`.

### 5.4 The ~8-chart cap

- Generate all candidate specs, score them, sort descending.
- Enforce **diversity**: no single column may appear in more than 3 charts
  **[default]**, so one column can't dominate the grid.
- Take the top **8** **[default]** (`MAX_CHARTS`, a named constant).

### 5.5 Summary stat cards

Always show: total rows, total columns, and a per-type column count. Then a card
per column with its headline stat (numeric: min/mean/max; categorical: top value
+ distinct count; date: range; boolean: true %).

## 6. Folder structure

```
DropDash/
├── PRD.md
├── TRD.md
├── README.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .github/workflows/ci.yml
├── fixtures/                     # sample CSVs for regression tests
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── lib/
    │   ├── types.ts
    │   ├── csv/
    │   │   ├── parse.ts          # Papaparse wrapper (stream + worker)
    │   │   └── parse.test.ts
    │   ├── inference/
    │   │   ├── config.ts         # thresholds/constants
    │   │   ├── ratios.ts         # numericRatio, dateRatio, etc.
    │   │   ├── dates.ts          # the date parser + format list
    │   │   ├── infer.ts          # inferColumn / inferSchema
    │   │   └── infer.test.ts
    │   └── charting/
    │       ├── config.ts         # MAX_CHARTS, bin bounds, etc.
    │       ├── scoring.ts        # interestingness heuristics
    │       ├── select.ts         # selectCharts
    │       └── select.test.ts
    ├── store/
    │   └── useDashboardStore.ts  # Zustand store + selectors
    └── components/
        ├── Dropzone.tsx
        ├── LoadingState.tsx
        ├── ErrorState.tsx
        ├── Dashboard.tsx
        ├── StatCard.tsx
        ├── InferencePanel.tsx    # "how we read this file"
        ├── FilterBar.tsx
        ├── FilterChips.tsx
        ├── DateRangeFilter.tsx
        └── charts/
            ├── ChartCard.tsx     # shared frame + aria-label
            ├── Histogram.tsx
            ├── BarChart.tsx
            ├── LineChart.tsx
            ├── ScatterChart.tsx
            └── GroupedBarChart.tsx
```

## 7. State management (`store/useDashboardStore.ts`)

Zustand store shape:

```ts
interface DashboardState {
  status: 'idle' | 'parsing' | 'ready' | 'error';
  error: string | null;
  fileName: string | null;

  rawRows: Row[];
  columnSchemas: ColumnSchema[];
  charts: ChartSpec[];

  activeFilters: Filter[];        // see below

  // actions
  loadParsed(fileName, rows, schemas, charts): void;
  setParsing(fileName): void;
  setError(message): void;
  reset(): void;

  addFilter(f: Filter): void;
  removeFilter(id: string): void;
  clearFilters(): void;
}

type Filter =
  | { id: string; kind: 'categorical'; column: string; values: string[] }
  | { id: string; kind: 'dateRange'; column: string; from?: string; to?: string }
  | { id: string; kind: 'numericRange'; column: string; min?: number; max?: number };
```

- **`filteredRows` is a memoized selector**, not stored state. It derives from
  `rawRows` + `activeFilters` and is recomputed only when either changes
  (memoize on identity). Charts and stat cards consume `filteredRows`.
- Raw rows are never mutated. Filtering is pure predicate composition (AND across
  filters, OR within a categorical filter's values).

## 8. Large-file handling & performance

- **Worker threshold:** files **> 2 MB** parse in a Papaparse **Web Worker**
  (`worker: true`), streaming with `chunk`/`step` so the main thread never
  blocks. Smaller files parse inline (worker startup isn't worth it).
- **Streaming:** always parse in streaming mode; accumulate rows and report a
  loading state.
- **Inference sampling:** above **50,000 rows** **[default]** (`INFERENCE_SAMPLE_ROWS`),
  infer types from a uniform random sample of 50k rows rather than the full set.
  Stats shown to the user are still computed over all rows where cheap; ratios
  use the sample.
- **Scatter downsampling:** scatter plots render at most **2,000 points**
  **[default]** (`SCATTER_MAX_POINTS`), uniformly downsampled, with a note.
- **Row hard cap:** **500,000 rows** **[default]** (`ROW_HARD_CAP`). Beyond it,
  keep the first 500k, and show a non-blocking warning that the file was
  truncated for interactivity.
- Bin/aggregate computations run once at load, not per render.

## 9. Testing strategy

- **Unit tests (Vitest), core-first:** `lib/inference` and `lib/charting` are
  tested as pure functions with no DOM. Inference tests are written **against a
  fixture set first** (test-driven) covering: plain numeric, ZIP-like
  numeric-but-categorical, dates in 2+ formats, an ID column, a boolean-like
  (Y/N) column, and mixed null representations.
- **Charting tests:** feed known `ColumnSchema[]` and assert the selected chart
  types, ordering, the ≤8 cap, and the diversity rule.
- **Fixture regression set:** `/fixtures` holds ~**20 varied CSVs** (sales
  exports, survey data, event logs, edge cases: empty, header-only, single
  column, wide, unicode, mixed nulls, ambiguous dates). A regression test runs
  parse→infer→select over each and snapshots the resulting schema + chart types,
  so behavior changes are visible in diffs.
- **Component smoke tests:** dropzone renders, error state renders on bad input.

## 10. CI/CD (`.github/workflows/ci.yml`)

Single workflow, on push/PR to `main`:

1. `test` — install, typecheck, run Vitest.
2. `build` — `vite build` (only if tests pass).
3. `deploy` — publish `dist/` to **GitHub Pages** (only on `main`, after build).

Vite `base` is set to the repo name for correct Pages asset paths.

## 11. Privacy enforcement (the no-network claim)

- **No network at file-load time.** Nothing in the load→infer→render→filter path
  issues `fetch`, `XHR`, `WebSocket`, `sendBeacon`, or dynamic asset loads.
- **No analytics/telemetry/error-reporting SDKs** in the bundle.
- **All assets bundled** (fonts/icons inlined or self-hosted from the build),
  so a file load never triggers a runtime asset fetch that could be mistaken for
  egress.
- **Verification:** demonstrated via browser devtools (Network tab shows zero
  requests on file load). This is a stated product claim (PRD §9).
- **Enforcement (shipped build):** a Vite plugin injects a strict
  `Content-Security-Policy` meta into `index.html` at build time with
  `connect-src 'none'` (plus `default-src 'self'`, `object-src 'none'`, etc.), so
  the browser physically blocks every `fetch` / `XHR` / `WebSocket` / beacon. The
  CSP is build-only so dev-server HMR (which needs a websocket) still works. The
  CSV worker is permitted via `worker-src 'self' blob:`.
- **Automated guard:** `src/lib/no-network.test.ts` stubs all egress APIs and
  asserts the parse → infer → select → filter path calls none of them.
