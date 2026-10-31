import { routes } from "../generated/routes";
import { loadLayout, type Section } from "./layouts";

export function matchRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  for (const route of routes) {
    const pattern = route.path.split("/").filter(Boolean);
    if (pattern.length !== parts.length) continue;
    const params: Record<string, string> = {};
    try {
      if (pattern.every((part, index) => part.startsWith("[")
        ? (params[part.slice(1, -1)] = decodeURIComponent(parts[index]), true)
        : part === parts[index])) return { route, params };
    } catch { return null; }
  }
  return null;
}

export function prefetchRoute(href: string) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
  const match = matchRoute(url.pathname);
  if (!match || url.pathname === window.location.pathname) return;
  // Import code only. Hovering never requests personal data or executes actions.
  void Promise.all([match.route.load(), loadLayout(match.route.layout as Section)]).catch(() => {});
}
