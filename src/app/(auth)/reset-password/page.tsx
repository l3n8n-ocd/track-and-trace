import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const invalid = sp.error === "INVALID_TOKEN" || !token;
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Set a new password</h1>
      {invalid ? (
        <div className="mt-4 space-y-4">
          <Alert>This reset link is invalid or has expired.</Alert>
          <Link href="/forgot-password" className="text-sm text-brand-700 hover:underline">
            Request a new link
          </Link>
        </div>
      ) : (
        <ResetForm token={token} />
      )}
    </Card>
  );
}
