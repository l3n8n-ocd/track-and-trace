import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { collegeOptions } from "@/server/options";
import { AuthHeading } from "../auth-heading";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  // Keep rendering on request while reusing the shared, invalidated list.
  await connection();
  const colleges = await collegeOptions();
  return (
    <div className="w-full max-w-[560px]">
      <AuthHeading title="Create your account">
        For students, faculty, and staff of Bulacan State University – Main Campus. It takes about two minutes.
      </AuthHeading>
      <RegisterForm colleges={colleges} />
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-crimson hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
