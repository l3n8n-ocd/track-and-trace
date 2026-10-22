import { env } from "@/lib/env";
import { runDailyJobs } from "@/server/daily";

export const maxDuration = 60;

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer $CRON_SECRET".
export async function GET(request: Request) {
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const summary = await runDailyJobs();
  return Response.json({ ok: true, summary });
}
