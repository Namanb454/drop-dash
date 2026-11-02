import { useCallback, useRef, useState } from 'react';
import { loadFile } from '../lib/loadFile';

/**
 * The empty-state dropzone (PRD §8): drag-and-drop plus click-to-browse,
 * keyboard operable. On drop it hands the file to the client-side pipeline.
 */
export default function Dropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (file) void loadFile(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="w-full max-w-xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a CSV file here or press Enter to browse"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={[
          'group cursor-pointer rounded-2xl border border-dashed px-8 py-16 text-center transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15',
          dragActive
            ? 'border-accent-500 bg-accent-50'
            : 'border-zinc-300 bg-white hover:border-zinc-400',
        ].join(' ')}
      >
        <div
          className={[
            'mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl border transition-colors',
            dragActive ? 'border-accent-200 bg-white text-accent-600' : 'border-zinc-200 bg-zinc-50 text-zinc-400 group-hover:text-zinc-500',
          ].join(' ')}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          Drop a CSV to build a dashboard
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
          Your file never leaves your device — no upload, no account.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          className="mt-6 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2"
        >
          Choose a file
        </button>
        <p className="mt-4 text-xs text-zinc-400">CSV or TSV · up to ~500k rows</p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,text/csv"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
