import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSessionCookie } from "better-auth/cookies";
import type { Role } from "@/db/schema";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
};

// Reads the current session once per request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const requestHeaders = await headers();
  // Guests cannot have a session without its token. Avoid initializing the
  // auth/database stack for public pages; signed-in users still get the full
  // database check, including account deactivation and session revocation.
  if (!getSessionCookie(requestHeaders)) return null;
  const { auth } = await import("./auth");
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const u = session.user as typeof session.user & {
    role: Role;
    firstName: string;
    lastName: string;
    status: string;
  };
  if (u.status === "DEACTIVATED") return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export function isAdmin(user: SessionUser | null) {
  return user?.role === "admin";
}
