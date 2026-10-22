import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimStatusBadge, ReportStatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, DetailList, LinkButton, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getPublicFoundItem } from "@/server/items";
import { photoUrl } from "@/server/storage";
import { dismissMatchAction } from "../../matches/actions";

export const metadata: Metadata = { title: "Found item" };

export default async function ItemPage({ params, searchParams }: PageProps<"/items/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const item = await getPublicFoundItem(id, user.id);
  if (!item) notFound();
  const sp = await searchParams;
  const matchId = Number(sp.match) || null;
  const match = item.matches.find((m) => m.id === matchId) ?? item.matches[0];

  const canClaim = item.status === "VERIFIED" && !item.isOwnReport && !item.myClaim;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={item.itemName}
        description={<span className="flex items-center gap-2">Found item #{item.id} <ReportStatusBadge status={item.status} /></span>}
      />

      {match && (
        <Alert tone="blue">
          This may be your lost “{match.lostItem}”. Compare carefully: only claim it if you can describe
          details that aren&apos;t shown here.
        </Alert>
      )}
      {item.isOwnReport && (
        <Alert tone="amber">
          You reported this item.{" "}
          <Link href={`/reports/${item.id}`} className="underline">
            Open your report
          </Link>
          .
        </Alert>
      )}
      {item.status === "PENDING" && !item.isOwnReport && (
        <Alert tone="amber">
          The finder hasn&apos;t surrendered this item to the Lost and Found Office yet. You can claim it once
          the office receives it; we&apos;ll keep checking.
        </Alert>
      )}

      <Card>
        <DetailList
          items={[
            ["Category", item.category],
            ["Found at", item.building],
            ["Date found", formatDate(item.dateFound)],
          ]}
        />
        {item.images.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {item.images.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={photoUrl(p, { blurred: !item.isOwnReport, width: 500 })} alt="" className="aspect-square w-full rounded-md object-cover ring-1 ring-slate-200" />
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Photos are blurred and some details are hidden on purpose. To claim this item you&apos;ll describe
          it and provide proof, which the office checks against the full report.
        </p>
      </Card>

      {item.myClaim ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            Your claim: <ClaimStatusBadge status={item.myClaim.claimStatus} />
          </div>
          <LinkButton href={`/claims/${item.myClaim.id}`} variant="secondary" size="sm">
            View claim
          </LinkButton>
        </Card>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          {match && match.status === "PENDING_VERIFICATION" && (
            <form action={dismissMatchAction.bind(null, match.id)}>
              <SubmitButton variant="ghost" pendingText="…">
                Not my item
              </SubmitButton>
            </form>
          )}
          {canClaim && (
            <LinkButton href={`/items/${item.id}/claim${match ? `?match=${match.id}` : ""}`}>
              This is mine, file a claim
            </LinkButton>
          )}
        </div>
      )}
    </div>
  );
}
