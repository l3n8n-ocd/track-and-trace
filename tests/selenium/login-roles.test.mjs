// Selenium WebDriver suite (IT302 Activity 8 Part C, SIA testing portfolio):
// login and role checks plus the main student features: filing a lost
// report, searching, the privacy of found items, and claim validation.
// Explicit waits throughout; a failing step saves a screenshot and the page
// HTML to test-results/selenium/.
//
// Local or CI (needs the API test accounts: npx tsx tests/api/setup-users.ts):
//   BASE_URL=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:selenium
// Live site with a visible browser: see tests/selenium/run-live.ps1.
//
// Settings (environment variables):
//   BASE_URL            site under test (Next.js app or the Firebase front end)
//   STUDENT_EMAIL, STUDENT_PASSWORD   a verified student account
//   ADMIN_EMAIL, ADMIN_PASSWORD       an administrator account (test skipped if unset)
//   FOUND_ITEM_KEYWORD  a word in the name of a verified found item from another user
//   FOUND_ITEM_CATEGORY optional: that item's category exactly as the search filter
//                       lists it ("Umbrellas", or "All electronics" for a main
//                       category); read from the result card when not set
//   FOUND_ITEM_HIDDEN   text from that item's hidden details (must never be shown)
//   HEADED=1            show the Chrome window;  SLOW_MO=ms  pause between steps
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const STUDENT = {
  email: process.env.STUDENT_EMAIL ?? "api.student@trackandtrace.test",
  password: process.env.STUDENT_PASSWORD ?? process.env.API_TEST_PASSWORD ?? "ApiTest12345",
};
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const FOUND = {
  keyword: process.env.FOUND_ITEM_KEYWORD ?? "Selenium test water bottle",
  category: process.env.FOUND_ITEM_CATEGORY ?? "",
  hidden: process.env.FOUND_ITEM_HIDDEN ?? "SEL-7781",
};
const SLOW_MO = Number(process.env.SLOW_MO ?? 0);
const WAIT = 20_000;
const OUT = "test-results/selenium";

let driver;

