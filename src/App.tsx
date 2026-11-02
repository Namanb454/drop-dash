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
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900 text-[11px] font-bold text-white">
              D
            </span>
            <h1 className="text-[15px] font-semibold tracking-tight text-zinc-900">
              Drop<span className="text-accent-600">Dash</span>
            </h1>
          </div>
          {status === 'ready' && (
            <div className="flex items-center gap-3">
              <span
                className="hidden max-w-[40vw] truncate text-sm text-zinc-500 sm:inline"
                title={fileName ?? ''}
              >
                {fileName}
              </span>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15"
              >
                New file
              </button>
            </div>
          )}
        </div>
      </header>

      {status === 'ready' ? (
        <main className="flex-1">
          <Dashboard />
        </main>
      ) : (
        <main className="grid flex-1 place-items-center p-6">
          {status === 'parsing' && <LoadingState />}
          {status === 'error' && <ErrorState />}
          {status === 'idle' && <Dropzone />}
        </main>
      )}

      <footer className="border-t border-zinc-200/70 px-6 py-4 text-center text-xs text-zinc-400">
        Everything runs in your browser — no upload, no account.
      </footer>
    </div>
  );
}
