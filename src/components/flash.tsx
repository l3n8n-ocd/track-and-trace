import { Alert } from "./ui";

// Shows ?msg= / ?error= set by admin actions.
export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  if (!msg && !error) return null;
  return <div className="mb-4">{error ? <Alert>{error}</Alert> : <Alert tone="green">{msg}</Alert>}</div>;
}
