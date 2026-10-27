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
    <div className="w-full max-w-2xl">
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
          'cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-white/60 hover:border-indigo-400 hover:bg-white',
        ].join(' ')}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="mx-auto mb-4 h-10 w-10 text-indigo-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Drop a CSV to build a dashboard.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-slate-500">
          Everything runs in your browser. Your file never leaves your device — no
          upload, no account.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Choose a file
        </button>
        <p className="mt-4 text-xs text-slate-400">.csv or .tsv · up to ~500k rows</p>

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
