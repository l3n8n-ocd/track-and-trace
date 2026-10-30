import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarClock, ChevronRight, ShieldCheck } from "lucide-react";
import { ClaimStatusBadge, StageMeter } from "@/components/status-badge";
import { EmptyState, ICON_STROKE, LinkButton, PageHeader, cn } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { claimJourney, journeyProgress } from "@/lib/journey";
import { requireUser } from "@/lib/session";
import { ACTIVE_CLAIM_STATUSES } from "@/lib/status";

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
  const active = claims.filter((c) => ACTIVE_CLAIM_STATUSES.includes(c.claimStatus));
  const closed = claims.filter((c) => !ACTIVE_CLAIM_STATUSES.includes(c.claimStatus));

  const list = (items: typeof claims) => (
    <ul className="space-y-2.5">
      {items.map((c) => {
        const p = journeyProgress(claimJourney(c, "owner"));
        const ready = c.claimStatus === "APPROVED";
        return (
          <li key={c.id}>
            <Link
              href={`/claims/${c.id}`}
              className={cn(
                "group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-paper p-4 transition-colors hover:bg-white",
                "border-line hover:border-line-strong",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{c.report.itemName}</p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Claim #{c.id} · filed {formatDate(c.claimDate)}
                </p>
                {ready && c.pickupDeadline && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-tint px-2 py-1 text-[13px] font-semibold text-amber-deep">
                    <CalendarClock aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                    Pick up by {formatDate(c.pickupDeadline)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-2">
                  <ClaimStatusBadge status={c.claimStatus} />
                  <StageMeter {...p} label={`Step ${Math.min(p.done + 1, p.total)} of ${p.total}`} />
                </div>
                <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-ink-faint group-hover:text-ink" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={ShieldCheck} title="My claims" description="Track the items you've claimed, from review to pickup." />
      {claims.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No claims yet"
          action={<LinkButton href="/search">Search found items</LinkButton>}
        >
          Find your item in search or your matches, then file a claim. You&apos;ll be able to follow every step here.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">In progress · {active.length}</h2>
              {list(active)}
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">Finished · {closed.length}</h2>
              {list(closed)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
