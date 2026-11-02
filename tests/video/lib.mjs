// Shared pieces for the screen-recorded test runs: a visible browser with an
// on-screen pointer, human-paced actions, a step log with screenshots, and
// optional OBS control. See tests/video/README.md.
import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
// VIDEO_PLAYWRIGHT can point at another Playwright install whose browsers and
// video encoder are already downloaded.
const { chromium } = await import(process.env.VIDEO_PLAYWRIGHT ?? "@playwright/test");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A pointer drawn into every page, since the real mouse doesn't move when
// the browser is driven by a script. Clicks show a short ripple.
const POINTER = () => {
  if (window.__ttPointer) return;
  window.__ttPointer = true;
  const add = () => {
    const dot = document.createElement("div");
    dot.id = "__tt-pointer";
    dot.innerHTML =
      '<svg width="26" height="30" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L21 17 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    Object.assign(dot.style, {
      position: "fixed", left: "-40px", top: "-40px", zIndex: 2147483647, pointerEvents: "none",
      transition: "transform 0.08s", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))",
    });
    document.documentElement.appendChild(dot);
    window.addEventListener("mousemove", (e) => {
      dot.style.left = `${e.clientX - 2}px`;
      dot.style.top = `${e.clientY - 2}px`;
    }, true);
    window.addEventListener("mousedown", (e) => {
      dot.style.transform = "scale(0.85)";
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        position: "fixed", left: `${e.clientX - 18}px`, top: `${e.clientY - 18}px`, width: "36px", height: "36px",
        borderRadius: "50%", border: "3px solid rgba(220,38,38,.8)", zIndex: 2147483646, pointerEvents: "none",
        transition: "transform .45s ease-out, opacity .45s ease-out",
      });
      document.documentElement.appendChild(ring);
      requestAnimationFrame(() => { ring.style.transform = "scale(1.8)"; ring.style.opacity = "0"; });
      setTimeout(() => ring.remove(), 500);
    }, true);
    window.addEventListener("mouseup", () => { dot.style.transform = ""; }, true);
  };
  if (document.documentElement) add();
  else document.addEventListener("DOMContentLoaded", add);
};

// Address bar stand-in for built-in video mode, where the browser's own
// address bar isn't part of the recording.
const URL_BAR = () => {
  const show = () => {
    let bar = document.getElementById("__tt-url");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "__tt-url";
      Object.assign(bar.style, {
        position: "fixed", right: "10px", bottom: "10px", zIndex: 2147483645, pointerEvents: "none",
        font: "12px/1.4 ui-monospace,Consolas,monospace", background: "rgba(17,17,17,.75)", color: "#fff",
        padding: "4px 8px", borderRadius: "6px",
      });
      document.documentElement.appendChild(bar);
    }
    bar.textContent = location.href;
  };
  setInterval(show, 400);
};

export class Session {
  constructor({ base, mode, outDir, slowMo = 1 }) {
    this.base = base.replace(/\/$/, "");
    // "obs": visible Chrome, OBS records the screen; "none": visible Chrome,
    // nothing recorded (rehearsal); "video": built-in recording, no window.
    this.mode = mode;
    this.outDir = outDir;
    this.speed = slowMo;
    this.contexts = new Map();
    this.log = [];
  }

  async start() {
    const headed = this.mode !== "video";
    const launch = {
      headless: !headed,
      args: headed ? ["--start-maximized", "--disable-infobars"] : [],
      ignoreDefaultArgs: ["--enable-automation"],
    };
    // Prefer an installed Google Chrome (it has an address bar and no download
    // is needed); VIDEO_BROWSER_PATH points at a specific browser instead.
    const executablePath = process.env.VIDEO_BROWSER_PATH || undefined;
    try {
      this.browser = await chromium.launch({ ...launch, executablePath, channel: executablePath ? undefined : (process.env.VIDEO_BROWSER_CHANNEL ?? "chrome") });
    } catch {
      this.browser = await chromium.launch({ ...launch, executablePath });
    }
  }

  // One browser context (its own window) per account, logged in off camera.
  async as(account) {
    if (this.contexts.has(account.key)) return this.contexts.get(account.key);
    const options = this.mode !== "video"
      ? { viewport: null }
      : { viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(this.outDir, "_raw"), size: { width: 1280, height: 720 } } };
    const context = await this.browser.newContext(options);
    await context.addInitScript(POINTER);
    if (this.mode === "video") await context.addInitScript(URL_BAR);
    const page = await context.newPage();
    if (account.email) {
      await page.goto(`${this.base}/login`, { waitUntil: "networkidle" });
      await page.fill("#email", account.email);
      await page.fill("#password", account.password);
      await page.click("button[type=submit]");
      await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
    } else {
      await page.goto(`${this.base}/`, { waitUntil: "networkidle" });
    }
    const actor = new Actor(this, account, page);
    this.contexts.set(account.key, actor);
    return actor;
  }

  async stop() {
    for (const actor of this.contexts.values()) await actor.page.context().close();
    await this.browser?.close();
  }
}

// Human-paced actions for one account's window, with a step log.
export class Actor {
  constructor(session, account, page) {
    this.s = session;
    this.account = account;
    this.page = page;
  }

  pause(ms = 700) {
    return sleep(ms * this.s.speed);
  }

