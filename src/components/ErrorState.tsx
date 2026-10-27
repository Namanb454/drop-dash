import { useDashboardStore } from '../store/useDashboardStore';

/** Visible, recoverable error state for bad/empty files (PRD §7). */
export default function ErrorState() {
  const error = useDashboardStore((s) => s.error);
  const reset = useDashboardStore((s) => s.reset);

  return (
    <div className="w-full max-w-md text-center" role="alert">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A1.5 1.5 0 003.1 21h17.8a1.5 1.5 0 001.29-2.44l-8.48-14.7a1.5 1.5 0 00-2.42 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900">That file didn’t work</h2>
      <p className="mt-2 text-slate-600">{error ?? 'Something went wrong reading the file.'}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        Try another file
      </button>
    </div>
  );
}
