import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", async () => ({ db: mock, schema: await import("@/db/schema") }));
import { reserveVerificationEmail, VERIFICATION_EMAIL_INTERVAL_MS } from "@/server/email-delivery";

let entries: Map<string, number>;
let locks: string[];
let queue: Promise<unknown>;
beforeEach(() => {
  vi.clearAllMocks(); entries = new Map(); locks = []; queue = Promise.resolve();
  mock.transaction.mockImplementation(run => {
    const reservation = queue.then(() => {
      let key = "";
      const tx = {
        insert: () => ({ values: (row: { key: string }) => {
          key = row.key;
          return { onDuplicateKeyUpdate: async () => { if (!entries.has(key)) entries.set(key, 0); } };
        } }),
        select: () => ({ from: () => ({ where: () => ({ for: async (lock: string) => { locks.push(lock); return [{ lastRequest: entries.get(key) }]; } }) }) }),
        update: () => ({ set: (row: { lastRequest: number }) => ({ where: async () => { entries.set(key, row.lastRequest); } }) }),
      };
      return run(tx);
    });
    queue = reservation.catch(() => {});
    return reservation;
  });
});
const now = 1_800_000_000_000;
describe("shared verification email cooldown", () => {
  it("reserves the first send and suppresses repeated requests within one minute", async () => {
    expect(await reserveVerificationEmail("student@example.test", now)).toBe(true);
    expect(await reserveVerificationEmail("student@example.test", now + 1000)).toBe(false);
    expect(await reserveVerificationEmail("student@example.test", now + 59_999)).toBe(false);
    expect(await reserveVerificationEmail("student@example.test", now + VERIFICATION_EMAIL_INTERVAL_MS)).toBe(true);
    expect(locks).toEqual(["update", "update", "update", "update"]);
  });
  it("normalizes case and whitespace and does not retain the email address in its key", async () => {
    await reserveVerificationEmail(" Student@Example.test ", now);
    expect(await reserveVerificationEmail("student@example.test", now + 1)).toBe(false);
    expect([...entries.keys()]).toEqual([expect.stringMatching(/^verification-email:[a-f0-9]{64}$/)]);
  });
  it("does not block a different recipient", async () => {
    expect(await reserveVerificationEmail("one@example.test", now)).toBe(true);
    expect(await reserveVerificationEmail("two@example.test", now)).toBe(true);
  });
  it("allows only one reservation when callers share a locked transaction store", async () => {
    expect(await Promise.all(Array.from({ length: 5 }, () => reserveVerificationEmail("same@example.test", now))))
      .toEqual([true, false, false, false, false]);
    expect(mock.transaction).toHaveBeenCalledTimes(5);
  });
});
