import { expect, test } from "@playwright/test";
import { ADMIN, closeDb, login, run } from "./helpers";

test("admin edits immediately refresh cached registration and report choices", async ({ page, browser }) => {
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const reportPage = await page.context().newPage();
  const college = `Cache college ${run}`;
  const category = `Cache category ${run}`;
  const renamed = `${category} renamed`;
  const place = `Cache place ${run}`;
  try {
    await login(page, ADMIN.email, ADMIN.password);
    // Warm both caches in other tabs before mutating them.
    await guest.goto("/register");
    await expect(guest.locator("#collegeId option")).not.toHaveCount(0);
    await reportPage.goto("/reports/new");
    await expect(reportPage.locator("#categoryId option")).not.toHaveCount(0);

    await page.goto("/admin/settings?tab=colleges");
    await page.getByPlaceholder("College or office name").fill(college);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("College added.", { exact: true })).toBeVisible();
    await guest.reload();
    await expect(guest.locator("#collegeId option").filter({ hasText: college })).toHaveCount(1);

    await page.goto("/admin/settings?tab=categories");
    await page.getByPlaceholder("New category name").fill(category);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(`Category "${category}" added.`, { exact: true })).toBeVisible();
    await reportPage.reload();
    await expect(reportPage.locator("#categoryId option").filter({ hasText: category })).toHaveCount(1);

    await page.getByText(category, { exact: true }).click();
    await page.getByText(`${category} (general)`, { exact: true }).click();
    await page.getByRole("textbox", { name: `Rename ${category}`, exact: true }).fill(renamed);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Category renamed.", { exact: true })).toBeVisible();
    await reportPage.reload();
    await expect(reportPage.locator("#categoryId option").filter({ hasText: renamed })).toHaveCount(1);
    await page.getByText(renamed, { exact: true }).click();
    await page.getByRole("button", { name: `Delete ${renamed}`, exact: true }).click();
    await expect(page.getByText("Category deleted.", { exact: true })).toBeVisible();
    await reportPage.reload();
    await expect(reportPage.locator("#categoryId option").filter({ hasText: category })).toHaveCount(0);

    await page.goto("/admin/settings?tab=places");
    await page.getByPlaceholder("Building or place").fill(place);
    await page.getByRole("button", { name: "Add place", exact: true }).click();
    await expect(page.getByText("Place added.", { exact: true })).toBeVisible();
    await reportPage.reload();
    await expect(reportPage.locator("#locationId option").filter({ hasText: place })).toHaveCount(1);
    const placeRow = page.locator("li").filter({ hasText: place });
    await placeRow.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(page.getByText("Location hidden from forms.", { exact: true })).toBeVisible();
    await reportPage.reload();
    await expect(reportPage.locator("#locationId option").filter({ hasText: place })).toHaveCount(0);
    await placeRow.getByRole("button", { name: "Restore", exact: true }).click();
    await expect(page.getByText("Location restored.", { exact: true })).toBeVisible();
    await reportPage.reload();
    await expect(reportPage.locator("#locationId option").filter({ hasText: place })).toHaveCount(1);
  } finally {
    await reportPage.close();
    await guestContext.close();
  }
});

test.afterAll(closeDb);
