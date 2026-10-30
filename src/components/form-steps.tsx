"use client";

import { Check, CircleAlert, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ICON_STROKE, cn } from "./ui";

// Guided forms: every step stays on one page (so the whole form can be
// reviewed and submitted at once), and a step tracker shows which sections
// are complete, which one you're in, and which have errors.

export type StepDef = {
  id: string;
  label: string;
  // Fields that must have a value for the step to count as complete. When
  // empty, the step is complete as soon as any of `fields` has a value.
  required: string[];
  fields?: string[];
};

function hasValue(form: HTMLFormElement, name: string) {
  const el = form.elements.namedItem(name);
  if (!el) return false;
  if (el instanceof RadioNodeList) {
    return Array.from(el).some((n) => n instanceof HTMLInputElement && (n.type === "checkbox" || n.type === "radio") ? n.checked : Boolean((n as HTMLInputElement).value?.trim()));
  }
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox" || el.type === "radio") return el.checked;
    if (el.type === "file") return (el.files?.length ?? 0) > 0;
  }
  return Boolean((el as HTMLInputElement).value?.trim());
}

function useStepState(formId: string, steps: StepDef[]) {
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  const [active, setActive] = useState<string | undefined>(steps[0]?.id);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const update = () =>
      setDone(
        steps.map((s) =>
          s.required.length ? s.required.every((n) => hasValue(form, n)) : (s.fields ?? []).some((n) => hasValue(form, n)),
        ),
      );
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    const onFocus = (e: FocusEvent) => {
      const section = (e.target as HTMLElement).closest("[data-step]");
      if (section) setActive(section.getAttribute("data-step") ?? undefined);
    };
    form.addEventListener("focusin", onFocus);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
      form.removeEventListener("focusin", onFocus);
    };
  }, [formId, steps]);

  // Highlight the section in view while scrolling.
  useEffect(() => {
    const sections = steps.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [steps]);

  return { done, active };
}

// Horizontal stepper across the top of a guided form: evenly spaced,
// centered steps joined by a line that fills as steps are completed.
export function StepTracker({
  formId,
  steps,
  errors = {},
  className,
}: {
  formId: string;
  steps: StepDef[];
  errors?: Record<string, string>;
  className?: string;
}) {
  const { done, active } = useStepState(formId, steps);
  const completed = done.filter(Boolean).length;
  const errored = steps.map((s) => [...s.required, ...(s.fields ?? [])].some((f) => errors[f]));
  const activeIndex = Math.max(0, steps.findIndex((s) => s.id === active));

  return (
    <nav aria-label="Form progress" className={cn("rounded-2xl bg-oxblood px-4 pb-4 pt-3.5 text-cream sm:px-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/70">Your progress</p>
        <p className="text-xs font-semibold tabular-nums text-cream">
          {completed === steps.length ? "All set" : `${completed} of ${steps.length} complete`}
        </p>
      </div>
      <ol className="mt-3.5 grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => {
          const isActive = i === activeIndex;
          const state = errored[i] && !done[i] ? "error" : done[i] ? "done" : isActive ? "active" : "todo";
          return (
            <li key={s.id} className="relative">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 rounded-full transition-colors duration-500",
                    done[i - 1] ? "bg-amber" : "bg-cream/20",
                  )}
                />
              )}
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "step" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(s.id);
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  el?.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea")?.focus({ preventScroll: true });
                }}
                className="group relative flex flex-col items-center gap-1.5 rounded-xl px-1 text-center"
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                    state === "done" && "bg-amber text-ink",
                    state === "error" && "bg-berry text-cream ring-2 ring-cream/70",
                    state === "active" && "bg-cream text-oxblood ring-4 ring-cream/20",
                    state === "todo" && "bg-oxblood text-cream/70 ring-2 ring-inset ring-cream/30 group-hover:ring-cream/60",
                  )}
                >
                  {state === "done" ? (
                    <Check aria-hidden strokeWidth={3} className="size-4" />
                  ) : state === "error" ? (
                    <CircleAlert aria-hidden strokeWidth={2.5} className="size-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-xs font-semibold sm:text-[13px]",
                    state === "error" ? "text-[#ffb3c4]" : isActive || state === "done" ? "text-cream" : "text-cream/65",
                    !isActive && "max-sm:sr-only",
                  )}
                >
                  {s.label}
                </span>
                <span className="sr-only">
                  {state === "done" ? "(complete)" : state === "error" ? "(needs attention)" : ""}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// A numbered section of a guided form.
export function FormSection({
  id,
  step,
  title,
  description,
  icon: Icon,
  optional,
  children,
  className,
}: {
  id: string;
  step: number;
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      data-step={id}
      className={cn("scroll-mt-24 rounded-2xl border border-line bg-paper p-5 sm:p-6", className)}
    >
      <header className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-oxblood font-display text-sm font-bold text-cream">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold text-ink">
            {Icon && <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-crimson" />}
            {title}
            {optional && (
              <span className="rounded-full bg-sand px-1.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Optional
              </span>
            )}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
