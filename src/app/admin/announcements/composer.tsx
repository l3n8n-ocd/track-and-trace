"use client";

import { useState } from "react";
import { Eye, Megaphone, Send } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Field, ICON_STROKE, Input, Notice, Textarea } from "@/components/ui";

// New announcement form with a live preview of how it looks on the user
// dashboard.
export function AnnouncementComposer({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="Title" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            icon={Megaphone}
            maxLength={150}
            required
            placeholder="e.g. Unclaimed items drive on November 15"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Message" htmlFor="body" required hint={`${body.length} characters`}>
          <Textarea
            id="body"
            name="body"
            rows={5}
            required
            placeholder="What should students, faculty, and staff know? Include dates, times, and the room."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <SubmitButton pendingText="Posting…">
          <Send aria-hidden />
          Post announcement
        </SubmitButton>
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Eye aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-crimson" />
          Preview on the user dashboard
        </p>
        <div className="rounded-2xl bg-sand/60 p-4">
          <Notice tone="rust" icon={Megaphone} title={title || "Your title"} meta="Today">
            <span className="whitespace-pre-line">{body || "Your message appears here."}</span>
          </Notice>
        </div>
      </div>
    </form>
  );
}
