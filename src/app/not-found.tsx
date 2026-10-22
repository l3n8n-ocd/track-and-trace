import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">It may have been moved, or you may not have access to it.</p>
      <Link href="/" className={buttonClass("primary", "md", "mt-6")}>
        Go home
      </Link>
    </div>
  );
}
