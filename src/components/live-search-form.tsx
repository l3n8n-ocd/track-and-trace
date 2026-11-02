"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";

// GET filters share one debounced navigation path on Next.js and Firebase.
// Keep submit available for keyboards and browsers without JavaScript.
export function LiveSearchForm({ children, ...props }: ComponentProps<"form">) {
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const composing = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const sync = (force = false) => {
      const params = new URLSearchParams(window.location.search);
      for (const field of Array.from(el.elements)) {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) continue;
        if (!field.name || field.type === "hidden" || !force && field === document.activeElement) continue;
        field.value = params.get(field.name) ?? "";
      }
    };
    sync();
    const back = () => sync(true);
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [query]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = () => {
    clearTimeout(timer.current);
    const el = form.current;
    if (!el || composing.current) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(el)) {
      if (typeof value === "string" && value.trim() && key !== "page") params.append(key, value.trim());
    }
    const current = new URLSearchParams(window.location.search);
    current.delete("page");
    current.sort();
    const comparison = new URLSearchParams(params);
    comparison.sort();
    if (current.toString() === comparison.toString() && !new URLSearchParams(window.location.search).has("page")) return;
    routerRef.current.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  return <form {...props} ref={form} method="get"
    onInput={() => { clearTimeout(timer.current); timer.current = setTimeout(search, 350); }}
    onChange={(event) => {
      if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement && event.target.type === "date") search();
    }}
    onCompositionStart={() => { composing.current = true; clearTimeout(timer.current); }}
    onCompositionEnd={() => { composing.current = false; clearTimeout(timer.current); timer.current = setTimeout(search, 350); }}
    onSubmit={(event) => { event.preventDefault(); search(); }}
  >{children}</form>;
}
