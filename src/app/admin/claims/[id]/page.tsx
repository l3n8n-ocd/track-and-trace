import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, DetailList, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { db, schema } from "@/db";
import { datePHFromToday, formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { canChangeClaim } from "@/lib/status";
import { locationLabel } from "@/server/options";
import { imagesFor, proofsFor, selectReports } from "@/server/queries";
import { photoUrl } from "@/server/storage";
import { approveClaimAction, rejectClaimAction, releaseClaimAction, requestProofAction } from "../../actions";

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
  const images = await imagesFor([found.report.id, ...(lost ? [lost.report.id] : [])]);
  const f = found.report;

  const s = claim.claimStatus;
  const defaultDeadline = datePHFromToday(7);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Claim #${claim.id}: ${f.itemName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Filed {formatDateTime(claim.claimDate)} <ClaimStatusBadge status={s} />
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
              <Link href={`/admin/claims/${o.id}`} className="underline">
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
          <h2 className="font-semibold">Claimant&apos;s proof</h2>
          {claimant && (
            <p className="mt-1 text-sm text-slate-600">
              <Link href={`/admin/users/${claimant.id}`} className="font-medium text-brand-700 hover:underline">
                {claimant.name}
              </Link>{" "}
              · {claimant.email} · ID {claimant.idNumber} {claimant.contactNo && `· ${claimant.contactNo}`}
            </p>
          )}
          <ul className="mt-4 space-y-4">
            {proofs.map((p) => (
              <li key={p.id} className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {PROOF_LABEL[p.proofType]} · {formatDateTime(p.dateUploaded)}
                </p>
                {p.description && <p className="mt-1 whitespace-pre-line">{p.description}</p>}
                {p.filePath && (
                  <a href={`/api/files/proof/${p.id}`} target="_blank" rel="noreferrer" className="mt-1 inline-block font-medium text-brand-700 hover:underline">
                    Open file ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
          {lost && (
            <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
              <p className="font-medium">
                Claimant&apos;s lost report{" "}
                <Link href={`/admin/reports/${lost.report.id}`} className="text-brand-700 hover:underline">
                  #{lost.report.id}
                </Link>{" "}
                (match score {match?.matchScore.toFixed(0)})
              </p>
              <p className="mt-1 text-slate-700">
                {lost.report.itemName} · {lost.category.name} · lost {formatDate(lost.report.dateLostOrFound)} at{" "}
                {lost.location.buildingName}
              </p>
              {lost.report.description && <p className="mt-1 text-slate-600">{lost.report.description}</p>}
              {lost.report.hiddenDetails && (
                <p className="mt-1 text-slate-600">
                  <span className="font-medium">Their hidden details:</span> {lost.report.hiddenDetails}
                </p>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">
            Found item{" "}
            <Link href={`/admin/reports/${f.id}`} className="text-brand-700 hover:underline">
              #{f.id}
            </Link>
          </h2>
          <div className="mt-3">
            <DetailList
              items={[
                ["Category", found.category.name],
                ["Found", `${formatDate(f.dateLostOrFound)} at ${locationLabel(found.location)}${f.locationNote ? `, ${f.locationNote}` : ""}`],
                ["Color / brand", [f.color, f.brand].filter(Boolean).join(" · ") || "—"],
                ["Stored at", found.storage ? locationLabel(found.storage) : "Not assigned"],
                ["Description", f.description],
                ["Hidden details (compare with the proof)", f.hiddenDetails],
              ]}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(images.get(f.id) ?? []).map((img) => (
              <a key={img.id} href={photoUrl(img.imagePath, { width: 1600 })} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(img.imagePath, { width: 300 })} alt="" className="aspect-square w-full rounded-md object-cover ring-1 ring-slate-200" />
              </a>
            ))}
          </div>
        </Card>
      </div>

      {claim.remarks && <Alert tone="blue">Remarks sent to the claimant: {claim.remarks}</Alert>}
      {claim.rejectionReason && <Alert>Rejection reason: {claim.rejectionReason}</Alert>}

      {(s === "PENDING" || s === "MORE_INFO_NEEDED") && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <h3 className="font-semibold text-emerald-700">Approve</h3>
            <form action={approveClaimAction.bind(null, id)} className="mt-3 space-y-3">
              <Field label="Pickup deadline" htmlFor="pickupDeadline" required>
                <Input id="pickupDeadline" name="pickupDeadline" type="date" defaultValue={defaultDeadline} />
              </Field>
              <Field label="Note to claimant (optional)" htmlFor="approveRemarks">
                <Textarea id="approveRemarks" name="remarks" rows={2} placeholder="e.g. Office hours 8 AM–5 PM, Room 101" />
              </Field>
              <SubmitButton variant="success" className="w-full" pendingText="Approving…" disabled={f.status !== "VERIFIED"}>
                Ownership verified, approve
              </SubmitButton>
              {f.status !== "VERIFIED" && <p className="text-xs text-brand-700">Verify the found item first.</p>}
            </form>
          </Card>
          {canChangeClaim(s, "MORE_INFO_NEEDED") && (
            <Card>
              <h3 className="font-semibold text-violet-700">Request more proof</h3>
              <form action={requestProofAction.bind(null, id)} className="mt-3 space-y-3">
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
            <h3 className="font-semibold text-brand-700">Reject</h3>
            <form action={rejectClaimAction.bind(null, id)} className="mt-3 space-y-3">
              <Field label="Reason (sent to the claimant)" htmlFor="reason" required>
                <Textarea id="reason" name="reason" rows={4} placeholder="e.g. The description doesn't match the item's distinguishing details." />
              </Field>
              <SubmitButton variant="danger" className="w-full" pendingText="Rejecting…">
                Reject claim
              </SubmitButton>
            </form>
          </Card>
        </div>
      )}

      {s === "APPROVED" && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-semibold">Awaiting pickup by {formatDate(claim.pickupDeadline)}</p>
            <p className="text-slate-600">Check the claimant&apos;s valid ID before handing over the item.</p>
          </div>
          <form action={releaseClaimAction.bind(null, id)}>
            <SubmitButton variant="success" pendingText="Recording…">
              Item picked up, record release
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
