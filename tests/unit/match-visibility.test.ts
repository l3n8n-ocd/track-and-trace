import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { QueryBuilder, alias } from "drizzle-orm/mysql-core";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
vi.mock("server-only", () => ({}));
vi.mock("@/db", async () => {
  const { QueryBuilder } = await import("drizzle-orm/mysql-core");
  return { db: new QueryBuilder(), schema: await import("@/db/schema") };
});
import { actionableMatches } from "@/server/match-visibility";

let database: DatabaseSync;
beforeEach(() => {
  database = new DatabaseSync(":memory:");
  // Execute the actual generated correlated predicate against isolated fixtures.
  database.exec(`CREATE TABLE REPORT (report_id INTEGER, status TEXT);
    CREATE TABLE MATCH_RECORD (match_id INTEGER, lost_report_id INTEGER, found_report_id INTEGER);
    CREATE TABLE CLAIM (claim_id INTEGER, report_id INTEGER, claimant_id TEXT, claim_status TEXT);
    INSERT INTO REPORT VALUES (1, 'VERIFIED'), (2, 'VERIFIED'), (3, 'VERIFIED');
    INSERT INTO MATCH_RECORD VALUES (1, 1, 2), (2, 1, 3);`);
});
afterEach(() => database.close());
function visible() {
  const lost = alias(schema.report, "lost");
  const found = alias(schema.report, "found");
  const query = new QueryBuilder().select({ id: schema.matchRecord.id }).from(schema.matchRecord)
    .innerJoin(lost, eq(lost.id, schema.matchRecord.lostReportId))
    .innerJoin(found, eq(found.id, schema.matchRecord.foundReportId))
    .where(actionableMatches("owner", lost, found)).toSQL();
  return database.prepare(query.sql).all(...query.params as string[]).map(row => row.match_id ?? row.id);
}
describe("actionable possible matches", () => {
  it("shows unclaimed open reports", () => expect(visible()).toHaveLength(2));
  it("hides a pending claim even without a match ID", () => {
    database.exec("INSERT INTO CLAIM VALUES (1, 2, 'owner', 'PENDING')");
    expect(visible()).toHaveLength(1);
  });
  it("hides all suggestions for the same lost report once pickup is approved", () => {
    database.exec("INSERT INTO CLAIM VALUES (1, 2, 'owner', 'APPROVED')");
    expect(visible()).toEqual([]);
  });
  it("does not suppress another claimant's suggestions", () => {
    database.exec("INSERT INTO CLAIM VALUES (1, 2, 'other-owner', 'APPROVED')");
    expect(visible()).toHaveLength(2);
  });
  it.each(["REJECTED", "LAPSED"])("restores suggestions after a %s claim", (status) => {
    database.prepare("INSERT INTO CLAIM VALUES (1, 2, 'owner', ?)").run(status);
    expect(visible()).toHaveLength(2);
  });
  it("hides closed or withdrawn lost reports", () => {
    database.exec("UPDATE REPORT SET status='ARCHIVED' WHERE report_id=1");
    expect(visible()).toEqual([]);
  });
  it("hides found items that have already been released", () => {
    database.exec("UPDATE REPORT SET status='CLAIMED' WHERE report_id=2");
    expect(visible()).toHaveLength(1);
  });
});
