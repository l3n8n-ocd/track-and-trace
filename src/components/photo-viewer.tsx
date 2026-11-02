"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { Modal } from "./modal";
import { cn } from "./ui";

export function PhotoViewer({ src, thumbnailSrc, alt, className, imageClassName }: {
  src: string;
  thumbnailSrc: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return <>
    <button type="button" aria-haspopup="dialog" aria-label={`View photo: ${alt}`}
      className={cn("group block min-w-0 cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crimson", className)}
      onClick={() => { setLoaded(false); setFailed(false); setOpen(true); }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnailSrc} alt={alt} className={cn("aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105", imageClassName)} />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title={alt} className="max-w-5xl">
      <div className="relative flex min-h-48 items-center justify-center bg-ink/5 p-3 sm:p-5">
        {!loaded && !failed && <span role="status" className="absolute flex items-center gap-2 text-sm text-ink-muted"><LoaderCircle aria-hidden className="size-5 animate-spin" />Loading photo…</span>}
        {failed ? <p role="alert" className="p-8 text-center text-sm">The photo could not load. Try opening the original image below.</p> : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt={alt} className="max-h-[calc(100dvh-11rem)] max-w-full object-contain" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        )}
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-crimson hover:underline">Open original image<ExternalLink aria-hidden className="size-4" /></a>
      </div>
    </Modal>
  </>;
}
