"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, EyeOff, FilePlus, Hand, IdCard, MapPin, PackageOpen, ScanSearch, Smartphone } from "lucide-react";
import { CLAIM_STATUS_LABEL } from "@/lib/status";
import { CLAIM_TAG, MatchScore, StatusTag, TypeBadge } from "../status-badge";
import { ICON_STROKE, cn } from "../ui";

const STEPS = [
  {
    icon: FilePlus,
    title: "Report it",
    body: "Lost something, or found something? Describe it, say where, add a photo. About two minutes on your phone.",
  },
  {
    icon: ScanSearch,
    title: "We match it",
    body: "Every new report is compared with the others by item, place, date, color, and brand. You're alerted when something lines up.",
  },
  {
    icon: Hand,
    title: "Prove it's yours",
    body: "File a claim with details only the owner would know. The office checks them against what the finder saw.",
  },
  {
    icon: PackageOpen,
    title: "Pick it up",
    body: "Once approved, bring a valid ID to the Lost and Found Office before the deadline. That's it.",
  },
];

function Mock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full max-w-md rounded-3xl border border-line bg-paper p-5 sm:p-6", className)}>{children}</div>;
}

function Line({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink">{label}</p>
      <div className="flex h-10 items-center gap-2.5 rounded-xl border border-line-strong bg-cream/60 px-3 text-sm text-ink">
        <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-muted" />
        {value}
      </div>
    </div>
  );
}

const MOCKS = [
  <Mock key="report">
    <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
      <span className="flex size-6 items-center justify-center rounded-lg bg-oxblood text-xs text-cream">1</span>
      The item
    </p>
    <div className="space-y-3">
      <Line icon={Smartphone} label="What is it?" value="Blue Casio fx-991ES calculator" />
      <Line icon={MapPin} label="Where you last had it" value="Library, 2nd floor" />
      <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-line-strong p-3 text-sm text-ink-muted">
        <Camera aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-crimson" />
        Add a photo (optional)
      </div>
    </div>
    <div className="mt-4 flex h-10 items-center justify-center rounded-xl bg-crimson text-sm font-semibold text-cream">Submit lost report</div>
  </Mock>,
  <Mock key="match">
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-cream p-3">
        <TypeBadge type="LOST" />
        <span className="text-sm font-semibold text-ink">Blue Casio fx-991ES</span>
      </div>
      <div className="flex items-center gap-3 pl-6">
        <svg aria-hidden width="2" height="36" className="overflow-visible">
          <line x1="1" y1="0" x2="1" y2="36" stroke="#C6480D" strokeWidth="2" strokeDasharray="3 4" className="animate-trace" />
        </svg>
        <MatchScore score={86} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-cream p-3">
        <TypeBadge type="FOUND" />
        <span className="text-sm font-semibold text-ink">Casio scientific calculator</span>
      </div>
    </div>
    <p className="mt-4 rounded-xl bg-amber-tint px-3 py-2.5 text-sm text-[#5a2a05]">
      A found item looks like your lost calculator. Have a look.
    </p>
  </Mock>,
  <Mock key="claim">
    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Your statement</p>
    <p className="mt-2 rounded-2xl rounded-tl-sm bg-cream p-3 text-sm leading-relaxed text-ink">
      It&apos;s mine. My initials <strong>JD</strong> are scratched near the battery cover.
    </p>
    <div className="mt-4 rounded-2xl border border-crimson/15 bg-crimson-tint/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-crimson">
        <EyeOff aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
        Finder&apos;s hidden note
      </p>
      <p className="mt-1 text-sm text-ink">Scratched initials on the back</p>
    </div>
    <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink">
      <span className="flex size-6 items-center justify-center rounded-full bg-oxblood text-cream">
        <Check aria-hidden strokeWidth={3} className="size-3.5" />
      </span>
      Details match. Ownership verified.
    </p>
  </Mock>,
  <Mock key="pickup" className="overflow-hidden p-0 sm:p-0">
    <div className="flex">
      <div className="flex-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rust">Pickup pass</p>
        <div className="mt-2">
          <StatusTag def={CLAIM_TAG.APPROVED} label={CLAIM_STATUS_LABEL.APPROVED} size="sm" />
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink">
          <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-crimson" />
          Lost and Found Office, Bin A
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-ink">
          <IdCard aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-crimson" />
          Bring a valid ID
        </p>
      </div>
      <div className="flex w-28 flex-col items-center justify-center border-l-2 border-dashed border-amber/60 bg-amber text-ink">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Claim</span>
        <span className="font-display text-3xl font-bold stretch-wide">#27</span>
      </div>
    </div>
  </Mock>,
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);
  const [fill, setFill] = useState(0);

  // Grow the progress line down to the active step's icon.
  useLayoutEffect(() => {
    const first = nodes.current[0];
    const current = nodes.current[active];
    if (first && current) setFill(current.offsetTop - first.offsetTop);
  }, [active]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    panels.current.forEach((p) => p && observer.observe(p));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="lg:sticky lg:top-28 lg:h-fit">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rust">How it works</p>
        <h2 className="mt-3 text-3xl font-bold leading-[1.05] text-ink sm:text-5xl">
          From &ldquo;where did it go?&rdquo; to back in your hands.
        </h2>
        <ol className="relative mt-10 hidden space-y-1 lg:block">
          <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-0.5 bg-line" />
          <span
            aria-hidden
            className="absolute left-[19px] top-6 w-0.5 bg-linear-to-b from-oxblood to-amber transition-[height] duration-500 ease-out"
            style={{ height: fill }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const state = i < active ? "done" : i === active ? "active" : "todo";
            return (
              <li
                key={s.title}
                ref={(el) => {
                  nodes.current[i] = el;
                }}
              >
                <button
                  type="button"
                  onClick={() => panels.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className={cn(
                    "relative flex w-full items-start gap-4 rounded-2xl p-2 pr-4 text-left transition-colors",
                    state === "active" && "bg-paper",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                      state === "done" && "bg-oxblood text-cream",
                      state === "active" && "bg-amber text-ink",
                      state === "todo" && "border-2 border-line-strong bg-cream text-ink-muted",
                    )}
                  >
                    <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
                  </span>
                  <span className="pt-1.5">
                    <span className={cn("block font-display text-lg font-semibold", state === "todo" ? "text-ink-muted" : "text-ink")}>
                      {s.title}
                    </span>
                    <span
                      className={cn(
                        "grid text-sm leading-relaxed text-ink-soft transition-[grid-template-rows,opacity] duration-500",
                        state === "active" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <span className="overflow-hidden">{s.body}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-12 lg:space-y-0">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            ref={(el) => {
              panels.current[i] = el;
            }}
            data-index={i}
            className="flex flex-col justify-center lg:min-h-[64vh]"
          >
            <div className="mb-4 lg:hidden">
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-rust">Step {i + 1}</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
            <div
              className={cn(
                "flex items-center justify-center rounded-[28px] bg-sand/70 px-4 py-10 transition-[opacity,transform] duration-500 sm:px-10 sm:py-14",
                "lg:opacity-40 lg:scale-[0.97]",
                active === i && "lg:scale-100 lg:opacity-100",
              )}
            >
              {MOCKS[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
