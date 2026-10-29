import { expect, type Page } from "@playwright/test";
import { config } from "dotenv";
import mysql from "mysql2/promise";
import { poolOptions } from "../../src/db/connection";

config({ path: ".env.local" });

export const run = Date.now().toString(36);
export const PASSWORD = "Password123";
export const ADMIN = { email: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! };

let pool: mysql.Pool | null = null;
export function db() {
  pool ??= mysql.createPool(poolOptions(process.env.DATABASE_URL!));
  return pool;
}

// Each spec closes the pool when it finishes; the next spec opens a new one.
export async function closeDb() {
  await pool?.end();
  pool = null;
}

export async function register(page: Page, who: { first: string; email: string; idNumber: string }) {
  await page.goto("/register");
  await page.selectOption("#role", "student");
  await page.fill("#firstName", who.first);
  await page.fill("#lastName", "Tester");
  await page.fill("#idNumber", who.idNumber);
  await page.selectOption("#collegeId", { index: 1 });
  await page.fill("#course", "BSIT");
  await page.selectOption("#yearLevel", "3");
  await page.fill("#email", who.email);
  await page.fill("#password", PASSWORD);
  await page.fill("#confirmPassword", PASSWORD);
  await page.check("input[name=consent]");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/verify-email/);
  // Tests can't read the inbox, so mark the email verified directly.
  await db().query("update user set email_verified = 1 where email = ?", [who.email]);
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}
