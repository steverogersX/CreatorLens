import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EngagementBarProps {
  rate: number;
  accent: "blue" | "green";
}

const ACCENT = {
  blue: {
    text: "text-blue-400",
    gradient: "from-blue-500 via-blue-400 to-blue-300",
    bg: "bg-blue-500/8",
    border: "border-blue-500/18",
    icon: "text-blue-400",
  },
  green: {
    text: "text-emerald-400",
    gradient: "from-emerald-500 via-emerald-400 to-emerald-300",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/18",
    icon: "text-emerald-400",
  },
};

function rateLabel(rate: number): { text: string; color: string } {
  if (rate >= 6) return { text: "Excellent", color: "text-emerald-400" };
  if (rate >= 3) return { text: "Good",      color: "text-blue-400"    };
  if (rate >= 1) return { text: "Average",   color: "text-amber-400"   };
  return              { text: "Low",         color: "text-muted-foreground/50" };
}

export function EngagementBar({ rate, accent }: EngagementBarProps) {
  const capped = Math.min(Math.max(rate, 0), 100);
  const a = ACCENT[accent];
  const badge = rateLabel(capped);

  return (
    <div className={cn("flex flex-col gap-2.5 rounded-xl px-3 py-2.5 border", a.bg, a.border)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} strokeWidth={2} className={a.icon} />
          <span className="text-[11px] font-semibold text-muted-foreground/70 leading-none">
            Engagement
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-semibold leading-none", badge.color)}>
            {badge.text}
          </span>
          <span className={cn("text-[14px] font-bold font-mono tabular-nums leading-none", a.text)}>
            {capped.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
            a.gradient,
          )}
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  );
}
