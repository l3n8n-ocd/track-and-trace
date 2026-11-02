"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import { SubmitButton } from "./submit-button";

export function ConfirmAction({ action, title, description, label, children, variant = "danger", pendingText = "Saving…" }: {
  action: (form: FormData) => void | Promise<void>;
  title: string; description: string; label: ReactNode; children?: ReactNode;
  variant?: "danger" | "success" | "secondary"; pendingText?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const button = trigger.current;
    return () => button?.focus();
  }, [open]);
  return <>
    <Button ref={trigger} type="button" variant={variant} onClick={() => setOpen(true)}>{label}</Button>
    {open && createPortal(
      <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-line bg-paper p-6 text-ink shadow-2xl backdrop:bg-ink/55"
        onCancel={() => setOpen(false)}
        onClick={(event) => { if (event.target === dialog.current) setOpen(false); }}>
        <div onClick={(event) => event.stopPropagation()}>
          <h2 id={`${id}-title`} className="text-xl font-bold">{title}</h2>
          <p id={`${id}-body`} className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" autoFocus onClick={() => setOpen(false)}>Cancel</Button>
            <form action={async (form) => { await action(form); setOpen(false); }}>{children}<SubmitButton variant={variant} pendingText={pendingText}>{label}</SubmitButton></form>
          </div>
        </div>
      </dialog>, document.body)}
  </>;
}
