"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { ICON_STROKE, cn, fieldClass } from "./ui";

// Password field with a lock icon and a show/hide toggle.
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeOff : Eye;
  return (
    <div className="group relative">
      <Lock
        aria-hidden
        strokeWidth={ICON_STROKE}
        className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-crimson"
      />
      <input type={visible ? "text" : "password"} className={cn(fieldClass, "h-11 pl-11 pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted hover:bg-sand hover:text-ink"
      >
        <Toggle aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
      </button>
    </div>
  );
}
