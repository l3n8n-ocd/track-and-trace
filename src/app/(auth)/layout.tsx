import Link from "next/link";
import { Logo } from "@/components/logo";
import { EmberPanel, TraceAnimation } from "@/components/trace-animation";
import { AuthSwitchLink } from "./switch-link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      {/* Brand panel: a short strip on phones, half the screen on desktop. */}
      <EmberPanel className="shrink-0 lg:sticky lg:top-0 lg:h-dvh lg:w-[46%] xl:w-1/2">
        <div className="flex h-full flex-col px-5 py-5 sm:px-8 lg:px-10 lg:py-9">
          <Logo tone="light" />
          <TraceAnimation className="mx-auto my-6 hidden w-full max-w-[560px] flex-1 lg:block" />
          <div className="mt-5 lg:mt-0">
            <p className="max-w-md font-display text-[22px] font-bold leading-[1.1] text-cream sm:text-[28px] lg:text-[34px]">
              Every lost item deserves a way back.
            </p>
            <p className="mt-3 hidden max-w-md text-sm leading-relaxed text-cream/75 sm:block">
              Report it, let Track-and-Trace match it, and pick it up at the Lost and Found Office once
              ownership is verified.
            </p>
          </div>
        </div>
      </EmberPanel>

      <div className="relative flex flex-1 flex-col bg-cream">
        <div className="hidden items-center justify-end px-5 pt-5 sm:px-8 lg:flex">
          <AuthSwitchLink />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-8 lg:py-10">{children}</div>
        <p className="px-5 pb-6 text-center text-xs text-ink-muted sm:px-8">
          Bulacan State University – Main Campus Lost and Found ·{" "}
          <Link href="/privacy" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
            Data privacy notice
          </Link>
        </p>
      </div>
    </div>
  );
}
