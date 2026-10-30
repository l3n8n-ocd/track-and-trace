"use client";

import { useMemo } from "react";
import {
  Brush,
  CalendarDays,
  Camera,
  DoorOpen,
  EyeOff,
  ListChecks,
  MapPin,
  Package,
  Send,
  Smartphone,
  Tag,
} from "lucide-react";
import { FormSection, StepTracker, type StepDef } from "@/components/form-steps";
import { PhotoInput } from "@/components/photo-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { useActionForm } from "@/components/use-action-form";
import type { ReportFormState } from "./actions";

type Category = { id: number; name: string; children: { id: number; name: string }[] };
type Place = { id: number; label: string };
type Existing = {
  itemName: string;
  categoryId: number;
  description: string | null;
  hiddenDetails: string | null;
  color: string | null;
  brand: string | null;
  dateLostOrFound: string;
  locationId: number;
  locationNote: string | null;
  images: { id: number; url: string }[];
};

export function ReportForm({
  type,
  categories,
  places,
  today,
  action,
  existing,
}: {
  type: "LOST" | "FOUND";
  categories: Category[];
  places: Place[];
  today: string;
  action: (state: ReportFormState, formData: FormData) => Promise<ReportFormState>;
  existing?: Existing;
}) {
  const { state, pending, onSubmit } = useActionForm<ReportFormState>(action, {});
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const val = (key: keyof Existing & string) => v[key] ?? (existing?.[key] as string | number | null | undefined)?.toString() ?? "";
  const lost = type === "LOST";
  const bad = (k: string) => Boolean(e[k]);

  const steps = useMemo<StepDef[]>(
    () => [
      { id: "step-item", label: "The item", required: ["itemName", "categoryId"] },
      { id: "step-where", label: "When and where", required: ["dateLostOrFound", "locationId"] },
      lost || existing
        ? { id: "step-photos", label: "Photos", required: [], fields: ["photos"] }
        : { id: "step-photos", label: "Photos", required: ["photos"] },
    ],
    [lost, existing],
  );

  return (
    <form id="report-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {state.error && <Alert>{state.error}</Alert>}
        {Object.keys(e).length > 0 && <Alert>Please fix the highlighted fields.</Alert>}
        <input type="hidden" name="reportType" value={type} />

        <StepTracker formId="report-form" steps={steps} errors={e} className="sticky top-[76px] z-10" />

        <FormSection
          id="step-item"
          step={1}
          icon={Package}
          title="The item"
          description={lost ? "What did you lose? Be as specific as you can." : "What did you find?"}
        >
          <Field label="What is it?" htmlFor="itemName" error={e.itemName} required hint='A short name, like "black Samsung phone" or "blue umbrella".'>
            <Input id="itemName" name="itemName" icon={Smartphone} placeholder="e.g. Blue Casio fx-991ES calculator" aria-invalid={bad("itemName")} defaultValue={val("itemName")} maxLength={150} />
          </Field>
          <Field label="Category" htmlFor="categoryId" error={e.categoryId} required>
            <Select id="categoryId" name="categoryId" icon={Tag} defaultValue={val("categoryId")} aria-invalid={bad("categoryId")}>
              <option value="">Choose a category…</option>
              {categories.map((c) =>
                c.children.length ? (
                  <optgroup key={c.id} label={c.name}>
                    <option value={c.id}>{c.name} (general)</option>
                    {c.children.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Color" htmlFor="color" error={e.color}>
              <Input id="color" name="color" icon={Brush} defaultValue={val("color")} placeholder="e.g. Black" />
            </Field>
            <Field label="Brand" htmlFor="brand" error={e.brand}>
              <Input id="brand" name="brand" icon={Tag} defaultValue={val("brand")} placeholder="e.g. Samsung" />
            </Field>
          </div>
          <Field
            label="Description"
            htmlFor="description"
            error={e.description}
            hint="Visible on the matching and admin screens. Describe size, model, case, stickers, and so on."
          >
            <Textarea
              id="description"
              name="description"
              placeholder="e.g. Scientific calculator with a clear hard cover and a small name sticker on the front."
              defaultValue={val("description")}
              maxLength={2000}
            />
          </Field>
          <div className="rounded-2xl border border-crimson/15 bg-crimson-tint/40 p-4">
            <Field
              label={lost ? "Details only the owner would know" : "Private details for verifying the owner"}
              htmlFor="hiddenDetails"
              error={e.hiddenDetails}
              hint={
                <span className="flex items-start gap-1.5">
                  <EyeOff aria-hidden strokeWidth={2} className="mt-0.5 size-3.5 shrink-0" />
                  {lost
                    ? "Only you and the administrators see this, e.g. lock screen wallpaper, contents of a wallet, engraving."
                    : "Only you and the administrators see this. Note what a real owner could describe, e.g. what's inside, scratches, names written on it. Keep it out of the description."}
                </span>
              }
            >
              <Textarea
                id="hiddenDetails"
                name="hiddenDetails"
                placeholder={lost ? "e.g. Initials JD scratched near the battery cover" : "e.g. Has a library card inside"}
                defaultValue={val("hiddenDetails")}
                maxLength={1000}
                className="min-h-20"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection id="step-where" step={2} icon={MapPin} title="When and where" description="This is what matching relies on most.">
          <Field label={lost ? "Date lost" : "Date found"} htmlFor="dateLostOrFound" error={e.dateLostOrFound} required hint={lost ? "Your best guess is fine." : undefined}>
            <Input id="dateLostOrFound" name="dateLostOrFound" type="date" icon={CalendarDays} max={today} defaultValue={val("dateLostOrFound") || today} aria-invalid={bad("dateLostOrFound")} className="sm:max-w-xs" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={lost ? "Where you last had it" : "Where you found it"} htmlFor="locationId" error={e.locationId} required>
              <Select id="locationId" name="locationId" icon={MapPin} defaultValue={val("locationId")} aria-invalid={bad("locationId")}>
                <option value="">Choose a place…</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Room or exact spot" htmlFor="locationNote" error={e.locationNote}>
              <Input id="locationNote" name="locationNote" icon={DoorOpen} placeholder="e.g. Room 304, 2nd floor hallway" defaultValue={val("locationNote")} maxLength={255} />
            </Field>
          </div>
        </FormSection>

        <FormSection
          id="step-photos"
          step={3}
          icon={Camera}
          title="Photos"
          optional={lost}
          description={
            lost
              ? "A photo of the item, or a similar one, helps the office recognize it."
              : "Add at least one clear photo. Photos are blurred in public search results."
          }
        >
          {existing && existing.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {existing.images.map((img) => (
                <label key={img.id} className="flex cursor-pointer flex-col items-center gap-1.5 text-xs font-medium text-ink-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="size-24 rounded-xl object-cover ring-1 ring-line" />
                  <span className="flex items-center gap-1.5">
                    <input type="checkbox" name="removeImage" value={img.id} className="accent-crimson" /> Remove
                  </span>
                </label>
              ))}
            </div>
          )}
          <PhotoInput name="photos" label="Add photos" />
          {e.photos && <p className="text-[13px] font-medium text-berry">{e.photos}</p>}
        </FormSection>

        {!existing && (
          <Notice tone={lost ? "neutral" : "amber"} icon={ListChecks} title="What happens next">
            <ol className="mt-1 space-y-1">
              {(lost
                ? ["The office reviews your report.", "We compare it with every found item.", "You're notified when something looks similar."]
                : [
                    "Bring the item to the Lost and Found Office. It becomes claimable once the office receives and verifies it.",
                    "The office stores it safely.",
                    "The owner proves it's theirs before pickup.",
                  ]
              ).map((t, i) => (
                <li key={t} className="flex gap-2">
                  <span className="font-semibold text-ink">{i + 1}.</span>
                  {t}
                </li>
              ))}
            </ol>
          </Notice>
        )}

        <div className="flex flex-col-reverse gap-3 rounded-2xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            {existing ? "Changes are saved to your report right away." : "You can edit or withdraw the report later."}
          </p>
          <SubmitButton pending={pending} size="lg" pendingText={existing ? "Saving…" : "Submitting…"}>
            <Send aria-hidden />
            {existing ? "Save changes" : lost ? "Submit lost report" : "Submit found report"}
          </SubmitButton>
        </div>
    </form>
  );
}
