import {
  Eye, ThumbsUp, MessageSquare, Clock,
  Heart, Bookmark, BarChart2, Repeat2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsRowProps {
  views: string;
  likes: string;
  comments: string;
  duration: string;
  retweets?: string;
  platform?: "youtube" | "instagram" | "twitter";
}

type StatKey = "views" | "likes" | "comments" | "duration" | "retweets";

interface StatDef {
  key: StatKey;
  Icon: LucideIcon;
  label: string;
  iconClass: string;
}

const ICON_CLASS = "text-muted-foreground";

const PLATFORM_STATS: Record<"youtube" | "instagram" | "twitter", StatDef[]> = {
  youtube: [
    { key: "views",    Icon: Eye,           label: "Views",    iconClass: ICON_CLASS },
    { key: "likes",    Icon: ThumbsUp,      label: "Likes",    iconClass: ICON_CLASS },
    { key: "comments", Icon: MessageSquare, label: "Comments", iconClass: ICON_CLASS },
    { key: "duration", Icon: Clock,         label: "Duration", iconClass: ICON_CLASS },
  ],
  instagram: [
    { key: "likes",    Icon: Heart,         label: "Likes",    iconClass: ICON_CLASS },
    { key: "views",    Icon: Eye,           label: "Views",    iconClass: ICON_CLASS },
    { key: "comments", Icon: MessageSquare, label: "Comments", iconClass: ICON_CLASS },
    { key: "duration", Icon: Bookmark,      label: "Saves",    iconClass: ICON_CLASS },
  ],
  twitter: [
    { key: "views",    Icon: BarChart2,     label: "Impressions", iconClass: ICON_CLASS },
    { key: "likes",    Icon: Heart,         label: "Likes",       iconClass: ICON_CLASS },
    { key: "comments", Icon: MessageSquare, label: "Replies",     iconClass: ICON_CLASS },
    { key: "retweets", Icon: Repeat2,       label: "Retweets",    iconClass: ICON_CLASS },
  ],
};

export function StatsRow({ views, likes, comments, duration, retweets, platform = "youtube" }: StatsRowProps) {
  const values: Record<StatKey, string> = { views, likes, comments, duration, retweets: retweets ?? "—" };
  const stats = PLATFORM_STATS[platform];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(({ key, Icon, label, iconClass }) => (
        <div
          key={`${platform}-${key}`}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-w-0",
            "bg-secondary border border-border",
          )}
        >
          <div className="shrink-0">
            <Icon size={15} strokeWidth={1.8} className={iconClass} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-medium text-muted-foreground/60 leading-none truncate">
              {label}
            </span>
            <span className="text-[13px] font-bold text-foreground font-mono leading-none tracking-tight tabular-nums">
              {values[key] || "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
