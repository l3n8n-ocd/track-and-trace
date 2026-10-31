import "server-only";
import { env } from "./env";

const HOSTS = [
  "https://track-and-trace-bulsu-2026.web.app",
  "https://track-and-trace-bulsu-2026.firebaseapp.com",
];
export function clientOrigins() {
  return [...HOSTS, ...(env.CLIENT_APP_URL ? [new URL(env.CLIENT_APP_URL).origin] : [])];
}
export function clientOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const origin = new URL(value).origin;
    return clientOrigins().includes(origin) ? origin : null;
  } catch { return null; }
}
export function verificationLink(value: string): string {
  const link = new URL(value);
  const callback = link.searchParams.get("callbackURL");
  const origin = clientOrigin(callback);
  const token = link.searchParams.get("token");
  if (!origin || !token) return value;
  const frontend = new URL("/verify-email", origin);
  frontend.searchParams.set("token", token);
  return frontend.toString();
}
export function withClientCors(request: Request, response: Response): Response {
  const origin = clientOrigin(request.headers.get("origin"));
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.append("Vary", "Origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Expose-Headers", "set-auth-token, Content-Disposition, Server-Timing");
    headers.set("Timing-Allow-Origin", origin);
    if (request.method === "OPTIONS") headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(response.body, { status: response.status, headers });
}
