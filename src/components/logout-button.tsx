"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { SubmitButton } from "./submit-button";
import { Button, ICON_STROKE } from "./ui";

// Opens a confirmation before logging out. The dialog is portaled to the
// body so the navigation drawer's transform can't clip it.
export function LogoutButton({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div aria-hidden onClick={() => setOpen(false)} className="absolute inset-0 animate-fade bg-ink/55 backdrop-blur-[2px]" />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="logout-title"
              aria-describedby="logout-body"
              className="relative w-full max-w-sm animate-rise rounded-3xl border border-line bg-paper p-6 text-center"
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-crimson-tint text-crimson">
                <LogOut aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
              </span>
              <h2 id="logout-title" className="mt-4 text-xl font-bold text-ink">
                Log out?
              </h2>
              <p id="logout-body" className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                You&apos;ll need to log in again to check your reports and claims.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <Button ref={cancel} type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Stay
                </Button>
                <form action={logoutAction}>
                  <SubmitButton className="w-full" pendingText="Logging out…">
                    Log out
                  </SubmitButton>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
