import { redirect } from "next/navigation";
import Link from "next/link";
import { Aperture, ArrowLeft } from "lucide-react";
import { VideoCard, type VideoData, type Platform } from "@/components/video-card";
import { ChatPanel } from "@/components/chat-panel";
import { LiveStreamView } from "@/components/live-stream-view";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { UIMessage } from "ai";
import type { ThreadVideoRow } from "@/types/thread";

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<{ fresh?: string; a?: string; b?: string }>;
}

function detectPlatform(url: string): Platform {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  return "twitter";
}

function extractVideoId(url: string, platform: Platform): string {
  if (platform === "youtube") {
    return url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? "";
  }
  if (platform === "instagram") {
    return url.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/)?.[1] ?? "";
  }
  return url.match(/status\/(\d+)/)?.[1] ?? "";
}

function buildSkeleton(
  url: string,
  label: "A" | "B",
  accent: "blue" | "green",
): VideoData {
  const platform = detectPlatform(url);
  const videoType =
    platform === "youtube" && url.includes("/shorts/") ? "short" :
    platform === "instagram" && url.includes("/reel/") ? "reel" :
    platform === "instagram" ? "post" :
    "video" as const;
  return {
    label,
    accent,
    platform,
    videoType,
    videoId: extractVideoId(url, platform),
    title: "",
    creator: "",
    followers: "",
    views: "",
    likes: "",
    comments: "",
    duration: "",
    engagementRate: 0,
  };
}

function videoRowToData(row: ThreadVideoRow, label: "A" | "B", accent: "blue" | "green"): VideoData {
  const platform: Platform =
    row.provider === "youtube" ? "youtube" :
    row.provider === "instagram" ? "instagram" : "twitter";

  const videoType =
    platform === "youtube" && row.url.includes("/shorts/") ? "short" :
    platform === "instagram" && row.url.includes("/reel/") ? "reel" :
    platform === "instagram" ? "post" :
    "video" as const;

  return {
    label,
    accent,
    platform,
    videoType,
    videoId: row.externalId,
    title: row.title,
    creator: row.creatorName,
    followers: `${(row.creatorFollowerCount / 1000).toFixed(0)}K`,
    views: row.views.toLocaleString(),
    likes: row.likes.toLocaleString(),
    comments: row.commentCount.toLocaleString(),
    duration: `${Math.floor(row.duration / 60)}:${String(Math.floor(row.duration % 60)).padStart(2, "0")}`,
    engagementRate: row.views > 0 ? parseFloat(((row.likes / row.views) * 100).toFixed(1)) : 0,
  };
}

function dbMessagesToUIMessages(rows: Array<{ role: string; content: string }>): UIMessage[] {
  return rows.map((row, i) => ({
    id: `db-${i}`,
    role: row.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: row.content }],
  }));
}

export default async function ThreadPage({ params, searchParams }: ThreadPageProps) {
  const { threadId } = await params;
  const sp = await searchParams;

  // Fresh stream — home page is feeding active-stream store, LiveStreamView subscribes
  if (sp.fresh === "1" && sp.a && sp.b) {
    const urlA = decodeURIComponent(sp.a);
    const urlB = decodeURIComponent(sp.b);
    const skeletonA = buildSkeleton(urlA, "A", "blue");
    const skeletonB = buildSkeleton(urlB, "B", "green");
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <header className="flex items-center gap-3 px-4 h-[50px] border-b border-border/50 shrink-0 bg-background">
          <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-150 group">
            <ArrowLeft size={13} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
            New comparison
          </Link>
          <div className="w-px h-4 bg-border/60" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center shrink-0">
              <Aperture size={12} className="text-background" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-medium text-foreground/70 tracking-tight">CreatorLens</span>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <LiveStreamView threadId={threadId} skeletonA={skeletonA} skeletonB={skeletonB} />
        </div>
      </div>
    );
  }

  const backendUrl = process.env["BACKEND_URL"] ?? "http://localhost:5000";
  const res = await fetch(`${backendUrl}/api/v1/thread/${threadId}`, { cache: "no-store" });

  if (!res.ok) redirect("/");

  const json = (await res.json()) as {
    data: {
      threadId: string;
      videos: ThreadVideoRow[];
      messages: Array<{ role: string; content: string }>;
    };
  };
  const { data } = json;

  const videoA = data.videos[0] ? videoRowToData(data.videos[0], "A", "blue") : null;
  const videoB = data.videos[1] ? videoRowToData(data.videos[1], "B", "green") : null;
  if (!videoA || !videoB) redirect("/");

  const initialMessages = dbMessagesToUIMessages(data.messages);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 h-[50px] border-b border-border/50 shrink-0 bg-background">
        <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-150 group">
          <ArrowLeft size={13} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
          New comparison
        </Link>
        <div className="w-px h-4 bg-border/60" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center shrink-0">
            <Aperture size={12} className="text-background" strokeWidth={2} />
          </div>
          <span className="text-[13px] font-medium text-foreground/70 tracking-tight">CreatorLens</span>
        </div>
      </header>
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize="25" minSize="15" className="flex flex-col overflow-y-auto bg-card">
          <VideoCard video={videoA} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="50" minSize="25" className="flex flex-col overflow-hidden">
          <ChatPanel
            threadId={data.threadId}
            platformA={videoA.platform}
            platformB={videoB.platform}
            initialMessages={initialMessages}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="25" minSize="15" className="flex flex-col overflow-y-auto bg-card">
          <VideoCard video={videoB} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
