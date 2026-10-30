import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthHeading } from "../auth-heading";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <div className="w-full max-w-[420px]">
      <AuthHeading title="Check your email">
        We sent a verification link to <strong className="font-semibold text-ink">{email || "your email address"}</strong>.
        Open it to activate your account.
      </AuthHeading>
      <ol className="mb-6 space-y-2.5 rounded-2xl border border-line bg-paper p-4 text-sm text-ink-soft">
        {["Open the email from Track-and-Trace.", "Click the verification link. It expires in one hour.", "Come back and log in."].map((t, i) => (
          <li key={t} className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sand font-display text-xs font-bold text-crimson">
              {i + 1}
            </span>
            <span className="pt-0.5">{t}</span>
          </li>
        ))}
        <li className="pl-9 text-xs text-ink-muted">Can&apos;t find it? Check your spam or promotions folder.</li>
      </ol>
      <ResendForm email={email} />
      <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft aria-hidden strokeWidth={2} className="size-4" />
        Back to log in
      </Link>
    </div>
  );
}
