"use client";

import { useActionState } from "react";
import { PhotoInput } from "@/components/photo-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, Field, Input, Select, Textarea } from "@/components/ui";
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
  const [state, formAction] = useActionState<ReportFormState, FormData>(action, {});
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const val = (key: keyof Existing & string) => v[key] ?? (existing?.[key] as string | number | null | undefined)?.toString() ?? "";
  const lost = type === "LOST";

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      {Object.keys(e).length > 0 && <Alert>Please fix the highlighted fields.</Alert>}
      <input type="hidden" name="reportType" value={type} />

      <Card className="space-y-4">
        <h2 className="font-semibold">The item</h2>
        <Field label="What is it?" htmlFor="itemName" error={e.itemName} required hint='A short name, like "black Samsung phone" or "blue umbrella".'>
          <Input id="itemName" name="itemName" defaultValue={val("itemName")} maxLength={150} />
        </Field>
        <Field label="Category" htmlFor="categoryId" error={e.categoryId} required>
          <Select id="categoryId" name="categoryId" defaultValue={val("categoryId")}>
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
            <Input id="color" name="color" defaultValue={val("color")} placeholder="e.g. black" />
          </Field>
          <Field label="Brand" htmlFor="brand" error={e.brand}>
            <Input id="brand" name="brand" defaultValue={val("brand")} placeholder="e.g. Samsung" />
          </Field>
        </div>
        <Field
          label="Description"
          htmlFor="description"
          error={e.description}
          hint="Visible on the matching and admin screens. Describe size, model, case, stickers, and so on."
        >
          <Textarea id="description" name="description" defaultValue={val("description")} maxLength={2000} />
        </Field>
        <Field
          label={lost ? "Details only the owner would know" : "Hidden details (for verifying the owner)"}
          htmlFor="hiddenDetails"
          error={e.hiddenDetails}
          hint={
            lost
              ? "Only you and the administrators see this, e.g. lock screen wallpaper, contents of a wallet, engraving."
              : "Only you and the administrators see this. Note details a real owner could describe, e.g. what's inside, scratches, names written on it. Don't put them in the description."
          }
        >
          <Textarea id="hiddenDetails" name="hiddenDetails" defaultValue={val("hiddenDetails")} maxLength={1000} />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">When and where</h2>
        <Field label={lost ? "Date lost" : "Date found"} htmlFor="dateLostOrFound" error={e.dateLostOrFound} required>
          <Input id="dateLostOrFound" name="dateLostOrFound" type="date" max={today} defaultValue={val("dateLostOrFound") || today} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={lost ? "Where you last had it" : "Where you found it"} htmlFor="locationId" error={e.locationId} required>
            <Select id="locationId" name="locationId" defaultValue={val("locationId")}>
              <option value="">Choose a place…</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Room or exact spot" htmlFor="locationNote" error={e.locationNote} hint="e.g. Room 304, 2nd floor hallway">
            <Input id="locationNote" name="locationNote" defaultValue={val("locationNote")} maxLength={255} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Photos {lost ? "(optional)" : ""}</h2>
        <p className="text-sm text-slate-600">
          {lost
            ? "A photo of the item, or a similar one, helps the office recognize it."
            : "Add at least one clear photo. Photos are blurred in public search results."}{" "}
          Up to 5 images; they&apos;re resized automatically.
        </p>
        {existing && existing.images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {existing.images.map((img) => (
              <label key={img.id} className="flex flex-col items-center gap-1 text-xs text-slate-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-20 w-20 rounded-md object-cover ring-1 ring-slate-200" />
                <span className="flex items-center gap-1">
                  <input type="checkbox" name="removeImage" value={img.id} /> Remove
                </span>
              </label>
            ))}
          </div>
        )}
        <PhotoInput name="photos" />
        {e.photos && <p className="text-xs text-brand-700">{e.photos}</p>}
      </Card>

      {!lost && !existing && (
        <Alert tone="amber">
          After submitting, please bring the item to the Lost and Found Office. It becomes claimable once
          the office receives and verifies it.
        </Alert>
      )}

      <div className="flex justify-end">
        <SubmitButton pendingText={existing ? "Saving…" : "Submitting…"}>
          {existing ? "Save changes" : lost ? "Submit lost report" : "Submit found report"}
        </SubmitButton>
      </div>
    </form>
  );
}
