import { expect, test, type Page } from "@playwright/test";
import type { RowDataPacket } from "mysql2";
import { ADMIN, closeDb, db, login, run } from "./helpers";

const api = process.env.E2E_API_BASE_URL;
test.skip(!api, "Exercises the Firebase frontend navigation.");

async function holdReports(page: Page) {
  let release!: () => void, arrived!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { arrived = resolve; });
  await page.route(api + "/api/client/page?**", async route => {
    if (new URL(route.request().url()).searchParams.get("id") !== "admin/reports") return route.continue();
    const response = await route.fetch();
    arrived();
    await gate;
    await route.fulfill({ response });
  });
  return { release, started };
}

test("hover prepares route code without fetching personal data or duplicating page requests", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/client/")) requests.push(request.url()); });
  const register = page.locator('a[href="/register"]').first();
  await register.hover();
  await page.waitForTimeout(200);
  expect(requests).toEqual([]);
  await register.click();
  await expect(page.locator("#collegeId")).toBeVisible();
  expect(requests.filter(url => new URL(url).searchParams.get("id") === "(auth)/register")).toHaveLength(1);
});

test("cached lists render before the network and revalidate changed data; edits invalidate them", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.locator('a[href="/admin/reports"]').first().click();
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading", exact: true })).toHaveCount(0);
  await page.locator('a[href="/admin"]').first().click();
  await expect(page.getByRole("heading", { name: "Claims to review", exact: true })).toBeVisible();

  const [[ref]] = await db().query<RowDataPacket[]>("select (select id from user where email=?) userId,(select category_id from category where category_name='Others') categoryId,(select location_id from location where is_storage=0 limit 1) locationId", [ADMIN.email]);
  const name = `Navigation fixture ${run}`;
  await db().query("insert into report(user_id,category_id,location_id,report_type,item_name,date_lost_or_found,status) values(?,?,?,'LOST',?,curdate(),'PENDING')", [ref.userId, ref.categoryId, ref.locationId, name]);
  const first = await holdReports(page);
  try {
    await page.locator('a[href="/admin/reports"]').first().click();
    await first.started;
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  } finally { first.release(); }
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });

  await page.getByText(name, { exact: true }).click();
  await page.getByRole("button", { name: "Verify report", exact: true }).click();
  await expect(page.getByText("Report verified.", { exact: true })).toBeVisible();
  await page.locator('a[href="/admin"]').first().click();
  await expect(page.getByRole("heading", { name: "Claims to review", exact: true })).toBeVisible();
  const second = await holdReports(page);
  try {
    await page.locator('a[href="/admin/reports"]').first().click();
    await second.started;
    // The previously cached list was invalidated by verification.
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toHaveCount(0);
  } finally { second.release(); }
  await expect(page.getByText(name, { exact: true })).toBeVisible();
});

test("a cached private page still checks session revocation and cross-tab sign-out", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.locator('a[href="/admin/reports"]').first().click();
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  await page.locator('a[href="/admin"]').first().click();
  await expect(page.getByRole("heading", { name: "Claims to review", exact: true })).toBeVisible();
  const [[admin]] = await db().query<RowDataPacket[]>("select id from user where email=?", [ADMIN.email]);
  await db().query("delete from session where user_id=?", [admin.id]);
  await page.locator('a[href="/admin/reports"]').first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#email")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("track-and-trace-session"))).toBeNull();

  await login(page, ADMIN.email, ADMIN.password);
  const other = await page.context().newPage();
  await other.goto("/login");
  await other.evaluate(() => localStorage.removeItem("track-and-trace-session"));
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#email")).toBeVisible();
  await other.close();
});

test.afterAll(closeDb);
