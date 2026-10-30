import type { Metadata } from "next";
import Link from "next/link";
import { Building2, IdCard, KeyRound, Mail, UserPlus, UserRound } from "lucide-react";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { createAdminAction } from "../../actions";

export const metadata: Metadata = { title: "Add administrator" };

export default async function NewAdminPage({ searchParams }: PageProps<"/admin/users/new">) {
  await requireAdmin();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={UserPlus}
        eyebrow={
          <Link href="/admin/users" className="hover:text-oxblood">
            Users
          </Link>
        }
        title="Add administrator"
        description="Students, faculty, and staff register themselves. Use this only for Lost and Found Office personnel."
      />
      <Flash sp={sp} />
      <Card>
        <form action={createAdminAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" required>
              <Input id="firstName" name="firstName" icon={UserRound} placeholder="e.g. Liza" required />
            </Field>
            <Field label="Last name" htmlFor="lastName" required>
              <Input id="lastName" name="lastName" icon={UserRound} placeholder="e.g. Ramos" required />
            </Field>
          </div>
          <Field label="Email" htmlFor="email" required hint="They'll log in with this address.">
            <Input id="email" name="email" type="email" icon={Mail} placeholder="name@bulsu.edu.ph" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee ID number" htmlFor="idNumber" required>
              <Input id="idNumber" name="idNumber" icon={IdCard} placeholder="e.g. EMP-2024-0012" required />
            </Field>
            <Field label="Office" htmlFor="office" required>
              <Input id="office" name="office" icon={Building2} defaultValue="Lost and Found Office" required />
            </Field>
          </div>
          <Field label="Temporary password" htmlFor="password" required hint="At least 8 characters. Ask them to change it after logging in.">
            <Input id="password" name="password" type="text" icon={KeyRound} autoComplete="off" placeholder="Share it with them privately" required minLength={8} />
          </Field>
          <div className="flex justify-end border-t border-line pt-4">
            <SubmitButton pendingText="Creating…">
              <UserPlus aria-hidden />
              Create administrator
            </SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
