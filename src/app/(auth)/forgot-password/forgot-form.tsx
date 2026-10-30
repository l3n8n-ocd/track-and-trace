"use client";

import { useActionState } from "react";
import { Mail, Send } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { forgotPasswordAction, type FormState } from "../actions";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && <Alert tone="green">{state.message}</Alert>}
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} hint="The reset link expires in one hour.">
        <Input
          id="email"
          name="email"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="The email you registered with"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        <Send aria-hidden />
        Send reset link
      </SubmitButton>
    </form>
  );
}
