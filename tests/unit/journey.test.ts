import { describe, expect, it } from "vitest";
import { CLAIM_STATUSES, REPORT_STATUSES } from "@/db/schema";
import { claimJourney, journeyProgress, reportJourney } from "@/lib/journey";

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

describe("status journeys", () => {
  it("advances a found report through check-in, claim, and return", () => {
    const base = { reportType: "FOUND" as const, dateReported: day(1), dateVerified: null };
    expect(reportJourney({ ...base, status: "PENDING" }, { audience: "owner" }).current).toBe(1);
    const verified = { ...base, status: "VERIFIED" as const, dateVerified: day(2) };
    expect(reportJourney(verified, { audience: "owner" }).current).toBe(2);
    const approved = reportJourney(verified, {
      audience: "admin",
      claim: { claimStatus: "APPROVED", dateReviewed: day(3), dateReleased: null },
    });
    expect(approved.current).toBe(3);
    expect(approved.steps[2].date).toEqual(day(3));
    const done = reportJourney({ ...verified, status: "CLAIMED" }, { audience: "owner" });
    expect(done.current).toBe(done.steps.length);
    expect(done.ended).toBeUndefined();
  });

  it("asks the owner to act once a lost report has a match", () => {
    const r = { reportType: "LOST" as const, status: "VERIFIED" as const, dateReported: day(1), dateVerified: day(2) };
    expect(reportJourney(r, { audience: "owner" }).current).toBe(2);
    const matched = reportJourney(r, { audience: "owner", hasMatch: true });
    expect(matched.current).toBe(3);
    expect(matched.currentTone).toBe("attention");
  });

  it("ends early for expired and archived reports", () => {
    const expired = reportJourney(
      { reportType: "FOUND", status: "EXPIRED", dateReported: day(1), dateVerified: day(2), updatedAt: day(30) },
      { audience: "admin" },
    );
    expect(expired.ended?.label).toBe("Expired");
    expect(journeyProgress(expired)).toEqual({ done: 2, total: 4, stopped: true });
    const archived = reportJourney(
      { reportType: "LOST", status: "ARCHIVED", dateReported: day(1), dateVerified: null },
      { audience: "owner" },
    );
    expect(archived.current).toBe(1);
    expect(archived.ended?.label).toBe("Archived");
  });

  it("follows a claim from filing to pickup", () => {
    const c = { claimDate: day(1), dateReviewed: day(2), pickupDeadline: day(9), dateReleased: null };
    expect(claimJourney({ ...c, claimStatus: "PENDING" }, "owner").current).toBe(1);
    const more = claimJourney({ ...c, claimStatus: "MORE_INFO_NEEDED" }, "owner");
    expect(more.steps[1].label).toBe("More proof needed");
    expect(more.currentTone).toBe("attention");
    expect(claimJourney({ ...c, claimStatus: "MORE_INFO_NEEDED" }, "admin").currentTone).toBe("normal");
    const approved = claimJourney({ ...c, claimStatus: "APPROVED" }, "owner");
    expect(approved.current).toBe(3);
    expect(approved.steps[2].note).toMatch(/^Pick up by /);
    const released = claimJourney({ ...c, claimStatus: "RELEASED", dateReleased: day(4) }, "owner");
    expect(released.current).toBe(released.steps.length);
  });

  it("ends early for rejected and lapsed claims", () => {
    const c = { claimDate: day(1), dateReviewed: day(2), pickupDeadline: day(9), dateReleased: null };
    expect(claimJourney({ ...c, claimStatus: "REJECTED" }, "owner").ended?.label).toBe("Not approved");
    expect(claimJourney({ ...c, claimStatus: "LAPSED" }, "owner").ended?.date).toEqual(day(9));
  });

  it("covers every status", () => {
    for (const status of REPORT_STATUSES) {
      for (const reportType of ["LOST", "FOUND"] as const) {
        const j = reportJourney({ reportType, status, dateReported: day(1), dateVerified: day(2) }, { audience: "owner" });
        expect(j.current).toBeGreaterThanOrEqual(0);
        expect(j.current).toBeLessThanOrEqual(j.steps.length);
      }
    }
    for (const claimStatus of CLAIM_STATUSES) {
      const j = claimJourney({ claimStatus, claimDate: day(1), dateReviewed: null, pickupDeadline: null, dateReleased: null }, "admin");
      expect(j.steps).toHaveLength(4);
    }
  });
});
