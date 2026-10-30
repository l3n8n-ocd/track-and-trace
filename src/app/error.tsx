"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { buttonClass } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex size-20 items-center justify-center rounded-3xl bg-rust-tint text-rust">
        <TriangleAlert aria-hidden strokeWidth={1.75} className="size-9" />
      </span>
      <h1 className="mt-6 text-3xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-muted">
        Please try again. If it keeps happening, contact the Lost and Found Office.
      </p>
      <button onClick={reset} className={buttonClass("primary", "md", "mt-7")}>
        <RotateCcw aria-hidden />
        Try again
      </button>
    </div>
  );
}
