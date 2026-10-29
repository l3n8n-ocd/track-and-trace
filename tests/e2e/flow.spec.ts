import path from "node:path";
import { expect, test } from "@playwright/test";
import { ADMIN, closeDb, db, login, logout, register, run } from "./helpers";

const owner = { first: "Owner", email: `owner-${run}@example.com`, idNumber: `O-${run}` };
const finder = { first: "Finder", email: `finder-${run}@example.com`, idNumber: `F-${run}` };
const photo = path.join(__dirname, "fixtures", "item.jpg");
const item = `Blue Casio calculator ${run}`;

test.describe.serial("report → match → claim → release", () => {
  let lostId = "";
  let foundId = "";
  let claimId = "";

  test("guests are sent to the login page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("registration validates required fields", async ({ page }) => {
    await page.goto("/register");
    await page.click("button[type=submit]");
    await expect(page.getByText("Enter your university ID number")).toBeVisible();
    await expect(page.getByText("You must agree to the data privacy notice")).toBeVisible();
  });

  test("owner reports a lost item", async ({ page }) => {
    await register(page, owner);
    await login(page, owner.email);
    await page.goto("/reports/new?type=lost");
    await page.fill("#itemName", item);
    await page.selectOption("#categoryId", { label: "Calculators" });
    await page.fill("#color", "asul");
    await page.fill("#brand", "Casio");
    await page.fill("#description", "Scientific calculator fx-991 with a name sticker");
    await page.fill("#hiddenDetails", "Initials JD scratched on the back");
    await page.selectOption("#locationId", { label: "Library" });
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/reports\/\d+\?created/);
    lostId = page.url().match(/reports\/(\d+)/)![1];
  });

  test("finder reports the found item, which needs a photo", async ({ page }) => {
    await register(page, finder);
    await login(page, finder.email);
    await page.goto("/reports/new?type=found");
    await page.fill("#itemName", `Casio scientific calculator ${run}`);
    await page.selectOption("#categoryId", { label: "Calculators" });
    await page.fill("#color", "blue");
    await page.fill("#brand", "Casio");
    await page.selectOption("#locationId", { label: "Library" });
    await page.click("button[type=submit]");
    await expect(page.getByText("Add at least one photo of the found item")).toBeVisible();
    await page.setInputFiles("input[type=file][accept]", photo);
    await page.waitForTimeout(500);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/reports\/\d+\?created/);
    foundId = page.url().match(/reports\/(\d+)/)![1];
  });

  test("users can't open other people's reports or the admin panel", async ({ page }) => {
    await login(page, finder.email);
    // Pages stream behind a loading screen, so "not found" is shown in the
    // page rather than as an HTTP 404 status.
    await page.goto(`/reports/${lostId}`);
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByText("Initials JD")).toHaveCount(0);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
    const exp = await page.request.get("/api/admin/export?type=reports");
    expect(exp.status()).toBe(403);
  });

  test("an unverified found item isn't in search", async ({ page }) => {
    await login(page, owner.email);
    await page.goto(`/search?q=${run}`);
    await expect(page.getByText("0 items found")).toBeVisible();
  });

  test("admin verifies the found item and assigns storage", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto(`/admin/reports/${foundId}`);
    await expect(page.getByText("Initials JD").or(page.getByText("Hidden details"))).toBeVisible();
    await page.selectOption("#storageLocationId", { index: 1 });
    await page.getByRole("button", { name: "Item received, verify" }).click();
    await expect(page.getByText("Report verified.")).toBeVisible();
  });

  test("owner sees the match and files a claim", async ({ page }) => {
    await login(page, owner.email);
    await expect
      .poll(async () => {
        await page.goto("/matches");
        return page.getByText(`For your lost “${item}”`).count();
      }, { timeout: 15_000 })
      .toBeGreaterThan(0);
    await page.goto(`/search?q=${run}`);
    await expect(page.getByText("1 item found")).toBeVisible();
    await page.goto("/matches");
    await page.getByRole("link", { name: "This is mine" }).first().click();
    await page.fill("#statement", "Too short");
    await page.click("button[type=submit]");
    await expect(page.getByText(/at least a few sentences/)).toBeVisible();
    await page.fill("#statement", "It's my fx-991 calculator. My initials JD are scratched on the back near the battery cover.");
    await page.setInputFiles("input[type=file][accept]", photo);
    await page.waitForTimeout(500);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/claims\/\d+\?created/);
    claimId = page.url().match(/claims\/(\d+)/)![1];
  });

  test("proof files and claims are private", async ({ page }) => {
    const [rows] = await db().query("select proof_id from claim_proof where claim_id = ? and file_path is not null", [claimId]);
    const proofId = (rows as { proof_id: number }[])[0].proof_id;
    await login(page, finder.email);
    expect((await page.request.get(`/api/files/proof/${proofId}`)).status()).toBe(404);
    await page.goto(`/claims/${claimId}`);
    await expect(page.getByText("Page not found")).toBeVisible();
    await logout(page);
    await login(page, owner.email);
    expect((await page.request.get(`/api/files/proof/${proofId}`)).status()).toBe(200);
  });

  test("admin asks for more proof, owner responds", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto(`/admin/claims/${claimId}`);
    await page.fill("#infoRemarks", "Please send a photo of the back of the calculator.");
    await page.getByRole("button", { name: "Request more proof" }).click();
    await expect(page.getByText("More proof requested.")).toBeVisible();
    await logout(page);

    await login(page, owner.email);
    await page.goto(`/claims/${claimId}`);
    await expect(page.getByText("Please send a photo of the back")).toBeVisible();
    await page.fill("#statement", "Attached is a photo showing the JD initials on the back cover.");
    await page.click("button[type=submit]");
    await expect(page.getByText("additional proof was sent")).toBeVisible();
  });

  test("admin approves and releases; records update", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto(`/admin/claims/${claimId}`);
    await page.getByRole("button", { name: "Ownership verified, approve" }).click();
    await expect(page.getByText("Claim approved.")).toBeVisible();
    await page.getByRole("button", { name: "Item picked up, record release" }).click();
    await expect(page.getByText("Item released and records updated.")).toBeVisible();

    const [[found]] = (await db().query("select status from report where report_id = ?", [foundId])) as unknown as [{ status: string }[]];
    const [[lost]] = (await db().query("select status from report where report_id = ?", [lostId])) as unknown as [{ status: string }[]];
    expect(found.status).toBe("CLAIMED");
    expect(lost.status).toBe("CLOSED");

    const [logs] = await db().query("select action from activity_log where target_entity = 'claim' and target_id = ?", [claimId]);
    expect((logs as { action: string }[]).map((l) => l.action)).toEqual(
      expect.arrayContaining(["Filed claim", "Requested more proof", "Approved claim", "Released item to claimant"]),
    );
  });

  test("owner sees the release and notifications", async ({ page }) => {
    await login(page, owner.email);
    await page.goto(`/claims/${claimId}`);
    await expect(page.getByText(/released to you/)).toBeVisible();
    await page.goto("/notifications");
    await expect(page.getByText(/was approved\. Pick it up/)).toBeVisible();
  });
});

test.afterAll(async () => {
  await closeDb();
});
