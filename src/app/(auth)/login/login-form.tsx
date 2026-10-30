"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { loginAction, type FormState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="mt-4 space-y-4" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email" error={e.email}>
        <Input
          id="email"
          name="email"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="name@example.com"
          required
          aria-invalid={Boolean(e.email)}
          defaultValue={state.values?.email}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={e.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          aria-invalid={Boolean(e.password)}
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-crimson hover:text-oxblood hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Logging in…">
        Log in
        <ArrowRight aria-hidden />
      </SubmitButton>
    </form>
  );
}
