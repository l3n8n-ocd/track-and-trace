import {
  Archive,
  BadgeCheck,
  CircleCheck,
  CircleCheckBig,
  CirclePause,
  CircleX,
  EyeOff,
  FileQuestion,
  Hourglass,
  PackageCheck,
  PackageOpen,
  ScanSearch,
  ShieldCheck,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import type { ClaimStatus, MatchStatus, ReportStatus } from "@/db/schema";
import { CLAIM_STATUS_LABEL, MATCH_STATUS_LABEL, REPORT_STATUS_LABEL } from "@/lib/status";
import { cn } from "./ui";

// Status tags. Each status gets a color *and* a fill style and an icon, so
// tags stay distinguishable without relying on hue alone:
//   waiting  – soft rust          (someone is reviewing)
//   action   – soft amber, strong ring (the owner needs to do something)
//   ready    – solid amber        (go to the office)
//   verified – soft crimson       (checked by the office)
//   done     – solid oxblood      (resolved, item returned)
//   stopped  – dashed berry       (rejected, expired, lapsed)
//   inactive – neutral            (archived, on hold, dismissed)
export type TagStyle = "waiting" | "action" | "ready" | "verified" | "confirmed" | "done" | "stopped" | "inactive";

const STYLE: Record<TagStyle, string> = {
  waiting: "bg-rust-tint text-[#8f3209] ring-1 ring-inset ring-rust/25",
  action: "bg-amber-tint text-amber-deep ring-[1.5px] ring-inset ring-amber",
  ready: "bg-amber text-ink",
  verified: "bg-crimson-tint text-crimson ring-1 ring-inset ring-crimson/25",
  confirmed: "bg-crimson text-cream",
  done: "bg-oxblood text-cream",
  stopped: "bg-berry-tint/60 text-berry border border-dashed border-berry/60",
  inactive: "bg-sand text-ink-soft ring-1 ring-inset ring-line-strong",
};

type TagDef = { style: TagStyle; icon: LucideIcon; hint: string };

export const REPORT_TAG: Record<ReportStatus, TagDef> = {
  PENDING: { style: "waiting", icon: Hourglass, hint: "Waiting for the Lost and Found Office to verify it." },
  VERIFIED: { style: "verified", icon: ShieldCheck, hint: "Checked by the office. Found items are in storage and claimable." },
  CLAIMED: { style: "done", icon: PackageCheck, hint: "Returned to its verified owner." },
  CLOSED: { style: "inactive", icon: CircleCheckBig, hint: "Resolved and closed." },
  EXPIRED: { style: "stopped", icon: TimerOff, hint: "Unclaimed after 60 days in storage." },
  ARCHIVED: { style: "inactive", icon: Archive, hint: "Withdrawn, invalid, or disposed of." },
};

export const CLAIM_TAG: Record<ClaimStatus, TagDef> = {
  PENDING: { style: "waiting", icon: Hourglass, hint: "An administrator will compare your proof with the item." },
  MORE_INFO_NEEDED: { style: "action", icon: FileQuestion, hint: "The office needs more proof from you." },
  ON_HOLD: { style: "inactive", icon: CirclePause, hint: "Another claim on this item is being processed first." },
  APPROVED: { style: "ready", icon: PackageOpen, hint: "Ownership verified. Pick it up before the deadline." },
  REJECTED: { style: "stopped", icon: CircleX, hint: "The proof didn't match the item." },
  RELEASED: { style: "done", icon: BadgeCheck, hint: "Handed over to you." },
  LAPSED: { style: "stopped", icon: TimerOff, hint: "The pickup deadline passed." },
};

export const MATCH_TAG: Record<MatchStatus, TagDef> = {
  PENDING_VERIFICATION: { style: "action", icon: ScanSearch, hint: "Looks similar to your lost item. Have a look." },
  CONFIRMED: { style: "confirmed", icon: CircleCheck, hint: "Confirmed as the same item." },
  REJECTED: { style: "inactive", icon: EyeOff, hint: "Dismissed as not the same item." },
};

export function StatusTag({
  def,
  label,
  size = "md",
  className,
}: {
  def: TagDef;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = def.icon;
  return (
    <span
      title={def.hint}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "h-6 gap-1 pl-1.5 pr-2 text-xs" : "h-7 gap-1.5 pl-2 pr-2.5 text-[13px]",
        STYLE[def.style],
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={2.25} className={size === "sm" ? "size-3.5" : "size-4"} />
      {label}
    </span>
  );
}

export function ReportStatusBadge({ status, size }: { status: ReportStatus; size?: "sm" | "md" }) {
  return <StatusTag def={REPORT_TAG[status]} label={REPORT_STATUS_LABEL[status]} size={size} />;
}

export function ClaimStatusBadge({ status, size }: { status: ClaimStatus; size?: "sm" | "md" }) {
  return <StatusTag def={CLAIM_TAG[status]} label={CLAIM_STATUS_LABEL[status]} size={size} />;
}

export function MatchStatusBadge({ status, size }: { status: MatchStatus; size?: "sm" | "md" }) {
  return <StatusTag def={MATCH_TAG[status]} label={MATCH_STATUS_LABEL[status]} size={size} />;
}

// LOST / FOUND, cut in the shape of a luggage tag so it never reads as a
// status.
export function TypeBadge({ type }: { type: "LOST" | "FOUND" }) {
  const lost = type === "LOST";
  return (
    <span
      className={cn(
        "tag-shape relative inline-flex h-6 shrink-0 items-center pl-[15px] pr-2 font-display text-[11px] font-bold uppercase tracking-[0.12em]",
        lost ? "bg-berry text-cream" : "bg-ink text-cream",
      )}
    >
      <span aria-hidden className="absolute left-[6px] top-1/2 size-[5px] -translate-y-1/2 rounded-full bg-cream" />
      {lost ? "Lost" : "Found"}
    </span>
  );
}

// Compact lifecycle meter for list rows: filled segments for completed
// steps, amber for the current one.
export function StageMeter({
  done,
  total,
  stopped,
  label,
}: {
  done: number;
  total: number;
  stopped?: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={label} title={label}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-4 rounded-full",
            i < done ? (stopped ? "bg-berry/50" : "bg-oxblood") : i === done && !stopped ? "bg-amber" : "bg-line-strong/70",
          )}
        />
      ))}
    </span>
  );
}

// Match score out of 100, as a short bar.
export function MatchScore({ score }: { score: number }) {
  const s = Math.round(score);
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft" title={`Match score ${s} out of 100`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-sand">
        <span
          className={cn("block h-full rounded-full", s >= 80 ? "bg-crimson" : s >= 65 ? "bg-rust" : "bg-amber")}
          style={{ width: `${Math.min(100, s)}%` }}
        />
      </span>
      <span className="tabular-nums">{s}% match</span>
    </span>
  );
}
