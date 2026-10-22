import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { notFound } from "next/navigation";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge, MatchStatusBadge, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Card, DetailList, Field, Input, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { canChangeReport } from "@/lib/status";
import { locationLabel, storageOptions } from "@/server/options";
import { imagesFor, selectReports } from "@/server/queries";
import { photoUrl } from "@/server/storage";
import { assignStorageAction, setReportStatusAction, verifyReportAction } from "../../actions";

export const metadata: Metadata = { title: "Report" };

export default async function AdminReportPage({ params, searchParams }: PageProps<"/admin/reports/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const [row] = await selectReports().where(eq(schema.report.id, id));
  if (!row) notFound();
  const r = row.report;
  const found = r.reportType === "FOUND";

  const other = alias(schema.report, "other_report");
  const [reporter, images, storage, claims, matches] = await Promise.all([
    db.query.user.findFirst({ where: eq(schema.user.id, r.userId) }),
    imagesFor([id]).then((m) => m.get(id) ?? []),
    storageOptions(),
    found
      ? db
          .select({ claim: schema.claim, claimant: schema.user.name })
          .from(schema.claim)
          .innerJoin(schema.user, eq(schema.user.id, schema.claim.claimantId))
          .where(eq(schema.claim.reportId, id))
          .orderBy(desc(schema.claim.claimDate))
      : Promise.resolve([]),
    db
      .select({ match: schema.matchRecord, other: other })
      .from(schema.matchRecord)
      .innerJoin(other, or(eq(other.id, schema.matchRecord.lostReportId), eq(other.id, schema.matchRecord.foundReportId)))
      .where(found ? eq(schema.matchRecord.foundReportId, id) : eq(schema.matchRecord.lostReportId, id))
      .orderBy(desc(schema.matchRecord.matchScore)),
  ]);
  const matchRows = matches.filter((m) => m.other.id !== id);

  const statusOptions = (["VERIFIED", "CLOSED", "EXPIRED", "ARCHIVED"] as const).filter(
    (s) => s !== "VERIFIED" && canChangeReport(r.status, s),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={r.itemName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type={r.reportType} /> <ReportStatusBadge status={r.status} /> Report #{r.id} · filed{" "}
            {formatDateTime(r.dateReported)}
          </span>
        }
      />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <DetailList
              items={[
                ["Category", row.category.name],
                [found ? "Date found" : "Date lost", formatDate(r.dateLostOrFound)],
                ["Place", [locationLabel(row.location), r.locationNote].filter(Boolean).join(", ")],
                ["Color", r.color],
                ["Brand", r.brand],
                ["Storage", row.storage ? locationLabel(row.storage) : found ? "Not assigned" : "—"],
                ["Description", r.description],
                ["Hidden details", r.hiddenDetails],
                ["Verified", r.dateVerified ? formatDateTime(r.dateVerified) : "Not yet"],
              ]}
            />
            {images.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((img) => (
                  <a key={img.id} href={photoUrl(img.imagePath, { width: 1600 })} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(img.imagePath, { width: 400 })} alt="" className="aspect-square w-full rounded-md object-cover ring-1 ring-slate-200" />
                  </a>
                ))}
              </div>
            )}
          </Card>

          {found && (
            <Card>
              <h2 className="font-semibold">Claims</h2>
              {claims.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No claims yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {claims.map(({ claim, claimant }) => (
                    <li key={claim.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/admin/claims/${claim.id}`} className="font-medium text-brand-700 hover:underline">
                        Claim #{claim.id} · {claimant}
                      </Link>
                      <span className="flex items-center gap-2 text-xs text-slate-500">
                        {formatDate(claim.claimDate)} <ClaimStatusBadge status={claim.claimStatus} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card>
            <h2 className="font-semibold">{found ? "Matching lost reports" : "Matching found reports"}</h2>
            {matchRows.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No matches.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {matchRows.map(({ match, other: o }) => (
                  <li key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/admin/reports/${o.id}`} className="text-brand-700 hover:underline">
                      #{o.id} {o.itemName}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      score {match.matchScore.toFixed(0)} <MatchStatusBadge status={match.matchStatus} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Reported by</h2>
            {reporter && (
              <div className="mt-2 text-sm">
                <Link href={`/admin/users/${reporter.id}`} className="font-medium text-brand-700 hover:underline">
                  {reporter.name}
                </Link>
                <p className="text-slate-600">{reporter.email}</p>
                <p className="text-slate-600">{reporter.contactNo}</p>
                <p className="text-slate-600">ID {reporter.idNumber}</p>
              </div>
            )}
          </Card>

          {r.status === "PENDING" && (
            <Card>
              <h2 className="font-semibold">Verify</h2>
              <p className="mt-1 text-sm text-slate-600">
                {found
                  ? "Confirm the item was surrendered to the office and record where it's stored. It then appears in search and can be claimed."
                  : "Confirm the lost report is genuine and complete."}
              </p>
              <form action={verifyReportAction.bind(null, id)} className="mt-3 space-y-3">
                {found && (
                  <Field label="Storage location" htmlFor="storageLocationId" required>
                    <Select id="storageLocationId" name="storageLocationId" defaultValue={r.storageLocationId ?? ""}>
                      <option value="">Choose…</option>
                      {storage.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <SubmitButton className="w-full" pendingText="Verifying…">
                  {found ? "Item received, verify" : "Verify report"}
                </SubmitButton>
              </form>
            </Card>
          )}

          {found && r.status === "VERIFIED" && (
            <Card>
              <h2 className="font-semibold">Storage location</h2>
              <form action={assignStorageAction.bind(null, id)} className="mt-3 space-y-3">
                <Select name="storageLocationId" defaultValue={r.storageLocationId ?? ""} aria-label="Storage location">
                  <option value="">Choose…</option>
                  {storage.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <SubmitButton variant="secondary" className="w-full">
                  Save storage
                </SubmitButton>
              </form>
            </Card>
          )}

          {statusOptions.length > 0 && (
            <Card>
              <h2 className="font-semibold">Change status</h2>
              <form action={setReportStatusAction.bind(null, id)} className="mt-3 space-y-3">
                <Select name="status" aria-label="New status">
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "ARCHIVED" ? "Archive (invalid, withdrawn, or disposed)" : s === "CLOSED" ? "Close (resolved)" : "Expired (unclaimed)"}
                    </option>
                  ))}
                </Select>
                <Input name="note" placeholder="Note for the activity log (optional)" />
                <SubmitButton variant="danger" className="w-full">
                  Update status
                </SubmitButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
