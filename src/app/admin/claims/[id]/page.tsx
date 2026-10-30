import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  BadgeCheck,
  CalendarClock,
  CircleX,
  ExternalLink,
  EyeOff,
  FileQuestion,
  FileText,
  Gavel,
  History,
  IdCard,
  Package,
  PackageOpen,
  UserRound,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge, MatchScore, TypeBadge } from "@/components/status-badge";
import { StatusJourney } from "@/components/status-journey";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Avatar, Card, CardHeader, DetailList, Field, ICON_STROKE, Input, PageHeader, Textarea } from "@/components/ui";
import { db, schema } from "@/db";
import { datePHFromToday, formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { claimJourney } from "@/lib/journey";
import { canChangeClaim } from "@/lib/status";
import { locationLabel } from "@/server/options";
import { imagesFor, proofsFor, selectReports } from "@/server/queries";
import { photoUrl } from "@/server/storage";
import { approveClaimAction, rejectClaimAction, releaseClaimAction, requestProofAction } from "../../actions";
import { ActivityIcon } from "../../activity-icon";

export const metadata: Metadata = { title: "Review claim" };

const PROOF_LABEL = { DESCRIPTION: "Statement", PHOTO: "Photo", RECEIPT: "Receipt", DOCUMENT: "Document", OTHER: "File" } as const;

export default async function AdminClaimPage({ params, searchParams }: PageProps<"/admin/claims/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const claim = await db.query.claim.findFirst({ where: eq(schema.claim.id, id) });
  if (!claim) notFound();

  const [[found], claimant, proofs, match, otherClaims] = await Promise.all([
    selectReports().where(eq(schema.report.id, claim.reportId)),
    db.query.user.findFirst({ where: eq(schema.user.id, claim.claimantId) }),
    proofsFor([id]).then((m) => m.get(id) ?? []),
    claim.matchId ? db.query.matchRecord.findFirst({ where: eq(schema.matchRecord.id, claim.matchId) }) : null,
    db
      .select({ id: schema.claim.id, status: schema.claim.claimStatus })
      .from(schema.claim)
      .where(and(eq(schema.claim.reportId, claim.reportId), ne(schema.claim.id, id))),
  ]);
  const [lost] = match ? await selectReports().where(eq(schema.report.id, match.lostReportId)) : [];
  const history = await db
    .select({ log: schema.activityLog, name: schema.user.name })
    .from(schema.activityLog)
    .leftJoin(schema.user, eq(schema.user.id, schema.activityLog.userId))
    .where(and(eq(schema.activityLog.targetEntity, "claim"), eq(schema.activityLog.targetId, String(id))))
    .orderBy(desc(schema.activityLog.dateLogged));
  const images = await imagesFor([found.report.id, ...(lost ? [lost.report.id] : [])]);
  const f = found.report;

  const s = claim.claimStatus;
  const defaultDeadline = datePHFromToday(7);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/claims" className="hover:text-oxblood">
            Claims · #{claim.id}
          </Link>
        }
        title={f.itemName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ClaimStatusBadge status={s} />
            <span className="text-sm">Filed {formatDateTime(claim.claimDate)}</span>
          </span>
        }
      />
      <Flash sp={sp} />
      {otherClaims.length > 0 && (
        <Alert tone="amber">
          This item has {otherClaims.length} other claim{otherClaims.length > 1 ? "s" : ""}:{" "}
          {otherClaims.map((o, i) => (
            <span key={o.id}>
              {i > 0 && ", "}
              <Link href={`/admin/claims/${o.id}`} className="font-semibold underline">
                #{o.id}
              </Link>{" "}
              ({o.status.toLowerCase().replace(/_/g, " ")})
            </span>
          ))}
          . Compare the proof before deciding.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={UserRound} title="Claimant's proof" />
          {claimant && (
            <Link
              href={`/admin/users/${claimant.id}`}
              className="mb-5 flex items-center gap-3 rounded-xl border border-line bg-cream/60 p-3 hover:border-line-strong"
            >
              <Avatar name={claimant.name} />
              <span className="min-w-0 text-sm">
                <span className="block font-semibold text-ink">{claimant.name}</span>
                <span className="block truncate text-ink-muted">
                  {claimant.email} · ID {claimant.idNumber} {claimant.contactNo && `· ${claimant.contactNo}`}
                </span>
              </span>
            </Link>
          )}
          <ol className="space-y-3">
            {proofs.map((p) => (
              <li key={p.id} className="rounded-xl bg-cream/70 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {PROOF_LABEL[p.proofType]} · {formatDateTime(p.dateUploaded)}
                </p>
                {p.description && <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">{p.description}</p>}
                {p.filePath && (
                  <a
                    href={`/api/files/proof/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-crimson hover:underline"
                  >
                    <FileText aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                    Open file
                    <ExternalLink aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ol>
          {lost && (
            <div className="mt-5 rounded-xl bg-sand/70 p-4 text-sm">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                <TypeBadge type="LOST" />
                Claimant&apos;s lost report{" "}
                <Link href={`/admin/reports/${lost.report.id}`} className="text-crimson hover:underline">
                  #{lost.report.id}
                </Link>
                {match && <MatchScore score={match.matchScore} />}
              </p>
              <p className="mt-2 text-ink-soft">
                {lost.report.itemName} · {lost.category.name} · lost {formatDate(lost.report.dateLostOrFound)} at{" "}
                {lost.location.buildingName}
              </p>
              {lost.report.description && <p className="mt-1 text-ink-soft">{lost.report.description}</p>}
              {lost.report.hiddenDetails && (
                <p className="mt-1 text-ink-soft">
                  <span className="font-semibold text-ink">Their hidden details:</span> {lost.report.hiddenDetails}
                </p>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={Package}
            title={
              <>
                Found item{" "}
                <Link href={`/admin/reports/${f.id}`} className="text-crimson hover:underline">
                  #{f.id}
                </Link>
              </>
            }
          />
          <DetailList
            items={[
              ["Category", found.category.name],
              ["Found", `${formatDate(f.dateLostOrFound)} at ${locationLabel(found.location)}${f.locationNote ? `, ${f.locationNote}` : ""}`],
              ["Color / brand", [f.color, f.brand].filter(Boolean).join(" · ") || "—"],
              ["Stored at", found.storage ? locationLabel(found.storage) : "Not assigned"],
              ["Description", f.description],
            ]}
          />
          <div className="mt-5 rounded-2xl border border-crimson/15 bg-crimson-tint/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-crimson">
              <EyeOff aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
              Hidden details · compare with the proof
            </p>
            <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{f.hiddenDetails || "—"}</p>
          </div>
          {(images.get(f.id) ?? []).length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(images.get(f.id) ?? []).map((img) => (
                <a key={img.id} href={photoUrl(img.imagePath, { width: 1600 })} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl ring-1 ring-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(img.imagePath, { width: 300 })} alt="" className="aspect-square w-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>

      {claim.remarks && <Alert tone="blue">Remarks sent to the claimant: {claim.remarks}</Alert>}
      {claim.rejectionReason && <Alert>Rejection reason: {claim.rejectionReason}</Alert>}

      {(s === "PENDING" || s === "MORE_INFO_NEEDED") && (
        <section aria-labelledby="decide-heading">
          <h2 id="decide-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink">
            <Gavel aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-crimson" />
            Decide
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="flex items-center gap-2 font-semibold text-ink">
                <PackageOpen aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-amber-deep" />
                Approve
              </h3>
              <p className="mt-1 text-sm text-ink-muted">The proof matches. Set a pickup deadline.</p>
              <form action={approveClaimAction.bind(null, id)} className="mt-4 space-y-3">
                <Field label="Pickup deadline" htmlFor="pickupDeadline" required>
                  <Input id="pickupDeadline" name="pickupDeadline" type="date" icon={CalendarClock} defaultValue={defaultDeadline} />
                </Field>
                <Field label="Note to claimant (optional)" htmlFor="approveRemarks">
                  <Textarea id="approveRemarks" name="remarks" rows={2} placeholder="e.g. Office hours 8 AM–5 PM, Room 101" className="min-h-20" />
                </Field>
                <SubmitButton variant="success" className="w-full" pendingText="Approving…" disabled={f.status !== "VERIFIED"}>
                  Ownership verified, approve
                </SubmitButton>
                {f.status !== "VERIFIED" && <p className="text-xs font-medium text-berry">Verify the found item first.</p>}
              </form>
            </Card>
            {canChangeClaim(s, "MORE_INFO_NEEDED") && (
              <Card>
                <h3 className="flex items-center gap-2 font-semibold text-ink">
                  <FileQuestion aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-rust" />
                  Ask for more
                </h3>
                <p className="mt-1 text-sm text-ink-muted">Not sure yet. The claimant is notified.</p>
                <form action={requestProofAction.bind(null, id)} className="mt-4 space-y-3">
                  <Field label="What do you need?" htmlFor="infoRemarks" required>
                    <Textarea id="infoRemarks" name="remarks" rows={4} placeholder="e.g. Send a photo of you with the item, or describe the lock screen." />
                  </Field>
                  <SubmitButton variant="secondary" className="w-full" pendingText="Sending…">
                    Request more proof
                  </SubmitButton>
                </form>
              </Card>
            )}
            <Card>
              <h3 className="flex items-center gap-2 font-semibold text-ink">
                <CircleX aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-berry" />
                Reject
              </h3>
              <p className="mt-1 text-sm text-ink-muted">The proof doesn&apos;t match the item.</p>
              <form action={rejectClaimAction.bind(null, id)} className="mt-4 space-y-3">
                <Field label="Reason (sent to the claimant)" htmlFor="reason" required>
                  <Textarea id="reason" name="reason" rows={4} placeholder="e.g. The description doesn't match the item's distinguishing details." />
                </Field>
                <SubmitButton variant="danger" className="w-full" pendingText="Rejecting…">
                  Reject claim
                </SubmitButton>
              </form>
            </Card>
          </div>
        </section>
      )}

      {s === "APPROVED" && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber text-ink">
              <IdCard aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-ink">Awaiting pickup by {formatDate(claim.pickupDeadline)}</p>
              <p className="text-ink-muted">Check the claimant&apos;s valid ID before handing over the item.</p>
            </div>
          </div>
          <form action={releaseClaimAction.bind(null, id)}>
            <SubmitButton variant="success" size="lg" pendingText="Recording…">
              <BadgeCheck aria-hidden />
              Item picked up, record release
            </SubmitButton>
          </form>
        </Card>
      )}

      <StatusJourney journey={claimJourney(claim, "admin")} title="Claim lifecycle" />
      <div>
        <Card>
          <CardHeader icon={History} title="History" />
          {history.length === 0 ? (
            <p className="text-sm text-ink-muted">No actions recorded yet.</p>
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
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