before(async () => {
  const options = new chrome.Options().addArguments("--no-sandbox", "--window-size=1280,900");
  if (!process.env.HEADED) options.addArguments("--headless=new");
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

const pause = () => (SLOW_MO ? driver.sleep(SLOW_MO) : Promise.resolve());

// Waits until an element is present, visible, and enabled. Pages render in
// stages, so a control can exist before it can be used.
async function ready(locator) {
  const element = await driver.wait(until.elementLocated(locator), WAIT);
  await driver.wait(until.elementIsVisible(element), WAIT);
  await driver.wait(until.elementIsEnabled(element), WAIT);
  return element;
}

async function type(locator, value) {
  const field = await ready(locator);
  await field.clear();
  await field.sendKeys(value);
  await pause();
}

async function click(locator) {
  await (await ready(locator)).click();
  await pause();
}

async function choose(selectId, optionText) {
  await click(By.xpath(`//select[@id="${selectId}"]/option[normalize-space(.)="${optionText}"]`));
}

const textOnPage = (text) => until.elementLocated(By.xpath(`//*[contains(normalize-space(.), "${text}")]`));
const button = (label) => By.xpath(`//button[normalize-space(.)="${label}"]`);

// Signs out (the Firebase front end keeps its session in browser storage,
// the Next.js app in a cookie) and signs in again.
async function logIn(email, password) {
  await driver.get(`${BASE}/login`);
  await driver.manage().deleteAllCookies();
  await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");
  await driver.navigate().refresh();
  await type(By.id("email"), email);
  await type(By.id("password"), password);
  await click(By.css("button[type=submit]"));
}

test("SEL-01 a wrong password shows an error and stays on the login page", () =>
  step("SEL-01-wrong-password", async () => {
    await logIn(STUDENT.email, "WrongPassword1");
    await driver.wait(textOnPage("Invalid email or password."), WAIT);
    assert.match(await driver.getCurrentUrl(), /\/login/);
  }));

test("SEL-02 a student logs in and lands on the dashboard", () =>
  step("SEL-02-student-login", async () => {
    await logIn(STUDENT.email, STUDENT.password);
    await driver.wait(until.urlContains("/dashboard"), WAIT);
    await driver.wait(textOnPage("Your recent reports"), WAIT);
  }));

test("SEL-03 a student who opens /admin is sent back to the dashboard", () =>
  step("SEL-03-student-admin-redirect", async () => {
    await driver.get(`${BASE}/admin`);
    await driver.wait(until.urlContains("/dashboard"), WAIT);
    assert.doesNotMatch(await driver.getCurrentUrl(), /\/admin/);
  }));

test("SEL-05 a student files a lost item report", () =>
  step("SEL-05-lost-report", async () => {
    const name = `Selenium lost calculator ${Date.now()}`;
    await driver.get(`${BASE}/reports/new?type=lost`);
    await type(By.id("itemName"), name);
    await click(By.css("#categoryId option:nth-child(2)"));
    await type(By.id("description"), "Grey scientific calculator with a cracked cover.");
    // The date field already holds today's date.
    await click(By.css("#locationId option:nth-child(2)"));
    await click(button("Submit lost report"));
    await driver.wait(until.urlMatches(/\/reports\/\d+/), WAIT);
    await driver.wait(textOnPage("Your report was submitted"), WAIT);
    await driver.wait(textOnPage(name), WAIT);
  }));

test("SEL-06 search filters found items by keyword and category", () =>
  step("SEL-06-search", async () => {
    const itemLink = By.xpath(`//a[starts-with(@href, "/items/") and contains(normalize-space(.), "${FOUND.keyword}")]`);
    await driver.get(`${BASE}/search`);
    await type(By.id("q"), FOUND.keyword);
    await click(By.css("form button[type=submit]"));
    await driver.wait(until.urlContains("q="), WAIT);
    await driver.wait(until.elementLocated(itemLink), WAIT);

    // Unless given, take the item's category from its result card: a
    // sub-category is listed by name, a main category as "All <name>".
    const category =
      FOUND.category ||
      (await driver.executeScript(
        `const card = [...document.querySelectorAll('a[href^="/items/"]')]
           .find(a => a.textContent.includes(arguments[0]))?.textContent.toLowerCase() ?? '';
         const names = [...document.querySelectorAll('#category option')].filter(o => o.value).map(o => o.text.trim());
         return names
           .filter(n => card.includes(n.toLowerCase()) || (n.startsWith('All ') && card.includes(n.slice(4).toLowerCase())))
           .sort((a, b) => b.length - a.length)[0];`,
        FOUND.keyword,
      ));
    assert.ok(category, "could not tell the found item's category from its result card");
    await choose("category", category);
    await click(By.css("form button[type=submit]"));
    await driver.wait(until.urlContains("category="), WAIT);
    await driver.wait(until.elementLocated(itemLink), WAIT);

    // The same keyword under a category from another group finds nothing.
    const other = await driver.executeScript(
      `const options = [...document.querySelectorAll('#category option')];
       const group = options.find(o => o.text.trim() === arguments[0])?.parentElement;
       return options.find(o => o.value && o.parentElement !== group)?.text.trim();`,
      category,
    );
    await choose("category", other);
    await click(By.css("form button[type=submit]"));
    await driver.wait(textOnPage("No matching items"), WAIT);
    assert.equal((await driver.findElements(itemLink)).length, 0);
  }));

test("SEL-07 a found item's page hides the finder and blurs photos", () =>
  step("SEL-07-privacy", async () => {
    await driver.get(`${BASE}/search?q=${encodeURIComponent(FOUND.keyword)}`);
    await click(By.xpath(`//a[starts-with(@href, "/items/") and contains(normalize-space(.), "${FOUND.keyword}")]`));
    await driver.wait(until.urlMatches(/\/items\/\d+$/), WAIT);
    await driver.wait(textOnPage("Photos are blurred"), WAIT);
    await driver.wait(textOnPage("This is mine, file a claim"), WAIT);
    const html = await driver.getPageSource();
    assert.ok(!html.includes(FOUND.hidden), "hidden details must not be on the page");
    assert.ok(!/Reported by/i.test(html), "the finder must not be shown");
  }));

test("SEL-08 the claim form rejects a too-short proof description", () =>
  step("SEL-08-claim-validation", async () => {
    await click(By.xpath(`//a[normalize-space(.)="This is mine, file a claim"]`));
    await driver.wait(until.urlMatches(/\/items\/\d+\/claim$/), WAIT);
    await type(By.id("statement"), "mine");
    await click(button("Submit claim"));
    await driver.wait(textOnPage("at least a few sentences (20+ characters)"), WAIT);
    assert.match(await driver.getCurrentUrl(), /\/claim$/);
  }));

test("SEL-04 an administrator logs in and sees the admin overview", { skip: !ADMIN.email && "ADMIN_EMAIL not set" }, () =>
  step("SEL-04-admin-login", async () => {
    await logIn(ADMIN.email, ADMIN.password);
    await driver.wait(until.urlContains("/admin"), WAIT);
    await driver.wait(textOnPage("Claims to review"), WAIT);
  }));
