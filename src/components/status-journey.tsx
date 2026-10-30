import { ArrowRight, Check, CirclePause, CircleX, Route } from "lucide-react";
import type { ReactNode } from "react";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Journey } from "@/lib/journey";
import { CardHeader, ICON_STROKE, cn } from "./ui";

type NodeState = "done" | "current" | "upcoming" | "ended";

function Node({ state, tone }: { state: NodeState; tone?: Journey["currentTone"] }) {
  const base = "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full";
  if (state === "done")
    return (
      <span className={cn(base, "bg-oxblood text-cream")}>
        <Check aria-hidden strokeWidth={3} className="size-4" />
      </span>
    );
  if (state === "ended")
    return (
      <span className={cn(base, "border-2 border-dashed border-berry bg-berry-tint text-berry")}>
        <CircleX aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
      </span>
    );
  if (state === "current") {
    if (tone === "paused")
      return (
        <span className={cn(base, "border-2 border-ink-faint bg-sand text-ink-soft")}>
          <CirclePause aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        </span>
      );
    return (
      <span className={cn(base, tone === "attention" ? "bg-amber" : "border-2 border-amber bg-paper")}>
        <span aria-hidden className="absolute inset-0 rounded-full bg-amber/50 animate-ping-soft" />
        <span className={cn("size-2.5 rounded-full", tone === "attention" ? "bg-ink" : "bg-amber")} />
      </span>
    );
  }
  return <span className={cn(base, "border-2 border-line-strong bg-paper")} />;
}

export function StatusJourney({
  journey,
  title = "Status history",
  description,
  footer,
  bare = false,
}: {
  journey: Journey;
  title?: string;
  description?: ReactNode;
  footer?: ReactNode;
  bare?: boolean;
}) {
  const { steps, current, ended, currentTone } = journey;
  const shown: { label: string; date?: Date | string | null; note?: string; state: NodeState }[] = [];
  steps.forEach((s, i) => {
    if (ended && i >= current) return;
    shown.push({ ...s, state: i < current ? "done" : i === current ? "current" : "upcoming" });
  });
  if (ended) shown.push({ ...ended, state: "ended" });
  const complete = !ended && current >= steps.length;

  const body = (
    <>
      <ol className="grid md:grid-flow-col md:auto-cols-fr">
        {shown.map((s, i) => {
          const next = shown[i + 1];
          const connector = !next
            ? null
            : s.state === "done" && next.state === "done"
              ? "bg-oxblood"
              : s.state === "done" && next.state === "current"
                ? "bg-linear-to-b from-oxblood to-amber md:bg-linear-to-r"
                : s.state === "done" && next.state === "ended"
                  ? "bg-linear-to-b from-oxblood to-berry/50 md:bg-linear-to-r"
                  : "bg-line-strong";
          return (
            <li
              key={`${s.label}-${i}`}
              aria-current={s.state === "current" ? "step" : undefined}
              className="relative flex gap-3 pb-6 last:pb-0 md:flex-col md:pb-0 md:pr-4"
            >
              {connector && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-0 left-[15px] top-8 w-0.5 md:bottom-auto md:left-8 md:right-0 md:top-[15px] md:h-0.5 md:w-auto",
                    connector,
                  )}
                />
              )}
              <Node state={s.state} tone={currentTone} />
              <div className="min-w-0 pt-1 md:pt-0">
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    s.state === "upcoming" && "text-ink-muted",
                    s.state === "ended" && "text-berry",
                    (s.state === "done" || s.state === "current") && "text-ink",
                  )}
                >
                  {s.label}
                </p>
                {s.date && s.state !== "upcoming" ? (
                  <p className="mt-0.5 text-xs font-medium tabular-nums text-ink-soft" title={formatDateTime(s.date)}>
                    {formatDate(s.date)}
                  </p>
                ) : s.state === "current" ? (
                  <p className="mt-0.5 text-xs font-semibold text-amber-deep">
                    {currentTone === "paused" ? "Paused" : "In progress"}
                  </p>
                ) : null}
                {s.note && <p className="mt-0.5 text-xs leading-snug text-ink-muted">{s.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {(journey.hint || complete) && (
        <div
          className={cn(
            "mt-5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm",
            complete ? "bg-oxblood text-cream" : currentTone === "attention" ? "bg-amber-tint text-[#5a2a05]" : "bg-sand text-ink-soft",
          )}
        >
          {complete ? (
            <Check aria-hidden strokeWidth={3} className="mt-0.5 size-4 shrink-0" />
          ) : (
            <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            <span className="font-semibold">{complete ? "All steps complete." : "Next: "}</span>
            {!complete && journey.hint}
          </span>
        </div>
      )}
      {footer}
    </>
  );

  if (bare) return body;
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-paper p-5 sm:p-6" aria-label={title}>
      <CardHeader icon={Route} title={title} description={description} />
      {body}
    </section>
  );
}
