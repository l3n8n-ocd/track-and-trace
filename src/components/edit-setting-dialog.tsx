"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "./modal";
import { SubmitButton } from "./submit-button";
import { Button } from "./ui";

export function EditSettingDialog({ title, label, action, children }: {
  title: string;
  label: string;
  action: (form: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="ghost" size="sm" aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)} className="shrink-0 text-crimson">
      <Pencil aria-hidden />Edit
    </Button>
    <Modal open={open} onClose={() => setOpen(false)} title={title}>
      <form action={async (form) => { await action(form); setOpen(false); }} className="space-y-4 p-5">
        {children}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton>Save changes</SubmitButton>
        </div>
      </form>
    </Modal>
  </>;
}
