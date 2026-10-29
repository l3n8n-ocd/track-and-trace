import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href={user.role === "admin" ? "/admin" : "/dashboard"} className={buttonClass("primary", "sm")}>
                Open Track-and-Trace
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost", "sm")}>
                  Log in
                </Link>
                <Link href="/register" className={buttonClass("primary", "sm")}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <p>Track-and-Trace · Bulacan State University – Main Campus Lost and Found</p>
          <Link href="/privacy" className="hover:underline">
            Data privacy notice
          </Link>
        </div>
      </footer>
    </>
  );
}
