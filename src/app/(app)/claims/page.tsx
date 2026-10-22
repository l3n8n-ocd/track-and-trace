import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ClaimStatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My claims" };

export default async function MyClaimsPage() {
  const user = await requireUser();
  const rows = await db
    .select({ claim: schema.claim, itemName: schema.report.itemName })
    .from(schema.claim)
    .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
    .where(eq(schema.claim.claimantId, user.id))
    .orderBy(desc(schema.claim.claimDate));
  const claims = rows.map((r) => ({ ...r.claim, report: { itemName: r.itemName } }));
  return (
    <div>
      <PageHeader title="My claims" description="Track the items you've claimed." />
      {claims.length === 0 ? (
        <EmptyState title="No claims yet">
          Find your item in{" "}
          <Link href="/search" className="text-brand-700 underline">
            search
          </Link>{" "}
          or your{" "}
          <Link href="/matches" className="text-brand-700 underline">
            matches
          </Link>
          , then file a claim.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          {claims.map((c) => (
            <li key={c.id}>
              <Link href={`/claims/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div>
                  <p className="font-medium">{c.report.itemName}</p>
                  <p className="text-sm text-slate-600">
                    Claim #{c.id} · filed {formatDate(c.claimDate)}
                    {c.claimStatus === "APPROVED" && c.pickupDeadline && ` · pick up by ${formatDate(c.pickupDeadline)}`}
                  </p>
                </div>
                <ClaimStatusBadge status={c.claimStatus} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
