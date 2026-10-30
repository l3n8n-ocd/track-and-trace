import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, EyeOff, Hand, ImageOff, MapPin, ShieldCheck, Tag, X } from "lucide-react";
import { ClaimStatusBadge, ReportStatusBadge, TypeBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, ICON_STROKE, LinkButton, PageHeader } from "@/components/ui";
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
  const facts = [
    { icon: Tag, label: "Category", value: item.category },
    { icon: MapPin, label: "Found at", value: item.building },
    { icon: CalendarDays, label: "Date found", value: formatDate(item.dateFound) },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={`Found item #${item.id}`}
        title={item.itemName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type="FOUND" />
            <ReportStatusBadge status={item.status} />
          </span>
        }
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
          <Link href={`/reports/${item.id}`} className="font-semibold underline">
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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {item.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {item.images.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p}
                  src={photoUrl(p, { blurred: !item.isOwnReport, width: 700 })}
                  alt=""
                  className={`w-full rounded-2xl object-cover ring-1 ring-line ${i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-sand text-ink-faint">
              <ImageOff aria-hidden strokeWidth={ICON_STROKE} className="size-8" />
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-0 sm:p-0">
            <ul className="divide-y divide-line">
              {facts.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-center gap-3 px-5 py-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-sand text-crimson">
                    <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
                    <span className="block text-[15px] font-medium text-ink">{value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex gap-3 rounded-2xl border border-line bg-paper p-4 text-sm leading-relaxed text-ink-soft">
            <EyeOff aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-[18px] shrink-0 text-crimson" />
            <p>
              Photos are blurred and some details are hidden on purpose. To claim this item you&apos;ll describe
              it and provide proof, which the office checks against the full report.
            </p>
          </div>

          {item.myClaim ? (
            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Your claim</p>
              <ClaimStatusBadge status={item.myClaim.claimStatus} />
              <LinkButton href={`/claims/${item.myClaim.id}`} variant="secondary" className="w-full">
                <ShieldCheck aria-hidden />
                Track your claim
              </LinkButton>
            </Card>
          ) : (
            (canClaim || (match && match.status === "PENDING_VERIFICATION")) && (
              <Card className="space-y-3">
                <p className="font-semibold text-ink">Is this yours?</p>
                {canClaim && (
                  <LinkButton href={`/items/${item.id}/claim${match ? `?match=${match.id}` : ""}`} size="lg" className="w-full">
                    <Hand aria-hidden />
                    This is mine, file a claim
                  </LinkButton>
                )}
                {match && match.status === "PENDING_VERIFICATION" && (
                  <form action={dismissMatchAction.bind(null, match.id)}>
                    <SubmitButton variant="ghost" className="w-full" pendingText="…">
                      <X aria-hidden />
                      Not my item
                    </SubmitButton>
                  </form>
                )}
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}
