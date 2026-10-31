import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn(), getSession: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));

import { getSessionUser } from "@/lib/session";

const user = {
  id: "student-1", name: "Test Student", email: "student@example.test",
  role: "student", firstName: "Test", lastName: "Student", status: "ACTIVE",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user });
});

describe("session lookup", () => {
  it("passes a bearer token to authentication for full validation", async () => {
    const requestHeaders = new Headers({ authorization: "Bearer signed-token.signature" });
    mocks.headers.mockResolvedValue(requestHeaders);
    expect(await getSessionUser()).toMatchObject({ id: user.id });
    expect(mocks.getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("rejects a bearer session after deactivation", async () => {
    mocks.headers.mockResolvedValue(new Headers({ authorization: "Bearer token.signature" }));
    mocks.getSession.mockResolvedValue({ user: { ...user, status: "DEACTIVATED" } });
    expect(await getSessionUser()).toBeNull();
  });
  it.each(["", "theme=light"])("does not initialize authentication for a guest (%s)", async (cookie) => {
    mocks.headers.mockResolvedValue(new Headers({ cookie }));
    expect(await getSessionUser()).toBeNull();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it.each(["better-auth.session_token", "__Secure-better-auth.session_token"])(
    "validates a %s cookie with authentication",
    async (cookieName) => {
      const headers = new Headers({ cookie: `${cookieName}=signed-token` });
      mocks.headers.mockResolvedValue(headers);
      expect(await getSessionUser()).toMatchObject({ id: user.id, role: "student" });
      expect(mocks.getSession).toHaveBeenCalledWith({ headers });
    },
  );

  it("rejects a revoked or invalid session token", async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=revoked" }));
    mocks.getSession.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });

  it("still rejects deactivated accounts with a session cookie", async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=signed-token" }));
    mocks.getSession.mockResolvedValue({ user: { ...user, status: "DEACTIVATED" } });
    expect(await getSessionUser()).toBeNull();
  });
});
