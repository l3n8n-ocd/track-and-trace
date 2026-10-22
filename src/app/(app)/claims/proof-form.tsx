"use client";

import { useActionState } from "react";
import { PhotoInput } from "@/components/photo-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Select, Textarea } from "@/components/ui";
import type { ClaimFormState } from "./actions";

export function ProofForm({
  action,
  matchId,
  submitLabel,
  statementLabel,
}: {
  action: (state: ClaimFormState, formData: FormData) => Promise<ClaimFormState>;
  matchId?: number | null;
  submitLabel: string;
  statementLabel: string;
}) {
  const [state, formAction] = useActionState<ClaimFormState, FormData>(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      {matchId && <input type="hidden" name="matchId" value={matchId} />}
      <Field
        label={statementLabel}
        htmlFor="statement"
        error={e.statement}
        required
        hint="Describe details that aren't visible in the listing: contents, marks, scratches, stickers, lock screen, serial number, where and when you lost it."
      >
        <Textarea id="statement" name="statement" rows={6} defaultValue={state.values?.statement} maxLength={3000} />
      </Field>
      <Field label="Supporting files (optional)" error={e.files} hint="Up to 3 photos or PDFs: a photo of you with the item, a receipt, a box, or a document.">
        <div className="space-y-2">
          <Select name="fileType" defaultValue={state.values?.fileType || "PHOTO"} className="sm:max-w-xs" aria-label="What are these files?">
            <option value="PHOTO">Photos of me with the item</option>
            <option value="RECEIPT">Receipts or proof of purchase</option>
            <option value="DOCUMENT">Documents</option>
            <option value="OTHER">Other</option>
          </Select>
          <PhotoInput name="files" max={3} allowPdf label="Add file" />
        </div>
      </Field>
      <p className="text-xs text-slate-500">
        Your proof is visible only to you and the Lost and Found administrators.
      </p>
      <div className="flex justify-end">
        <SubmitButton pendingText="Submitting…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
