# DropDash

**Drop a CSV, get an interactive dashboard — entirely in your browser.**

DropDash is a zero-config, client-side-only web app. Drop a CSV or TSV file and it
infers the type of every column, picks sensible charts, computes summary
statistics, and lets you filter — with **no backend, no account, and no upload**.
Your file never leaves your device.

---

## Why

Everyone has CSVs and no fast way to just *look* at them. The usual options are
heavyweight BI tools that need setup and accounts, privacy-hostile "upload your
data" SaaS, or notebooks that need code. DropDash targets the 30-second "let me
just see this data" moment — and because everything runs locally, you can point
it at sensitive data without it ever being transmitted anywhere.

- **Zero friction** — open the page, drop a file, see a dashboard.
- **Private by construction** — [zero network requests](#the-no-network-guarantee)
  fire when you load a file, and the shipped build enforces this with a strict
  Content-Security-Policy (`connect-src 'none'`) so the browser physically blocks
  any egress.
- **Legible & correctable** — a "how we read this file" panel shows *why* each
  column was typed, and lets you override any misclassification; the charts
  update instantly.

## Quick start

Requirements: Node.js 18+ (developed on Node 20).

```bash
git clone https://github.com/<you>/DropDash.git
cd DropDash
npm install
npm run dev        # open the printed http://localhost:5173/DropDash/ URL
```

Then drop any `.csv` / `.tsv` file onto the page.

### Scripts

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Start the Vite dev server                        |
| `npm run build`     | Type-check and build to `dist/`                  |
| `npm run preview`   | Serve the production build locally               |
| `npm test`          | Run the unit + fixture regression tests (Vitest) |
| `npm run typecheck` | Type-check without emitting                      |

## Usage

1. **Drop or browse** to a CSV/TSV file on the landing screen.
2. DropDash parses it (in a Web Worker for files over 2 MB), infers column types,
   and builds up to **8** charts plus per-column stat cards.
3. **Filter** using categorical chips, date-range controls, numeric range
   inputs, or by clicking a bar. The active-filter bar shows what's applied;
   **Reset all** clears it. Summary stats update to reflect the filtered rows.
4. Expand **"How we read this file"** to see each column's inferred type and the
   confidence ratios behind it — and **change a column's type** if it guessed
   wrong; charts re-select instantly.
5. **New file** starts over.

### What it infers

`numeric` · `categorical` · `date` · `boolean` · `identifier` · `unknown`

The classifier handles the awkward cases: ZIP/postal codes stay categorical (not
numeric), currency and percentages parse as numbers, dates are recognized across
several formats (ISO, slash, month-name) with column-level day/month
disambiguation, booleans cover `Y/N`, `true/false`, `1/0`, and mixed null tokens
(`NA`, `n/a`, `-`, …) are normalized. See [`TRD.md`](TRD.md) §4 for the full
algorithm.

### Chart selection

Charts are chosen from column types (histogram, bar, line, scatter, grouped
bar), scored for "interestingness" (spread, category balance, correlation, time
coverage), de-duplicated so no single column dominates, and capped at ~8. See
[`TRD.md`](TRD.md) §5.

## Configuration

Most behavior is tunable via named constants, no code changes to logic required:

- **Inference thresholds** — [`src/lib/inference/config.ts`](src/lib/inference/config.ts)
  (ratio cutoffs, cardinality limits, boolean/null vocabularies, date-ambiguity).
- **Charting** — [`src/lib/charting/config.ts`](src/lib/charting/config.ts)
  (`MAX_CHARTS`, histogram bin bounds, scatter downsample cap, diversity cap).
- **Large files** — worker threshold, inference sampling, and the row hard cap
  live in [`src/lib/csv/parse.ts`](src/lib/csv/parse.ts) and the inference config.
- **Deploy base path** — `base` in [`vite.config.ts`](vite.config.ts) defaults to
  `/DropDash/` for GitHub Pages. Override with the `VITE_BASE` env var if your
  repository name differs.

## The no-network guarantee

DropDash makes a hard promise: **loading a file triggers zero network requests.**
No uploads, no telemetry, no analytics or error-reporting SDKs, no runtime asset
fetches.

This is **enforced**, not just asserted:

- The shipped build injects a strict `Content-Security-Policy` with
  `connect-src 'none'`, so the browser blocks every `fetch` / `XHR` /
  `WebSocket` / beacon outright — a regression *cannot* phone home.
- An automated test ([`src/lib/no-network.test.ts`](src/lib/no-network.test.ts))
  stubs all egress APIs and fails if the data pipeline touches any of them.

To verify by hand: `npm run build && npm run preview`, open devtools →
**Network**, clear it, and drop a file. The only entries are the app's own
bundled JS/CSS (loaded before you dropped anything) and the local Web Worker —
no outbound requests.

## Architecture

Pure, framework-agnostic core; thin React shell.

```
src/
  lib/
    csv/          # Papaparse wrapper (streaming + Web Worker)
    inference/    # pure type inference (ratios, dates, decision order)
    charting/     # pure chart selection + scoring
  store/          # Zustand store + memoized filteredRows selector
  components/     # React UI (dropzone, dashboard, charts, filters)
fixtures/         # ~20 CSVs exercised by the regression tests
```

Data flows one way: **raw rows → schema (inference) → chart specs (charting) →
components**. Filters are applied as a derived selector, never by mutating raw
rows. Full details in [`TRD.md`](TRD.md).

**Stack:** Vite · React 18 · TypeScript · Papaparse · Recharts · Zustand ·
Tailwind CSS · Vitest.

## Testing

```bash
npm test
```

- Unit tests for the pure core (`lib/inference`, `lib/charting`, `lib/csv`) and
  the store's filter logic.
- A fixture regression suite runs parse → infer → select over every file in
  [`fixtures/`](fixtures/) and snapshots the resulting schema + chart types, so
  behavior changes surface in a diff. Regenerate fixtures with
  `node scripts/generate-fixtures.mjs`.

## Contributing

1. Fork and branch from `main`.
2. Keep the core pure — inference and charting logic must not import React or
   touch the DOM, so it stays unit-testable.
3. Add or update tests. If you change classification or chart selection, run
   `npm test` and review the snapshot diff intentionally.
4. Run `npm run typecheck` and `npm test` before opening a PR.
5. CI (test → build → deploy) runs on every PR; deploys to GitHub Pages happen
   only on `main`.

New inference thresholds or chart heuristics should be added as named constants
in the relevant `config.ts` and documented in `TRD.md`.

## License

MIT
