"use client";

import { useState } from "react";
import { Building2, UserRound } from "lucide-react";
import { CLAIM_STATUS_LABEL, MATCH_STATUS_LABEL, REPORT_STATUS_LABEL } from "@/lib/status";
import { CLAIM_TAG, MATCH_TAG, REPORT_TAG, StatusTag } from "../status-badge";
import { ICON_STROKE, cn } from "../ui";

type Entry = {
  def: (typeof REPORT_TAG)[keyof typeof REPORT_TAG];
  label: string;
  means: string;
  next: string;
  who: "You" | "The office" | "Nobody, it's done";
};

const GROUPS: { title: string; entries: Entry[] }[] = [
  {
    title: "Reports",
    entries: [
      { def: REPORT_TAG.PENDING, label: REPORT_STATUS_LABEL.PENDING, means: "The office hasn't checked the report yet.", next: "Finders bring the item to the Lost and Found Office. Matching already runs in the background.", who: "The office" },
      { def: REPORT_TAG.VERIFIED, label: REPORT_STATUS_LABEL.VERIFIED, means: "Checked by the office. A found item is in storage and shows up in search.", next: "If it's yours, file a claim from the item page.", who: "You" },
      { def: REPORT_TAG.CLAIMED, label: REPORT_STATUS_LABEL.CLAIMED, means: "The item went back to its verified owner.", next: "Nothing. The report is kept for the office's records.", who: "Nobody, it's done" },
      { def: REPORT_TAG.EXPIRED, label: REPORT_STATUS_LABEL.EXPIRED, means: "Nobody claimed it within 60 days in storage.", next: "Contact the office soon if it's yours, before it's disposed of under university policy.", who: "The office" },
    ],
  },
  {
    title: "Matches",
    entries: [
      { def: MATCH_TAG.PENDING_VERIFICATION, label: MATCH_STATUS_LABEL.PENDING_VERIFICATION, means: "A found item looks like something you reported lost.", next: "Compare it. Claim it if it's yours, or mark it as not yours.", who: "You" },
    ],
  },
  {
    title: "Claims",
    entries: [
      { def: CLAIM_TAG.PENDING, label: CLAIM_STATUS_LABEL.PENDING, means: "An administrator is comparing your proof with the found report.", next: "Wait for a notification. Most claims are reviewed within a few days.", who: "The office" },
      { def: CLAIM_TAG.MORE_INFO_NEEDED, label: CLAIM_STATUS_LABEL.MORE_INFO_NEEDED, means: "The office isn't sure yet and has asked you something.", next: "Open the claim and send the extra details or photos.", who: "You" },
      { def: CLAIM_TAG.APPROVED, label: CLAIM_STATUS_LABEL.APPROVED, means: "Ownership verified. The item is waiting for you.", next: "Bring a valid ID to the office before the pickup deadline.", who: "You" },
      { def: CLAIM_TAG.RELEASED, label: CLAIM_STATUS_LABEL.RELEASED, means: "You picked it up. The claim is closed.", next: "Nothing left to do.", who: "Nobody, it's done" },
      { def: CLAIM_TAG.REJECTED, label: CLAIM_STATUS_LABEL.REJECTED, means: "The proof didn't match what the finder described.", next: "Read the reason on the claim. Contact the office if you think it's a mistake.", who: "You" },
      { def: CLAIM_TAG.ON_HOLD, label: CLAIM_STATUS_LABEL.ON_HOLD, means: "Someone else's claim on the same item is being decided first.", next: "Wait. If theirs doesn't go through, yours is reviewed next.", who: "The office" },
    ],
  },
];

export function TagExplorer() {
  const all = GROUPS.flatMap((g) => g.entries);
  const [selected, setSelected] = useState(all[0].label);
  const entry = all.find((e) => e.label === selected) ?? all[0];
  const WhoIcon = entry.who === "You" ? UserRound : Building2;

  return (
    <div className="grid overflow-hidden rounded-3xl bg-paper text-ink lg:grid-cols-2">
      <div className="space-y-6 p-6 sm:p-8">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{g.title}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.entries.map((e) => {
                const isSel = e.label === selected;
                return (
                  <button
                    key={e.label}
                    type="button"
                    onClick={() => setSelected(e.label)}
                    aria-pressed={isSel}
                    className={cn(
                      "rounded-full p-1 transition-colors duration-200",
                      isSel ? "bg-sand" : "hover:bg-sand/60",
                    )}
                  >
                    <StatusTag def={e.def} label={e.label} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col border-t border-line bg-cream/60 p-6 sm:p-8 lg:border-l lg:border-t-0" aria-live="polite">
        <div key={entry.label} className="flex flex-1 animate-fade flex-col items-start">
          <StatusTag def={entry.def} label={entry.label} />
          <p className="mt-5 font-display text-2xl font-semibold leading-snug">{entry.means}</p>
          <div aria-hidden className="min-h-8 flex-1" />
          <dl className="w-full divide-y divide-line border-t border-line pt-1 text-sm">
            <div className="flex items-start gap-4 py-4">
              <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-muted">Who acts next</dt>
              <dd className="flex items-center gap-2 font-semibold">
                <WhoIcon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-crimson" />
                {entry.who}
              </dd>
            </div>
            <div className="flex items-start gap-4 pt-4">
              <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-muted">What to do</dt>
              <dd className="leading-relaxed text-ink-soft">{entry.next}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
