import { expect, test } from "@playwright/test";
import { db, run } from "./helpers";

type Row = Record<string, unknown>;
async function one(sql: string, params: unknown[] = []) {
  const [rows] = await db().query(sql, params);
  return (rows as Row[])[0];
}
async function insert(sql: string, params: unknown[]) {
  const [res] = await db().query(sql, params);
  return (res as { insertId: number }).insertId;
}

test("daily job: reminders, lapsed claims, and expired items", async ({ request }) => {
  const user = await one("select id from user where role <> 'admin' limit 1");
  const category = await one("select category_id from category limit 1");
  const place = await one("select location_id from location where is_storage = 0 limit 1");
  const base = [user.id, category.category_id, place.location_id];

  // Found item in storage for 70 days with no claim -> EXPIRED.
  const stale = await insert(
    `insert into report (user_id, category_id, location_id, report_type, item_name, date_lost_or_found, status, date_verified)
     values (?, ?, ?, 'FOUND', ?, '2026-01-01', 'VERIFIED', now() - interval 70 day)`,
    [...base, `Old umbrella ${run}`],
  );
  // Found item with an approved claim past its deadline -> claim LAPSED.
  const claimed = await insert(
    `insert into report (user_id, category_id, location_id, report_type, item_name, date_lost_or_found, status, date_verified)
     values (?, ?, ?, 'FOUND', ?, '2026-01-01', 'VERIFIED', now())`,
    [...base, `Water bottle ${run}`],
  );
  const lapsing = await insert(
    `insert into claim (report_id, claimant_id, claim_status, pickup_deadline) values (?, ?, 'APPROVED', now() - interval 1 day)`,
    [claimed, user.id],
  );
  const waiting = await insert(`insert into claim (report_id, claimant_id, claim_status) values (?, ?, 'ON_HOLD')`, [claimed, user.id]);
  // Approved claim due tomorrow -> reminder.
  const remind = await insert(
    `insert into claim (report_id, claimant_id, claim_status, pickup_deadline) values (?, ?, 'APPROVED', now() + interval 20 hour)`,
    [claimed, user.id],
  );

  const unauthorized = await request.get("/api/cron/daily");
  expect(unauthorized.status()).toBe(401);
  const res = await request.get("/api/cron/daily", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(res.ok()).toBeTruthy();

  expect((await one("select status from report where report_id = ?", [stale])).status).toBe("EXPIRED");
  expect((await one("select claim_status from claim where claim_id = ?", [lapsing])).claim_status).toBe("LAPSED");
  expect((await one("select claim_status from claim where claim_id = ?", [waiting])).claim_status).toBe("PENDING");
  expect((await one("select reminder_sent from claim where claim_id = ?", [remind])).reminder_sent).toBe(1);
});

test.afterAll(async () => {
  await db().end();
});
