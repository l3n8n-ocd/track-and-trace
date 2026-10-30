import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CalendarDays, Database, Download, IdCard, KeyRound, Mail, UserRound, UserX } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, ICON_STROKE, PageHeader, buttonClass } from "@/components/ui";
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

  const fullName = `${user.firstName} ${user.lastName}`;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader icon={UserRound} title="Profile" description="Your account details and settings." />
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <aside className="overflow-hidden rounded-2xl border border-line bg-paper lg:sticky lg:top-24">
          <div className="bg-ember-soft relative isolate h-20">
            <div aria-hidden className="noise absolute inset-0 -z-10" />
          </div>
          <div className="relative -mt-9 px-5 pb-5">
            <Avatar name={fullName} className="size-[72px] bg-cream text-xl ring-4 ring-paper" />
            <p className="mt-3 font-display text-lg font-bold text-ink">{fullName}</p>
            <div className="mt-1.5">
              <Badge tone={user.role === "admin" ? "amber" : "gray"}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Badge>
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
              {[
                [Mail, "Email", user.email],
                [IdCard, "ID number", user.idNumber],
                [CalendarDays, "Member since", formatDate(user.createdAt)],
              ].map(([Icon, label, value]) => {
                const I = Icon as typeof Mail;
                return (
                  <div key={label as string} className="flex items-start gap-2.5">
                    <I aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 shrink-0 text-crimson" />
                    <div className="min-w-0">
                      <dt className="text-xs text-ink-muted">{label as string}</dt>
                      <dd className="truncate font-medium text-ink">{value as string}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        </aside>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={UserRound} title="Personal details" description="Keep these current so the office can reach you." />
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
            <CardHeader icon={KeyRound} title="Change password" />
            <PasswordForm />
          </Card>
          <Card>
            <CardHeader
              icon={Database}
              title="Your data"
              description="Under the Data Privacy Act you can get a copy of the personal data Track-and-Trace holds about you."
            />
            <a href="/api/me/export" className={buttonClass("secondary")}>
              <Download aria-hidden />
              Download my data (JSON)
            </a>
            {user.role !== "admin" && (
              <div className="mt-6 rounded-2xl border border-berry/20 bg-berry-tint/40 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-berry">
                  <UserX aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                  Deactivate account
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  You won&apos;t be able to log in. Your reports and claims stay in the office&apos;s records. Ask an
                  administrator to reactivate it later.
                </p>
                <DeactivateForm />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
