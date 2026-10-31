import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { Suspense } from "react";
import Loading from "./loading";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}><AuthenticatedApp>{children}</AuthenticatedApp></Suspense>;
}

async function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={user} section="user">
      {children}
    </AppShell>
  );
}
