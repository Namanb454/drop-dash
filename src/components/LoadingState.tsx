import { useDashboardStore } from '../store/useDashboardStore';

/** Non-blocking loading state shown while a file parses (PRD §8). */
export default function LoadingState() {
  const fileName = useDashboardStore((s) => s.fileName);
  const progressRows = useDashboardStore((s) => s.progressRows);

  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"
      />
      <div>
        <p className="font-medium text-slate-900">Reading {fileName ?? 'your file'}…</p>
        <p className="text-sm text-slate-500">
          {progressRows > 0 ? `${progressRows.toLocaleString()} rows so far` : 'Parsing in your browser'}
        </p>
      </div>
    </div>
  );
}
