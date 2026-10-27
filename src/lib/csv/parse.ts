import Papa from 'papaparse';
import type { Row } from '../types';
import type { WorkerRequest, WorkerResponse } from './parse.worker';

/**
 * CSV parsing layer (TRD §8). Papaparse in streaming mode; a Web Worker is used
 * for files above the threshold so the main thread never blocks. Values are kept
 * as raw strings — null/type normalization is the inference layer's job.
 */

/** Files larger than this parse in a Web Worker (TRD §8). */
export const WORKER_SIZE_THRESHOLD = 2 * 1024 * 1024; // 2 MB

/** Hard cap on retained rows for interactivity (TRD §8). */
export const ROW_HARD_CAP = 500_000;

export interface ParseSuccess {
  rows: Row[];
  columns: string[];
  /** True if the file had more rows than ROW_HARD_CAP and was truncated. */
  truncated: boolean;
  /** Total data rows seen before the cap was applied. */
  totalRows: number;
}

export type ParseResult =
  | { ok: true; value: ParseSuccess }
  | { ok: false; error: string };

export interface ParseOptions {
  rowHardCap?: number;
  /** Called with the running row count so the UI can show progress. */
  onProgress?: (rowsSoFar: number) => void;
}

const CSV_EXTENSIONS = /\.(csv|tsv|txt)$/i;

/** Convert a Papaparse header-keyed record into our Row shape. */
function toRow(record: Record<string, string | undefined>, columns: string[]): Row {
  const row: Row = {};
  for (const col of columns) {
    const v = record[col];
    row[col] = v === undefined ? null : v;
  }
  return row;
}

/**
 * Parse a dropped/selected file into rows + column names. Resolves with a
 * discriminated result rather than throwing, so callers render a clean error
 * state (PRD §7). Auto-detects the delimiter, so CSV and TSV both work.
 */
export function parseCsvFile(file: File, opts: ParseOptions = {}): Promise<ParseResult> {
  const rowHardCap = opts.rowHardCap ?? ROW_HARD_CAP;
  const useWorker = file.size > WORKER_SIZE_THRESHOLD;

  // Cheap upfront guards before handing off to the parser.
  if (file.size === 0) {
    return Promise.resolve({ ok: false, error: 'This file is empty — there is nothing to read.' });
  }
  if (!CSV_EXTENSIONS.test(file.name)) {
    return Promise.resolve({
      ok: false,
      error: `“${file.name}” doesn’t look like a CSV. Please drop a .csv or .tsv file.`,
    });
  }

  // Validate the outcome of either parse path.
  const validate = (rows: Row[], columns: string[], totalRows: number): ParseResult => {
    if (columns.length === 0) {
      return { ok: false, error: 'This file has no readable columns. Is it really a CSV?' };
    }
    if (rows.length === 0) {
      return { ok: false, error: 'This file has a header row but no data rows.' };
    }
    return { ok: true, value: { rows, columns, truncated: totalRows > rowHardCap, totalRows } };
  };

  return useWorker
    ? parseInWorker(file, rowHardCap, validate, opts.onProgress)
    : parseInline(file, rowHardCap, validate, opts.onProgress);
}

/**
 * Parse large files off the main thread in a dedicated Vite worker (TRD §8), so
 * the UI stays responsive. Falls back to inline parsing if the worker errors.
 */
function parseInWorker(
  file: File,
  rowHardCap: number,
  validate: (rows: Row[], columns: string[], total: number) => ParseResult,
  onProgress?: (rows: number) => void,
): Promise<ParseResult> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(parseInline(file, rowHardCap, validate, onProgress));
      return;
    }
    let settled = false;
    const finish = (result: ParseResult) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(result);
    };
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === 'progress') onProgress?.(msg.total);
      else if (msg.type === 'done') finish(validate(msg.rows, msg.columns, msg.total));
      else finish({ ok: false, error: `Could not parse this file: ${msg.message}` });
    };
    worker.onerror = () => {
      // Worker failed to run — fall back to inline parsing.
      if (!settled) {
        settled = true;
        worker.terminate();
        resolve(parseInline(file, rowHardCap, validate, onProgress));
      }
    };
    worker.postMessage({ file, rowHardCap } satisfies WorkerRequest);
  });
}

/** Parse on the main thread, streaming in chunks (used for smaller files). */
function parseInline(
  file: File,
  rowHardCap: number,
  validate: (rows: Row[], columns: string[], total: number) => ParseResult,
  onProgress?: (rows: number) => void,
): Promise<ParseResult> {
  return new Promise((resolve) => {
    const rows: Row[] = [];
    let columns: string[] = [];
    let totalRows = 0;
    let aborted = false;
    let settled = false;

    const finish = (result: ParseResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    Papa.parse<Record<string, string | undefined>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      // `chunk` streams the file in slices so we can enforce the row cap without
      // buffering the entire file first.
      chunk: (results, parser) => {
        if (columns.length === 0 && results.meta.fields) {
          columns = results.meta.fields.filter((f) => f !== '');
        }
        for (const record of results.data) {
          totalRows++;
          if (rows.length < rowHardCap) {
            rows.push(toRow(record, columns));
          }
        }
        onProgress?.(totalRows);
        if (rows.length >= rowHardCap && !aborted) {
          aborted = true;
          parser.abort();
        }
      },
      complete: () => finish(validate(rows, columns, totalRows)),
      error: (err) => finish({ ok: false, error: `Could not parse this file: ${err.message}` }),
    });
  });
}
