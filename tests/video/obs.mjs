// Controls the continuous OBS recording between and around recorder runs.
//   node tests/video/obs.mjs start
//   node tests/video/obs.mjs mark SCR-V2-04b "Selenium suite, visible Chrome"
//   node tests/video/obs.mjs status
//   node tests/video/obs.mjs stop Video1-raw      (stops and renames the file)
// Reads OBS_WEBSOCKET_PASSWORD from tests/video/.env.accounts.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Recorder } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(here, ".env.accounts"), quiet: true });

const [command, label, ...rest] = process.argv.slice(2);
const recorder = new Recorder("obs", path.resolve("test-results/video"));
await (await import("node:fs/promises")).mkdir(path.resolve("test-results/video"), { recursive: true });
await recorder.connect();
try {
  if (command === "start") await recorder.ensureRecording();
  else if (command === "mark" && label) await recorder.mark(label, rest.join(" "));
  else if (command === "stop") await recorder.stop(label);
  else if (command === "status") {
    const s = await recorder.obs.call("GetRecordStatus");
    console.log(s.outputActive ? `Recording: ${s.outputTimecode}` : "Not recording");
  } else {
    console.log('Usage: start | mark <clip> "<what>" | status | stop [file name]');
    process.exitCode = 1;
  }
} finally {
  await recorder.close();
}
