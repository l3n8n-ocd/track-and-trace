// Fills an empty demo database with sample users and reports, then saves
// the screenshots used as figures in Chapter III. Run against a dev server
// that uses its own demo database, never production:
//   DEMO_DB=mysql://… SHOT_DIR=… IMG_DIR=… E2E_BASE_URL=http://localhost:3100 \
//   npx playwright test --config tests/screens/pw.config.ts
// IMG_DIR holds calculator.jpg, umbrella.jpg and bottle.jpg.
import { expect, test, type Browser, type Page } from "@playwright/test";
import mysql from "mysql2/promise";
import { poolOptions } from "../../src/db/connection";

const OUT = process.env.SHOT_DIR!;
const IMG = process.env.IMG_DIR!;
const PASSWORD = "Password123";
const ADMIN = { email: "admin@returndesk.test", password: "AdminDemo123" };
const pool = mysql.createPool(poolOptions(process.env.DEMO_DB!));

const juan = { first: "Juan", last: "Dela Cruz", email: "juan.delacruz@example.com", id: "2023-100245" };
const maria = { first: "Maria", last: "Santos", email: "maria.santos@example.com", id: "2022-104118" };

async function ctx(browser: Browser, mobile = false) {
  const c = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 },
  );
  return c.newPage();
}
async function shot(page: Page, name: string, full = false) {
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
}
async function register(page: Page, w: typeof juan, snap?: string) {
  await page.goto("/register");
  await page.selectOption("#role", "student");
  await page.fill("#firstName", w.first);
  await page.fill("#lastName", w.last);
  await page.fill("#idNumber", w.id);
  await page.selectOption("#collegeId", { label: "College of Information and Communications Technology" }).catch(() => page.selectOption("#collegeId", { index: 1 }));
  await page.fill("#course", "BS Information Technology");
  await page.selectOption("#yearLevel", "3");
  await page.fill("#email", w.email);
  await page.fill("#password", PASSWORD);
  await page.fill("#confirmPassword", PASSWORD);
  await page.check("input[name=consent]");
  if (snap) await shot(page, snap, true);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/verify-email/);
  await pool.query("update user set email_verified = 1 where email = ?", [w.email]);
}
async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}
async function report(page: Page, type: "lost" | "found", r: { name: string; cat: string; color: string; brand?: string; desc: string; hidden?: string; loc: string; photo?: string }, snap?: string) {
  await page.goto(`/reports/new?type=${type}`);
  await page.fill("#itemName", r.name);
  await page.selectOption("#categoryId", { label: r.cat });
  await page.fill("#color", r.color);
  if (r.brand) await page.fill("#brand", r.brand);
  await page.fill("#description", r.desc);
  if (r.hidden) await page.fill("#hiddenDetails", r.hidden);
  await page.selectOption("#locationId", { label: r.loc });
  if (r.photo) { await page.setInputFiles("input[type=file][accept]", `${IMG}/${r.photo}`); await page.waitForTimeout(800); }
  if (snap) await shot(page, snap, true);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/reports\/\d+\?created/);
  return page.url().match(/reports\/(\d+)/)![1];
}