  async front() {
    await this.page.bringToFront();
    await this.pause(500);
  }

  async go(pathname) {
    await this.page.goto(this.s.base + pathname, { waitUntil: "networkidle" });
    await this.pause(900);
  }

  async moveTo(locator) {
    await locator.first().scrollIntoViewIfNeeded();
    const box = await locator.first().boundingBox();
    if (!box) throw new Error("Element is not visible on the page");
    const x = box.x + Math.min(box.width / 2, 40 + Math.random() * 20);
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y, { steps: 18 });
    await this.pause(250);
    return { x, y };
  }

  async click(locator, after = 900) {
    await this.moveTo(locator);
    await locator.first().click();
    await this.pause(after);
  }

  async type(locator, text) {
    await this.click(locator, 200);
    await locator.first().fill("");
    await this.page.keyboard.type(text, { delay: 55 * this.s.speed });
    await this.pause(400);
  }

  async choose(selectLocator, label) {
    await this.moveTo(selectLocator);
    await selectLocator.first().selectOption({ label });
    await this.pause(700);
  }

  async upload(inputLocator, file) {
    await inputLocator.first().setInputFiles(file);
    await this.pause(1500);
  }

  async hover(locator, ms = 1500) {
    await this.moveTo(locator);
    await this.pause(ms);
  }

  text(t) {
    return this.page.getByText(t, { exact: false });
  }

  button(name) {
    return this.page.getByRole("button", { name });
  }

  link(name) {
    return this.page.getByRole("link", { name });
  }
}

// Step log: every step's expected and actual result, with a screenshot.
export class StepLog {
  constructor(outDir) {
    this.outDir = outDir;
    this.rows = [];
  }

  async check(clip, tc, step, actor, expected, fn) {
    const row = { clip, tc, step, account: actor.account.label, expected, actual: "", status: "Pass", screenshot: "" };
    try {
      row.actual = (await fn()) ?? expected;
    } catch (error) {
      row.status = "Fail";
      row.actual = String(error.message ?? error).split("\n")[0].slice(0, 300);
    }
    const shot = `${clip}_${tc}_step${step}.png`.replace(/[^\w.-]/g, "_");
    await mkdir(path.join(this.outDir, "screenshots"), { recursive: true });
    await actor.page.screenshot({ path: path.join(this.outDir, "screenshots", shot) }).catch(() => {});
    row.screenshot = `screenshots/${shot}`;
    this.rows.push(row);
    console.log(`  ${row.status === "Pass" ? "PASS" : "FAIL"}  ${tc} step ${step}: ${row.actual}`);
    return row.status === "Pass";
  }

  async save() {
    const md = [
      "# Test execution log",
      "",
      "Use this to mark each step in Zephyr's Test Player (status, actual result, screenshot).",
      "",
      "| Clip | Test case | Step | Account | Expected | Actual | Status | Screenshot |",
      "|---|---|---|---|---|---|---|---|",
      ...this.rows.map((r) => `| ${r.clip} | ${r.tc} | ${r.step} | ${r.account} | ${r.expected} | ${r.actual.replace(/\|/g, "/")} | **${r.status}** | ${r.screenshot} |`),
      "",
    ].join("\n");
    await writeFile(path.join(this.outDir, "execution-log.md"), md);
    await writeFile(path.join(this.outDir, "execution-log.json"), JSON.stringify(this.rows, null, 2));
  }
}

// OBS control through its WebSocket server (OBS → Tools → WebSocket Server Settings).
export class Recorder {
  constructor(mode) {
    this.mode = mode;
  }

  async connect() {
    if (this.mode !== "obs") return;
    const { default: OBSWebSocket } = await import("obs-websocket-js");
    this.obs = new OBSWebSocket();
    await this.obs.connect(process.env.OBS_WEBSOCKET_URL ?? "ws://127.0.0.1:4455", process.env.OBS_WEBSOCKET_PASSWORD);
  }

  async start(clip) {
    if (this.mode !== "obs") return;
    await this.obs.call("StartRecord");
    await sleep(1500);
    console.log(`● recording ${clip}`);
  }

  // Stops OBS and renames its file to the clip ID, in OBS's recording folder.
  async stop(clip) {
    if (this.mode !== "obs") return null;
    await sleep(1500);
    const { outputPath } = await this.obs.call("StopRecord");
    await sleep(1500);
    if (!outputPath) return null;
    const target = path.join(path.dirname(outputPath), `${clip}${path.extname(outputPath)}`);
    await rename(outputPath, target).catch(() => {});
    console.log(`■ saved ${target}`);
    return target;
  }

  async close() {
    await this.obs?.disconnect();
  }
}

// Built-in video mode: Playwright writes one file per page; give them clip names.
export async function nameRawVideos(outDir, clip, pages) {
  const names = [];
  for (const [i, page] of pages.entries()) {
    const video = page.video();
    if (!video) continue;
    const src = await video.path().catch(() => null);
    if (!src) continue;
    names.push({ src, dst: path.join(outDir, `${clip}${pages.length > 1 ? `_${i + 1}` : ""}.webm`) });
  }
  return names;
}

export async function listFiles(dir) {
  return (await readdir(dir).catch(() => [])).sort();
}
