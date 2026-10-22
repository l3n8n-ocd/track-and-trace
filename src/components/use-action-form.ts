"use client";

import { startTransition, useActionState, type FormEvent } from "react";

// Like useActionState, but submits without React's automatic form reset,
// so dropdowns and selected photos keep their values after a validation
// error.
export function useActionForm<S extends object>(
  action: (state: Awaited<S>, formData: FormData) => Promise<S>,
  initial: Awaited<S>,
) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, pending, onSubmit };
}