test.describe.serial("prototype screenshots", () => {
  const found: string[] = [];
  let claimId = "";

  test("public and account screens", async ({ browser }) => {
    test.skip(!!process.env.SKIP_SETUP);
    const d = await ctx(browser);
    await d.goto("/"); await shot(d, "01-landing");
    const m = await ctx(browser, true);
    await m.goto("/login"); await shot(m, "02-login-mobile");
    await register(d, juan, "03-registration");
    await register(d, maria);
  });

  test("reports", async ({ browser }) => {
    test.skip(!!process.env.SKIP_SETUP);
    const p = await ctx(browser);
    await login(p, maria.email);
    found.push(await report(p, "found", { name: "Casio scientific calculator", cat: "Calculators", color: "blue", brand: "Casio", desc: "Found on a table near the reading area, second floor.", hidden: "Initials JD scratched near the battery cover", loc: "Library", photo: "calculator.jpg" }, "05-report-found-form"));
    found.push(await report(p, "found", { name: "Black folding umbrella", cat: "Umbrellas", color: "black", desc: "Left on a bench outside the canteen after the rain.", hidden: "Wooden handle with a small crack", loc: "Cafeteria / Canteen", photo: "umbrella.jpg" }).catch(() => ""));
    found.push(await report(p, "found", { name: "Green Aquaflask tumbler", cat: "Water Bottles and Tumblers", color: "green", brand: "Aquaflask", desc: "Found in the covered court bleachers.", hidden: "Sticker of a cat on the bottom", loc: "Covered Court", photo: "bottle.jpg" }).catch(() => ""));
    const a = await ctx(browser);
    await login(a, ADMIN.email, ADMIN.password);
    for (const [i, id] of found.filter(Boolean).entries()) {
      await a.goto(`/admin/reports/${id}`);
      await a.selectOption("#storageLocationId", { index: 1 + (i % 3) });
      if (i === 0) await shot(a, "11-admin-verify-report", true);
      await a.getByRole("button", { name: "Item received, verify" }).click();
      await expect(a.getByText("Report verified.")).toBeVisible();
    }
    await a.goto("/admin/announcements");
    await a.fill("#title", "Lost and Found Office hours").catch(() => {});
    await a.fill("#body", "The Lost and Found Office in the Student Affairs building is open Monday to Friday, 8:00 AM to 5:00 PM. Bring a valid ID when claiming an item.").catch(() => {});
    await a.getByRole("button", { name: "Post announcement" }).first().click().catch(() => {});
    await a.waitForTimeout(800);
    const j = await ctx(browser);
    await login(j, juan.email);
    await report(j, "lost", { name: "Blue Casio calculator fx-991", cat: "Calculators", color: "asul", brand: "Casio", desc: "Scientific calculator, lost after my Math class.", hidden: "Initials JD scratched on the back", loc: "Library" });
    await j.waitForTimeout(3000);
  });

  test("user screens", async ({ browser }) => {
    const j = await ctx(browser);
    await login(j, juan.email);
    await j.goto("/dashboard"); await shot(j, "04-user-dashboard", true);
    await j.goto("/search"); await shot(j, "06-search", true);
    const jm = await ctx(browser, true);
    await login(jm, juan.email);
    await expect.poll(async () => { await jm.goto("/matches"); return jm.getByRole("link", { name: "This is mine" }).count(); }, { timeout: 20000 }).toBeGreaterThan(0);
    await shot(jm, "07-matches-mobile", true);
    const href = await jm.getByRole("link", { name: "This is mine" }).first().getAttribute("href");
    await j.goto(href!);
    await j.fill("#statement", "This is my fx-991 calculator. My initials JD are scratched on the back near the battery cover, and it has a blue cover.");
    await j.setInputFiles("input[type=file][accept]", `${IMG}/calculator.jpg`);
    await j.waitForTimeout(800);
    await shot(j, "08-claim-form", true);
    await j.click("button[type=submit]");
    await expect(j).toHaveURL(/\/claims\/\d+\?created/);
    claimId = j.url().match(/claims\/(\d+)/)![1];
  });

  test("admin screens and claim decision", async ({ browser }) => {
    const a = await ctx(browser);
    await login(a, ADMIN.email, ADMIN.password);
    await a.goto("/admin"); await shot(a, "10-admin-dashboard", true);
    await a.goto(`/admin/claims/${claimId}`); await shot(a, "12-admin-claim-review", true);
    await a.getByRole("button", { name: "Ownership verified, approve" }).click();
    await expect(a.getByText("Claim approved.")).toBeVisible();
    await a.goto("/admin/users"); await shot(a, "13-admin-users");
    await a.goto("/admin/records"); await shot(a, "14-admin-records", true);
    const jm = await ctx(browser, true);
    await login(jm, juan.email);
    await jm.goto(`/claims/${claimId}`); await shot(jm, "09-claim-tracking-mobile", true);
    await jm.goto("/notifications"); await shot(jm, "09b-notifications-mobile", true);
  });
});

test.afterAll(async () => { await pool.end(); });
