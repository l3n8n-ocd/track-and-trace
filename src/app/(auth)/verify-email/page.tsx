import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="mt-2 text-sm text-slate-600">
        We sent a verification link to <strong>{email || "your email address"}</strong>. Open it to
        activate your account. The link expires in one hour. If you don&apos;t see it, check your spam
        folder.
      </p>
      <ResendForm email={email} />
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-brand-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </Card>
  );
}
