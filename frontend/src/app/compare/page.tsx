import Link from "next/link";
import { Aperture, ArrowLeft } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { ChatPanel } from "@/components/chat-panel";
import type { VideoData, Platform } from "@/components/video-card";

function detectPlatform(url: string): Platform {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  return "twitter";
}

function extractVideoId(url: string, platform: Platform): string {
  if (platform === "youtube") {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m?.[1] ?? "";
  }
  if (platform === "instagram") {
    const m = url.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/);
    return m?.[1] ?? "";
  }
  // twitter/x: extract tweet id
  const m = url.match(/status\/(\d+)/);
  return m?.[1] ?? "";
}

function buildVideoData(
  url: string,
  label: "A" | "B",
  accent: "blue" | "green"
): VideoData {
  const platform = detectPlatform(url);
  const videoId = extractVideoId(url, platform);
  return {
    label,
    accent,
    platform,
    videoId,
    title: "Loading metadata…",
    creator: "—",
    followers: "—",
    views: "—",
    likes: "—",
    comments: "—",
    duration: "—",
    engagementRate: 0,
  };
}

const DEMO_A: VideoData = {
  label: "A",
  accent: "blue",
  platform: "youtube",
  videoId: "T_Qwke60mCs",
  title: "Next.js 14 Full Course — Build & Deploy a Full Stack App",
  creator: "JavaScript Mastery",
  followers: "2.1M subscribers",
  views: "2,418,302",
  likes: "89.4K",
  comments: "4,231",
  duration: "5:23:10",
  engagementRate: 3.8,
};

const DEMO_B: VideoData = {
  label: "B",
  accent: "green",
  platform: "youtube",
  videoId: "t6Sl_KiXO9I",
  title: "CSS Grid — Complete Guide for Beginners to Advanced",
  creator: "Kevin Powell",
  followers: "958K subscribers",
  views: "1,142,880",
  likes: "47.2K",
  comments: "1,847",
  duration: "19:42",
  engagementRate: 4.3,
};

interface ComparePageProps {
  searchParams: Promise<{ a?: string; b?: string; q?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const urlA = params.a ? decodeURIComponent(params.a) : null;
  const urlB = params.b ? decodeURIComponent(params.b) : null;
  const initialQuestion = params.q ? decodeURIComponent(params.q) : undefined;

  const VIDEO_A = urlA ? buildVideoData(urlA, "A", "blue") : DEMO_A;
  const VIDEO_B = urlB ? buildVideoData(urlB, "B", "green") : DEMO_B;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Minimal top bar */}
      <header className="flex items-center gap-3 px-4 h-[50px] border-b border-border/50 shrink-0 bg-background">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-150 group"
        >
          <ArrowLeft size={13} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
          New comparison
        </Link>

        <div className="w-px h-4 bg-border/60" />

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center shrink-0">
            <Aperture size={12} className="text-background" strokeWidth={2} />
          </div>
          <span className="text-[13px] font-medium text-foreground/70 tracking-tight">
            CreatorLens
          </span>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video A */}
        <aside className="w-[25%] min-w-[260px] max-w-[340px] flex flex-col overflow-y-auto border-r border-border/50 bg-card shrink-0">
          <VideoCard video={VIDEO_A} />
        </aside>

        {/* Chat */}
        <main className="flex flex-col flex-1 overflow-hidden min-w-0">
          <ChatPanel
            platformA={VIDEO_A.platform}
            platformB={VIDEO_B.platform}
            initialQuestion={initialQuestion}
          />
        </main>

        {/* Video B */}
        <aside className="w-[25%] min-w-[260px] max-w-[340px] flex flex-col overflow-y-auto border-l border-border/50 bg-card shrink-0">
          <VideoCard video={VIDEO_B} />
        </aside>
      </div>
    </div>
  );
}
