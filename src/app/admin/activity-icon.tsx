import {
  Archive,
  BadgeCheck,
  CircleX,
  FilePlus,
  FileQuestion,
  Megaphone,
  PackageOpen,
  Settings,
  ShieldCheck,
  TimerOff,
  UserCog,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { ICON_STROKE, cn } from "@/components/ui";

// Picks an icon and accent for an activity log entry from its action text.
function look(action: string, entity: string): { icon: LucideIcon; tone: string } {
  const a = action.toLowerCase();
  if (a.includes("released")) return { icon: BadgeCheck, tone: "bg-oxblood text-cream" };
  if (a.includes("approved")) return { icon: PackageOpen, tone: "bg-amber text-ink" };
  if (a.includes("rejected")) return { icon: CircleX, tone: "bg-berry-tint text-berry" };
  if (a.includes("more proof")) return { icon: FileQuestion, tone: "bg-amber-tint text-amber-deep" };
  if (a.includes("expired") || a.includes("lapsed")) return { icon: TimerOff, tone: "bg-berry-tint text-berry" };
  if (a.includes("verified")) return { icon: ShieldCheck, tone: "bg-crimson-tint text-crimson" };
  if (a.includes("storage")) return { icon: Warehouse, tone: "bg-sand text-ink-soft" };
  if (a.includes("archiv") || a.includes("status")) return { icon: Archive, tone: "bg-sand text-ink-soft" };
  if (a.includes("filed") || a.includes("report")) return { icon: FilePlus, tone: "bg-rust-tint text-rust" };
  if (entity === "announcement") return { icon: Megaphone, tone: "bg-sand text-ink-soft" };
  if (entity === "user") return { icon: UserCog, tone: "bg-sand text-ink-soft" };
  return { icon: Settings, tone: "bg-sand text-ink-soft" };
}

export function ActivityIcon({ action, entity, className }: { action: string; entity: string; className?: string }) {
  const { icon: Icon, tone } = look(action, entity);
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", tone, className)}>
      <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
    </span>
  );
}
