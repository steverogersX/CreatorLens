import { Eye, ThumbsUp, MessageSquare, Clock, Heart, Bookmark, BarChart2, RefreshCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
}

const PLATFORM_STATS: Record<"youtube" | "instagram" | "twitter", StatDef[]> = {
  youtube: [
    { key: "views",    Icon: Eye,           label: "Views"    },
    { key: "likes",    Icon: ThumbsUp,      label: "Likes"    },
    { key: "comments", Icon: MessageSquare, label: "Comments" },
    { key: "duration", Icon: Clock,         label: "Duration" },
  ],
  instagram: [
    { key: "likes",    Icon: Heart,         label: "Likes"    },
    { key: "views",    Icon: Eye,           label: "Views"    },
    { key: "comments", Icon: MessageSquare, label: "Comments" },
    { key: "duration", Icon: Bookmark,      label: "Saved"    },
  ],
  twitter: [
    { key: "views",    Icon: BarChart2,     label: "Impressions" },
    { key: "likes",    Icon: Heart,         label: "Likes"       },
    { key: "comments", Icon: MessageSquare, label: "Replies"     },
    { key: "duration", Icon: RefreshCcw,    label: "Retweets"    },
  ],
};

export function StatsRow({ views, likes, comments, duration, platform = "youtube" }: StatsRowProps) {
  const values: Record<StatKey, string> = { views, likes, comments, duration };
  const stats = PLATFORM_STATS[platform];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {stats.map(({ key, Icon, label }) => (
        <div
          key={`${platform}-${key}`}
          className="bg-secondary rounded-lg px-2 py-2 flex flex-col gap-1"
        >
          <div className="flex items-center gap-1">
            <Icon size={9} className="text-muted-foreground" strokeWidth={2} />
            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.07em] font-semibold">
              {label}
            </span>
          </div>
          <span className="text-[11px] font-bold text-foreground font-mono tracking-tight">
            {values[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
