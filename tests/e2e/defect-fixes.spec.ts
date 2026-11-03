import { expect, test } from "@playwright/test";
import { closeDb, login, register, run } from "./helpers";

// Regression tests for defects found during SIA testing.
const student = { first: "Regress", email: `regress-${run}@example.com`, idNumber: `R-${run}` };

test.afterAll(closeDb);

test("DEF-10: a report with an unknown category shows a message and isn't saved", async ({ page }) => {
  await register(page, student);
  await login(page, student.email);
  await page.goto("/reports/new?type=lost");
  await page.fill("#itemName", `Tampered category ${run}`);
  await page.locator("#locationId").selectOption({ index: 1 });
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>("#categoryId")!;
    const option = document.createElement("option");
    option.value = "999999";
    option.text = "(not a category)";
    select.add(option);
    select.value = "999999";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Submit lost report" }).click();
  await expect(page.getByText("Choose a category from the list").first()).toBeVisible();
  await expect(page.getByText(/Something went wrong|Unable to show this screen/)).toHaveCount(0);
  await page.goto("/reports?type=lost");
  await expect(page.getByText(`Tampered category ${run}`)).toHaveCount(0);
});

test("DEF-11: the login page blocks a sixth wrong password within a minute", async ({ page }) => {
  // An email with no account, so the test can't lock out a real user.
  const email = `nobody-${run}@example.com`;
  // Each attempt waits for the server's answer before the next one.
  const attempt = async (password: string) => {
    await page.fill("#email", email);
    await page.fill("#password", password);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.click("button[type=submit]"),
    ]);
  };
  await page.goto("/login");
  for (let i = 1; i <= 5; i++) {
    await attempt(`wrong-${i}`);
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  }
  await attempt("wrong-6");
  await expect(page.getByText("Too many attempts. Please wait a minute and try again.")).toBeVisible();
});
