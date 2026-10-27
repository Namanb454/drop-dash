import Papa from 'papaparse';
import type { Row } from '../types';

/**
 * Dedicated CSV parsing worker (TRD §8). Papaparse's built-in `worker: true`
 * mode cannot locate its own script inside a bundled ESM app, so we run Papa in
 * a real Vite worker module instead. The main thread spawns this for files above
 * the size threshold, keeping the UI responsive during large parses.
 */

export interface WorkerRequest {
  file: File;
  rowHardCap: number;
}

export type WorkerResponse =
  | { type: 'progress'; total: number }
  | { type: 'done'; rows: Row[]; columns: string[]; total: number }
  | { type: 'error'; message: string };

const post = (msg: WorkerResponse) => (self as unknown as Worker).postMessage(msg);

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { file, rowHardCap } = e.data;
  const rows: Row[] = [];
  let columns: string[] = [];
  let total = 0;
  let aborted = false;

  Papa.parse<Record<string, string | undefined>>(file, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
    chunk: (results, parser) => {
      if (columns.length === 0 && results.meta.fields) {
        columns = results.meta.fields.filter((f) => f !== '');
      }
      for (const record of results.data) {
        total++;
        if (rows.length < rowHardCap) {
          const row: Row = {};
          for (const col of columns) row[col] = record[col] === undefined ? null : record[col]!;
          rows.push(row);
        }
      }
      post({ type: 'progress', total });
      if (rows.length >= rowHardCap && !aborted) {
        aborted = true;
        parser.abort();
      }
    },
    complete: () => post({ type: 'done', rows, columns, total }),
    error: (err) => post({ type: 'error', message: err.message }),
  });
};
