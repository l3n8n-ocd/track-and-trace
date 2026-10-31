// Selenium WebDriver proof of concept (IT302 Activity 8, Part C): a negative
// login, a student login, role authorization, and an administrator login,
// using explicit waits. A failing step saves a screenshot and the page HTML
// to test-results/selenium/.
//   BASE_URL=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:selenium
// Needs the API test accounts (npx tsx tests/api/setup-users.ts).
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const STUDENT = { email: "api.student@trackandtrace.test", password: process.env.API_TEST_PASSWORD ?? "ApiTest12345" };
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const WAIT = 15_000;
const OUT = "test-results/selenium";

let driver;

before(async () => {
  const options = new chrome.Options().addArguments("--headless=new", "--no-sandbox", "--window-size=1280,800");
  if (process.env.CHROME_BIN) options.setChromeBinaryPath(process.env.CHROME_BIN);
  driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
});

after(async () => {
  await driver?.quit();
});

// Runs one step; on failure keeps a screenshot and the HTML as evidence.
async function step(name, fn) {
  try {
    await fn();
  } catch (error) {
    await mkdir(OUT, { recursive: true });
    const file = name.replace(/\W+/g, "-");
    await writeFile(`${OUT}/${file}.png`, await driver.takeScreenshot(), "base64");
    await writeFile(`${OUT}/${file}.html`, await driver.getPageSource());
    throw error;
  }
}

async function logIn(email, password) {
  await driver.manage().deleteAllCookies();
  await driver.get(`${BASE}/login`);
  // Streamed pages can have form elements in the DOM before they are visible.
  // Wait for each control to be ready before interacting with it.
  for (const [locator, value] of [[By.id("email"), email], [By.id("password"), password]]) {
    const field = await driver.wait(until.elementLocated(locator), WAIT);
    await driver.wait(until.elementIsVisible(field), WAIT);
    await driver.wait(until.elementIsEnabled(field), WAIT);
    await field.sendKeys(value);
  }
  const submit = await driver.wait(until.elementLocated(By.css("button[type=submit]")), WAIT);
  await driver.wait(until.elementIsVisible(submit), WAIT);
  await driver.wait(until.elementIsEnabled(submit), WAIT);
  await submit.click();
}

const textOnPage = (text) => until.elementLocated(By.xpath(`//*[contains(normalize-space(.), "${text}")]`));

test("a wrong password shows an error and stays on the login page", () =>
  step("wrong-password", async () => {
    await logIn(STUDENT.email, "WrongPassword1");
    await driver.wait(textOnPage("Invalid email or password."), WAIT);
    assert.match(await driver.getCurrentUrl(), /\/login/);
  }));

test("a student logs in and lands on the dashboard", () =>
  step("student-login", async () => {
    await logIn(STUDENT.email, STUDENT.password);
    await driver.wait(until.urlContains("/dashboard"), WAIT);
    await driver.wait(textOnPage(", API."), WAIT);
  }));

test("a student who opens /admin is sent back to the dashboard", () =>
  step("student-admin-redirect", async () => {
    await driver.get(`${BASE}/admin`);
    await driver.wait(until.urlContains("/dashboard"), WAIT);
    assert.doesNotMatch(await driver.getCurrentUrl(), /\/admin/);
  }));

test("an administrator logs in and sees the admin overview", { skip: !ADMIN.email && "ADMIN_EMAIL not set" }, () =>
  step("admin-login", async () => {
    await logIn(ADMIN.email, ADMIN.password);
    await driver.wait(until.urlContains("/admin"), WAIT);
    await driver.wait(textOnPage("Claims to review"), WAIT);
  }));
