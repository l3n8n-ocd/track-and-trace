"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/ui";

// Top-right shortcut: "Create an account" on the login page, "Log in"
// everywhere else.
export function AuthSwitchLink() {
  const onLogin = usePathname() === "/login";
  return (
    <Link href={onLogin ? "/register" : "/login"} className={buttonClass("ghost", "sm", "font-semibold text-ink")}>
      {onLogin ? "Create an account" : "Log in"}
    </Link>
  );
}
