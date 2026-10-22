import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { connection } from "next/server";
import { Card } from "@/components/ui";
import { db, schema } from "@/db";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  // Colleges can change, so read them on every request.
  await connection();
  const colleges = await db.select().from(schema.college).orderBy(asc(schema.college.name));
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">
        For students, faculty, and staff of Bulacan State University – Main Campus.
      </p>
      <RegisterForm colleges={colleges} />
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
