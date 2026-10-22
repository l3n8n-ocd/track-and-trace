import type { ClaimStatus, MatchStatus, ReportStatus } from "@/db/schema";
import { CLAIM_STATUS_LABEL, MATCH_STATUS_LABEL, REPORT_STATUS_LABEL } from "@/lib/status";
import { Badge } from "./ui";

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const tone = ({
    PENDING: "amber",
    VERIFIED: "blue",
    CLAIMED: "green",
    CLOSED: "gray",
    EXPIRED: "red",
    ARCHIVED: "gray",
  } as const)[status];
  return <Badge tone={tone}>{REPORT_STATUS_LABEL[status]}</Badge>;
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const tone = ({
    PENDING: "amber",
    MORE_INFO_NEEDED: "purple",
    APPROVED: "green",
    REJECTED: "red",
    RELEASED: "gray",
    LAPSED: "gray",
    ON_HOLD: "gray",
  } as const)[status];
  return <Badge tone={tone}>{CLAIM_STATUS_LABEL[status]}</Badge>;
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const tone = ({ PENDING_VERIFICATION: "blue", CONFIRMED: "green", REJECTED: "gray" } as const)[status];
  return <Badge tone={tone}>{MATCH_STATUS_LABEL[status]}</Badge>;
}

export function TypeBadge({ type }: { type: "LOST" | "FOUND" }) {
  return <Badge tone={type === "LOST" ? "red" : "green"}>{type === "LOST" ? "Lost" : "Found"}</Badge>;
}
