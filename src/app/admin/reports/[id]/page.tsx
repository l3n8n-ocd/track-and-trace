import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { notFound } from "next/navigation";
import {
  Archive,
  ChevronRight,
  History,
  IdCard,
  Info,
  Inbox,
  Mail,
  Phone,
  ScanSearch,
  ShieldCheck,
  UserRound,
  Warehouse,
} from "lucide-react";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge, MatchScore, MatchStatusBadge, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { StatusJourney } from "@/components/status-journey";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, Card, CardHeader, DetailList, Field, ICON_STROKE, Input, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { reportJourney } from "@/lib/journey";
import { requireAdmin } from "@/lib/session";
import { canChangeReport } from "@/lib/status";
import { locationLabel, storageOptions } from "@/server/options";
import { imagesFor, leadingClaims, selectReports } from "@/server/queries";
import { photoUrl } from "@/server/storage";
import { assignStorageAction, setReportStatusAction, verifyReportAction } from "../../actions";
import { ActivityIcon } from "../../activity-icon";

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
  const [reporter, images, storage, claims, matches, history, leading] = await Promise.all([
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
    db
      .select({ log: schema.activityLog, name: schema.user.name })
      .from(schema.activityLog)
      .leftJoin(schema.user, eq(schema.user.id, schema.activityLog.userId))
      .where(and(eq(schema.activityLog.targetEntity, "report"), eq(schema.activityLog.targetId, String(id))))
      .orderBy(desc(schema.activityLog.dateLogged))
      .limit(30),
    found ? leadingClaims([id]).then((m) => m.get(id) ?? null) : Promise.resolve(null),
  ]);
  const matchRows = matches.filter((m) => m.other.id !== id);

  const statusOptions = (["VERIFIED", "CLOSED", "EXPIRED", "ARCHIVED"] as const).filter(
    (s) => s !== "VERIFIED" && canChangeReport(r.status, s),
  );
  const journey = reportJourney(r, {
    audience: "admin",
    hasMatch: matchRows.some((m) => m.match.matchStatus !== "REJECTED"),
    claim: leading,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/reports" className="hover:text-oxblood">
            Reports · #{r.id}
          </Link>
        }
        title={r.itemName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type={r.reportType} /> <ReportStatusBadge status={r.status} />
            <span className="text-sm">Filed {formatDateTime(r.dateReported)}</span>
          </span>
        }
      />
      <Flash sp={sp} />

      <StatusJourney journey={journey} title="Report lifecycle" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader icon={Info} title="Details" />
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
                  <a
                    key={img.id}
                    href={photoUrl(img.imagePath, { width: 1600 })}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-xl ring-1 ring-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl(img.imagePath, { width: 400 })}
                      alt=""
                      className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            )}
          </Card>

          {found && (
            <Card>
              <CardHeader icon={Inbox} title="Claims" description={claims.length ? `${claims.length} on this item` : undefined} />
              {claims.length === 0 ? (
                <p className="rounded-xl bg-cream/70 px-4 py-3.5 text-sm text-ink-muted">No claims yet.</p>
              ) : (
                <ul className="-mx-2 divide-y divide-line">
                  {claims.map(({ claim, claimant }) => (
                    <li key={claim.id}>
                      <Link href={`/admin/claims/${claim.id}`} className="group flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 hover:bg-sand/60">
                        <Avatar name={claimant} className="size-8 text-[11px]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{claimant}</p>
                          <p className="text-xs text-ink-muted">
                            Claim #{claim.id} · filed {formatDate(claim.claimDate)}
                          </p>
                        </div>
                        <ClaimStatusBadge status={claim.claimStatus} size="sm" />
                        <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-faint group-hover:text-ink" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card>
            <CardHeader icon={ScanSearch} title={found ? "Matching lost reports" : "Matching found reports"} />
            {matchRows.length === 0 ? (
              <p className="rounded-xl bg-cream/70 px-4 py-3.5 text-sm text-ink-muted">No matches.</p>
            ) : (
              <ul className="-mx-2 divide-y divide-line">
                {matchRows.map(({ match, other: o }) => (
                  <li key={match.id}>
                    <Link href={`/admin/reports/${o.id}`} className="group flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 hover:bg-sand/60">
                      <TypeBadge type={o.reportType} />
                      <span className="min-w-0 flex-1 font-semibold text-ink">
                        #{o.id} {o.itemName}
                      </span>
                      <MatchScore score={match.matchScore} />
                      <MatchStatusBadge status={match.matchStatus} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {r.status === "PENDING" && (
            <Card>
              <CardHeader icon={ShieldCheck} title="Verify" />
              <p className="-mt-1 text-sm text-ink-soft">
                {found
                  ? "Confirm the item was surrendered to the office and record where it's stored. It then appears in search and can be claimed."
                  : "Confirm the lost report is genuine and complete."}
              </p>
              <form action={verifyReportAction.bind(null, id)} className="mt-4 space-y-3">
                {found && (
                  <Field label="Storage location" htmlFor="storageLocationId" required>
                    <Select id="storageLocationId" name="storageLocationId" icon={Warehouse} defaultValue={r.storageLocationId ?? ""}>
                      <option value="">Choose a shelf or bin…</option>
                      {storage.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <SubmitButton variant="success" className="w-full" pendingText="Verifying…">
                  <ShieldCheck aria-hidden />
                  {found ? "Item received, verify" : "Verify report"}
                </SubmitButton>
              </form>
            </Card>
          )}

          <Card>
            <CardHeader icon={UserRound} title="Reported by" />
            {reporter && (
              <div className="space-y-3 text-sm">
                <Link href={`/admin/users/${reporter.id}`} className="flex items-center gap-3 font-semibold text-ink hover:text-crimson">
                  <Avatar name={reporter.name} />
                  {reporter.name}
                </Link>
                <p className="flex items-center gap-2 text-ink-soft">
                  <Mail aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-muted" />
                  {reporter.email}
                </p>
                {reporter.contactNo && (
                  <p className="flex items-center gap-2 text-ink-soft">
                    <Phone aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-muted" />
                    {reporter.contactNo}
                  </p>
                )}
                <p className="flex items-center gap-2 text-ink-soft">
                  <IdCard aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-muted" />
                  ID {reporter.idNumber}
                </p>
              </div>
            )}
          </Card>

          {found && r.status === "VERIFIED" && (
            <Card>
              <CardHeader icon={Warehouse} title="Storage location" />
              <form action={assignStorageAction.bind(null, id)} className="space-y-3">
                <Select name="storageLocationId" icon={Warehouse} defaultValue={r.storageLocationId ?? ""} aria-label="Storage location">
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
              <CardHeader icon={Archive} title="Change status" />
              <form action={setReportStatusAction.bind(null, id)} className="space-y-3">
                <Select name="status" aria-label="New status">
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "ARCHIVED" ? "Archive (invalid, withdrawn, or disposed)" : s === "CLOSED" ? "Close (resolved)" : "Expired (unclaimed)"}
                    </option>
                  ))}
                </Select>
                <Input name="note" placeholder="Note for the activity log (optional)" aria-label="Note" />
                <SubmitButton variant="danger" className="w-full">
                  Update status
                </SubmitButton>
              </form>
            </Card>
          )}

          <Card>
            <CardHeader icon={History} title="History" />
            {history.length === 0 ? (
              <p className="text-sm text-ink-muted">No office actions recorded yet.</p>
            ) : (
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-line">
                {history.map(({ log, name }) => (
                  <li key={log.id} className="relative flex items-start gap-3">
                    <ActivityIcon action={log.action} entity={log.targetEntity} className="ring-4 ring-paper" />
                    <div className="min-w-0 pt-0.5 text-sm">
                      <p className="font-semibold text-ink">{log.action}</p>
                      <p className="text-xs text-ink-muted">
                        {name ?? "System"} · {formatDateTime(log.dateLogged)}
                      </p>
                      {log.details && <p className="mt-0.5 text-xs text-ink-soft">{log.details}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
