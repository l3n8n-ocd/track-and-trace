"use client";

import { useActionState } from "react";
import { Mail, RotateCcw } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { resendVerificationAction, type FormState } from "../actions";

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState<FormState, FormData>(resendVerificationAction, {});
  return (
    <form action={action} className="space-y-3">
      {state.message && <Alert tone="green">{state.message}</Alert>}
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Didn't get it? Send a new link to" htmlFor="email">
        <Input id="email" name="email" type="email" icon={Mail} placeholder="name@example.com" defaultValue={email} />
      </Field>
      <SubmitButton variant="secondary" className="w-full" pendingText="Sending…">
        <RotateCcw aria-hidden />
        Resend verification email
      </SubmitButton>
    </form>
  );
}
