import { PreviewCard } from "@base-ui/react/preview-card";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CitationPayload } from "@shared/events";

type VideoPlatform = "youtube" | "instagram" | "twitter";

interface CitationBadgeProps {
  video: "A" | "B";
  /** Literal start label from the inline marker, e.g. "1:23". */
  timestamp: string;
  platform: VideoPlatform;
  /** Resolved transcript range + text. Absent until the backend resolves the marker. */
  citation?: CitationPayload;
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
  twitter: "X / Twitter",
};

export function CitationBadge({ video, timestamp, platform, citation }: CitationBadgeProps) {
  const isA = video === "A";
  const Icon = PLATFORM_ICON[platform];
  const platformLabel = PLATFORM_LABEL[platform];

  const startLabel = citation?.timestampLabel ?? timestamp;
  const endLabel = citation?.endTimestampLabel;
  const range = endLabel && endLabel !== startLabel ? `${startLabel} – ${endLabel}` : startLabel;

  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        // Render inline so the badge sits naturally inside a markdown paragraph.
        render={<span />}
        delay={200}
        closeDelay={120}
        className={cn(
          "inline-flex items-center gap-[3px] px-1.5 h-[18px] rounded-[5px] align-middle mx-[1px]",
          "text-[9px] font-bold font-mono cursor-pointer select-none",
          "ring-1 ring-inset transition-colors duration-150",
          isA
            ? "bg-foreground/12 text-foreground ring-foreground/25 hover:bg-foreground/20"
            : "bg-muted-foreground/12 text-muted-foreground ring-border hover:bg-muted-foreground/20",
        )}
      >
        <Icon size={8} />
        {video}
      </PreviewCard.Trigger>

      <PreviewCard.Portal>
        <PreviewCard.Positioner side="top" align="center" sideOffset={8} collisionPadding={12}>
          <PreviewCard.Popup
            className={cn(
              "w-[280px] rounded-xl overflow-hidden z-50",
              "bg-popover border border-border shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            )}
          >
            {/* Header — platform identity + time range */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/60">
              <span
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  isA ? "bg-foreground/15 text-foreground" : "bg-muted-foreground/15 text-muted-foreground",
                )}
              >
                <Icon size={14} />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[12px] font-semibold text-foreground leading-none">
                  Video {video}
                </span>
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.08em] leading-none">
                  {platformLabel}
                </span>
              </div>
              <span className="ml-auto flex items-center gap-1 shrink-0 text-[10px] font-mono text-muted-foreground tabular-nums">
                <Clock size={10} strokeWidth={2} />
                {range}
              </span>
            </div>

            {/* Cited transcript — highlighted passage */}
            {citation?.snippet ? (
              <div className="px-3 py-2.5 max-h-[180px] overflow-y-auto custom-scrollbar">
                <p className="text-[11.5px] leading-[1.65] text-foreground/90">
                  <mark
                    className={cn(
                      "rounded px-0.5 py-px box-decoration-clone text-foreground",
                      isA ? "bg-foreground/12" : "bg-muted-foreground/15",
                    )}
                  >
                    {citation.snippet}
                  </mark>
                </p>
              </div>
            ) : (
              <div className="px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground/60 italic">
                  Transcript segment unavailable.
                </p>
              </div>
            )}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
