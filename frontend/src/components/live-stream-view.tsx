"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoCard, type VideoData } from "@/components/video-card";
import { StepFeed, type AgentStep } from "@/components/step-feed";
import { subscribeStream, type LiveEvent, type LiveVideoMeta } from "@/lib/active-stream";
import { cn } from "@/lib/utils";

interface LiveStreamViewProps {
  threadId: string;
  skeletonA: VideoData;
  skeletonB: VideoData;
}

function metaToVideoData(
  meta: LiveVideoMeta,
  label: "A" | "B",
  accent: "blue" | "green",
): VideoData {
  const platform = meta.provider === "youtube" ? ("youtube" as const) : ("twitter" as const);
  return {
    label,
    accent,
    platform,
    videoId: meta.videoId,
    title: meta.title,
    creator: meta.creator.name,
    followers: `${(meta.creator.followerCount / 1000).toFixed(0)}K`,
    views: meta.views.toLocaleString(),
    likes: meta.likes.toLocaleString(),
    comments: meta.commentCount.toLocaleString(),
    duration: `${Math.floor(meta.duration / 60)}:${String(Math.floor(meta.duration % 60)).padStart(2, "0")}`,
    engagementRate:
      meta.views > 0 ? parseFloat(((meta.likes / meta.views) * 100).toFixed(1)) : 0,
  };
}

export function LiveStreamView({ threadId, skeletonA, skeletonB }: LiveStreamViewProps) {
  const router = useRouter();
  const [videoA, setVideoA] = useState<VideoData>(skeletonA);
  const [videoB, setVideoB] = useState<VideoData>(skeletonB);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeStream(threadId, (event: LiveEvent) => {
      switch (event.type) {
        case "video_meta":
          if (event.position === 1) setVideoA(metaToVideoData(event.meta, "A", "blue"));
          if (event.position === 2) setVideoB(metaToVideoData(event.meta, "B", "green"));
          break;
        case "agent_step":
          setSteps((prev) => {
            const idx = prev.findIndex((s) => s.label === event.label);
            if (idx >= 0)
              return prev.map((s, i) =>
                i === idx ? { label: s.label, stepStatus: event.stepStatus } : s,
              );
            return [...prev, { label: event.label, stepStatus: event.stepStatus }];
          });
          break;
        case "text_delta":
          setText((prev) => prev + event.delta);
          break;
        case "done":
          setStreaming(false);
          // Skip DB restore for mock threads (no backend exists)
          if (!threadId.startsWith("mock-")) {
            router.replace(`/c/${threadId}`, { scroll: false });
          }
          break;
        case "error":
          setStreaming(false);
          break;
      }
    });
    return () => unsub?.();
  }, [threadId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [text, steps.length]);

  return (
    <>
      <aside className="w-[25%] min-w-[260px] max-w-[340px] flex flex-col overflow-y-auto border-r border-border/50 bg-card shrink-0">
        <VideoCard video={videoA} isLoading={!videoA.title} />
      </aside>

      <main className="flex flex-col flex-1 overflow-hidden min-w-0 bg-app-bg">

<div className="flex-1 overflow-y-auto custom-scrollbar py-8">
          <div className="max-w-2xl mx-auto px-6 flex flex-col gap-4">
            <AnimatePresence>
              {steps.length === 0 && !text && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 py-1"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                        animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1, 0.75] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                  <span className="text-[13px] text-muted-foreground/50 thinking-shimmer">
                    Analyzing videos…
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {steps.length > 0 && <StepFeed steps={steps} hasText={text.length > 0} />}

            {text && (
              <div
                className={cn(
                  "prose prose-invert prose-sm max-w-none text-foreground/90",
                  streaming && "cursor-blink",
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 px-6 pb-6 pt-1">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-3 bg-secondary rounded-3xl px-5 py-3.5 border border-border/50">
              <textarea
                rows={1}
                disabled
                placeholder="Ask anything about these videos…"
                className={cn(
                  "flex-1 resize-none bg-transparent",
                  "text-[14px] text-foreground placeholder:text-muted-foreground/20",
                  "outline-none font-sans leading-relaxed max-h-[140px] overflow-y-auto py-0.5",
                  "disabled:opacity-40 cursor-not-allowed",
                )}
              />
              <button
                disabled
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 bg-border/40 text-muted-foreground/30 cursor-not-allowed"
              >
                <Loader2 size={13} strokeWidth={2} className="animate-spin" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <aside className="w-[25%] min-w-[260px] max-w-[340px] flex flex-col overflow-y-auto border-l border-border/50 bg-card shrink-0">
        <VideoCard video={videoB} isLoading={!videoB.title} />
      </aside>
    </>
  );
}
