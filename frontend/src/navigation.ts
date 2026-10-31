import { useSyncExternalStore } from "react";
export class NavigationSignal extends Error {
  constructor(public destination: string, public missing = false) { super(destination); }
}
let navigationVersion = 0;
export const notifyNavigation = () => { navigationVersion++; window.dispatchEvent(new Event("track-navigation")); };
export function navigate(href: string, replace = false) {
  if (!href.startsWith("/") || href.startsWith("//")) { window.location.assign(href); return; }
  if (replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
  notifyNavigation();
}
function subscribe(listener: () => void) {
  window.addEventListener("popstate",listener);
  window.addEventListener("track-navigation",listener);
  return () => {window.removeEventListener("popstate",listener);window.removeEventListener("track-navigation",listener);};
}
export function useLocation() {
  return useSyncExternalStore(subscribe,()=>window.location.pathname+window.location.search+"#nav="+navigationVersion,()=>"/");
}
export function usePathname() { useLocation(); return window.location.pathname; }
export function useRouter() { return {push:navigate,replace:(url:string)=>navigate(url,true),refresh:notifyNavigation,back:()=>window.history.back()}; }
export function useSearchParams() { useLocation(); return new URLSearchParams(window.location.search); }
export function redirect(url:string):never { throw new NavigationSignal(url); }
export function notFound():never { throw new NavigationSignal("",true); }
