import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BadgeCheck, FileText, Inbox, MailWarning, UserCheck, UserX } from "lucide-react";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, Badge, Card, CardEmpty, CardHeader, DetailList } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { loadProfile } from "@/server/profile";
import { setUserStatusAction } from "../../actions";

export const metadata: Metadata = { title: "User" };

const ROLE_LABEL = { student: "Student", faculty: "Faculty", staff: "Staff", admin: "Administrator" } as const;

export default async function AdminUserPage({ params, searchParams }: PageProps<"/admin/users/[id]">) {
  const admin = await requireAdmin();
  const id = (await params).id;
  const sp = await searchParams;
  const user = await db.query.user.findFirst({ where: eq(schema.user.id, id) });
  if (!user) notFound();
  const [profile, college, reports, claims, [logs]] = await Promise.all([
    loadProfile(id),
    user.collegeId ? db.query.college.findFirst({ where: eq(schema.college.id, user.collegeId) }) : null,
    db.select().from(schema.report).where(eq(schema.report.userId, id)).orderBy(desc(schema.report.dateReported)).limit(20),
    db
      .select({ claim: schema.claim, itemName: schema.report.itemName })
      .from(schema.claim)
      .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
      .where(eq(schema.claim.claimantId, id))
      .orderBy(desc(schema.claim.claimDate))
      .limit(20),
    db.select({ value: count() }).from(schema.activityLog).where(eq(schema.activityLog.userId, id)),
  ]);

  const roleDetails: [string, string | null][] = profile.student
    ? [["Course", profile.student.course], ["Year level", String(profile.student.yearLevel)]]
    : profile.faculty
      ? [["Department", profile.faculty.department], ["Academic rank", profile.faculty.academicRank]]
      : profile.staff
        ? [["Office", profile.staff.office], ["Position", profile.staff.position]]
        : profile.administrator
          ? [["Office", profile.administrator.office], ["Admin level", profile.administrator.adminLevel]]
          : [];

  const active = user.status === "ACTIVE";
  return (
    <div className="space-y-6">
      <Flash sp={sp} />
      <Card className="p-0 sm:p-0">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar name={user.name} className="size-16 text-lg" />
          <div className="min-w-0 flex-1">
            <Link href="/admin/users" className="text-xs font-semibold uppercase tracking-[0.14em] text-rust hover:text-oxblood">
              Users
            </Link>
            <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{user.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone={user.role === "admin" ? "amber" : "gray"}>{ROLE_LABEL[user.role]}</Badge>
              {!active ? (
                <Badge tone="red" icon={UserX}>Deactivated</Badge>
              ) : user.emailVerified ? (
                <Badge tone="green" icon={BadgeCheck}>Active</Badge>
              ) : (
                <Badge tone="amber" icon={MailWarning}>Unverified email</Badge>
              )}
            </p>
          </div>
          {user.id !== admin.id && (
            <form action={setUserStatusAction.bind(null, user.id)} className="sm:text-right">
              <input type="hidden" name="status" value={active ? "DEACTIVATED" : "ACTIVE"} />
              <SubmitButton variant={active ? "danger" : "success"}>
                {active ? <UserX aria-hidden /> : <UserCheck aria-hidden />}
                {active ? "Deactivate account" : "Reactivate account"}
              </SubmitButton>
              <p className="mt-1.5 text-xs text-ink-muted">
                {active ? "They're signed out; records are kept." : "Restores their access."}
              </p>
            </form>
          )}
        </div>
        <div className="border-t border-line p-5 sm:p-6">
          <DetailList
            columns={3}
            items={[
              ["Email", `${user.email}${user.emailVerified ? "" : " (not verified)"}`],
              ["ID number", user.idNumber],
              ["Contact number", user.contactNo],
              ["College / office", college?.name ?? null],
              ...roleDetails,
              ["Registered", formatDate(user.createdAt)],
              ["Logged actions", String(logs.value)],
            ]}
          />
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={FileText} title="Reports" description={`${reports.length} most recent`} />
          {reports.length === 0 ? (
            <CardEmpty>None yet.</CardEmpty>
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reports/${r.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-sand/60">
                    <TypeBadge type={r.reportType} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      #{r.id} {r.itemName}
                    </span>
                    <ReportStatusBadge status={r.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader icon={Inbox} title="Claims" description={`${claims.length} most recent`} />
          {claims.length === 0 ? (
            <CardEmpty>None yet.</CardEmpty>
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {claims.map(({ claim, itemName }) => (
                <li key={claim.id}>
                  <Link href={`/admin/claims/${claim.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-sand/60">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      #{claim.id} {itemName}
                    </span>
                    <ClaimStatusBadge status={claim.claimStatus} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
