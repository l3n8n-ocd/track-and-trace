"use client";

import { CircleAlert, FileText, ImagePlus, LoaderCircle, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { ICON_STROKE } from "./ui";

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
    if (hidden.current) {
      hidden.current.files = dt.files;
      // Lets the form's step tracker see the new files.
      hidden.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
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

  const pickerAccept = allowPdf ? `${accept},application/pdf` : accept;
  const picker = (
    <input type="file" accept={pickerAccept} multiple onChange={onPick} className="sr-only" disabled={busy} />
  );

  return (
    <div className="space-y-2">
      <input ref={hidden} type="file" name={name} multiple className="hidden" tabIndex={-1} aria-hidden />
      {files.length === 0 ? (
        <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-cream/60 px-4 py-7 text-center transition-colors hover:border-crimson/50 hover:bg-crimson-tint/40 focus-within:border-crimson">
          <span className="flex size-11 items-center justify-center rounded-xl bg-paper text-crimson ring-1 ring-line transition-transform group-hover:-translate-y-0.5">
            {busy ? (
              <LoaderCircle aria-hidden strokeWidth={ICON_STROKE} className="size-5 animate-spin" />
            ) : (
              <ImagePlus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            )}
          </span>
          <span className="text-sm font-semibold text-ink">{busy ? "Processing…" : label}</span>
          <span className="text-xs text-ink-muted">
            JPG, PNG or WebP{allowPdf ? " · PDF" : ""} · up to {max} files, resized automatically
          </span>
          {picker}
        </label>
      ) : (
        <div className="flex flex-wrap gap-3">
          {files.map((f, i) => (
            <div key={i} className="relative size-24 overflow-hidden rounded-xl bg-sand ring-1 ring-line animate-fade">
              {f.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-[10px] text-ink-soft">
                  <FileText aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-crimson" />
                  <span className="line-clamp-2 break-all">{f.file.name}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => sync(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/75 text-cream hover:bg-ink"
                aria-label="Remove file"
              >
                <X aria-hidden strokeWidth={2.5} className="size-3.5" />
              </button>
            </div>
          ))}
          {files.length < max && (
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong bg-cream/60 text-center text-xs font-medium text-ink-soft hover:border-crimson/50 hover:text-crimson">
              {busy ? (
                <LoaderCircle aria-hidden strokeWidth={ICON_STROKE} className="size-5 animate-spin" />
              ) : (
                <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
              )}
              {busy ? "Processing…" : "Add more"}
              {picker}
            </label>
          )}
        </div>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-berry">
          <CircleAlert aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
          {error}
        </p>
      )}
    </div>
  );
}
