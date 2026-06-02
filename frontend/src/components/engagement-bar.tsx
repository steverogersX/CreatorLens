import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoAccent } from "@/components/video-card";

interface EngagementBarProps {
  rate: number;
  accent: VideoAccent;
}

function rateLabel(rate: number): string {
  if (rate >= 6) return "Excellent";
  if (rate >= 3) return "Good";
  if (rate >= 1) return "Average";
  return "Low";
}

export function EngagementBar({ rate, accent }: EngagementBarProps) {
  const capped = Math.min(Math.max(rate, 0), 100);
  const badge = rateLabel(capped);
  // A = bright fill, B = muted fill — keeps the two cards distinguishable.
  const fill = accent === "a" ? "bg-foreground" : "bg-muted-foreground";

  return (
    <div className="flex flex-col gap-2.5 rounded-xl px-3 py-2.5 border border-border bg-secondary">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} strokeWidth={2} className="text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground leading-none">
            Engagement
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium leading-none text-muted-foreground/70">
            {badge}
          </span>
          <span className="text-[14px] font-bold font-mono tabular-nums leading-none text-foreground">
            {capped.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", fill)}
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  );
}
