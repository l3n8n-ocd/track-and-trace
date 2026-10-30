"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { resetPasswordAction, type FormState } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" error={e.password} hint="At least 8 characters">
        <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="Create a new password" aria-invalid={Boolean(e.password)} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={e.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" placeholder="Type it again" aria-invalid={Boolean(e.confirmPassword)} />
      </Field>
      <SubmitButton className="w-full" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
