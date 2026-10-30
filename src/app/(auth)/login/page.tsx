import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { AuthHeading } from "../auth-heading";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <div className="w-full max-w-[400px]">
      <AuthHeading title="Welcome!">
        Log in with the email you registered with to check your reports and claims.
      </AuthHeading>
      <div className="space-y-3 empty:hidden">
        {sp.reset && <Alert tone="green">Your password was changed. Log in with your new password.</Alert>}
        {sp.verified && <Alert tone="green">Your email is verified. You can log in now.</Alert>}
      </div>
      <LoginForm next={next} />
      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <span className="h-px flex-1 bg-line-strong" />
        New to Track-and-Trace?
        <span className="h-px flex-1 bg-line-strong" />
      </div>
      <Link
        href="/register"
        className="flex h-11 w-full items-center justify-center rounded-xl border border-line-strong bg-paper text-sm font-semibold text-ink hover:bg-sand"
      >
        Create an account
      </Link>
      <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-muted">
        By logging in, you agree to how we handle your data in the{" "}
        <Link href="/privacy" className="font-medium text-ink underline decoration-line-strong underline-offset-2">
          Data privacy notice
        </Link>
        .
      </p>
    </div>
  );
}
