import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { connection } from "next/server";
import { db, schema } from "@/db";
import { AuthHeading } from "../auth-heading";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  // Colleges can change, so read them on every request.
  await connection();
  const colleges = await db.select().from(schema.college).orderBy(asc(schema.college.name));
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
