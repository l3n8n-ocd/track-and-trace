import type { Metadata } from "next";
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
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add administrator"
        description="Students, faculty, and staff register themselves. Use this only for Lost and Found Office personnel."
      />
      <Flash sp={sp} />
      <Card>
        <form action={createAdminAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" required>
              <Input id="firstName" name="firstName" required />
            </Field>
            <Field label="Last name" htmlFor="lastName" required>
              <Input id="lastName" name="lastName" required />
            </Field>
          </div>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee ID number" htmlFor="idNumber" required>
              <Input id="idNumber" name="idNumber" required />
            </Field>
            <Field label="Office" htmlFor="office" required>
              <Input id="office" name="office" defaultValue="Lost and Found Office" required />
            </Field>
          </div>
          <Field label="Temporary password" htmlFor="password" required hint="At least 8 characters. Ask them to change it after logging in.">
            <Input id="password" name="password" type="text" autoComplete="off" required minLength={8} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton pendingText="Creating…">Create administrator</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
