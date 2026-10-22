// Allowed status changes (system design §8). Every status update in the
// server code goes through these checks.
import type { ClaimStatus, MatchStatus, ReportStatus } from "@/db/schema";

const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  PENDING: ["VERIFIED", "ARCHIVED"],
  VERIFIED: ["CLAIMED", "CLOSED", "EXPIRED", "ARCHIVED"],
  CLAIMED: ["CLOSED"],
  CLOSED: [],
  EXPIRED: ["ARCHIVED", "VERIFIED"],
  ARCHIVED: [],
};

const CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  PENDING: ["MORE_INFO_NEEDED", "APPROVED", "REJECTED", "ON_HOLD"],
  MORE_INFO_NEEDED: ["PENDING", "REJECTED", "ON_HOLD"],
  APPROVED: ["RELEASED", "LAPSED"],
  ON_HOLD: ["PENDING", "REJECTED"],
  REJECTED: [],
  RELEASED: [],
  LAPSED: [],
};

const MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  PENDING_VERIFICATION: ["CONFIRMED", "REJECTED"],
  CONFIRMED: [],
  REJECTED: [],
};

export function canChangeReport(from: ReportStatus, to: ReportStatus) {
  return REPORT_TRANSITIONS[from].includes(to);
}

export function canChangeClaim(from: ClaimStatus, to: ClaimStatus) {
  return CLAIM_TRANSITIONS[from].includes(to);
}

export function canChangeMatch(from: MatchStatus, to: MatchStatus) {
  return MATCH_TRANSITIONS[from].includes(to);
}

// Reports that are still active for matching and searching.
export const OPEN_REPORT_STATUSES: ReportStatus[] = ["PENDING", "VERIFIED"];

// Claims that still need an administrator or the claimant to act.
export const ACTIVE_CLAIM_STATUSES: ClaimStatus[] = [
  "PENDING",
  "MORE_INFO_NEEDED",
  "APPROVED",
  "ON_HOLD",
];

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  CLAIMED: "Claimed",
  CLOSED: "Closed",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  PENDING: "Pending review",
  MORE_INFO_NEEDED: "More proof needed",
  APPROVED: "Approved – ready for pickup",
  REJECTED: "Rejected",
  RELEASED: "Released",
  LAPSED: "Lapsed",
  ON_HOLD: "On hold",
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  PENDING_VERIFICATION: "Possible match",
  CONFIRMED: "Confirmed",
  REJECTED: "Dismissed",
};
