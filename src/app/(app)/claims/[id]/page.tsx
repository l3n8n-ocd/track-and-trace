import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, FileQuestion, FileText, IdCard, MapPin, MessageSquareText, Paperclip } from "lucide-react";
import { ClaimStatusBadge } from "@/components/status-badge";
import { StatusJourney } from "@/components/status-journey";
import { Alert, Card, CardHeader, ICON_STROKE, Notice, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { claimJourney } from "@/lib/journey";
import { requireUser } from "@/lib/session";
import { locationLabel } from "@/server/options";
import { proofsFor, storageLocation } from "@/server/queries";
import { addProofAction } from "../actions";
import { ProofForm } from "../proof-form";

export const metadata: Metadata = { title: "Claim" };

const PROOF_LABEL = {
  DESCRIPTION: "Statement",
  PHOTO: "Photo",
  RECEIPT: "Receipt",
  DOCUMENT: "Document",
  OTHER: "File",
} as const;

export default async function ClaimPage({ params, searchParams }: PageProps<"/claims/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const [row] = await db
    .select({ claim: schema.claim, reportId: schema.report.id, itemName: schema.report.itemName, storage: storageLocation })
    .from(schema.claim)
    .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
    .leftJoin(storageLocation, eq(storageLocation.id, schema.report.storageLocationId))
    .where(and(eq(schema.claim.id, id), eq(schema.claim.claimantId, user.id)));
  if (!row) notFound();
  const claim = {
    ...row.claim,
    report: { id: row.reportId, itemName: row.itemName, storageLocation: row.storage },
    proofs: (await proofsFor([row.claim.id])).get(row.claim.id) ?? [],
  };

  const s = claim.claimStatus;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/claims" className="hover:text-oxblood">
            My claims · #{claim.id}
          </Link>
        }
        title={`Claim for ${claim.report.itemName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ClaimStatusBadge status={s} />
            <span className="text-sm">Filed {formatDateTime(claim.claimDate)}</span>
          </span>
        }
      />
      {sp.created && <Alert tone="green">Your claim was submitted. The Lost and Found Office will review it.</Alert>}
      {sp.proofAdded && <Alert tone="green">Thanks. Your additional proof was sent for review.</Alert>}

      {s === "APPROVED" && (
        <section
          aria-label="Pickup pass"
          className="relative overflow-hidden rounded-2xl border border-line bg-paper"
        >
          <div className="flex flex-col sm:flex-row">
            <div className="flex-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rust">Pickup pass</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">Your claim was approved.</p>
              <ul className="mt-4 space-y-2.5 text-[15px] text-ink">
                <li className="flex items-start gap-2.5">
                  <MapPin aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-[18px] shrink-0 text-crimson" />
                  <span>
                    Pick up the item at{" "}
                    <strong>{claim.report.storageLocation ? locationLabel(claim.report.storageLocation) : "the Lost and Found Office"}</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CalendarClock aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-[18px] shrink-0 text-crimson" />
                  <span>
                    by <strong>{formatDate(claim.pickupDeadline)}</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <IdCard aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-[18px] shrink-0 text-crimson" />
                  <span>Bring a valid ID and mention claim #{claim.id}.</span>
                </li>
              </ul>
              {claim.remarks && (
                <p className="mt-4 rounded-xl bg-sand px-3.5 py-2.5 text-sm text-ink-soft">Note from the office: {claim.remarks}</p>
              )}
            </div>
            <div className="flex items-center justify-center bg-amber px-6 py-5 sm:w-44">
              <div className="text-center text-ink">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Claim</p>
                <p className="font-display text-4xl font-bold tabular-nums leading-none stretch-wide">#{claim.id}</p>
              </div>
            </div>
          </div>
        </section>
      )}
      {s === "REJECTED" && (
        <Alert>
          <p className="font-semibold">Your claim was not approved.</p>
          {claim.rejectionReason && <p className="mt-1">Reason: {claim.rejectionReason}</p>}
        </Alert>
      )}
      {s === "RELEASED" && <Alert tone="green">The item was released to you on {formatDateTime(claim.dateReleased)}.</Alert>}
      {s === "LAPSED" && (
        <Alert tone="amber">
          The pickup deadline passed before the item was collected. Contact the Lost and Found Office if you still
          want to claim it.
        </Alert>
      )}

      {s === "MORE_INFO_NEEDED" && (
        <Card>
          <CardHeader icon={FileQuestion} title="More proof needed" description="Reply below. Your claim goes back to review once you send it." />
          {claim.remarks && (
            <Notice tone="amber" icon={MessageSquareText} title="From the office" className="mb-5">
              {claim.remarks}
            </Notice>
          )}
          <ProofForm action={addProofAction.bind(null, claim.id)} submitLabel="Send additional proof" statementLabel="Additional details" />
        </Card>
      )}

      <StatusJourney journey={claimJourney(claim, "owner")} title="Claim progress" />

      <Card>
        <CardHeader
          icon={Paperclip}
          title="What you submitted"
          description={`Reviewed: ${claim.dateReviewed ? formatDateTime(claim.dateReviewed) : "not yet"}`}
          action={
            <Link href={`/items/${claim.report.id}`} className="text-sm font-semibold text-crimson hover:underline">
              View item
            </Link>
          }
        />
        <ol className="space-y-3">
          {claim.proofs.map((p) => (
            <li key={p.id} className="rounded-xl bg-cream/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {PROOF_LABEL[p.proofType]} · {formatDateTime(p.dateUploaded)}
              </p>
              {p.description && <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">{p.description}</p>}
              {p.filePath && (
                <Link
                  href={`/api/files/proof/${p.id}`}
                  target="_blank"
                  className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-crimson hover:underline"
                >
                  <FileText aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                  Open file
                  <ExternalLink aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
