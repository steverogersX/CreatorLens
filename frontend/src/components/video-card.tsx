"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatsRow } from "@/components/stats-row";
import { EngagementBar } from "@/components/engagement-bar";
import { motion } from "framer-motion";

export type Platform = "youtube" | "instagram" | "twitter";

export interface VideoData {
  label: "A" | "B";
  accent: "blue" | "green";
  platform: Platform;
  videoId: string;
  title: string;
  creator: string;
  followers: string;
  views: string;
  likes: string;
  comments: string;
  duration: string;
  engagementRate: number;
}

interface PlatformConfig {
  name: string;
  colorClass: string;
  bgDim: string;
  borderClass: string;
  stripClass: string;
  /** Tailwind aspect-ratio class */
  aspectClass: string;
  embedUrl: (id: string) => string;
  Icon: React.FC<{ className?: string }>;
}

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

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  youtube: {
    name: "YouTube",
    colorClass: "text-[#FF4444]",
    bgDim: "bg-[#FF0000]/10",
    borderClass: "border-[#FF0000]/25",
    stripClass: "from-[#FF0000] via-[#FF4444]/60 to-transparent",
    aspectClass: "aspect-video",
    embedUrl: (id) => `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
    Icon: YouTubeIcon,
  },
  instagram: {
    name: "Instagram",
    colorClass: "text-[#E1306C]",
    bgDim: "bg-[#E1306C]/10",
    borderClass: "border-[#E1306C]/25",
    stripClass: "from-[#833AB4] via-[#E1306C]/70 to-[#F77737]/30",
    aspectClass: "aspect-square",
    embedUrl: (id) => `https://www.instagram.com/p/${id}/embed`,
    Icon: InstagramIcon,
  },
  twitter: {
    name: "Twitter / X",
    colorClass: "text-[#1DA1F2]",
    bgDim: "bg-[#1DA1F2]/10",
    borderClass: "border-[#1DA1F2]/25",
    stripClass: "from-[#1DA1F2] via-[#1DA1F2]/50 to-transparent",
    aspectClass: "aspect-video",
    embedUrl: (id) => `https://platform.twitter.com/embed/Tweet.html?id=${id}`,
    Icon: TwitterXIcon,
  },
};

interface VideoCardProps {
  video: VideoData;
  index?: number;
}

export function VideoCard({ video, index = 0 }: VideoCardProps) {
  const { label, accent, platform, videoId, title, creator, followers } = video;
  const cfg = PLATFORM_CONFIG[platform];
  const { Icon } = cfg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08, ease: "easeOut" }}
      className="flex flex-col"
    >
      {/* Platform accent strip */}
      <div className={cn("h-0.5 w-full bg-gradient-to-r", cfg.stripClass)} />

      <div className="flex flex-col p-5 gap-4">

        {/* Platform badge + Video label */}
        <div className="flex items-center justify-between">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
            "text-[10px] font-semibold font-mono tracking-wide border",
            cfg.bgDim, cfg.colorClass, cfg.borderClass
          )}>
            <Icon className="w-3 h-3" />
            {cfg.name}
          </span>

          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border",
            accent === "blue"
              ? "bg-accent-blue/10 text-accent-blue border-accent-blue/20"
              : "bg-accent-green/10 text-accent-green border-accent-green/20"
          )}>
            Video {label}
          </span>
        </div>

        {/* Video embed — aspect ratio driven by platform */}
        <div className={cn(
          "relative w-full rounded-lg overflow-hidden border bg-muted",
          cfg.aspectClass,
          cfg.borderClass
        )}>
          <iframe
            src={cfg.embedUrl(videoId)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {title}
        </p>

        {/* Creator + followers */}
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold font-mono", cfg.colorClass)}>
            {creator}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users size={10} strokeWidth={2} />
            {followers}
          </span>
        </div>

        {/* Stats — labels change per platform */}
        <StatsRow
          views={video.views}
          likes={video.likes}
          comments={video.comments}
          duration={video.duration}
          platform={platform}
        />

        {/* Engagement */}
        <EngagementBar rate={video.engagementRate} accent={accent} />
      </div>
    </motion.div>
  );
}
