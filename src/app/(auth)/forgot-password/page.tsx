import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter your registered email and we&apos;ll send you a link to set a new password.
      </p>
      <ForgotForm />
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-brand-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </Card>
  );
}
