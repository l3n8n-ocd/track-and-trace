"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { CLAIM_STATUS_LABEL, MATCH_STATUS_LABEL, REPORT_STATUS_LABEL } from "@/lib/status";
import { CLAIM_TAG, MATCH_TAG, REPORT_TAG, StatusTag } from "../status-badge";
import { cn } from "../ui";

const STEPS = [
  { label: "Reported", def: REPORT_TAG.PENDING, tag: REPORT_STATUS_LABEL.PENDING, note: "Juan files a lost report from his phone." },
  { label: "Verified", def: REPORT_TAG.VERIFIED, tag: REPORT_STATUS_LABEL.VERIFIED, note: "The office checks the report." },
  { label: "Matched", def: MATCH_TAG.PENDING_VERIFICATION, tag: MATCH_STATUS_LABEL.PENDING_VERIFICATION, note: "A found calculator scores an 86% match." },
  { label: "Approved", def: CLAIM_TAG.APPROVED, tag: CLAIM_STATUS_LABEL.APPROVED, note: "His proof matches the hidden details." },
  { label: "Returned", def: CLAIM_TAG.RELEASED, tag: CLAIM_STATUS_LABEL.RELEASED, note: "Picked up with a valid ID. Case closed." },
];

// A claim tag hanging in the hero, stepping through one item's journey.
export function TagDemo() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, [paused]);

  const current = STEPS[step];
  return (
    <div
      className="relative mx-auto w-full max-w-[380px] pt-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="animate-swing origin-top" style={{ animationDuration: "6s" }}>
        {/* string */}
        <svg aria-hidden viewBox="0 0 40 60" className="absolute -top-14 left-1/2 h-16 w-10 -translate-x-1/2">
          <path d="M20 0 C 12 20, 28 34, 20 58" fill="none" stroke="#F5F5ED" strokeOpacity="0.55" strokeWidth="1.5" />
        </svg>
        <div
          className="relative rounded-[22px] bg-cream p-6 pt-9 text-ink ring-1 ring-black/5"
          style={{ clipPath: "polygon(22% 0, 78% 0, 100% 9%, 100% 100%, 0 100%, 0 9%)" }}
        >
          <span aria-hidden className="absolute left-1/2 top-3.5 size-4 -translate-x-1/2 rounded-full bg-oxblood ring-[5px] ring-sand" />
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
            <span>Track-and-Trace</span>
            <span className="tabular-nums">No. 0427</span>
          </div>
          <div className="my-4 border-t-2 border-dashed border-line-strong" />
          <p className="text-xs font-semibold uppercase tracking-wider text-berry">Lost item</p>
          <p className="mt-1 font-display text-[22px] font-bold leading-tight">Blue Casio fx-991ES calculator</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden strokeWidth={2} className="size-3.5" />
              Library, 2nd floor
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden strokeWidth={2} className="size-3.5" />
              Oct 22
            </span>
          </p>

          <div className="mt-5 flex min-h-[64px] flex-col items-start gap-2" aria-live="polite">
            <span key={step} className="animate-fade">
              <StatusTag def={current.def} label={current.tag} />
            </span>
            <p key={`n${step}`} className="animate-fade text-sm text-ink-soft">
              {current.note}
            </p>
          </div>

          <ol className="mt-5 grid grid-cols-5 gap-1.5" aria-label="Journey steps">
            {STEPS.map((s, i) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  className="group block w-full text-left"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-colors duration-500",
                      i < step ? "bg-oxblood" : i === step ? "bg-amber" : "bg-line-strong",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-1.5 block truncate text-[10px] font-semibold uppercase tracking-wide",
                      i === step ? "text-ink" : "text-ink-muted group-hover:text-ink",
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
