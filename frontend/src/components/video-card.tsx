"use client";

import { Users, Play, Zap, ImageIcon, Film, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatsRow } from "@/components/stats-row";
import { EngagementBar } from "@/components/engagement-bar";
import { motion } from "framer-motion";

export type Platform = "youtube" | "instagram" | "twitter";
export type VideoType = "video" | "short" | "post" | "reel";
export type VideoAccent = "a" | "b";

export interface VideoData {
  label: "A" | "B";
  accent: VideoAccent;
  platform: Platform;
  videoType: VideoType;
  videoId: string;
  title: string;
  creator: string;
  followers: string;
  views: string;
  likes: string;
  comments: string;
  duration: string;
  engagementRate: number;
  thumbnailUrl?: string;
  sourceUrl?: string;
  retweets?: string;
}

const ASPECT_CLASS: Record<string, string> = {
  "youtube:video":  "aspect-video",
  "youtube:short":  "aspect-[9/16]",
  "instagram:post": "aspect-square",
  "instagram:reel": "aspect-[9/16]",
  "twitter:video":  "aspect-video",
};

const VIDEO_TYPE_META: Record<VideoType, {
  label: string;
  Icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
}> = {
  video: { label: "Video", Icon: Film },
  short: { label: "Short", Icon: Zap },
  post:  { label: "Post",  Icon: ImageIcon },
  reel:  { label: "Reel",  Icon: Play },
};

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TwitterXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const PLATFORM_META: Record<Platform, { name: string; Icon: React.FC<{ className?: string }>; embedUrl: (id: string) => string }> = {
  youtube: {
    name: "YouTube",
    Icon: YouTubeIcon,
    embedUrl: (id) => `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
  },
  instagram: {
    name: "Instagram",
    Icon: InstagramIcon,
    embedUrl: (id) => `https://www.instagram.com/p/${id}/embed`,
  },
  twitter: {
    name: "X",
    Icon: TwitterXIcon,
    embedUrl: (id) => `https://platform.twitter.com/embed/Tweet.html?id=${id}`,
  },
};

// Two tones of the monochrome scale — A is bright, B is muted.
const BADGE_STYLE: Record<VideoAccent, string> = {
  a: "bg-foreground text-background",
  b: "bg-secondary text-foreground border border-border",
};

interface VideoCardProps {
  video: VideoData;
  index?: number;
  isLoading?: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-accent/60 animate-pulse", className)} />;
}

export function VideoCard({ video, index = 0, isLoading = false }: VideoCardProps) {
  const { label, accent, platform, videoType, videoId, title, creator, followers } = video;
  const cfg = PLATFORM_META[platform];
  const typeMeta = VIDEO_TYPE_META[videoType] ?? VIDEO_TYPE_META["video"];
  const { Icon: PlatformIcon } = cfg;
  const { Icon: TypeIcon } = typeMeta;
  const aspectClass = ASPECT_CLASS[`${platform}:${videoType}`] ?? "aspect-video";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-3.5 p-3.5 min-w-0"
    >
      {/* Platform + A/B label */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-secondary text-muted-foreground shrink-0">
          <PlatformIcon className="w-3.5 h-3.5 shrink-0 text-foreground/70" />
          <span className="leading-none">{cfg.name}</span>
        </div>

        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "text-[11px] font-bold uppercase tracking-widest shrink-0",
          BADGE_STYLE[accent],
        )}>
          Video {label}
        </div>
      </div>

      {/* Embed / thumbnail */}
      <div className={cn("relative w-full rounded-xl overflow-hidden border border-border bg-black", aspectClass)}>
        {platform === "youtube" && videoId ? (
          <iframe
            src={cfg.embedUrl(videoId)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : video.thumbnailUrl ? (
          /* Social platforms: thumbnail image + "watch on platform" overlay */
          <a
            href={video.sourceUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
              <PlatformIcon className="w-5 h-5 text-white" />
              <span className="text-white text-[12px] font-semibold">Watch on {cfg.name}</span>
            </div>
          </a>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-accent/40">
            <PlatformIcon className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Type chip + title */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="inline-flex items-center gap-1">
          <TypeIcon size={11} strokeWidth={2.5} className="text-muted-foreground/50" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {typeMeta.label}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-1.5 mt-0.5">
            <Skeleton className="h-[15px] w-full" />
            <Skeleton className="h-[15px] w-3/4" />
          </div>
        ) : (
          <p className="text-[13.5px] font-semibold leading-[1.4] line-clamp-2 text-foreground tracking-tight">
            {title || <span className="text-muted-foreground/40 italic font-normal">Loading…</span>}
          </p>
        )}
      </div>

      {/* Creator row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border bg-secondary min-w-0">
        {isLoading ? (
          <Skeleton className="h-3.5 w-28" />
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <BadgeCheck size={13} strokeWidth={2} className="shrink-0 text-muted-foreground" />
            <span className="text-[12px] font-semibold leading-none truncate text-foreground">
              {creator || "—"}
            </span>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-3 w-14 shrink-0" />
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
            <Users size={11} strokeWidth={2} />
            <span className="text-[11px] font-mono font-medium tabular-nums">{followers || "—"}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[52px]" />
          ))}
        </div>
      ) : (
        <StatsRow
          views={video.views}
          likes={video.likes}
          comments={video.comments}
          duration={video.duration}
          retweets={video.retweets}
          platform={platform}
        />
      )}

      {/* Engagement */}
      {isLoading ? (
        <Skeleton className="h-[60px] rounded-xl" />
      ) : (
        <EngagementBar rate={video.engagementRate} accent={accent} />
      )}
    </motion.div>
  );
}
