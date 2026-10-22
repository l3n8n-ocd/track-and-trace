import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getPublicFoundItem } from "@/server/items";
import { createClaimAction } from "../../../claims/actions";
import { ProofForm } from "../../../claims/proof-form";

export const metadata: Metadata = { title: "File a claim" };

export default async function ClaimItemPage({ params, searchParams }: PageProps<"/items/[id]/claim">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const item = await getPublicFoundItem(id, user.id);
  if (!item) notFound();
  if (item.myClaim) redirect(`/claims/${item.myClaim.id}`);
  if (item.status !== "VERIFIED" || item.isOwnReport) redirect(`/items/${id}`);
  const sp = await searchParams;
  const matchId = item.matches.find((m) => m.id === Number(sp.match))?.id ?? item.matches[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="File a claim"
        description={`For found item #${item.id}: ${item.itemName} (${item.category}, found at ${item.building} on ${formatDate(item.dateFound)}).`}
      />
      <Card className="space-y-2 bg-sky-50 text-sm text-sky-900 ring-sky-200">
        <p className="font-medium">How claims work</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Describe the item and attach any proof you have.</li>
          <li>An administrator compares it with the full found report, including details hidden from the listing.</li>
          <li>You&apos;ll be notified if the claim is approved, rejected, or needs more proof.</li>
          <li>If approved, pick up the item at the Lost and Found Office with a valid ID before the deadline.</li>
        </ol>
      </Card>
      <Card>
        <ProofForm
          action={createClaimAction.bind(null, id)}
          matchId={matchId}
          submitLabel="Submit claim"
          statementLabel="Why is this item yours?"
        />
      </Card>
    </div>
  );
}
