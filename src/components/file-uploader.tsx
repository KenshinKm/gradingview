"use client";

import { useEffect, useRef, useState } from "react";

const IMAGE_RE = /\.(jpe?g|png)$/i;

export interface UploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept: string;
  hint: string;
  idPrefix: string;
}

/**
 * Multi-file uploader with thumbnails, per-file remove/replace, and
 * user-controlled ordering (the order in `files` is the submission order).
 */
export function FileUploader({ files, onChange, accept, hint, idPrefix }: UploaderProps) {
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [urls, setUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    const next = files.map((f) =>
      IMAGE_RE.test(f.name) ? URL.createObjectURL(f) : null,
    );
    setUrls(next);
    return () => next.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  function add(list: FileList | null) {
    if (!list?.length) return;
    onChange([...files, ...Array.from(list)]);
    if (addRef.current) addRef.current.value = "";
  }

  function remove(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function doReplace(list: FileList | null) {
    if (replaceIndex === null || !list?.length) return;
    const next = [...files];
    next[replaceIndex] = list[0];
    onChange(next);
    setReplaceIndex(null);
    if (replaceRef.current) replaceRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => addRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-surface-subtle px-4 py-8 text-center transition hover:border-brand-300"
      >
        <p className="text-sm font-medium text-ink-soft">
          Click to upload or drag files here
        </p>
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
        <input
          ref={addRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => doReplace(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={`${idPrefix}-${f.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <span className="w-6 shrink-0 text-center text-xs font-semibold text-ink-muted">
                {i + 1}
              </span>
              {urls[i] ? (
                <img src={urls[i]!} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-slate-100 text-[10px] font-semibold text-ink-muted">
                  {f.name.split(".").pop()?.toUpperCase().slice(0, 4)}
                </span>
              )}
              <span className="flex-1 truncate text-sm text-ink-soft">{f.name}</span>
              <div className="flex shrink-0 items-center gap-1 text-ink-muted">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-30"
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === files.length - 1}
                  className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-30"
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-100"
                  onClick={() => {
                    setReplaceIndex(i);
                    replaceRef.current?.click();
                  }}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => remove(i)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
