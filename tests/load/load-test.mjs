// Small load test for the SIA portfolio (Q4, PERF-03 / TC-26): a few virtual
// users request the Firebase front end and the backend's public page data
// for a fixed time, then the script reports response times and errors and
// checks them against the targets. Kept small on purpose so the free
// Firebase, Vercel, and TiDB plans aren't strained.
//   node tests/load/load-test.mjs
//   node tests/load/load-test.mjs --users 10 --seconds 60
// Results are printed and saved to test-results/load/.
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values: opts } = parseArgs({
  options: {
    frontend: { type: "string", default: process.env.FRONTEND_URL ?? "https://track-and-trace-bulsu-2026.web.app" },
    backend: { type: "string", default: process.env.BACKEND_URL ?? "https://track-and-trace-ucp.vercel.app" },
    users: { type: "string", default: "10" },
    seconds: { type: "string", default: "60" },
    "p95-ms": { type: "string", default: "2000" },
    "max-error-pct": { type: "string", default: "1" },
  },
});
const USERS = Number(opts.users);
const SECONDS = Number(opts.seconds);
const P95_TARGET = Number(opts["p95-ms"]);
const ERROR_TARGET = Number(opts["max-error-pct"]);

const pageData = (id) =>
  `${opts.backend.replace(/\/$/, "")}/api/client/page?id=${encodeURIComponent(id)}&params=%7B%7D&search=%7B%7D`;
const TARGETS = [
  { name: "Front end: home page (Firebase)", url: `${opts.frontend.replace(/\/$/, "")}/` },
  { name: "Front end: search page (Firebase)", url: `${opts.frontend.replace(/\/$/, "")}/search` },
  { name: "Backend: registration page data (Vercel + database)", url: pageData("(auth)/register") },
];

const results = TARGETS.map(() => ({ times: [], errors: 0, statuses: {} }));

async function hit(i) {
  const started = performance.now();
  try {
    const res = await fetch(TARGETS[i].url, { headers: { "User-Agent": "track-and-trace-load-test" } });
    await res.arrayBuffer();
    results[i].statuses[res.status] = (results[i].statuses[res.status] ?? 0) + 1;
    if (!res.ok) results[i].errors++;
  } catch {
    results[i].errors++;
    results[i].statuses.network = (results[i].statuses.network ?? 0) + 1;
  }
  results[i].times.push(performance.now() - started);
}

// Each virtual user cycles through the targets, with a short think time.
async function virtualUser(n, until) {
  let i = n % TARGETS.length;
  while (Date.now() < until) {
    await hit(i);
    i = (i + 1) % TARGETS.length;
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  }
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0);

console.log(`Load test: ${USERS} virtual users for ${SECONDS} s`);
TARGETS.forEach((t) => console.log(`  - ${t.name}: ${t.url}`));
const startedAt = new Date();
const until = Date.now() + SECONDS * 1000;
await Promise.all(Array.from({ length: USERS }, (_, n) => virtualUser(n, until)));

const rows = TARGETS.map((t, i) => {
  const sorted = [...results[i].times].sort((a, b) => a - b);
  const count = sorted.length;
  return {
    target: t.name,
    url: t.url,
    requests: count,
    errors: results[i].errors,
    errorPct: count ? (100 * results[i].errors) / count : 0,
    avgMs: count ? sorted.reduce((a, b) => a + b, 0) / count : 0,
    p50Ms: pct(sorted, 50),
    p95Ms: pct(sorted, 95),
    maxMs: sorted.at(-1) ?? 0,
    statuses: results[i].statuses,
  };
});
const all = rows.flatMap((_, i) => results[i].times).sort((a, b) => a - b);
const totalRequests = all.length;
const totalErrors = rows.reduce((a, r) => a + r.errors, 0);
const summary = {
  startedAt: startedAt.toISOString(),
  users: USERS,
  seconds: SECONDS,
  totalRequests,
  requestsPerSecond: totalRequests / SECONDS,
  p95Ms: pct(all, 95),
  errorPct: totalRequests ? (100 * totalErrors) / totalRequests : 0,
  targets: { p95Ms: P95_TARGET, maxErrorPct: ERROR_TARGET },
};
summary.passed = summary.p95Ms <= P95_TARGET && summary.errorPct <= ERROR_TARGET;

const ms = (v) => `${Math.round(v)} ms`;
console.log("");
console.table(rows.map((r) => ({ target: r.target, requests: r.requests, errors: r.errors, avg: ms(r.avgMs), p50: ms(r.p50Ms), p95: ms(r.p95Ms), max: ms(r.maxMs) })));
console.log(`Total: ${totalRequests} requests, ${summary.requestsPerSecond.toFixed(1)}/s, p95 ${ms(summary.p95Ms)}, errors ${summary.errorPct.toFixed(2)}%`);
console.log(`Targets: p95 <= ${P95_TARGET} ms and errors <= ${ERROR_TARGET}%  =>  ${summary.passed ? "PASS" : "FAIL"}`);

const md = [
  `# Load test results`,
  ``,
  `- Started: ${startedAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (Philippine time)`,
  `- Load: ${USERS} virtual users for ${SECONDS} seconds`,
  `- Targets: p95 response time <= ${P95_TARGET} ms; error rate <= ${ERROR_TARGET}%`,
  `- Result: **${summary.passed ? "PASS" : "FAIL"}** (p95 ${ms(summary.p95Ms)}, errors ${summary.errorPct.toFixed(2)}%, ${totalRequests} requests)`,
  ``,
  `| Target | Requests | Errors | Average | p50 | p95 | Max |`,
  `|---|---|---|---|---|---|---|`,
  ...rows.map((r) => `| ${r.target} | ${r.requests} | ${r.errors} | ${ms(r.avgMs)} | ${ms(r.p50Ms)} | ${ms(r.p95Ms)} | ${ms(r.maxMs)} |`),
  ``,
].join("\n");
await mkdir("test-results/load", { recursive: true });
const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
await writeFile(`test-results/load/load-test-${stamp}.json`, JSON.stringify({ summary, rows }, null, 2));
await writeFile(`test-results/load/load-test-${stamp}.md`, md);
console.log(`Saved test-results/load/load-test-${stamp}.md`);
process.exitCode = summary.passed ? 0 : 1;
