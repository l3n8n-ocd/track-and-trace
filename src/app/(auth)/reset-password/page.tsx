import type { Metadata } from "next";
import { Alert, LinkButton } from "@/components/ui";
import { AuthHeading } from "../auth-heading";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const invalid = sp.error === "INVALID_TOKEN" || !token;
  return (
    <div className="w-full max-w-[400px]">
      <AuthHeading title="Set a new password">
        {!invalid && "Choose a password you haven't used here before."}
      </AuthHeading>
      {invalid ? (
        <div className="space-y-4">
          <Alert>This reset link is invalid or has expired.</Alert>
          <LinkButton href="/forgot-password" className="w-full">
            Request a new link
          </LinkButton>
        </div>
      ) : (
        <ResetForm token={token} />
      )}
    </div>
  );
}
