import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  BadgeCheck,
  Calculator,
  CupSoda,
  EyeOff,
  Glasses,
  HandHelping,
  Headphones,
  IdCard,
  Key,
  Laptop,
  Lock,
  Scale,
  SearchX,
  ShieldCheck,
  Smartphone,
  Umbrella,
  UserCheck,
  Wallet,
} from "lucide-react";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PrivacyToggle } from "@/components/landing/privacy-toggle";
import { Reveal } from "@/components/landing/reveal";
import { TagDemo } from "@/components/landing/tag-demo";
import { TagExplorer } from "@/components/landing/tag-explorer";
import { ICON_STROKE, buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/session";

const ITEMS = [
  { icon: Umbrella, label: "Umbrellas" },
  { icon: IdCard, label: "School IDs" },
  { icon: Calculator, label: "Calculators" },
  { icon: CupSoda, label: "Tumblers" },
  { icon: Headphones, label: "Earphones" },
  { icon: Wallet, label: "Wallets" },
  { icon: Key, label: "Keys" },
  { icon: Smartphone, label: "Phones" },
  { icon: Laptop, label: "Laptops" },
  { icon: Backpack, label: "Bags" },
  { icon: Glasses, label: "Eyeglasses" },
];

const PRIVACY = [
  { icon: EyeOff, title: "Blurred photos", body: "Anyone can browse found items, but photos are blurred and descriptions held back." },
  { icon: Lock, title: "Hidden details", body: "Finders note marks only the owner would know. Those never appear in search." },
  { icon: UserCheck, title: "A person checks", body: "An administrator compares every claim with the hidden details before approving it." },
  { icon: ShieldCheck, title: "RA 10173", body: "Your data is handled under the Data Privacy Act and used only to return items." },
];

export default async function HomePage() {
  const user = await getSessionUser();
  const start = (type: "lost" | "found") => (user ? `/reports/new?type=${type}` : "/register");

  return (
    <div>
      {/* Hero */}
      <section className="bg-ember relative isolate overflow-hidden text-cream">
        <div aria-hidden className="fluted absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden className="noise absolute inset-0 -z-10" />
        <div className="mx-auto grid min-h-[100svh] max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-20">
          <div className="animate-rise">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber sm:text-sm">
              Bulacan State University – Main Campus
            </p>
            <h1 className="stretch-wide mt-5 text-[17vw] font-black leading-[0.86] tracking-[-0.03em] text-cream sm:text-[88px] lg:text-[96px]">
              Track-
              <br />
              <span className="text-amber">and</span>-
              <br />
              Trace
            </h1>
            <p className="mt-7 max-w-lg font-display text-xl font-semibold leading-snug text-cream sm:text-2xl">
              Lost something on campus? Let&apos;s trace it back to you.
            </p>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-cream/75">
              The official channel for reporting, searching, and claiming lost and found items. No more scrolling
              through group chats and notice boards.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={start("lost")} className={buttonClass("light", "lg")}>
                <SearchX aria-hidden />
                I lost something
              </Link>
              <Link href={start("found")} className={buttonClass("primary", "lg", "bg-white/10 ring-1 ring-inset ring-cream/35 hover:bg-white/20")}>
                <HandHelping aria-hidden />
                I found something
              </Link>
            </div>
            {!user && (
              <p className="mt-5 text-sm text-cream/70">
                Already registered?{" "}
                <Link href="/login" className="font-semibold text-cream underline decoration-amber decoration-2 underline-offset-4">
                  Log in
                </Link>
              </p>
            )}
          </div>
          <div className="animate-rise [animation-delay:150ms]">
            <TagDemo />
          </div>
        </div>
      </section>

      {/* What gets lost */}
      <section aria-label="Commonly lost items" className="overflow-hidden border-b border-line bg-paper py-5">
        <div className="flex w-max animate-marquee gap-10 pr-10 hover:[animation-play-state:paused]">
          {[...ITEMS, ...ITEMS].map(({ icon: Icon, label }, i) => (
            <span key={i} aria-hidden={i >= ITEMS.length} className="flex items-center gap-2.5 whitespace-nowrap text-ink-soft">
              <Icon aria-hidden strokeWidth={1.75} className="size-6 text-crimson" />
              <span className="font-display text-lg font-semibold">{label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <HowItWorks />
        </div>
      </section>

      {/* Status tags */}
      <section id="tags" className="relative isolate scroll-mt-16 overflow-hidden bg-oxblood text-cream">
        <div aria-hidden className="noise absolute inset-0 -z-10 opacity-30" />
        <div aria-hidden className="absolute -right-40 -top-40 -z-10 size-[520px] rounded-full bg-berry/50 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber">Status tags</p>
            <h2 className="mt-3 text-3xl font-bold leading-[1.05] text-cream sm:text-5xl">Every item wears a tag.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-cream/75">
              You always know where your report or claim stands, and whose move it is. Pick a tag to see what it means.
            </p>
          </Reveal>
          <Reveal className="mt-12" delay={100}>
            <TagExplorer />
          </Reveal>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="scroll-mt-16 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rust">Privacy by design</p>
            <h2 className="mt-3 text-3xl font-bold leading-[1.05] text-ink sm:text-5xl">Only the real owner can tell.</h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {PRIVACY.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-6 text-crimson" />
                  <p className="mt-2 font-display font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <PrivacyToggle />
          </Reveal>
        </div>
      </section>

      {/* Found something */}
      <section className="bg-cream pb-20">
        <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 rounded-3xl border border-line bg-paper p-6 sm:flex-row sm:items-center sm:p-8">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rust-tint text-rust">
              <Scale aria-hidden strokeWidth={ICON_STROKE} className="size-7" />
            </span>
            <div className="flex-1">
              <p className="font-display text-xl font-semibold text-ink">Found an item?</p>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
                Report it in Track-and-Trace, then bring it to the Lost and Found Office. Under the Civil Code
                (Articles 719–720), found property must be returned to its owner or turned over to the proper
                authorities. The office keeps it safe until the owner is verified.
              </p>
            </div>
            <Link href={start("found")} className={buttonClass("secondary", "lg")}>
              Report a found item
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Closing call to action */}
      <section className="bg-cream px-4 pb-20 sm:px-6">
        <Reveal className="bg-ember relative isolate mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-14 text-center text-cream sm:px-12 sm:py-20">
          <div aria-hidden className="noise absolute inset-0 -z-10" />
          <BadgeCheck aria-hidden strokeWidth={1.75} className="mx-auto size-10 text-amber" />
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-[1.05] text-cream sm:text-5xl">
            Lost it? Found it? Start here.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-cream/75">
            Free for every BulSU student, faculty member, and staff member. Works on any phone.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {user ? (
              <Link href={user.role === "admin" ? "/admin" : "/dashboard"} className={buttonClass("light", "lg")}>
                Open Track-and-Trace
                <ArrowRight aria-hidden />
              </Link>
            ) : (
              <>
                <Link href="/register" className={buttonClass("light", "lg")}>
                  Create an account
                  <ArrowRight aria-hidden />
                </Link>
                <Link href="/login" className={buttonClass("primary", "lg", "bg-white/10 ring-1 ring-inset ring-cream/35 hover:bg-white/20")}>
                  Log in
                </Link>
              </>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
