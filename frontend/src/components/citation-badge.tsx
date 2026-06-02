import { cn } from "@/lib/utils";

type VideoPlatform = "youtube" | "instagram" | "twitter";

interface CitationBadgeProps {
  video: "A" | "B";
  timestamp?: string;
  chunk?: number;
  platform?: VideoPlatform;
  snippet?: string;
}

function YTIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IGIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function XIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type PlatformIconComponent = React.FC<{ size?: number }>;

const PLATFORM_ICON: Record<VideoPlatform, PlatformIconComponent> = {
  youtube: YTIcon,
  instagram: IGIcon,
  twitter: XIcon,
};

const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  twitter: "Twitter / X",
};

export function CitationBadge({ video, timestamp, platform = "youtube", snippet }: CitationBadgeProps) {
  const isA = video === "A";
  const Icon = PLATFORM_ICON[platform];
  const tooltipText = timestamp ? `Video ${video} · ${timestamp}` : `Video ${video}`;
  const platformLabel = PLATFORM_LABEL[platform];

  return (
    <span className="relative group/cite inline-flex items-center align-middle mx-[1px]">
      {/* Badge pill */}
      <span
        className={cn(
          "inline-flex items-center gap-[3px] px-1.5 h-[18px] rounded-[5px]",
          "text-[9px] font-bold font-mono cursor-default select-none",
          "ring-1 ring-inset transition-colors duration-150",
          isA
            ? "bg-foreground/12 text-foreground ring-foreground/25 group-hover/cite:bg-foreground/20"
            : "bg-muted-foreground/12 text-muted-foreground ring-border group-hover/cite:bg-muted-foreground/20"
        )}
      >
        <Icon size={8} />
        {video}
      </span>

      {/* Popup tooltip */}
      <span className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <span
          className={cn(
            "flex flex-col gap-2 rounded-xl w-[240px]",
            "bg-card border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
            "opacity-0 group-hover/cite:opacity-100 transition-opacity duration-150 delay-100",
            "overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3 pt-3">
            <span className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              isA ? "bg-foreground/15 text-foreground" : "bg-muted-foreground/15 text-muted-foreground"
            )}>
              <Icon size={14} />
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[12px] font-semibold font-mono text-foreground/90 leading-none">
                {tooltipText}
              </span>
              <span className="text-[9px] text-muted-foreground/50 font-mono uppercase tracking-[0.08em]">
                {platformLabel}
              </span>
            </div>
          </div>

          {/* Snippet */}
          {snippet && (
            <>
              <div className="h-px bg-border/50 mx-3" />
              <div className="mx-3 mb-3 rounded-lg px-2.5 py-2 bg-secondary border border-border">
                <p className="text-[11px] leading-[1.6] font-mono text-foreground/80">
                  &ldquo;{snippet}&rdquo;
                </p>
              </div>
            </>
          )}

          {/* No snippet: bottom padding */}
          {!snippet && <div className="pb-1" />}
        </span>

        {/* Arrow */}
        <span className="block w-0 h-0 mx-auto border-x-[5px] border-x-transparent border-t-[5px] border-t-card" />
      </span>
    </span>
  );
}
