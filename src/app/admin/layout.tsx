import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell user={user} section="admin">
      {children}
    </AppShell>
  );
}
