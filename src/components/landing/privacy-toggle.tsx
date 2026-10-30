"use client";

import { useState } from "react";
import { Building2, CalendarDays, EyeOff, Lock, MapPin, Tag, Users } from "lucide-react";
import { TypeBadge } from "../status-badge";
import { ICON_STROKE, cn } from "../ui";

// The demo item. The photo is public/samplePhoto.jpg; keep the text below
// in line with what it shows.
const SAMPLE = {
  photo: "/samplePhoto.jpg",
  name: "Black leather wallet with keys",
  category: "Wallets and Purses",
  place: "Gymnasium",
  date: "Oct 26",
  description: "Bifold wallet with a key ring, found near the bleachers after PE class.",
  hidden: "Car key fob on a navy leather tag, with three silver house keys.",
};

// Shows the same found item as the public sees it and as the office sees it.
export function PrivacyToggle() {
  const [view, setView] = useState<"public" | "office">("public");
  const office = view === "office";
  return (
    <div>
      <div role="tablist" aria-label="Who is looking" className="mb-4 inline-flex rounded-2xl border border-line bg-paper p-1">
        {(
          [
            ["public", "Everyone else", Users],
            ["office", "The office", Building2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              view === key ? "bg-ink text-cream" : "text-ink-soft hover:bg-sand",
            )}
          >
            <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="relative aspect-[16/9] overflow-hidden bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SAMPLE.photo}
            alt={office ? SAMPLE.name : ""}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-[filter,transform] duration-700",
              office ? "blur-0" : "scale-110 blur-xl",
            )}
          />
          <span className="absolute left-4 top-4">
            <TypeBadge type="FOUND" />
          </span>
          {!office && (
            <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-xl bg-ink/70 px-2.5 py-1 text-xs font-semibold text-cream">
              <EyeOff aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
              Photo blurred
            </span>
          )}
        </div>
        <div className="space-y-3 p-5">
          <p className="font-display text-lg font-semibold text-ink">{SAMPLE.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Tag aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-crimson" />
              {SAMPLE.category}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-crimson" />
              {SAMPLE.place}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-crimson" />
              {SAMPLE.date}
            </span>
          </div>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-500",
              office ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 space-y-2 border-t border-line pt-3 text-sm">
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">Description:</span> {SAMPLE.description}
                </p>
                <p className="rounded-2xl border border-crimson/15 bg-crimson-tint/40 p-3 text-ink">
                  <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-crimson">
                    <Lock aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                    Only the office sees this
                  </span>
                  {SAMPLE.hidden}
                </p>
              </div>
            </div>
          </div>
          {!office && (
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <Lock aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              Description and identifying details are held back.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
