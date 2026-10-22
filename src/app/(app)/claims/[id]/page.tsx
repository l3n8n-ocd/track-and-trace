import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ClaimStatusBadge } from "@/components/status-badge";
import { Alert, Card, DetailList, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate, formatDateTime } from "@/lib/format";
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Claim for ${claim.report.itemName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Claim #{claim.id} · filed {formatDateTime(claim.claimDate)} <ClaimStatusBadge status={s} />
          </span>
        }
      />
      {sp.created && <Alert tone="green">Your claim was submitted. The Lost and Found Office will review it.</Alert>}
      {sp.proofAdded && <Alert tone="green">Thanks. Your additional proof was sent for review.</Alert>}

      {s === "PENDING" && !sp.created && <Alert tone="blue">Your claim is waiting for an administrator to review it.</Alert>}
      {s === "ON_HOLD" && (
        <Alert tone="amber">
          Another claim on this item is being processed. If it doesn&apos;t go through, your claim will be reviewed next.
        </Alert>
      )}
      {s === "APPROVED" && (
        <Alert tone="green">
          <p className="font-semibold">Your claim was approved.</p>
          <p className="mt-1">
            Pick up the item at{" "}
            <strong>{claim.report.storageLocation ? locationLabel(claim.report.storageLocation) : "the Lost and Found Office"}</strong>{" "}
            by <strong>{formatDate(claim.pickupDeadline)}</strong>. Bring a valid ID and mention claim #{claim.id}.
          </p>
          {claim.remarks && <p className="mt-1">Note from the office: {claim.remarks}</p>}
        </Alert>
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
        <Card className="space-y-3">
          <h2 className="font-semibold">More proof needed</h2>
          {claim.remarks && (
            <p className="rounded-md bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-200">
              From the office: {claim.remarks}
            </p>
          )}
          <ProofForm
            action={addProofAction.bind(null, claim.id)}
            submitLabel="Send additional proof"
            statementLabel="Additional details"
          />
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">What you submitted</h2>
        <ul className="mt-3 space-y-3">
          {claim.proofs.map((p) => (
            <li key={p.id} className="text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {PROOF_LABEL[p.proofType]} · {formatDateTime(p.dateUploaded)}
              </p>
              {p.description && <p className="mt-1 whitespace-pre-line text-slate-800">{p.description}</p>}
              {p.filePath && (
                <Link href={`/api/files/proof/${p.id}`} target="_blank" className="mt-1 inline-block text-brand-700 hover:underline">
                  Open file
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <DetailList
          items={[
            ["Item", <Link key="i" href={`/items/${claim.report.id}`} className="text-brand-700 hover:underline">{claim.report.itemName}</Link>],
            ["Reviewed", claim.dateReviewed ? formatDateTime(claim.dateReviewed) : "Not yet"],
          ]}
        />
      </Card>
    </div>
  );
}
