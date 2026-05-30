import { cn } from "@/lib/utils";

interface EngagementBarProps {
  rate: number;
  accent: "blue" | "green";
}

export function EngagementBar({ rate, accent }: EngagementBarProps) {
  const capped = Math.min(Math.max(rate, 0), 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.07em] font-semibold">
          Engagement Rate
        </span>
        <span
          className={cn(
            "text-xs font-bold font-mono",
            accent === "blue" ? "text-accent-blue" : "text-accent-green"
          )}
        >
          {capped.toFixed(1)}%
        </span>
      </div>

      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            accent === "blue" ? "bg-accent-blue" : "bg-accent-green"
          )}
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  );
}
