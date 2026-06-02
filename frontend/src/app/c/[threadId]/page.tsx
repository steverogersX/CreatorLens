import { redirect } from "next/navigation";
import { VideoCard, type VideoData, type Platform, type VideoAccent } from "@/components/video-card";
import { LiveVideoCard } from "@/components/live-video-card";
import { ConversationPanel } from "@/components/conversation-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { UIMessage } from "ai";
import type { ThreadVideoRow, ThreadStatus } from "@/types/thread";

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

function detectPlatform(url: string): Platform {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  return "twitter";
}

function extractVideoId(url: string, platform: Platform): string {
  if (platform === "youtube")
    return url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? "";
  if (platform === "instagram")
    return url.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/)?.[1] ?? "";
  return url.match(/status\/(\d+)/)?.[1] ?? "";
}

function buildSkeleton(url: string, label: "A" | "B", accent: VideoAccent): VideoData {
  const platform = detectPlatform(url);
  const videoType =
    platform === "youtube" && url.includes("/shorts/") ? "short" :
    platform === "instagram" && url.includes("/reel/")  ? "reel"  :
    platform === "instagram"                            ? "post"  :
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

function videoRowToData(row: ThreadVideoRow, label: "A" | "B", accent: VideoAccent): VideoData {
  const platform: Platform =
    row.provider === "youtube"   ? "youtube"   :
    row.provider === "instagram" ? "instagram" : "twitter";

  const videoType =
    platform === "youtube"   && row.url.includes("/shorts/") ? "short" :
    platform === "instagram" && row.url.includes("/reel/")   ? "reel"  :
    platform === "instagram"                                  ? "post"  :
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

function emptyVideo(label: "A" | "B", accent: VideoAccent): VideoData {
  return {
    label, accent, platform: "youtube", videoType: "video",
    videoId: "", title: "", creator: "", followers: "",
    views: "", likes: "", comments: "", duration: "", engagementRate: 0,
  };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;

  // Mock threads skip DB fetch entirely — active-stream store has all data
  if (threadId.startsWith("mock-")) {
    return (
      <ThreadShell title="Live preview">
        <LiveVideoCard threadId={threadId} position={1} initial={emptyVideo("A", "a")} />
        <ConversationPanel
          threadId={threadId}
          initialMessages={[]}
          streamOnMount
        />
        <LiveVideoCard threadId={threadId} position={2} initial={emptyVideo("B", "b")} />
      </ThreadShell>
    );
  }

  const backendUrl = process.env["BACKEND_URL"] ?? "http://localhost:5000";
  const res = await fetch(`${backendUrl}/api/v1/thread/${threadId}`, { cache: "no-store" });

  if (!res.ok) redirect("/");

  const json = (await res.json()) as {
    data: {
      threadId: string;
      status: ThreadStatus;
      videos: ThreadVideoRow[];
      messages: Array<{ role: string; content: string }>;
    };
  };
  const { data } = json;

  const isLive = data.status !== "completed";

  // Only hard-redirect when completed and data is genuinely missing
  if (!isLive && (!data.videos[0] || !data.videos[1])) redirect("/");

  const videoA = data.videos[0]?.title
    ? videoRowToData(data.videos[0], "A", "a")
    : buildSkeleton(data.videos[0]?.url ?? "", "A", "a");

  const videoB = data.videos[1]?.title
    ? videoRowToData(data.videos[1], "B", "b")
    : buildSkeleton(data.videos[1]?.url ?? "", "B", "b");

  const initialMessages = dbMessagesToUIMessages(data.messages);
  const title = [videoA.title || "Video A", videoB.title || "Video B"].join("  ·  ");

  return (
    <ThreadShell title={title}>
      {isLive
        ? <LiveVideoCard threadId={threadId} position={1} initial={videoA} />
        : <VideoCard video={videoA} />
      }
      <ConversationPanel
        threadId={data.threadId}
        platformA={videoA.platform}
        platformB={videoB.platform}
        initialMessages={initialMessages}
        streamOnMount={isLive}
      />
      {isLive
        ? <LiveVideoCard threadId={threadId} position={2} initial={videoB} />
        : <VideoCard video={videoB} />
      }
    </ThreadShell>
  );
}

function ThreadShell({
  title,
  children,
}: {
  title: string;
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
}) {
  const [leftPanel, center, rightPanel] = children;
  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="flex items-center gap-2 h-12 shrink-0 border-b border-border bg-background pl-14 pr-4 md:pl-5">
        <span className="text-[12.5px] font-medium text-muted-foreground truncate">{title}</span>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={26} minSize={16} className="flex flex-col overflow-y-auto custom-scrollbar bg-card">
          {leftPanel}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={48} minSize={28} className="flex flex-col overflow-hidden min-w-0">
          {center}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={26} minSize={16} className="flex flex-col overflow-y-auto custom-scrollbar bg-card">
          {rightPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
