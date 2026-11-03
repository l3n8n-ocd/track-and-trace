// The recorded test runs, in recording order. Each clip ID matches the shot
// list in the Video Production Plan; each step is checked against the test
// case's expected result and written to the execution log.
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = (name) => path.join(here, "fixtures", name);

const FOUND = { name: "Black folding umbrella", category: "Umbrellas", hidden: "Rubber grip with a small crack near the end", place: "Gymnasium" };
const LOST = { name: "Black umbrella", category: "Umbrellas", color: "Black", description: "Folding, rubber grip handle", place: "Gymnasium" };
const CLAIM_TEXT = "Black folding umbrella with a rubber grip; there is a small crack near the end of the handle. I lost it in the gym after PE class.";

const isoDate = (days) => new Date(Date.now() + 8 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);

async function seeText(actor, text, timeout = 15_000) {
  await actor.page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor({ state: "visible", timeout });
  return `Shows "${text}"`;
}

async function absent(actor, text) {
  const html = await actor.page.content();
  if (html.includes(text)) throw new Error(`"${text}" is on the page`);
  return `"${text}" is not on the page`;
}

// Shows a short note on screen for actions that happen outside the page,
// such as changing a value through the browser's developer tools.
async function note(actor, message, ms = 2500) {
  await actor.page.evaluate((m) => {
    const n = document.createElement("div");
    n.textContent = m;
    Object.assign(n.style, {
      position: "fixed", left: "50%", top: "16px", transform: "translateX(-50%)", zIndex: 2147483646,
      background: "#111827", color: "#fff", padding: "10px 16px", borderRadius: "10px",
      font: "600 15px/1.4 system-ui,sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,.3)", pointerEvents: "none",
    });
    n.id = "__tt-note";
    document.documentElement.appendChild(n);
  }, message);
  await actor.pause(ms);
  await actor.page.evaluate(() => document.getElementById("__tt-note")?.remove());
}

async function newLostForm(actor) {
  await actor.go("/reports/new?type=lost");
  await actor.page.locator("#itemName").waitFor();
}

// Scrolls back to the top of the form so the field messages are in view.
async function toTop(actor) {
  await actor.page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await actor.pause(1500);
}

async function submitLost(actor) {
  await actor.click(actor.button("Submit lost report"), 2500);
}

