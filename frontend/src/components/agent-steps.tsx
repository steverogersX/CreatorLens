"use client";

import { useState, useEffect, useRef, memo } from "react";
import {
  Loader2,
  ChevronDown,
  FileVideo2,
  ScrollText,
  Sparkles,
  Search,
  Brain,
  Lightbulb,
  Zap,
  Film,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AgentStep {
  label: string;
  stepStatus: "running" | "done";
  /** LangChain tool name, e.g. "search_video_transcript". Null for non-tool steps. */
  tool?: string | null;
  /** Hostname for video-analysis steps, e.g. "www.youtube.com". Null for agent tool steps. */
  platform?: string | null;
}

interface AgentStepsProps {
  steps: AgentStep[];
  hasText: boolean;
}

// ── Brand SVG icons ───────────────────────────────────────────────────────────

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  );
}

// ── Platform skeleton card ────────────────────────────────────────────────────

function classifyPlatform(hostname: string) {
  const h = hostname.toLowerCase();
  if (h.includes("youtube") || h.includes("youtu.be"))
    return { name: "YouTube",   Icon: YouTubeIcon,   vertical: false } as const;
  if (h.includes("instagram"))
    return { name: "Instagram", Icon: InstagramIcon, vertical: true  } as const;
  if (h.includes("tiktok"))
    return { name: "TikTok",    Icon: TikTokIcon,    vertical: true  } as const;
  if (h.includes("twitter") || h === "x.com" || h.includes("t.co"))
    return { name: "X",         Icon: XIcon,         vertical: false } as const;
  return { name: hostname,   Icon: Film,          vertical: false } as const;
}

function PlatformSkeleton({ hostname }: { hostname: string }) {
  const { vertical } = classifyPlatform(hostname);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mt-1.5 ml-[34px] flex gap-2.5"
    >
      {/* Thumbnail — correct platform aspect ratio */}
      <div className={cn(
        "shrink-0 rounded-md overflow-hidden skeleton",
        vertical ? "w-[52px] h-[92px]" : "w-[120px] h-[68px]",
      )} />

      {/* Text lines */}
      <div className="flex flex-col justify-center gap-2 py-1 min-w-0 flex-1">
        <div className="skeleton h-[9px] w-full rounded-sm" />
        <div className="skeleton h-[9px] w-4/5 rounded-sm" />
        <div className="skeleton h-[8px] w-2/5 rounded-sm mt-0.5" />
      </div>
    </motion.div>
  );
}

// ── Icon resolver ─────────────────────────────────────────────────────────────

type AnyIcon = LucideIcon | React.FC<{ className?: string }>;

const TOOL_ICONS: Record<string, AnyIcon> = {
  search_video_transcript: Search,
  read_video_transcript: ScrollText,
  get_video_meta: FileVideo2,
  read_thread_video_meta: Layers,
};

function resolveIcon(step: AgentStep): AnyIcon {
  if (step.tool && TOOL_ICONS[step.tool]) return TOOL_ICONS[step.tool]!;

  if (step.platform) return classifyPlatform(step.platform).Icon;

  const l = step.label.toLowerCase();
  if (l.includes("generat") || l.includes("response") || l.includes("writing")) return Sparkles;
  if (l.includes("search")) return Search;
  if (l.includes("read") || l.includes("transcript")) return ScrollText;
  if (l.includes("fetch") || l.includes("metadata")) return FileVideo2;
  if (l.includes("analyz") || l.includes("video")) return Film;
  if (l.includes("think") || l.includes("reason")) return Brain;
  if (l.includes("plan")) return Lightbulb;
  return Zap;
}

// ── Component ─────────────────────────────────────────────────────────────────

function AgentStepsInner({ steps, hasText }: AgentStepsProps) {
  const isDone = steps.length > 0 && steps.every((s) => s.stepStatus === "done");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => {
      if (startRef.current !== null)
        setElapsedSeconds(Math.round((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isDone]);

  useEffect(() => {
    if (!hasText) return;
    const t = setTimeout(() => setIsCollapsed(true), 1500);
    return () => clearTimeout(t);
  }, [hasText]);

  if (steps.length === 0) return null;

  const displaySeconds = Math.max(1, elapsedSeconds);

  return (
    <div className="flex w-full flex-col">
      {/* Header toggle */}
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:text-foreground group"
      >
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
        <span className={cn("text-[12.5px] text-foreground/60", !isDone && "thinking-shimmer")}>
          {isDone ? `Thought for ${displaySeconds}s` : "Thinking…"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="relative pt-1.5 pb-3">
              {steps.map((step, index) => {
                const isLastStep = index === steps.length - 1;
                const isActive = isLastStep && !isDone;
                const showSkeleton = isActive && !!step.platform;
                const Icon = resolveIcon(step);

                return (
                  <motion.div
                    key={`${step.label}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: index * 0.05 }}
                    className="relative pb-3.5 last:pb-0"
                  >
                    {/* Vertical connector */}
                    {!isLastStep && (
                      <div className="absolute left-[10px] top-[28px] bottom-0 w-px bg-border/50" />
                    )}

                    {/* Step row — no background shimmer, only text shimmers */}
                    <div className="flex items-center gap-3 px-2 py-1 -mx-2">
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 350, damping: 22, delay: index * 0.05 }}
                        className={cn(
                          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border",
                          isActive
                            ? "border-foreground/20 bg-foreground/8 text-foreground"
                            : "border-border/40 bg-muted/20 text-foreground/35",
                        )}
                      >
                        {isActive ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Icon className="h-3 w-3" />
                        )}
                      </motion.div>

                      {/* Text shimmer only on the label span */}
                      <span
                        className={cn(
                          "text-[12.5px] leading-none",
                          isActive ? "thinking-shimmer" : "text-foreground/45",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>

                    {/* Platform-specific skeleton card — only while running */}
                    <AnimatePresence>
                      {showSkeleton && <PlatformSkeleton hostname={step.platform!} />}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const AgentSteps = memo(AgentStepsInner);
