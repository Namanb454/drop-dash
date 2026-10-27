import { useDashboardStore } from './store/useDashboardStore';
import Dropzone from './components/Dropzone';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import Dashboard from './components/Dashboard';

export default function App() {
  const status = useDashboardStore((s) => s.status);
  const fileName = useDashboardStore((s) => s.fileName);
  const reset = useDashboardStore((s) => s.reset);

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-tight">
          Drop<span className="text-indigo-600">Dash</span>
        </h1>
        {status === 'ready' && (
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[40vw] truncate text-sm text-slate-500 sm:inline" title={fileName ?? ''}>
              {fileName}
            </span>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              New file
            </button>
          </div>
        )}
      </header>

      {status === 'ready' ? (
        <main className="flex-1">
          <Dashboard />
        </main>
      ) : (
        <main className="flex-1 grid place-items-center p-6">
          {status === 'parsing' && <LoadingState />}
          {status === 'error' && <ErrorState />}
          {status === 'idle' && <Dropzone />}
        </main>
      )}

      <footer className="border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-400">
        DropDash · everything runs in your browser — no upload, no account.
      </footer>
    </div>
  );
}
