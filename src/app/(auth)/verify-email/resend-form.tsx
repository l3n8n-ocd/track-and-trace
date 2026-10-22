"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { resendVerificationAction, type FormState } from "../actions";

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState<FormState, FormData>(resendVerificationAction, {});
  return (
    <form action={action} className="mt-5 space-y-3">
      {state.message && <Alert tone="green">{state.message}</Alert>}
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Didn't get it? Send a new link to" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={email} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Sending…">
        Resend verification email
      </SubmitButton>
    </form>
  );
}
