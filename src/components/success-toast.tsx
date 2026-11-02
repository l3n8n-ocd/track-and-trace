"use client";

import { CircleCheck, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function SuccessToast({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 0);
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => { clearTimeout(show); clearTimeout(timer); };
  }, [children]);
  if (!visible) return null;
  return createPortal(<div role="status" aria-live="polite" className="fixed inset-x-4 bottom-5 z-[90] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-success/30 bg-success-tint p-4 text-sm text-success shadow-xl sm:left-auto sm:right-6 sm:mx-0">
    <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
    <div className="min-w-0 flex-1">{children}</div>
    <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss success message" className="rounded-lg p-1 hover:bg-success/10"><X aria-hidden className="size-4" /></button>
  </div>, document.body);
}
