import { cn } from "@/lib/utils";

type VideoPlatform = "youtube" | "instagram" | "twitter";

interface CitationBadgeProps {
  video: "A" | "B";
  timestamp?: string;
  chunk?: number;
  platform?: VideoPlatform;
}

function YTIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden>
      <path d="M1.5 1.2L6.5 4 1.5 6.8V1.2z" />
    </svg>
  );
}

function IGIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden>
      <rect x="0.5" y="0.5" width="7" height="7" rx="2" />
      <circle cx="4" cy="4" r="1.6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <path d="M1 1l5 5M6 1L1 6" />
    </svg>
  );
}

const PLATFORM_ICON: Record<VideoPlatform, React.FC> = {
  youtube: YTIcon,
  instagram: IGIcon,
  twitter: XIcon,
};

const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  twitter: "Twitter / X",
};

export function CitationBadge({ video, timestamp, platform = "youtube" }: CitationBadgeProps) {
  const isA = video === "A";
  const Icon = PLATFORM_ICON[platform];
  const tooltipText = timestamp ? `Video ${video} · ${timestamp}` : `Video ${video}`;
  const platformLabel = PLATFORM_LABEL[platform];

  return (
    <span className="relative group/cite inline-flex items-center align-middle mx-[1px]">
      {/* Badge pill */}
      <span
        className={cn(
          "inline-flex items-center gap-[3px] px-1.5 h-[18px] rounded-[4px]",
          "text-[9px] font-black font-mono cursor-default select-none",
          "transition-all duration-150",
          isA
            ? "bg-accent-blue/15 text-accent-blue ring-1 ring-inset ring-accent-blue/35 group-hover/cite:bg-accent-blue/28"
            : "bg-accent-green/15 text-accent-green ring-1 ring-inset ring-accent-green/35 group-hover/cite:bg-accent-green/28"
        )}
      >
        <Icon />
        {video}
      </span>

      {/* Tooltip */}
      <span className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <span
          className={cn(
            "flex flex-col gap-1 px-3 py-2 rounded-xl whitespace-nowrap",
            "bg-card border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
            "opacity-0 group-hover/cite:opacity-100 transition-opacity duration-150 delay-100"
          )}
        >
          <span className="flex items-center gap-2">
            <span className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0",
              isA ? "bg-accent-blue/20 text-accent-blue" : "bg-accent-green/20 text-accent-green"
            )}>
              <Icon />
            </span>
            <span className="text-[11px] font-mono text-foreground/90">{tooltipText}</span>
          </span>
          <span className="text-[9px] text-muted-foreground/50 font-mono pl-7 uppercase tracking-[0.08em]">
            {platformLabel}
          </span>
        </span>

        {/* Arrow */}
        <span className="block w-0 h-0 mx-auto border-x-[5px] border-x-transparent border-t-[5px] border-t-card" />
      </span>
    </span>
  );
}
