import { Backpack, Calculator, Glasses, Headphones, IdCard, Key, Umbrella, Wallet } from "lucide-react";
import { cn } from "./ui";

// The route an item takes: lost somewhere on campus, found somewhere else,
// returned at the Lost and Found Office. A dot travels the path slowly;
// everything stays still for people who prefer reduced motion.
const ROUTE = "M70 590 C 170 470, 40 380, 210 330 S 450 300, 390 200 S 470 70, 540 110";

const PINS = [
  { x: 70, y: 590, kind: "Lost", place: "Library, 2nd floor", dx: 18, dy: -16 },
  { x: 210, y: 330, kind: "Found", place: "Gym lobby", dx: 18, dy: 22 },
  { x: 540, y: 110, kind: "Returned", place: "Lost & Found Office", dx: -190, dy: 40 },
];

const FLOATERS = [
  { Icon: Umbrella, className: "left-[8%] top-[14%] size-10", delay: "0s", r: "-12deg" },
  { Icon: Key, className: "left-[62%] top-[48%] size-8", delay: "-2s", r: "18deg" },
  { Icon: Wallet, className: "left-[78%] top-[72%] size-9", delay: "-4s", r: "-6deg" },
  { Icon: IdCard, className: "left-[30%] top-[64%] size-9", delay: "-1s", r: "8deg" },
  { Icon: Calculator, className: "left-[44%] top-[10%] size-8", delay: "-3s", r: "-14deg" },
  { Icon: Headphones, className: "left-[84%] top-[30%] size-8", delay: "-5s", r: "10deg" },
  { Icon: Backpack, className: "left-[12%] top-[40%] size-8", delay: "-6s", r: "6deg" },
  { Icon: Glasses, className: "left-[56%] top-[84%] size-8", delay: "-2.5s", r: "-8deg" },
];

export function TraceAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none relative", className)} aria-hidden>
      {FLOATERS.map(({ Icon, className: c, delay, r }, i) => (
        <Icon
          key={i}
          strokeWidth={1.5}
          className={cn("animate-drift absolute text-cream/20", c)}
          style={{ animationDelay: delay, ["--r" as string]: r }}
        />
      ))}
      <svg viewBox="0 0 600 680" className="relative h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="route" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#F5F5ED" stopOpacity="0.25" />
            <stop offset="1" stopColor="#FF9002" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#FF9002" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FF9002" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={ROUTE} fill="none" stroke="#F5F5ED" strokeOpacity="0.12" strokeWidth="14" strokeLinecap="round" />
        <path
          d={ROUTE}
          fill="none"
          stroke="url(#route)"
          strokeWidth="2.5"
          strokeDasharray="2 10"
          strokeLinecap="round"
          className="animate-trace"
        />
        {PINS.map((p) => (
          <g key={p.kind} transform={`translate(${p.x} ${p.y})`}>
            <circle r="18" fill="#FF9002" fillOpacity="0.18" className="animate-ping-soft" style={{ transformOrigin: "center", transformBox: "fill-box" }} />
            <circle r="9" fill={p.kind === "Returned" ? "#FF9002" : "#F5F5ED"} />
            <circle r="3.5" fill="#670001" />
            <g transform={`translate(${p.dx} ${p.dy})`}>
              <rect width="172" height="46" rx="10" fill="#1f1718" fillOpacity="0.35" stroke="#F5F5ED" strokeOpacity="0.22" />
              <text x="14" y="19" fill="#FF9002" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fontFamily="var(--font-archivo)">
                {p.kind.toUpperCase()}
              </text>
              <text x="14" y="35" fill="#F5F5ED" fontSize="13" fontFamily="var(--font-dm-sans)">
                {p.place}
              </text>
            </g>
          </g>
        ))}
        <g className="motion-reduce:hidden">
          <circle r="22" fill="url(#glow)">
            <animateMotion dur="10s" repeatCount="indefinite" path={ROUTE} keyPoints="0;1;1" keyTimes="0;0.85;1" calcMode="linear" />
          </circle>
          <circle r="6" fill="#FF9002" stroke="#F5F5ED" strokeWidth="2">
            <animateMotion dur="10s" repeatCount="indefinite" path={ROUTE} keyPoints="0;1;1" keyTimes="0;0.85;1" calcMode="linear" />
          </circle>
        </g>
      </svg>
    </div>
  );
}

// Gradient panel with grain, used by the auth pages and banners.
export function EmberPanel({ className, children, fluted = true }: { className?: string; children?: React.ReactNode; fluted?: boolean }) {
  return (
    <div className={cn("bg-ember relative isolate overflow-hidden text-cream", className)}>
      {fluted && <div aria-hidden className="fluted absolute inset-0 -z-10 opacity-70" />}
      <div aria-hidden className="noise absolute inset-0 -z-10" />
      {children}
    </div>
  );
}
