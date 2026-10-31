import { expect, test } from "@playwright/test";
import type { RowDataPacket } from "mysql2";
import { ADMIN, closeDb, db, login } from "./helpers";

test("combined dashboard queries preserve counts across report types, statuses, and dates", async ({ page }) => {
  const [[admin]] = await db().query<RowDataPacket[]>("select id from user where email = ?", [ADMIN.email]);
  const [[category]] = await db().query<RowDataPacket[]>("select category_id from category where category_name = 'Others'");
  const [[place]] = await db().query<RowDataPacket[]>("select location_id from location where is_storage = 0 limit 1");
  const base = [admin.id, category.category_id, place.location_id];
  await db().query(
    `insert into report (user_id, category_id, location_id, report_type, item_name, date_lost_or_found, status, date_verified) values
      (?, ?, ?, 'FOUND', 'Old stored fixture', '2026-01-01', 'VERIFIED', now() - interval 51 day),
      (?, ?, ?, 'LOST', 'Old lost fixture', '2026-01-01', 'VERIFIED', now() - interval 51 day),
      (?, ?, ?, 'FOUND', 'Claimed fixture', '2026-01-01', 'CLAIMED', now() - interval 51 day),
      (?, ?, ?, 'FOUND', 'Recent stored fixture', '2026-01-01', 'VERIFIED', now()),
      (?, ?, ?, 'FOUND', 'Undated stored fixture', '2026-01-01', 'VERIFIED', null)`,
    [...base, ...base, ...base, ...base, ...base],
  );
  const [[totals]] = await db().query<RowDataPacket[]>(`select
    (select count(*) from report where status = 'PENDING') as pendingReports,
    (select count(*) from claim where claim_status = 'PENDING') as pendingClaims,
    (select count(*) from claim where claim_status = 'APPROVED') as awaitingPickup,
    (select count(*) from report where report_type = 'FOUND' and status = 'VERIFIED') as inStorage,
    (select count(*) from report where report_type = 'FOUND' and status = 'VERIFIED'
      and date_verified < now() - interval 50 day) as expiringSoon`);
  await login(page, ADMIN.email, ADMIN.password);
  for (const [label, value] of [
    ["Reports to verify", totals.pendingReports],
    ["Claims to review", totals.pendingClaims],
    ["Approved, awaiting pickup", totals.awaitingPickup],
    ["Items in storage", totals.inStorage],
    ["In storage over 50 days", totals.expiringSoon],
  ] as const) {
    const card = page.locator("main a").filter({ has: page.getByText(label, { exact: true }) });
    await expect(card.locator(".tabular-nums")).toHaveText(String(value));
  }
});

test.afterAll(closeDb);
