# DropDash — Product Requirements Document (PRD)

## 1. Summary

DropDash is a **zero-config, client-side-only** web app that turns a dropped CSV
file into an interactive dashboard. You drop a file; DropDash infers the type of
each column, picks sensible charts, renders summary statistics, and lets you
filter — all in the browser. There is no backend, no account, and no upload.

## 2. Problem

Non-technical and semi-technical users constantly have CSVs (exports from
spreadsheets, analytics tools, CRMs) and no fast way to *look* at them. The
existing options are heavyweight (BI tools requiring setup and accounts),
privacy-hostile (upload-your-data SaaS), or require code (notebooks). DropDash
targets the 30-second "let me just see this data" moment.

## 3. Goals

- **Zero friction:** open the page, drop a file, see a dashboard. No config, no
  sign-up, no column mapping step.
- **Private by construction:** the file never leaves the device. This is a core
  product promise, not a nice-to-have (see §9).
- **Legible inference:** the user can always see *why* DropDash charted the data
  the way it did (see §8).

## 4. Non-goals (v1)

- No multi-file joins or relationships.
- No SQL / query language.
- No persistence, sharing, or saved dashboards (everything is ephemeral,
  per-session).
- No pivot tables, custom chart authoring, or drill-down beyond one filter level.
- No Excel/JSON/Parquet ingestion (CSV/TSV only in v1).

## 5. Target users

1. **The spreadsheet escapee** — has a CSV export, wants a quick visual read.
2. **The analyst-in-a-hurry** — wants a fast first pass before deciding whether
   to load the data into a real tool.
3. **The privacy-conscious user** — will not upload sensitive data to a SaaS.

## 6. Core user flow

1. Land on the empty dropzone (see §8 for copy).
2. Drop or browse to a `.csv`/`.tsv` file.
3. See a brief loading state while parsing + inference run.
4. Land on a dashboard: summary stat cards, an auto-selected chart grid, and a
   "how we read this file" panel.
5. Optionally apply filters (categorical chips, date ranges, click-a-bar).
6. Reset filters or drop a new file at any time.

## 7. MVP scope (must-have for v1)

- [ ] Drag-and-drop **and** click-to-browse file input.
- [ ] CSV/TSV parsing with streaming and a Web Worker for large files.
- [ ] Robust handling of **bad/empty/malformed** files with a visible, friendly
      error state (never a blank screen or a thrown error in the UI).
- [ ] Per-column **type inference**: numeric, categorical, date, boolean,
      identifier, and an "unknown/text" fallback.
- [ ] Automatic **chart selection** based on inferred types, capped at ~8 charts.
- [ ] **Summary statistics** cards (row count, column count, per-column basics).
- [ ] A **"how we read this file"** panel exposing each column's inferred type
      and the confidence ratios behind that decision.
- [ ] **Filtering**: categorical filter chips + date range controls, an active
      filter bar, and one-click reset.
- [ ] **No network egress** when a file is loaded (see §9).

## 8. UX requirements

### Empty state (dropzone)

- Headline: **"Drop a CSV to build a dashboard."**
- Subtext: **"Everything runs in your browser. Your file never leaves your
  device — no upload, no account."**
- A visible affordance to browse (`Choose a file`) in addition to drag-and-drop.
- On drag-over, the dropzone shows an active highlighted state.

### "How we read this file" panel

- A per-column table showing: column name, inferred type, and the confidence
  ratios that drove the decision (numeric ratio, date ratio, cardinality ratio,
  null ratio).
- This panel is the user's window into the inference engine and must be readable
  by a non-engineer: plain type names, percentages, and a one-line rationale per
  column where helpful.
- v1 renders this as a debug/table view; it seeds the polished panel later.

### Error states

- Empty file, header-only file, unparseable file, and "not a CSV" all produce a
  distinct, human-readable message with a way to try another file.

### Loading state

- Any parse taking more than a moment shows a spinner/skeleton, never a frozen
  UI. Large-file parsing must not block the main thread (see TRD §8).

## 9. Privacy & trust (core product claim)

- **No file contents, no derived data, and no telemetry ever leave the browser.**
- There must be **zero network requests triggered by loading a file.** This is
  independently verifiable in devtools and is asserted as a marketing claim on
  the landing/empty state. It is also **enforced** in the shipped build via a
  strict Content-Security-Policy (`connect-src 'none'`), so the browser blocks
  any egress even if a dependency regressed (see TRD §11).
- No analytics SDKs, no error-reporting SDKs, no fonts/assets fetched at file-load
  time that could be conflated with data egress. Any static assets are bundled.
- This claim is enforced/tested (see TRD §11).

## 10. Success metrics (qualitative for v1)

- A first-time user can go from landing to a useful dashboard in under 30 seconds
  with a typical (<50k row) CSV, with no instructions.
- The inferred types and charts are "obviously right" for common CSVs (sales
  exports, survey results, event logs) without manual correction.
- The privacy claim holds up under devtools inspection.

## 11. Accessibility

- Keyboard-operable dropzone and filters.
- Charts carry `aria-label`s summarizing what they show.
- Sufficient color contrast; do not encode meaning in color alone.

## 12. Open questions / future

- ~~Manual type override UI~~ — **implemented** (inference panel type dropdowns).
- Additional input formats (JSON, Excel).
- Shareable, URL-encoded dashboard state (would need care to preserve the
  no-upload promise).
