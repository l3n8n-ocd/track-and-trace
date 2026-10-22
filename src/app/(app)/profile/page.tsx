import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, DetailList, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { loadProfile } from "@/server/profile";
import { DeactivateForm, PasswordForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireUser();
  const [found, profile, colleges] = await Promise.all([
    db.query.user.findFirst({ where: eq(schema.user.id, session.id) }),
    loadProfile(session.id),
    db.select().from(schema.college).orderBy(asc(schema.college.name)),
  ]);
  if (!found) notFound();
  const user = { ...found, ...profile };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile" description="Your account details and settings." />
      <Card>
        <DetailList
          items={[
            ["Email", user.email],
            ["ID number", user.idNumber],
            ["Role", user.role.charAt(0).toUpperCase() + user.role.slice(1)],
            ["Member since", formatDate(user.createdAt)],
          ]}
        />
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Personal details</h2>
        <ProfileForm
          role={user.role}
          colleges={colleges}
          defaults={{
            firstName: user.firstName,
            lastName: user.lastName,
            contactNo: user.contactNo ?? "",
            collegeId: String(user.collegeId ?? ""),
            course: user.student?.course ?? "",
            yearLevel: String(user.student?.yearLevel ?? ""),
            department: user.faculty?.department ?? "",
            academicRank: user.faculty?.academicRank ?? "",
            office: user.staff?.office ?? "",
            position: user.staff?.position ?? "",
          }}
        />
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Change password</h2>
        <PasswordForm />
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-slate-600">
          Under the Data Privacy Act you can get a copy of the personal data ReturnDesk holds about you.
        </p>
        <a href="/api/me/export" className="inline-block text-sm font-medium text-brand-700 hover:underline">
          Download my data (JSON)
        </a>
        {user.role !== "admin" && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-brand-700">Deactivate account</h3>
            <p className="mt-1 text-sm text-slate-600">
              You won&apos;t be able to log in. Your reports and claims stay in the office&apos;s records. Ask an
              administrator to reactivate it later.
            </p>
            <DeactivateForm />
          </div>
        )}
      </Card>
    </div>
  );
}
