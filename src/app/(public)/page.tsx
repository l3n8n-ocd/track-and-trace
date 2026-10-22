import Link from "next/link";
import { buttonClass } from "@/components/ui";

const steps = [
  {
    title: "Report",
    body: "Lost something, or found something? File a report with a description, location, and photos in under two minutes.",
  },
  {
    title: "Match",
    body: "ReturnDesk compares lost and found reports automatically and alerts you when it finds a likely match.",
  },
  {
    title: "Claim",
    body: "Submit proof of ownership. The lost and found office verifies it before releasing the item to you.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-brand-700 to-brand-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-wider text-gold-400">
            Bulacan State University – Main Campus
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
            Lost something on campus? Let&apos;s get it back to you.
          </h1>
          <p className="mt-4 max-w-xl text-brand-100">
            ReturnDesk is the official channel for reporting, searching, and claiming lost and found
            items. No more scrolling through group chats and notice boards.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={buttonClass("secondary", "md", "px-5")}>
              Create an account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-md px-5 py-2 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold">How it works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-lg bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-semibold">Found an item?</p>
          <p className="mt-1">
            Report it in ReturnDesk, then bring it to the Lost and Found Office. Under the Civil Code
            (Articles 719–720), found property must be returned to its owner or turned over to the
            proper authorities. The office keeps it safe until the owner is verified.
          </p>
        </div>
      </section>
    </div>
  );
}
