"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/components/chat-message";
import { SuggestedQuestions } from "@/components/suggested-questions";

type VideoPlatform = "youtube" | "instagram" | "twitter";

interface IVideoMeta {
  provider: string;
  videoId: string;
  title: string;
  url: string;
  views: number;
  likes: number;
  commentCount: number;
  creator: { name: string; handle: string; followerCount: number };
  duration: number;
}

interface ChatPanelProps {
  platformA?: VideoPlatform;
  platformB?: VideoPlatform;
  // New thread mode
  urls?: [string, string];
  initialQuestion?: string;
  onThreadCreated?: (threadId: string) => void;
  onVideoMeta?: (position: number, meta: IVideoMeta) => void;
  /** Fires once after the first full stream completes, with the new threadId */
  onStreamDone?: (threadId: string) => void;
  // Restore mode (threadId already known)
  threadId?: string;
  initialMessages?: UIMessage[];
}

const SUGGESTED = [
  "Which video has better audience retention?",
  "What topics does A cover that B doesn't?",
  "Compare their teaching styles",
  "Which is better for beginners?",
  "Summarize key differences",
];

export function ChatPanel({
  platformA = "youtube",
  platformB = "youtube",
  urls,
  initialQuestion,
  onThreadCreated,
  onVideoMeta,
  onStreamDone,
  threadId: initialThreadId,
  initialMessages,
}: ChatPanelProps) {
  const videoPlatforms: Record<"A" | "B", VideoPlatform> = {
    A: platformA,
    B: platformB,
  };

  // Track threadId without triggering re-renders
  const threadIdRef = useRef<string | null>(initialThreadId ?? null);
  const hasSentInitialRef = useRef(false);
  // Deduplicate data-part callbacks — key = `${messageId}:${partType}:${extra}`
  const processedPartsRef = useRef(new Set<string>());
  const prevStatusRef = useRef<string>("ready");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: msgs }) => {
        const lastUserMsg = msgs.findLast((m) => m.role === "user");
        const userMessage =
          lastUserMsg?.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("") ?? "";

        if (threadIdRef.current) {
          return {
            body: {
              type: "followup",
              threadId: threadIdRef.current,
              userMessage,
            },
          };
        }
        return { body: { type: "new", urls, userMessage } };
      },
    }),
    messages: initialMessages ?? [],
    id: initialThreadId ?? (urls ? urls.join("||") : "chat"),
    onError: (err) => console.error("[chat]", err),
  });

  // Parse data parts from the latest assistant message — deduplicated via processedPartsRef
  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    for (const part of lastAssistant.parts) {
      if (part.type === "data-thread-created") {
        const key = `${lastAssistant.id}:thread_created`;
        if (!processedPartsRef.current.has(key) && !threadIdRef.current) {
          processedPartsRef.current.add(key);
          const { threadId } = (
            part as unknown as { type: string; data: { threadId: string } }
          ).data;
          threadIdRef.current = threadId;
          onThreadCreated?.(threadId);
        }
      }
      if (part.type === "data-video-meta") {
        const { position, meta } = (
          part as unknown as {
            type: string;
            data: { position: number; meta: IVideoMeta };
          }
        ).data;
        const key = `${lastAssistant.id}:video_meta:${position}`;
        if (!processedPartsRef.current.has(key)) {
          processedPartsRef.current.add(key);
          onVideoMeta?.(position, meta);
        }
      }
    }
  }, [messages, onThreadCreated, onVideoMeta]);

  // Fire onStreamDone once when the stream transitions from loading → ready (new thread only)
  useEffect(() => {
    const wasLoading =
      prevStatusRef.current === "submitted" ||
      prevStatusRef.current === "streaming";
    const isNowReady = status === "ready";
    if (wasLoading && isNowReady && threadIdRef.current && !initialThreadId) {
      onStreamDone?.(threadIdRef.current);
    }
    prevStatusRef.current = status;
  }, [status, initialThreadId, onStreamDone]);

  const [input, setInput] = useState(initialQuestion ?? "");
  const isLoading = status === "submitted" || status === "streaming";
  const streamingId =
    status === "streaming" && messages.at(-1)?.role === "assistant"
      ? messages.at(-1)?.id
      : undefined;

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send initialQuestion once on mount (new thread flow only)
  useEffect(() => {
    if (initialQuestion && !hasSentInitialRef.current && !initialThreadId) {
      hasSentInitialRef.current = true;
      sendMessage({ text: initialQuestion });
      setInput("");
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-app-bg">
      <div className="flex-1 overflow-y-auto custom-scrollbar py-8">
        <div className="max-w-2xl mx-auto px-6 flex flex-col gap-7">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              videoPlatforms={videoPlatforms}
              streaming={msg.id === streamingId}
            />
          ))}
          {error && (
            <p className="text-[12px] text-destructive/70 font-mono text-center">
              Something went wrong — please try again.
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6 pt-1">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <SuggestedQuestions
            questions={SUGGESTED}
            onSelect={(q) => setInput(q)}
          />
          <div
            className={cn(
              "flex items-end gap-3 bg-secondary rounded-3xl px-5 py-3.5",
              "border border-border/50 focus-within:border-border transition-colors duration-150",
            )}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isLoading}
              placeholder="Ask anything about these videos…"
              className={cn(
                "flex-1 resize-none bg-transparent",
                "text-[14px] text-foreground placeholder:text-muted-foreground/35",
                "outline-none font-sans leading-relaxed max-h-[140px] overflow-y-auto py-0.5",
                "disabled:opacity-50",
              )}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 transition-all duration-200",
                isLoading || !input.trim()
                  ? "bg-border/40 text-muted-foreground/25 cursor-not-allowed"
                  : "bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95",
              )}
            >
              {isLoading ? (
                <span
                  className="w-3 h-3 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60"
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
              ) : (
                <ArrowUp size={14} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
