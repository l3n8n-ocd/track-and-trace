import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, DetailList, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { loadProfile } from "@/server/profile";
import { setUserStatusAction } from "../../actions";

export const metadata: Metadata = { title: "User" };

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name}
        description={
          <span className="flex items-center gap-2 capitalize">
            {user.role} {user.status === "DEACTIVATED" && <Badge tone="red">Deactivated</Badge>}
          </span>
        }
      />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <DetailList
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
        </Card>
        {user.id !== admin.id && (
          <Card>
            <h2 className="font-semibold">Account status</h2>
            <form action={setUserStatusAction.bind(null, user.id)} className="mt-3">
              <input type="hidden" name="status" value={user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE"} />
              <SubmitButton variant={user.status === "ACTIVE" ? "danger" : "success"} className="w-full">
                {user.status === "ACTIVE" ? "Deactivate account" : "Reactivate account"}
              </SubmitButton>
              <p className="mt-2 text-xs text-slate-500">
                Deactivated users are signed out and can&apos;t log in. Their records are kept.
              </p>
            </form>
          </Card>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Reports</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {reports.length === 0 && <li className="py-2 text-slate-600">None</li>}
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/admin/reports/${r.id}`} className="text-brand-700 hover:underline">
                  #{r.id} {r.itemName}
                </Link>
                <span className="flex gap-1">
                  <TypeBadge type={r.reportType} />
                  <ReportStatusBadge status={r.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Claims</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {claims.length === 0 && <li className="py-2 text-slate-600">None</li>}
            {claims.map(({ claim, itemName }) => (
              <li key={claim.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/admin/claims/${claim.id}`} className="text-brand-700 hover:underline">
                  #{claim.id} {itemName}
                </Link>
                <ClaimStatusBadge status={claim.claimStatus} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
