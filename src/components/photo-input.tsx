"use client";

import { useRef, useState } from "react";

const MAX_DIMENSION = 1600;
const QUALITY = 0.8;

// Shrinks a photo in the browser before upload so several photos fit
// within the 4.5 MB request limit, and drops location metadata.
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PhotoInput({
  name,
  max = 5,
  accept = "image/jpeg,image/png,image/webp",
  allowPdf = false,
  label = "Add photos",
}: {
  name: string;
  max?: number;
  accept?: string;
  allowPdf?: boolean;
  label?: string;
}) {
  const hidden = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; preview: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function sync(next: { file: File; preview: string | null }[]) {
    setFiles(next);
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f.file));
    if (hidden.current) hidden.current.files = dt.files;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    if (files.length + picked.length > max) {
      setError(`You can add up to ${max} files.`);
      return;
    }
    setBusy(true);
    const processed = await Promise.all(
      picked.map(async (f) => {
        const out = await compress(f);
        return { file: out, preview: out.type.startsWith("image/") ? URL.createObjectURL(out) : null };
      }),
    );
    setBusy(false);
    const tooBig = processed.find((p) => p.file.size > 4 * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.file.name} is larger than 4 MB.`);
      return;
    }
    sync([...files, ...processed]);
  }

  return (
    <div className="space-y-2">
      <input ref={hidden} type="file" name={name} multiple className="hidden" tabIndex={-1} aria-hidden />
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
            {f.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center p-1 text-center text-[10px] text-slate-600">
                {f.file.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => sync(files.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white"
              aria-label="Remove file"
            >
              ×
            </button>
          </div>
        ))}
        {files.length < max && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-center text-xs text-slate-600 hover:bg-slate-50">
            <span className="text-xl leading-none">+</span>
            {busy ? "Processing…" : label}
            <input
              type="file"
              accept={allowPdf ? `${accept},application/pdf` : accept}
              multiple
              onChange={onPick}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-brand-700">{error}</p>}
    </div>
  );
}
