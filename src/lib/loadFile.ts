import { parseCsvFile } from './csv/parse';
import { inferSchema } from './inference/infer';
import { selectCharts } from './charting/select';
import { useDashboardStore } from '../store/useDashboardStore';

/**
 * Orchestrates the full client-side pipeline for a dropped file:
 * parse → infer schema → select charts, updating the store as it goes.
 * Everything runs in the browser; nothing is uploaded (PRD §9).
 */
export async function loadFile(file: File): Promise<void> {
  const store = useDashboardStore.getState();
  store.setParsing(file.name);

  const result = await parseCsvFile(file, { onProgress: store.setProgress });
  if (!result.ok) {
    store.setError(result.error);
    return;
  }

  const { rows, columns, truncated, totalRows } = result.value;
  const columnSchemas = inferSchema(rows, columns);
  const charts = selectCharts(columnSchemas, rows);

  // Milestone 1 acceptance: log row count + column names to the console.
  // eslint-disable-next-line no-console
  console.info(`[DropDash] Parsed ${rows.length.toLocaleString()} rows · columns:`, columns);

  store.loadParsed({ fileName: file.name, rows, columnSchemas, charts, truncated, totalRows });
}
