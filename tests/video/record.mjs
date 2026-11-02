// Runs the screen-recorded test clips against the live site.
//   node tests/video/record.mjs --list
//   node tests/video/record.mjs --part 1            (before the Selenium run)
//   node tests/video/record.mjs --part 2            (the claim story, after Selenium)
//   node tests/video/record.mjs --only SCR-V1-08a,SCR-V1-06a
// Options: --mode obs|none|video (default obs; none = rehearsal without recording),
// --speed 1 (higher = slower).
// Accounts come from tests/video/.env.accounts; see README.md.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { CLIPS } from "./clips.mjs";
import { Recorder, Session, StepLog, sleep } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(here, ".env.accounts"), quiet: true });

const { values: opts } = parseArgs({
  options: {
    list: { type: "boolean" },
    part: { type: "string" },
    only: { type: "string" },
    mode: { type: "string", default: process.env.VIDEO_MODE ?? "obs" },
    speed: { type: "string", default: "1" },
    base: { type: "string", default: process.env.VIDEO_BASE_URL ?? "https://track-and-trace-bulsu-2026.web.app" },
    out: { type: "string", default: "test-results/video" },
  },
});

if (opts.list) {
  for (const c of CLIPS) console.log(`${c.id}  (part ${c.part})  ${c.title}`);
  process.exit(0);
}

const env = (k) => process.env[k] ?? "";
const accounts = {
  A: { key: "A", label: "STUDENT-A", email: env("TT_STUDENT_A_EMAIL"), password: env("TT_STUDENT_A_PASSWORD") },
  B: { key: "B", label: "STUDENT-B", email: env("TT_STUDENT_B_EMAIL"), password: env("TT_STUDENT_B_PASSWORD") },
  C: { key: "C", label: "STUDENT-C", email: env("TT_STUDENT_C_EMAIL"), password: env("TT_STUDENT_C_PASSWORD") },
  ADMIN: { key: "ADMIN", label: "ADMIN", email: env("TT_ADMIN_EMAIL"), password: env("TT_ADMIN_PASSWORD") },
  GUEST: { key: "GUEST", label: "logged out" },
};
const missing = ["A", "B", "C", "ADMIN"].filter((k) => !accounts[k].email || !accounts[k].password);
if (missing.length) {
  console.error(`Missing account settings for ${missing.join(", ")} in tests/video/.env.accounts (see README.md).`);
  process.exit(1);
}

let clips = CLIPS;
if (opts.part) clips = clips.filter((c) => String(c.part) === opts.part);
if (opts.only) {
  const ids = opts.only.split(",").map((s) => s.trim());
  clips = CLIPS.filter((c) => ids.includes(c.id));
}
if (!clips.length) {
  console.error("No clips selected. Use --list to see them.");
  process.exit(1);
}

const outDir = path.resolve(opts.out);
const runDir = path.join(outDir, `run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`);
await mkdir(runDir, { recursive: true });
// IDs created in one run (the found report, the claim) are reused by later runs.
const statePath = path.join(outDir, "state.json");
const state = JSON.parse(await readFile(statePath, "utf8").catch(() => "{}"));

const session = new Session({ base: opts.base, mode: opts.mode, outDir: runDir, slowMo: Number(opts.speed) });
const recorder = new Recorder(opts.mode);
const log = new StepLog(runDir);
await recorder.connect();
await session.start();

console.log(`Recording ${clips.length} clip(s) against ${opts.base} (${opts.mode} mode). Output: ${runDir}\n`);
try {
  for (const clip of clips) {
    console.log(`\n${clip.id}: ${clip.title}`);
    // Log in every account the clip uses before recording starts.
    const used = clip.run.toString().match(/as\("(\w+)"\)/g)?.map((m) => m.slice(4, -2)) ?? [];
    for (const key of used) await session.as(accounts[key]);
    const firstActor = session.contexts.get(used[0]);
    if (firstActor) await firstActor.front();
    await recorder.start(clip.id);
    try {
      await clip.run({ as: (key) => session.as(accounts[key]), log, state, accounts });
    } catch (error) {
      console.error(`  Stopped: ${String(error.message ?? error).split("\n")[0]}`);
      log.rows.push({ clip: clip.id, tc: "-", step: "-", account: "-", expected: "Clip runs to the end", actual: String(error.message ?? error).split("\n")[0], status: "Fail", screenshot: "" });
    }
    await recorder.stop(clip.id);
    await writeFile(statePath, JSON.stringify(state, null, 2));
    if (opts.mode === "video") {
      // Built-in recording: one file per window, named after the clip.
      const actors = [...session.contexts.values()];
      const videos = actors.map((a) => [a.account.key, a.page.video()]);
      for (const a of actors) await a.page.context().close();
      session.contexts.clear();
      for (const [key, video] of videos) {
        const src = await video?.path().catch(() => null);
        if (src) await rename(src, path.join(runDir, `${clip.id}_${key}.webm`)).catch(() => {});
      }
    }
    await sleep(1000);
  }
} finally {
  await log.save();
  await session.stop();
  await recorder.close();
}

const failed = log.rows.filter((r) => r.status === "Fail");
console.log(`\nDone. ${log.rows.length} steps checked, ${failed.length} failed.`);
for (const r of failed) console.log(`  FAIL ${r.tc} step ${r.step}: ${r.actual}`);
console.log(`Execution log: ${path.join(runDir, "execution-log.md")}`);
