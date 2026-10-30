"use client";

import { useMemo } from "react";
import { Lock, MessageSquareText, Paperclip, Send } from "lucide-react";
import { FormSection, StepTracker, type StepDef } from "@/components/form-steps";
import { PhotoInput } from "@/components/photo-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Select, Textarea } from "@/components/ui";
import { useActionForm } from "@/components/use-action-form";
import type { ClaimFormState } from "./actions";

const STATEMENT_HINT =
  "Describe details that aren't visible in the listing: contents, marks, scratches, stickers, lock screen, serial number, where and when you lost it.";

export function ProofForm({
  action,
  matchId,
  submitLabel,
  statementLabel,
  guided = false,
}: {
  action: (state: ClaimFormState, formData: FormData) => Promise<ClaimFormState>;
  matchId?: number | null;
  submitLabel: string;
  statementLabel: string;
  // Numbered sections with a progress tracker, for filing a new claim.
  guided?: boolean;
}) {
  const { state, pending, onSubmit } = useActionForm<ClaimFormState>(action, {});
  const e = state.fieldErrors ?? {};
  const steps = useMemo<StepDef[]>(
    () => [
      { id: "step-statement", label: "Describe it", required: ["statement"] },
      { id: "step-files", label: "Attach proof", required: [], fields: ["files"] },
    ],
    [],
  );

  const statement = (
    <Field label={statementLabel} htmlFor="statement" error={e.statement} required hint={STATEMENT_HINT}>
      <Textarea
        id="statement"
        name="statement"
        rows={6}
        placeholder="e.g. It's my fx-991ES. My initials JD are scratched near the battery cover, and there's a name sticker under the cover."
        aria-invalid={Boolean(e.statement)}
        defaultValue={state.values?.statement}
        maxLength={3000}
      />
    </Field>
  );
  const files = (
    <Field label="Supporting files (optional)" error={e.files} hint="Up to 3 photos or PDFs: a photo of you with the item, a receipt, a box, or a document.">
      <div className="space-y-3">
        <Select name="fileType" defaultValue={state.values?.fileType || "PHOTO"} className="sm:max-w-xs" aria-label="What are these files?">
          <option value="PHOTO">Photos of me with the item</option>
          <option value="RECEIPT">Receipts or proof of purchase</option>
          <option value="DOCUMENT">Documents</option>
          <option value="OTHER">Other</option>
        </Select>
        <PhotoInput name="files" max={3} allowPdf label="Add files" />
      </div>
    </Field>
  );
  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Lock aria-hidden strokeWidth={2} className="size-3.5 shrink-0" />
        Your proof is visible only to you and the Lost and Found administrators.
      </p>
      <SubmitButton pending={pending} size={guided ? "lg" : "md"} pendingText="Submitting…">
        <Send aria-hidden />
        {submitLabel}
      </SubmitButton>
    </div>
  );

  if (!guided) {
    return (
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {state.error && <Alert>{state.error}</Alert>}
        {matchId && <input type="hidden" name="matchId" value={matchId} />}
        {statement}
        {files}
        {footer}
      </form>
    );
  }

  return (
    <form id="claim-form" onSubmit={onSubmit} className="space-y-4" noValidate>
      <StepTracker formId="claim-form" steps={steps} errors={e} className="sticky top-[76px] z-10" />
      {state.error && <Alert>{state.error}</Alert>}
      {matchId && <input type="hidden" name="matchId" value={matchId} />}
      <FormSection id="step-statement" step={1} icon={MessageSquareText} title="Describe it" description="Tell the office what only the owner would know.">
        {statement}
      </FormSection>
      <FormSection id="step-files" step={2} icon={Paperclip} title="Attach proof" optional description="Stronger proof means a faster decision.">
        {files}
      </FormSection>
      <div className="rounded-2xl border border-line bg-paper p-4">{footer}</div>
    </form>
  );
}
