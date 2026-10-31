import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { clientOrigin, withClientCors } from "@/lib/client-origin";
import { env } from "@/lib/env";
import { getSessionUser, withClientSession, type SessionUser } from "@/lib/session";
import { clientPages } from "@/server/client-registry.generated";
import { clientActions } from "@/server/client-actions.generated";
import { adminClaimCounts, pendingMatchCount, pendingReportCount } from "@/server/counts";
import { clientData, decodeAction, isMissing, redirectFromError } from "@/server/client-protocol";
import { GET as proofDownload } from "@/app/api/files/proof/[id]/route";
import { GET as adminDownload } from "@/app/api/admin/export/route";
import { GET as personalDownload } from "@/app/api/me/export/route";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };

function json(request: Request, value: unknown, status = 200) {
  return withClientCors(request, Response.json(value, { status }));
}
function originDenied(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && !clientOrigin(origin));
}
function failure(request: Request, error: unknown) {
  const redirect = redirectFromError(error);
  if (redirect) return json(request, { redirect });
  if (isMissing(error)) return json(request, { notFound: true }, 404);
  console.error("[client-api]", error);
  return json(request, { error: "The request could not be completed. Please try again." }, 500);
}
async function shell(user: SessionUser, data: Record<string, unknown>, admin: boolean) {
  const [[{ value: unread }], counts] = await Promise.all([
    db.select({ value: count() }).from(schema.notification)
      .where(and(eq(schema.notification.userId, user.id), eq(schema.notification.isRead, false))),
    admin
      ? Promise.all([
          typeof data.pendingReports === "number" ? data.pendingReports : pendingReportCount(),
          data.claimCounts ? data.claimCounts as { pending: number } : adminClaimCounts(),
        ]).then(([reports, claims]) => ({
          "/admin/reports": { value: reports, urgent: true },
          "/admin/claims": { value: claims.pending, urgent: true },
        }))
      : (data.matches && !Array.isArray(data.matches) && typeof data.matches === "object" && "value" in data.matches
          ? Promise.resolve(data.matches as { value: number }) : pendingMatchCount(user.id))
        .then(matches => ({ "/matches": { value: matches.value, urgent: true }, "/notifications": { value: 0 } })),
  ]);
  if (!admin) Object.assign(counts, { "/notifications": { value: unread } });
  return { unread, counts };
}
export async function OPTIONS(request: Request) {
  if (originDenied(request)) return json(request, { error: "Origin not allowed" }, 403);
  return withClientCors(request, new Response(null, { status: 204 }));
}
export async function GET(request: Request, context: Context) {
  if (originDenied(request)) return json(request, { error: "Origin not allowed" }, 403);
  const path = (await context.params).path;
  try {
    const user = await getSessionUser();
    return await withClientSession(user, async () => {
      const url = new URL(request.url);
      if (path[0] === "session") return json(request, { user });
      if (path[0] === "download") {
        if (!user) return json(request, { error: "Unauthorized" }, 401);
        let response: Response;
        if (path[1] === "proof" && /^\d+$/.test(path[2] ?? "")) {
          response = await proofDownload(request, { params: Promise.resolve({ id: path[2] }) });
        } else if (path[1] === "admin") response = await adminDownload(request);
        else if (path[1] === "me") response = await personalDownload();
        else return json(request, { notFound: true }, 404);
        const target = response.headers.get("location");
        return target ? json(request, { url: target }) : withClientCors(request, response);
      }
      if (path[0] !== "page") return json(request, { notFound: true }, 404);
      const id = url.searchParams.get("id") ?? "";
      if (!Object.hasOwn(clientPages, id)) return json(request, { notFound: true }, 404);
      const page = clientPages[id as keyof typeof clientPages];
      if (page.access !== "public" && !user) return json(request, { redirect: "/login" }, 401);
      if (page.access === "admin" && user?.role !== "admin") return json(request, { redirect: "/dashboard" }, 403);
      const params: unknown = JSON.parse(url.searchParams.get("params") ?? "{}");
      const search: unknown = JSON.parse(url.searchParams.get("search") ?? "{}");
      const validRecord = (v: unknown): v is Record<string, string> =>
        Boolean(v && typeof v === "object" && !Array.isArray(v) &&
          Object.entries(v).length < 40 && Object.values(v).every(x => typeof x === "string" && x.length <= 4000));
      if (!validRecord(params) || !validRecord(search)) return json(request, { error: "Invalid parameters" }, 400);
      const data = await page.load({ params: Promise.resolve(params), searchParams: Promise.resolve(search) });
      const nav = user && page.access !== "public" ? await shell(user, data as Record<string, unknown>, page.access === "admin") : null;
      return json(request, { data: clientData(data, user), user, shell: nav, cloudName: env.CLOUDINARY_CLOUD_NAME ?? "" });
    });
  } catch (error) { return failure(request, error); }
}
export async function POST(request: Request, context: Context) {
  if (originDenied(request)) return json(request, { error: "Origin not allowed" }, 403);
  const path = (await context.params).path;
  if (Number(request.headers.get("content-length") || 0) > 4_500_000) return json(request, { error: "Upload exceeds 4.5 MB" }, 413);
  try {
    if (path[0] === "verify") {
      const body: unknown = await request.json();
      const token = body && typeof body === "object" && "token" in body ? body.token : null;
      if (typeof token !== "string" || token.length > 4096) return json(request, { error: "Invalid verification link" }, 400);
      const response = await auth.api.verifyEmail({ query: { token }, headers: request.headers, asResponse: true });
      return withClientCors(request, response);
    }
    if (path[0] !== "action") return json(request, { notFound: true }, 404);
    const { action, args } = decodeAction(await request.formData());
    if (!Object.hasOwn(clientActions, action)) return json(request, { error: "Unknown action" }, 400);
    const user = await getSessionUser();
    return await withClientSession(user, async () => {
      let result: unknown, redirect: string | null = null;
      try { result = await clientActions[action as keyof typeof clientActions](args); }
      catch (error) {
        redirect = redirectFromError(error);
        if (!redirect) throw error;
      }
      // nextCookies writes a signed cookie during the existing login action.
      // Return that signed value over HTTPS for this separate-origin client.
      const store = await cookies();
      const sessionToken = getSessionCookie(new Headers({ cookie: store.toString() }));
      return json(request, { result: clientData(result, user), redirect, ...(sessionToken ? { sessionToken } : {}) });
    });
  } catch (error) { return failure(request, error); }
}
