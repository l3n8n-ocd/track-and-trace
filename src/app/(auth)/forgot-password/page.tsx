import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthHeading } from "../auth-heading";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-[400px]">
      <AuthHeading title="Forgot your password?">
        Enter your registered email and we&apos;ll send you a link to set a new one.
      </AuthHeading>
      <ForgotForm />
      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft aria-hidden strokeWidth={2} className="size-4" />
        Back to log in
      </Link>
    </div>
  );
}
