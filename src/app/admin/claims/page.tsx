import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader, cn } from "@/components/ui";
import { db, schema } from "@/db";
import type { ClaimStatus } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Claims" };

const TABS: { key: string; label: string; statuses: ClaimStatus[] }[] = [
  { key: "review", label: "To review", statuses: ["PENDING"] },
  { key: "MORE_INFO_NEEDED", label: "Waiting on claimant", statuses: ["MORE_INFO_NEEDED"] },
  { key: "APPROVED", label: "Awaiting pickup", statuses: ["APPROVED"] },
  { key: "ON_HOLD", label: "On hold", statuses: ["ON_HOLD"] },
  { key: "done", label: "Closed", statuses: ["RELEASED", "REJECTED", "LAPSED"] },
];

export default async function AdminClaimsPage({ searchParams }: PageProps<"/admin/claims">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.status) ?? TABS[0];
  const open = tab.key !== "done";
  const rows = await db
    .select({
      claim: schema.claim,
      itemName: schema.report.itemName,
      claimant: schema.user.name,
    })
    .from(schema.claim)
    .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
    .innerJoin(schema.user, eq(schema.user.id, schema.claim.claimantId))
    .where(inArray(schema.claim.claimStatus, tab.statuses))
    .orderBy(open ? asc(schema.claim.claimDate) : desc(schema.claim.claimDate))
    .limit(100);

  return (
    <div>
      <PageHeader title="Claims" description="Review proof of ownership and release items to verified owners." />
      <Flash sp={sp} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/claims?status=${t.key}`}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              t.key === tab.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nothing here" />
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          {rows.map(({ claim, itemName, claimant }) => (
            <li key={claim.id}>
              <Link href={`/admin/claims/${claim.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div>
                  <p className="font-medium">
                    #{claim.id} · {itemName}
                  </p>
                  <p className="text-sm text-slate-600">
                    {claimant} · filed {formatDate(claim.claimDate)}
                    {claim.claimStatus === "APPROVED" && ` · pickup by ${formatDate(claim.pickupDeadline)}`}
                  </p>
                </div>
                <ClaimStatusBadge status={claim.claimStatus} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
