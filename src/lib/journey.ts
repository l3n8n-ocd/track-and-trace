// Builds the step-by-step "journey" shown on report and claim pages, from
// the dates already stored on each record. Steps before `current` are done,
// `current` is in progress, and `ended` replaces the remaining steps when a
// record stops early (rejected, expired, archived, lapsed).
import type { ClaimStatus, ReportStatus } from "@/db/schema";
import { formatDate } from "./format";

type When = Date | string | null | undefined;

export type JourneyStep = { key: string; label: string; date?: When; note?: string };

export type Journey = {
  steps: JourneyStep[];
  current: number;
  // "attention" when the person viewing has to act; "paused" while on hold.
  currentTone?: "normal" | "attention" | "paused";
  ended?: { label: string; date?: When; note?: string };
  hint?: string;
};

export type Audience = "owner" | "admin";

export function reportJourney(
  r: { reportType: "LOST" | "FOUND"; status: ReportStatus; dateReported: When; dateVerified: When; updatedAt?: When },
  opts: {
    audience: Audience;
    hasMatch?: boolean;
    claim?: { claimStatus: ClaimStatus; dateReviewed: When; dateReleased: When } | null;
  },
): Journey {
  const admin = opts.audience === "admin";
  if (r.reportType === "FOUND") {
    const steps: JourneyStep[] = [
      { key: "reported", label: "Reported", date: r.dateReported, note: "Found report filed" },
      { key: "verified", label: "Received by office", date: r.dateVerified, note: "Verified and stored" },
      { key: "owner", label: "Owner verified", date: opts.claim?.dateReviewed, note: "Claim approved" },
      { key: "returned", label: "Returned", date: opts.claim?.dateReleased, note: "Handed to the owner" },
    ];
    switch (r.status) {
      case "PENDING":
        return {
          steps,
          current: 1,
          hint: admin
            ? "Confirm the item was surrendered and choose where it's stored."
            : "Bring the item to the Lost and Found Office so it can be checked in.",
        };
      case "VERIFIED": {
        const approved = opts.claim?.claimStatus === "APPROVED";
        return {
          steps,
          current: approved ? 3 : 2,
          hint: approved
            ? "An owner was approved and is coming to pick it up."
            : admin
              ? "In storage and searchable. Waiting for an owner to file a claim."
              : "The office is keeping the item safe until its owner claims it.",
        };
      }
      case "CLAIMED":
      case "CLOSED":
        return { steps, current: steps.length };
      case "EXPIRED":
        return { steps, current: 2, ended: { label: "Expired", date: r.updatedAt, note: "Unclaimed after 60 days" } };
      case "ARCHIVED":
        return {
          steps,
          current: r.dateVerified ? 2 : 1,
          ended: { label: "Archived", date: r.updatedAt, note: "Withdrawn or disposed of" },
        };
    }
  }

  const steps: JourneyStep[] = [
    { key: "reported", label: "Reported", date: r.dateReported, note: "Lost report filed" },
    { key: "verified", label: "Verified", date: r.dateVerified, note: "Checked by the office" },
    { key: "matched", label: "Match found", note: "A found item looks similar" },
    { key: "recovered", label: "Recovered", note: "Back with the owner" },
  ];
  switch (r.status) {
    case "PENDING":
      return {
        steps,
        current: opts.hasMatch ? 2 : 1,
        hint: admin
          ? "Check that the report is genuine and complete."
          : "The office will review your report. Matching already runs in the background.",
      };
    case "VERIFIED":
      return opts.hasMatch
        ? {
            steps,
            current: 3,
            currentTone: admin ? "normal" : "attention",
            hint: admin ? "The owner has a possible match to review." : "Check your matches and file a claim if one is yours.",
          }
        : {
            steps,
            current: 2,
            hint: admin
              ? "No found item matches yet."
              : "We'll notify you as soon as a found item looks similar.",
          };
    case "CLAIMED":
    case "CLOSED":
      return { steps: steps.map((s) => (s.key === "recovered" ? { ...s, date: r.updatedAt } : s)), current: steps.length };
    case "EXPIRED":
      return { steps, current: 2, ended: { label: "Expired", date: r.updatedAt } };
    case "ARCHIVED":
      return {
        steps,
        current: r.dateVerified ? 2 : 1,
        ended: { label: "Archived", date: r.updatedAt, note: "Withdrawn or closed by the office" },
      };
  }
}

export function claimJourney(
  c: { claimStatus: ClaimStatus; claimDate: When; dateReviewed: When; pickupDeadline: When; dateReleased: When },
  audience: Audience,
): Journey {
  const admin = audience === "admin";
  const steps: JourneyStep[] = [
    { key: "filed", label: "Claim filed", date: c.claimDate, note: "Proof submitted" },
    { key: "review", label: "Under review", note: "Proof compared with the item" },
    {
      key: "approved",
      label: "Approved",
      date: c.dateReviewed,
      note: c.pickupDeadline ? `Pick up by ${formatDate(c.pickupDeadline)}` : "Ready for pickup",
    },
    { key: "pickup", label: "Picked up", date: c.dateReleased, note: "Item handed over" },
  ];
  const withReview = (label: string, note: string) =>
    steps.map((s) => (s.key === "review" ? { ...s, label, note } : s));

  switch (c.claimStatus) {
    case "PENDING":
      return {
        steps,
        current: 1,
        hint: admin
          ? "Compare the proof with the found report, then approve, ask for more, or reject."
          : "An administrator is comparing your proof with the found report.",
      };
    case "MORE_INFO_NEEDED":
      return {
        steps: withReview("More proof needed", "The office asked for more"),
        current: 1,
        currentTone: admin ? "normal" : "attention",
        hint: admin ? "Waiting for the claimant to send more proof." : "Send the extra proof the office asked for below.",
      };
    case "ON_HOLD":
      return {
        steps: withReview("On hold", "Another claim goes first"),
        current: 1,
        currentTone: "paused",
        hint: admin
          ? "Waiting for another claim on this item to be resolved."
          : "Another claim on this item is being processed. If it doesn't go through, yours is reviewed next.",
      };
    case "APPROVED":
      return {
        steps,
        current: 3,
        currentTone: admin ? "normal" : "attention",
        hint: admin ? "Check the claimant's valid ID before handing the item over." : "Bring a valid ID to the office before the deadline.",
      };
    case "RELEASED":
      return { steps, current: steps.length };
    case "REJECTED":
      return {
        steps: steps.map((s) => (s.key === "review" ? { ...s, date: c.dateReviewed } : s)),
        current: 2,
        ended: { label: "Not approved", date: c.dateReviewed, note: "The proof didn't match" },
      };
    case "LAPSED":
      return {
        steps,
        current: 3,
        ended: { label: "Pickup lapsed", date: c.pickupDeadline, note: "Not collected in time" },
      };
  }
}

// Progress for the compact meter in list rows.
export function journeyProgress(j: Journey) {
  return { done: Math.min(j.current, j.steps.length), total: j.steps.length, stopped: Boolean(j.ended) };
}