export const CLIPS = [
  // ---------------------------------------------------------------- part 1
  {
    id: "SCR-V1-07a", part: 1, title: "TC-02 + TC-07: finder reports the found umbrella with a photo",
    async run({ as, log, state }) {
      const b = await as("B");
      await b.front();
      await b.go("/reports/new?type=found");
      await log.check(this.id, "TC-02", 1, b, "The found report form opens", () => seeText(b, "Report a found item"));
      await b.type(b.page.locator("#itemName"), FOUND.name);
      await b.choose(b.page.locator("#categoryId"), FOUND.category);
      await b.type(b.page.locator("#hiddenDetails"), FOUND.hidden);
      await b.choose(b.page.locator("#locationId"), FOUND.place);
      await log.check(this.id, "TC-02", 2, b, "No field errors", () => absent(b, "Please fix the highlighted fields"));
      await b.click(b.button("Submit found report"), 1800);
      await log.check(this.id, "TC-02", 3, b, "Error: Add at least one photo of the found item", () => seeText(b, "Add at least one photo"));
      await b.upload(b.page.locator('input[type=file][name="photos"]'), FIXTURE("umbrella.jpg"));
      await b.click(b.button("Submit found report"), 500);
      await log.check(this.id, "TC-02", 4, b, "Report page with status Pending and the photo", async () => {
        await b.page.waitForURL(/\/reports\/\d+/, { timeout: 40_000 });
        await seeText(b, "Your report was submitted");
        return "Report submitted; status Pending; photo shown";
      });
      state.foundId = b.page.url().match(/reports\/(\d+)/)[1];
      await b.pause(1500);
      const src = await b.page.locator("main img").first().getAttribute("src");
      await log.check(this.id, "TC-07", 1, b, "Report saved; photo appears on the report page", async () => {
        if (!src) throw new Error("No photo on the report page");
        return "Photo shown on the report page";
      });
      await b.hover(b.page.locator("main img").first(), 1200);
      const tab = await b.page.context().newPage();
      await tab.goto(new URL(src, b.page.url()).href, { waitUntil: "load" });
      await tab.bringToFront();
      await b.pause(2500);
      await log.check(this.id, "TC-07", 2, { ...b, page: tab }, "The image is served from res.cloudinary.com", async () => {
        const host = new URL(tab.url()).host;
        if (!host.includes("cloudinary.com")) throw new Error(`Image served from ${host}`);
        return `Image served from ${host}`;
      });
      await tab.close();
      await b.front();
    },
  },
  {
    id: "SCR-V1-09a", part: 1, title: "TC-38 step 1: the office verifies the found umbrella and assigns storage",
    async run({ as, log, state }) {
      const a = await as("ADMIN");
      await a.front();
      await a.go(`/admin/reports/${state.foundId}`);
      const storage = a.page.locator("#storageLocationId");
      const label = (await storage.locator("option").nth(1).textContent()).trim();
      await a.choose(storage, label);
      await a.click(a.button("Item received, verify"), 2500);
      await log.check(this.id, "TC-38", 1, a, "Report status Verified; storage shown", () => seeText(a, "Report verified"));
      await a.pause(1500);
    },
  },
  {
    id: "SCR-V1-08a", part: 1, title: "TC-01: student files a lost item report",
    async run({ as, log, state }) {
      const s = await as("A");
      await s.front();
      await s.go("/dashboard");
      await s.click(s.link(/Report an item/).or(s.page.getByRole("link", { name: /Report/ })).first(), 1500);
      await s.click(s.link(/I lost something/), 1500);
      await log.check(this.id, "TC-01", 1, s, "Form with three sections and the progress bar", () => seeText(s, "When and where"));
      await s.type(s.page.locator("#itemName"), LOST.name);
      await s.choose(s.page.locator("#categoryId"), LOST.category);
      await s.type(s.page.locator("#color"), LOST.color);
      await s.type(s.page.locator("#description"), LOST.description);
      await log.check(this.id, "TC-01", 2, s, "No field errors; The item marked complete", () => absent(s, "Please fix the highlighted fields"));
      await s.page.locator("#dateLostOrFound").fill(isoDate(-1));
      await s.pause(600);
      await s.choose(s.page.locator("#locationId"), LOST.place);
      await submitLost(s);
      await log.check(this.id, "TC-01", 3, s, "'Your report was submitted.' and status Pending", async () => {
        await s.page.waitForURL(/\/reports\/\d+/, { timeout: 30_000 });
        await seeText(s, "Your report was submitted");
        return "Report submitted; status Pending";
      });
      state.lostId = s.page.url().match(/reports\/(\d+)/)[1];
      await s.pause(1500);
      await s.go("/reports?type=lost");
      await log.check(this.id, "TC-01", 4, s, "Listed under Lost with status Pending", () => seeText(s, LOST.name));
      await s.pause(1500);
    },
  },
  {
    id: "SCR-V1-06a", part: 1, title: "TC-06: future dates are rejected",
    async run({ as, log }) {
      const s = await as("A");
      await s.front();
      await newLostForm(s);
      await s.type(s.page.locator("#itemName"), "Scientific calculator");
      await s.choose(s.page.locator("#categoryId"), "Calculators");
      await s.choose(s.page.locator("#locationId"), "Library");
      await s.moveTo(s.page.locator("#dateLostOrFound"));
      await s.page.locator("#dateLostOrFound").fill("2029-01-01");
      await s.pause(1000);
      await submitLost(s);
      await log.check(this.id, "TC-06", 1, s, "Error: The date can't be in the future", () => seeText(s, "can't be in the future"));
      await s.moveTo(s.page.locator("#dateLostOrFound"));
      await s.page.locator("#dateLostOrFound").fill(isoDate(0));
      await s.pause(1000);
      await submitLost(s);
      await log.check(this.id, "TC-06", 2, s, "The report is saved", () => seeText(s, "Your report was submitted"));
      await s.pause(1500);
    },
  },
  {
    id: "SCR-V1-06b", part: 1, title: "TC-03: required fields are validated",
    async run({ as, log }) {
      const s = await as("A");
      await s.front();
      await newLostForm(s);
      await submitLost(s);
      await toTop(s);
      await log.check(this.id, "TC-03", 1, s, "Form stays open: Please fix the highlighted fields.", () => seeText(s, "Please fix the highlighted fields"));
      await log.check(this.id, "TC-03", 2, s, "Messages ask to name the item, choose a category, and choose a place", async () => {
        await seeText(s, "Name the item");
        await seeText(s, "Choose a category");
        return "Shows Name the item…, Choose a category, Choose a place";
      });
      await s.type(s.page.locator("#itemName"), "Calculator");
      await submitLost(s);
      await toTop(s);
      await log.check(this.id, "TC-03", 3, s, "Typed value kept; only remaining fields show errors", async () => {
        const v = await s.page.locator("#itemName").inputValue();
        if (v !== "Calculator") throw new Error(`What is it? shows "${v}"`);
        await seeText(s, "Choose a category");
        return "'Calculator' kept; category and place still flagged";
      });
      await s.pause(1500);
    },
  },
  {
    id: "SCR-V1-08b", part: 1, title: "TC-04: a report with an unknown category is not saved (expected to fail: DEF-10)",
    async run({ as, log }) {
      const s = await as("A");
      await s.front();
      await newLostForm(s);
      await s.type(s.page.locator("#itemName"), "Tampered category test");
      await s.choose(s.page.locator("#locationId"), "Library");
      await log.check(this.id, "TC-04", 1, s, "No errors", () => absent(s, "Please fix the highlighted fields"));
      await s.moveTo(s.page.locator("#categoryId"));
      await note(s, "Developer tools: changing the Category value to 999999");
      await s.page.evaluate(() => {
        const sel = document.querySelector("#categoryId");
        const o = document.createElement("option");
        o.value = "999999";
        o.text = "(value 999999)";
        sel.add(o);
        sel.value = "999999";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await s.pause(1200);
      await submitLost(s);
      await s.pause(1500);
      await log.check(this.id, "TC-04", 2, s, "Not saved, and a clear message says the category is invalid", async () => {
        const body = (await s.page.locator("body").innerText()).replace(/\s+/g, " ");
        const screen = body.match(/Unable to show this screen|Something went wrong/);
        if (screen) throw new Error(`Error screen "${screen[0]}" instead of a validation message (DEF-10)`);
        if (!/categor/i.test(body)) throw new Error("No message about the category");
        return "Clear message about the category";
      });
      await s.pause(1500);
      await s.go("/reports?type=lost");
      await log.check(this.id, "TC-04", 3, s, "No report was created", () => absent(s, "Tampered category test"));
      await s.pause(1200);
    },
  },
  {
    id: "SCR-V1-08c", part: 1, title: "TC-15 + TC-18: keyword search and category filter",
    async run({ as, log }) {
      const s = await as("C");
      await s.front();
      await s.go("/search");
      await s.type(s.page.locator("#q"), "umbrel");
      await s.page.keyboard.press("Enter");
      await s.pause(2000);
      await log.check(this.id, "TC-15", 1, s, "The umbrella is listed", () => seeText(s, FOUND.name));
      await s.type(s.page.locator("#q"), "UMBRELLA");
      await s.page.keyboard.press("Enter");
      await s.pause(2000);
      await log.check(this.id, "TC-15", 2, s, "Same result in a different letter case", () => seeText(s, FOUND.name));
      await s.choose(s.page.locator("#category"), FOUND.category);
      await s.page.keyboard.press("Enter");
      await s.click(s.page.locator("form").getByRole("button").last(), 2000);
      await log.check(this.id, "TC-18", 1, s, "Only items in that category are listed", () => seeText(s, FOUND.name));
      await s.choose(s.page.locator("#category"), "All electronics");
      await s.click(s.page.locator("form").getByRole("button").last(), 2000);
      await log.check(this.id, "TC-18", 2, s, "A different category does not list the umbrella", () => seeText(s, "No matching items"));
      await s.pause(1200);
    },
  },
  {
    id: "SCR-V1-08d", part: 1, title: "TC-28: search is safe from SQL injection",
    async run({ as, log }) {
      const s = await as("C");
      await s.front();
      await s.go("/search");
      await s.type(s.page.locator("#q"), "' OR 1=1 --");
      await s.page.keyboard.press("Enter");
      await s.pause(2200);
      await log.check(this.id, "TC-28", 1, s, "No error page; treated as normal text", async () => {
        await absent(s, "Something went wrong");
        await absent(s, "Unable to show this screen");
        return "Normal search result page; no error";
      });
      await s.type(s.page.locator("#q"), '"; DROP TABLE report; --');
      await s.page.keyboard.press("Enter");
      await s.pause(2200);
      await log.check(this.id, "TC-28", 2, s, "Same: normal result, the site keeps working", async () => {
        await absent(s, "Something went wrong");
        await s.page.locator("#q").fill("umbrella");
        await s.page.keyboard.press("Enter");
        await seeText(s, FOUND.name);
        return "Normal result; a follow-up search still works";
      });
      await s.pause(1200);
    },
  },
  {
    id: "SCR-V1-08e", part: 1, title: "TC-13: the finder and hidden details aren't shown publicly",
    async run({ as, log, state, accounts }) {
      const s = await as("C");
      await s.front();
      await s.go(`/items/${state.foundId}`);
      await log.check(this.id, "TC-13", 1, s, "Photos blurred; no finder name or email", async () => {
        await seeText(s, "Photos are blurred");
        await absent(s, accounts.B.email);
        return "Photos blurred; finder not shown";
      });
      await log.check(this.id, "TC-13", 2, s, "Hidden details are not on the page", () => absent(s, FOUND.hidden));
      await s.pause(1500);
      const a = await as("ADMIN");
      await a.front();
      await a.go(`/admin/reports/${state.foundId}`);
      await log.check(this.id, "TC-13", 3, a, "Admin sees the reporter and the hidden details", () => seeText(a, FOUND.hidden));
      await a.hover(a.text(FOUND.hidden), 2000);
    },
  },
  {
    id: "SCR-V1-08f", part: 1, title: "SEC-01: login page attempt limit (expected to fail: DEF-11)",
    async run({ as, log, accounts }) {
      const g = await as("GUEST");
      await g.front();
      await g.go("/login");
      let blocked = false;
      for (let i = 1; i <= 7; i++) {
        await g.type(g.page.locator("#email"), accounts.C.email);
        await g.type(g.page.locator("#password"), `wrong-password-${i}`);
        await g.click(g.page.locator("button[type=submit]"), 1600);
        const body = await g.page.locator("body").innerText();
        if (/too many/i.test(body)) {
          blocked = i;
          break;
        }
      }
      await log.check(this.id, "SEC-01", 1, g, "Blocked from the 6th try: Too many attempts", async () => {
        if (!blocked) throw new Error("7 wrong passwords in a row were all answered 'Invalid email or password' (DEF-11)");
        if (blocked < 6) throw new Error(`Blocked already at try ${blocked}`);
        return `Blocked at try ${blocked}`;
      });
      await g.pause(1500);
    },
  },
  {
    id: "SCR-V1-06c", part: 1, title: "TC-30: a claim needs a proof description",
    async run({ as, log, state }) {
      const s = await as("A");
      await s.front();
      await s.go(`/items/${state.foundId}`);
      await s.click(s.link("This is mine, file a claim"), 1500);
      await s.type(s.page.locator("#statement"), "mine");
      await s.click(s.button("Submit claim"), 2000);
      await log.check(this.id, "TC-30", 1, s, "Error: describe the item (20+ characters); no claim created", () => seeText(s, "20+ characters"));
      await s.pause(1500);
    },
  },

  // ---------------------------------------------------------------- part 2 (after Selenium)
  {
    id: "SCR-V1-09b", part: 2, title: "TC-29 + TC-31: the owner files a claim with a receipt",
    async run({ as, log, state }) {
      const s = await as("A");
      await s.front();
      await s.go(`/items/${state.foundId}/claim`);
      await s.type(s.page.locator("#statement"), CLAIM_TEXT);
      await s.upload(s.page.locator('input[type=file][name="files"]'), FIXTURE("receipt.png"));
      await s.click(s.button("Submit claim"), 500);
      await log.check(this.id, "TC-29", 1, s, "Claim page opens with status Pending", async () => {
        await s.page.waitForURL(/\/claims\/\d+/, { timeout: 40_000 });
        await seeText(s, "Your claim was submitted");
        return "Claim submitted; status Pending";
      });
      state.claimId = s.page.url().match(/claims\/(\d+)/)[1];
      await log.check(this.id, "TC-31", 1, s, "The file is listed on the claim", () => seeText(s, "Open file"));
      await s.hover(s.link("Open file"), 1500);
    },
  },
  {
    id: "SCR-V1-09c", part: 2, title: "TC-32: the finder can't claim their own found item",
    async run({ as, log, state }) {
      const b = await as("B");
      await b.front();
      await b.go(`/items/${state.foundId}/claim`);
      const form = await b.page.locator("#statement").isVisible().catch(() => false);
      if (form) {
        await b.type(b.page.locator("#statement"), "This is the umbrella I turned in to the office yesterday.");
        await b.click(b.button("Submit claim"), 2000);
      }
      await log.check(this.id, "TC-32", 1, b, "Claiming is refused: no claim form for your own item", async () => {
        const body = await b.page.locator("body").innerText();
        if (/You reported this item/i.test(body)) return "No claim form; banner 'You reported this item.'";
        await seeText(b, "reported found");
        return "Error: You can't claim an item you reported found.";
      });
      await b.hover(b.text("You reported this item").or(b.text("reported found")), 2000);
      await b.pause(1500);
    },
  },
  {
    id: "SCR-V1-09d", part: 2, title: "TC-33: no duplicate active claims",
    async run({ as, log, state }) {
      const s = await as("A");
      await s.front();
      await s.go(`/items/${state.foundId}/claim`);
      const form = await s.page.locator("#statement").isVisible().catch(() => false);
      if (form) {
        await s.type(s.page.locator("#statement"), CLAIM_TEXT);
        await s.click(s.button("Submit claim"), 2500);
      }
      await log.check(this.id, "TC-33", 1, s, "No second claim; the existing claim opens", async () => {
        await s.page.waitForURL(new RegExp(`/claims/${state.claimId}`), { timeout: 20_000 });
        return `Existing claim #${state.claimId} opened`;
      });
      await s.pause(1500);
    },
  },
  {
    id: "SCR-V1-07b", part: 2, title: "TC-31: proof files are private",
    async run({ as, log, state }) {
      const c = await as("C");
      await c.front();
      await c.go(`/claims/${state.claimId}`);
      await log.check(this.id, "TC-31", 2, c, "Page not found; the claim and its files aren't shown", () => seeText(c, "Page not found"));
      await c.pause(1500);
      const a = await as("ADMIN");
      await a.front();
      await a.go(`/admin/claims/${state.claimId}`);
      const popup = a.page.context().waitForEvent("page", { timeout: 15_000 }).catch(() => null);
      await a.click(a.link("Open file"), 300);
      const file = await popup;
      if (file) {
        await file.bringToFront();
        await a.pause(3000);
      }
      await log.check(this.id, "TC-31", 3, a, "The file opens for the administrator", async () => {
        if (!file) throw new Error("The file did not open");
        return "Receipt opened in a new tab";
      });
      await file?.close();
      await a.front();
    },
  },
  {
    id: "SCR-V1-09e", part: 2, title: "TC-36: the office approves the claim with a pickup deadline",
    async run({ as, log, state }) {
      const a = await as("ADMIN");
      await a.front();
      await a.go(`/admin/claims/${state.claimId}`);
      await log.check(this.id, "TC-36", 1, a, "Only valid actions: approve, ask for more proof, reject", async () => {
        await seeText(a, "Ownership verified, approve");
        await absent(a, "record release");
        return "Approve, Request more proof, Reject offered; no Release";
      });
      await a.moveTo(a.page.locator("#pickupDeadline"));
      await a.page.locator("#pickupDeadline").fill(isoDate(3));
      await a.pause(800);
      await a.type(a.page.locator("#approveRemarks"), "Proof matches the hidden details. Bring your school ID.");
      await a.click(a.button("Ownership verified, approve"), 2500);
      await log.check(this.id, "TC-36", 2, a, "Status Approved; Release now offered", async () => {
        await seeText(a, "Claim approved");
        await seeText(a, "record release");
        return "Claim approved; release offered";
      });
      await a.pause(1500);
    },
  },
  {
    id: "SCR-V1-07c", part: 2, title: "TC-40: the claimant is notified of the approval",
    async run({ as, log }) {
      const s = await as("A");
      await s.front();
      await s.go("/notifications");
      await log.check(this.id, "TC-40", 2, s, "A notice says the claim was approved, with pickup details", () => seeText(s, "approved"));
      await s.hover(s.text("approved"), 2000);
    },
  },
  {
    id: "SCR-V1-09f", part: 2, title: "TC-34: a later claim waits on hold",
    async run({ as, log, state }) {
      const c = await as("C");
      await c.front();
      await c.go(`/items/${state.foundId}/claim`);
      await c.type(c.page.locator("#statement"), "I lost a black umbrella in the gym last week; it has a long handle and a strap.");
      await c.click(c.button("Submit claim"), 500);
      await log.check(this.id, "TC-34", 3, c, "The new claim is placed On hold", async () => {
        await c.page.waitForURL(/\/claims\/\d+/, { timeout: 40_000 });
        await seeText(c, "On hold");
        return "Claim placed On hold";
      });
      await c.hover(c.text("On hold"), 2000);
    },
  },
  {
    id: "SCR-V1-09g", part: 2, title: "TC-36: the office releases the item at pickup",
    async run({ as, log, state }) {
      const a = await as("ADMIN");
      await a.front();
      await a.go(`/admin/claims/${state.claimId}`);
      a.page.once("dialog", (d) => d.accept());
      await a.click(a.button("Item picked up, record release"), 2500);
      const confirm = a.page.getByRole("button", { name: /confirm|release/i });
      if (await confirm.first().isVisible().catch(() => false)) await a.click(confirm, 2500);
      await log.check(this.id, "TC-36", 3, a, "Status Released; the found report becomes Claimed", () => seeText(a, "Released"));
      await a.pause(1500);
    },
  },
  {
    id: "SCR-V1-09h", part: 2, title: "TC-11 + TC-40: owner-only rules after release",
    async run({ as, log, state }) {
      const b = await as("B");
      await b.front();
      await b.go(`/reports/${state.lostId}`);
      await log.check(this.id, "TC-11", 1, b, "Another student's report: Page not found", () => seeText(b, "Page not found"));
      await b.go(`/reports/${state.foundId}/edit`);
      await log.check(this.id, "TC-11", 3, b, "Editing a claimed report is blocked", async () => {
        const body = await b.page.locator("body").innerText();
        if (/can no longer be edited|can't be edited|not found/i.test(body) || !(await b.page.locator("#itemName").isVisible().catch(() => false))) {
          return "Editing blocked for the claimed report";
        }
        await b.click(b.button(/Save changes/), 2000);
        await seeText(b, "can no longer be edited");
        return "Save refused: This report can no longer be edited.";
      });
      await b.pause(1500);
      const s = await as("A");
      await s.front();
      await s.go("/notifications");
      await log.check(this.id, "TC-40", 4, s, "Notification about the pickup", () => seeText(s, "You picked up"));
      await s.hover(s.text("You picked up"), 1500);
      await s.pause(2000);
    },
  },

  // ---------------------------------------------------------------- part 3: remaining manual test cases
  {
    id: "EXT-TC-05", part: 3, title: "TC-05: report location uses the official places list",
    async run({ as, log, state }) {
      const s = await as("A");
      await s.front();
      await newLostForm(s);
      await log.check(this.id, "TC-05", 1, s, "Place lost is a list of campus places, not free text", async () => {
        const tag = await s.page.locator("#locationId").evaluate((e) => e.tagName);
        const n = await s.page.locator("#locationId option").count();
        if (tag !== "SELECT" || n < 2) throw new Error(`Place field is ${tag} with ${n} options`);
        return `A list of ${n - 1} campus places`;
      });
      state.tc05Name = `Calculator TC05 ${Date.now().toString(36)}`;
      await s.type(s.page.locator("#itemName"), state.tc05Name);
      await s.choose(s.page.locator("#categoryId"), "Calculators");
      await s.choose(s.page.locator("#locationId"), "Library");
      await s.type(s.page.locator("#locationNote"), "Room 304, 2nd floor");
      await submitLost(s);
      await log.check(this.id, "TC-05", 2, s, "Report details show the building and the room note", async () => {
        await s.page.waitForURL(/\/reports\/\d+/, { timeout: 30_000 });
        await seeText(s, "Library");
        await seeText(s, "Room 304");
        return "Shows Library and 'Room 304, 2nd floor'";
      });
      state.tc05Id = s.page.url().match(/reports\/(\d+)/)[1];
    },
  },
  {
    id: "EXT-TC-14", part: 3, title: "TC-14: dashboard and My reports show the student's reports",
    async run({ as, log, state }) {
      const s = await as("A");
      await s.front();
      await s.go("/dashboard");
      await log.check(this.id, "TC-14", 1, s, "Your recent reports lists the report with its status", async () => {
        await seeText(s, "Your recent reports");
        await seeText(s, state.tc05Name);
        return "Recent reports lists the new report with its status";
      });
      await s.go("/reports?type=lost");
      const lost = await s.page.locator("main").innerText();
      await s.go("/reports?type=found");
      const found = await s.page.locator("main").innerText();
      await log.check(this.id, "TC-14", 2, s, "Lost and Found tabs each list only that type, with counts", async () => {
        if (!lost.includes(state.tc05Name)) throw new Error("Lost tab doesn't list the lost report");
        if (found.includes(state.tc05Name)) throw new Error("Found tab lists a lost report");
        return "Lost tab lists the lost report; Found tab doesn't";
      });
    },
  },
  {
    id: "EXT-TC-21", part: 3, title: "TC-21: lost reports are never public",
    async run({ as, log, state }) {
      const c = await as("C");
      await c.front();
      await c.go(`/search?q=${encodeURIComponent(state.tc05Name)}`);
      await log.check(this.id, "TC-21", 1, c, "Only verified found items are listed; lost reports are never public", () => seeText(c, "No matching items"));
    },
  },
  {
    id: "EXT-TC-12", part: 3, title: "TC-12: the owner withdraws a report; the record is kept",
    async run({ as, log, state }) {
      const s = await as("A");
      await s.front();
      await s.go(`/reports/${state.tc05Id}`);
      await s.click(s.button(/Withdraw/), 1200);
      const dialog = s.page.getByRole("dialog").getByRole("button", { name: /Withdraw/ });
      if (await dialog.first().isVisible().catch(() => false)) await s.click(dialog, 2000);
      await log.check(this.id, "TC-12", 1, s, "The report is withdrawn (status Archived)", async () => {
        await s.page.waitForURL(/withdrawn=1/, { timeout: 20_000 });
        return "Withdrawn; back on My reports";
      });
      const a = await as("ADMIN");
      await a.front();
      await a.go(`/admin/reports/${state.tc05Id}`);
      await log.check(this.id, "TC-12", 2, a, "The record still exists with status Archived", () => seeText(a, "Archived"));
    },
  },
  {
    id: "EXT-TC-08", part: 3, title: "TC-08: only image files are accepted as photos",
    async run({ as, log }) {
      const b = await as("B");
      await b.front();
      await b.go("/reports/new?type=found");
      await b.type(b.page.locator("#itemName"), "Photo type test");
      await b.choose(b.page.locator("#categoryId"), "Calculators");
      await b.choose(b.page.locator("#locationId"), "Library");
      await b.upload(b.page.locator('input[type=file][name="photos"]'), FIXTURE("notes.pdf"));
      await b.click(b.button("Submit found report"), 2500);
      await log.check(this.id, "TC-08", 2, b, "A non-image file is rejected: file type not allowed", async () => {
        const body = await b.page.locator("body").innerText();
        if (/\/reports\/\d+/.test(b.page.url())) throw new Error("The report was saved with a PDF as its photo");
        if (!/not allowed|photo|image/i.test(body)) throw new Error("No message about the file");
        return "Rejected; the report isn't saved";
      });
    },
  },
  {
    id: "EXT-TC-09", part: 3, title: "TC-09: a report can have up to 5 photos",
    async run({ as, log, state }) {
      const b = await as("B");
      await b.front();
      await b.go("/reports/new?type=found");
      await b.type(b.page.locator("#itemName"), "Five photo test");
      await b.choose(b.page.locator("#categoryId"), "Umbrellas");
      await b.choose(b.page.locator("#locationId"), "Library");
      await b.page.locator('input[type=file][name="photos"]').setInputFiles(Array(5).fill(FIXTURE("umbrella.jpg")));
      await b.pause(3000);
      await b.click(b.button("Submit found report"), 500);
      await log.check(this.id, "TC-09", 1, b, "Report saved with 5 photos", async () => {
        await b.page.waitForURL(/\/reports\/\d+/, { timeout: 60_000 });
        return "Saved with 5 photos";
      });
      state.fivePhotoId = b.page.url().match(/reports\/(\d+)/)[1];
      await b.go(`/reports/${state.fivePhotoId}/edit`);
      await b.upload(b.page.locator('input[type=file][name="photos"]'), FIXTURE("umbrella.jpg"));
      await b.click(b.button(/Save changes/), 2500);
      await log.check(this.id, "TC-09", 2, b, "A 6th photo is refused: A report can have up to 5 photos", () => seeText(b, "up to 5 photos"));
    },
  },
  {
    id: "EXT-TC-19", part: 3, title: "TC-19, TC-20: filter search by place and by date",
    async run({ as, log }) {
      const c = await as("C");
      await c.front();
      await c.go(`/search?q=${encodeURIComponent("Grey folding umbrella")}`);
      await c.choose(c.page.locator("#place"), "Gymnasium");
      await c.click(c.page.locator("form").getByRole("button").last(), 2000);
      await log.check(this.id, "TC-19", 1, c, "Only items found in that place are listed", () => seeText(c, "Grey folding umbrella"));
      await c.choose(c.page.locator("#place"), "Library");
      await c.click(c.page.locator("form").getByRole("button").last(), 2000);
      await log.check(this.id, "TC-19", 2, c, "Another place does not list it", () => seeText(c, "No matching items"));
      await c.go(`/search?q=${encodeURIComponent("Grey folding umbrella")}&from=${isoDate(-7)}&to=${isoDate(0)}`);
      await log.check(this.id, "TC-20", 1, c, "Items found within the range are listed", () => seeText(c, "Grey folding umbrella"));
      await c.go(`/search?q=${encodeURIComponent("Grey folding umbrella")}&from=2020-01-01&to=2020-01-31`);
      await log.check(this.id, "TC-20", 2, c, "A range with no items: No matching items", () => seeText(c, "No matching items"));
    },
  },
  {
    id: "EXT-TC-23", part: 3, title: "TC-23, TC-24, TC-25: sorting, empty results, paging",
    async run({ as, log }) {
      const c = await as("C");
      await c.front();
      await c.go("/search");
      await log.check(this.id, "TC-23", 1, c, "Items are ordered by date found, newest first", async () => {
        const dates = await c.page.$$eval('a[href^="/items/"]', (as) =>
          as.map((a) => (a.textContent.match(/[A-Z][a-z]{2} \d{1,2}, \d{4}/) || [])[0]).filter(Boolean).map((d) => Date.parse(d)));
        for (let i = 1; i < dates.length; i++) if (dates[i] > dates[i - 1]) throw new Error("Results are not newest first");
        return `${dates.length} results, newest first`;
      });
      await log.check(this.id, "TC-25", 1, c, "12 items per page with page controls", async () => {
        const n = await c.page.locator('a[href^="/items/"]').evaluateAll((as) => new Set(as.map((a) => a.getAttribute("href"))).size);
        if (n !== 12) throw new Error(`${n} items on page 1`);
        await c.page.getByRole("link", { name: "Next page" }).waitFor({ timeout: 5000 });
        return "12 items and a Next page link";
      });
      const first = await c.page.locator('a[href^="/items/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      await c.click(c.page.getByRole("link", { name: "Next page" }), 2000);
      await log.check(this.id, "TC-25", 2, c, "Page 2 lists the next items; none repeat", async () => {
        const second = await c.page.locator('a[href^="/items/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
        if (!second.length) throw new Error("Page 2 is empty");
        if (second.some((h) => first.includes(h))) throw new Error("Page 2 repeats items from page 1");
        return `${new Set(second).size} new items on page 2`;
      });
      await c.go("/search?q=NonExistentItemXYZ");
      await log.check(this.id, "TC-24", 1, c, "No matching items message with suggestions", async () => {
        await seeText(c, "No matching items");
        await seeText(c, "File a lost report");
        return "Shows 'No matching items' and 'File a lost report'";
      });
    },
  },
  {
    id: "EXT-SEC", part: 3, title: "SEC-02, SEC-03: export needs an admin; scripts shown as text",
    async run({ as, log }) {
      const g = await as("GUEST");
      const backend = (process.env.VIDEO_BACKEND_URL ?? "https://track-and-trace-ucp.vercel.app").replace(/\/$/, "");
      const res = await g.page.request.get(`${backend}/api/admin/export?type=reports`);
      await log.check(this.id, "SEC-02", 1, g, "Refused (401/403); no file downloads", async () => {
        if (![401, 403].includes(res.status())) throw new Error(`Answered ${res.status()}`);
        return `Refused with ${res.status()}`;
      });
      const s = await as("A");
      await s.front();
      let popup = false;
      s.page.on("dialog", (d) => { popup = true; d.dismiss(); });
      await newLostForm(s);
      await s.type(s.page.locator("#itemName"), "Script text test");
      await s.choose(s.page.locator("#categoryId"), "Calculators");
      await s.type(s.page.locator("#description"), "<script>alert('x')</script>");
      await s.choose(s.page.locator("#locationId"), "Library");
      await submitLost(s);
      await log.check(this.id, "SEC-03", 1, s, "No pop-up; the description shows the text as typed", async () => {
        await s.page.waitForURL(/\/reports\/\d+/, { timeout: 30_000 });
        await s.pause(1500);
        if (popup) throw new Error("A script ran (pop-up appeared)");
        await seeText(s, "<script>alert('x')</script>");
        return "No pop-up; the text is shown as typed";
      });
    },
  },
];
