import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">Use the email you registered with.</p>
      <div className="mt-4 space-y-3">
        {sp.reset && <Alert tone="green">Your password was changed. Log in with your new password.</Alert>}
        {sp.verified && <Alert tone="green">Your email is verified. You can log in now.</Alert>}
      </div>
      <LoginForm next={next} />
      <div className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:justify-between">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          Forgot password?
        </Link>
        <span className="text-slate-600">
          No account yet?{" "}
          <Link href="/register" className="font-medium text-brand-700 hover:underline">
            Register
          </Link>
        </span>
      </div>
    </Card>
  );
}
