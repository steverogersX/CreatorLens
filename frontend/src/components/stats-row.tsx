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
  platform?: "youtube" | "instagram" | "twitter";
}

type StatKey = "views" | "likes" | "comments" | "duration";

interface StatDef {
  key: StatKey;
  Icon: LucideIcon;
  label: string;
  iconClass: string;
}

const PLATFORM_STATS: Record<"youtube" | "instagram" | "twitter", StatDef[]> = {
  youtube: [
    { key: "views",    Icon: Eye,           label: "Views",    iconClass: "text-[#FF4040]"          },
    { key: "likes",    Icon: ThumbsUp,      label: "Likes",    iconClass: "text-[#FF4040]"          },
    { key: "comments", Icon: MessageSquare, label: "Comments", iconClass: "text-muted-foreground/50" },
    { key: "duration", Icon: Clock,         label: "Duration", iconClass: "text-muted-foreground/50" },
  ],
  instagram: [
    { key: "likes",    Icon: Heart,         label: "Likes",    iconClass: "text-[#E1306C]"          },
    { key: "views",    Icon: Eye,           label: "Views",    iconClass: "text-[#C13584]"          },
    { key: "comments", Icon: MessageSquare, label: "Comments", iconClass: "text-muted-foreground/50" },
    { key: "duration", Icon: Bookmark,      label: "Saves",    iconClass: "text-muted-foreground/50" },
  ],
  twitter: [
    { key: "views",    Icon: BarChart2,     label: "Impressions", iconClass: "text-[#1D9BF0]"          },
    { key: "likes",    Icon: Heart,         label: "Likes",       iconClass: "text-[#F91880]"          },
    { key: "comments", Icon: MessageSquare, label: "Replies",     iconClass: "text-muted-foreground/50" },
    { key: "duration", Icon: Repeat2,       label: "Retweets",    iconClass: "text-[#00BA7C]"          },
  ],
};

export function StatsRow({ views, likes, comments, duration, platform = "youtube" }: StatsRowProps) {
  const values: Record<StatKey, string> = { views, likes, comments, duration };
  const stats = PLATFORM_STATS[platform];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(({ key, Icon, label, iconClass }) => (
        <div
          key={`${platform}-${key}`}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5",
            "bg-muted/30 border border-border/40",
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
