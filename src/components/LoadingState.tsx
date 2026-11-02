import { useDashboardStore } from '../store/useDashboardStore';

/** Non-blocking loading state shown while a file parses (PRD §8). */
export default function LoadingState() {
  const fileName = useDashboardStore((s) => s.fileName);
  const progressRows = useDashboardStore((s) => s.progressRows);

  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900"
      />
      <div>
        <p className="text-sm font-medium text-zinc-900">Reading {fileName ?? 'your file'}…</p>
        <p className="mt-0.5 text-sm text-zinc-500">
          {progressRows > 0 ? `${progressRows.toLocaleString()} rows so far` : 'Parsing in your browser'}
        </p>
      </div>
    </div>
  );
}
