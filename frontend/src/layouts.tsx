import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/session";
import { NavigationSignal } from "./navigation";

export type Section = "user" | "admin" | "auth" | "public";
export type PageLayout = (children: ReactNode, user: SessionUser | null) => ReactNode | Promise<ReactNode>;
const layouts = new Map<Section, Promise<PageLayout>>();

export function loadLayout(section: Section): Promise<PageLayout> {
  const existing = layouts.get(section);
  if (existing) return existing;
  let pending: Promise<PageLayout>;
  if (section === "user" || section === "admin") {
    pending = import("../generated/app-shell").then(({ AppShell }) => function AppPage(children, user) {
      if (!user) throw new NavigationSignal("/login");
      return <AppShell user={user} section={section}>{children}</AppShell>;
    });
  } else if (section === "auth") {
    pending = import("@/app/(auth)/layout").then(({ default: Layout }) => function AuthPage(children) { return <Layout>{children}</Layout>; });
  } else {
    pending = import("@/app/(public)/layout").then(({ default: Layout }) => children => Layout({ children }));
  }
  layouts.set(section, pending);
  void pending.catch(() => { if (layouts.get(section) === pending) layouts.delete(section); });
  return pending;
}
