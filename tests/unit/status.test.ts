import { describe, expect, it } from "vitest";
import { canChangeClaim, canChangeMatch, canChangeReport } from "@/lib/status";

describe("status transitions", () => {
  it("follows the report lifecycle", () => {
    expect(canChangeReport("PENDING", "VERIFIED")).toBe(true);
    expect(canChangeReport("VERIFIED", "CLAIMED")).toBe(true);
    expect(canChangeReport("CLAIMED", "CLOSED")).toBe(true);
    expect(canChangeReport("PENDING", "CLAIMED")).toBe(false);
    expect(canChangeReport("CLOSED", "VERIFIED")).toBe(false);
  });

  it("follows the claim lifecycle", () => {
    expect(canChangeClaim("PENDING", "MORE_INFO_NEEDED")).toBe(true);
    expect(canChangeClaim("MORE_INFO_NEEDED", "PENDING")).toBe(true);
    expect(canChangeClaim("APPROVED", "RELEASED")).toBe(true);
    expect(canChangeClaim("REJECTED", "APPROVED")).toBe(false);
    expect(canChangeClaim("PENDING", "RELEASED")).toBe(false);
  });

  it("never reopens a decided match", () => {
    expect(canChangeMatch("PENDING_VERIFICATION", "CONFIRMED")).toBe(true);
    expect(canChangeMatch("REJECTED", "CONFIRMED")).toBe(false);
  });
});
