import type { ReactNode } from "react";

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-[28px] font-bold leading-tight text-ink sm:text-[32px]">{title}</h1>
      {children && <div className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-muted">{children}</div>}
    </div>
  );
}
