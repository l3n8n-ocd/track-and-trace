import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { Suspense } from "react";
import Loading from "./loading";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}><AuthenticatedAdmin>{children}</AuthenticatedAdmin></Suspense>;
}

async function AuthenticatedAdmin({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell user={user} section="admin">
      {children}
    </AppShell>
  );
}
