"use client";

import { useState, useRef, useEffect, useDeferredValue, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MessageItem } from "@/components/message-item";
import { AgentSteps, type AgentStep } from "@/components/agent-steps";
import { SuggestedQuestions } from "@/components/suggested-questions";
import { subscribeStream } from "@/lib/active-stream";

type VideoPlatform = "youtube" | "instagram" | "twitter";

export interface ConversationPanelProps {
  threadId: string;
  platformA?: VideoPlatform;
  platformB?: VideoPlatform;
  initialMessages?: UIMessage[];
  initialQuestion?: string;
  /** When true, subscribe to the active-stream store on mount (first-visit streaming). */
  streamOnMount?: boolean;
}

const SUGGESTED = [
  "Which video has better audience retention?",
  "What topics does A cover that B doesn't?",
  "Compare their teaching styles",
  "Which is better for beginners?",
  "Summarize key differences",
];

export function ConversationPanel({
  threadId,
  platformA = "youtube",
  platformB = "youtube",
  initialMessages,
  initialQuestion,
  streamOnMount = false,
}: ConversationPanelProps) {
  const router = useRouter();
  // Stable reference — prevents MessageItem memo from being bypassed on every liveText delta
  const videoPlatforms = useMemo(
    () => ({ A: platformA, B: platformB } as Record<"A" | "B", VideoPlatform>),
    [platformA, platformB],
  );

  // ── Live stream state (only active when streamOnMount=true) ──────────────
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([]);
  const liveTextRef = useRef("");
  const [liveText, setLiveText] = useState("");
  // 150ms throttle — batches deltas so ReactMarkdown parses ~6×/s instead of 60×/s
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveStreaming, setLiveStreaming] = useState(streamOnMount);
  const deferredLiveText = useDeferredValue(liveText);
  const pendingMsgRef = useRef("");

  useEffect(() => {
    if (!streamOnMount) return;

    const unsub = subscribeStream(threadId, (event) => {
      switch (event.type) {
        case "agent_step":
          setLiveSteps((prev) => {
            const idx = prev.findIndex((s) => s.label === event.label);
            if (idx >= 0)
              return prev.map((s, i) =>
                i === idx ? { label: s.label, stepStatus: event.stepStatus } : s,
              );
            return [...prev, { label: event.label, stepStatus: event.stepStatus }];
          });
          break;

        case "text_delta":
          liveTextRef.current += event.delta;
          if (!flushTimerRef.current) {
            flushTimerRef.current = setTimeout(() => {
              setLiveText(liveTextRef.current);
              flushTimerRef.current = null;
            }, 150);
          }
          break;

        case "done":
          // Flush any buffered text before marking stream done
          if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
          }
          setLiveText(liveTextRef.current);
          setLiveStreaming(false);
          if (!threadId.startsWith("mock-")) {
            const pending = pendingMsgRef.current;
            pendingMsgRef.current = "";
            // router.replace re-fetches the server component and carries the pending message
            const next = pending
              ? `/c/${threadId}?q=${encodeURIComponent(pending)}`
              : `/c/${threadId}`;
            router.replace(next);
          }
          break;

        case "error":
          setLiveStreaming(false);
          break;
      }
    });

    return () => {
      unsub?.();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, streamOnMount]);

  // Scroll live text into view — instant during streaming to avoid competing scroll animations
  const liveBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    liveBottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [liveText, liveSteps.length]);

  // ── Follow-up chat (useChat handles all messages after first stream) ──────
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: msgs }) => {
        const lastUser = msgs.findLast((m) => m.role === "user");
        const userMessage =
          lastUser?.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("") ?? "";
        return { body: { type: "followup", threadId, userMessage } };
      },
    }),
    messages: initialMessages ?? [],
    id: threadId,
    onError: (err) => console.error("[chat]", err),
  });

  const [input, setInput] = useState(initialQuestion ?? "");
  const isFollowUpLoading = status === "submitted" || status === "streaming";
  const streamingMsgId = useMemo(
    () =>
      status === "streaming" && messages.at(-1)?.role === "assistant"
        ? messages.at(-1)?.id
        : undefined,
    [status, messages],
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const msgCountRef = useRef(messages.length);
  useEffect(() => {
    const grew = messages.length > msgCountRef.current;
    msgCountRef.current = messages.length;
    bottomRef.current?.scrollIntoView({ behavior: grew ? "smooth" : "instant" });
  }, [messages]);

  // Auto-send initialQuestion for return-visit follow-ups (not during live stream)
  const hasSentInitialRef = useRef(false);
  useEffect(() => {
    if (initialQuestion && !hasSentInitialRef.current && !streamOnMount) {
      hasSentInitialRef.current = true;
      sendMessage({ text: initialQuestion });
      setInput("");
      // Clear ?q= from URL so refresh doesn't re-send
      router.replace(`/c/${threadId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    const msg = input.trim();
    if (!msg) return;
    if (liveStreaming) {
      // Queue — sent after stream completes via ?q= redirect
      pendingMsgRef.current = msg;
      setInput("");
      return;
    }
    if (isFollowUpLoading) return;
    sendMessage({ text: msg });
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isBusy = liveStreaming || isFollowUpLoading;

  return (
    <div className="flex flex-col h-full bg-app-bg">
      <div className="flex-1 overflow-y-auto custom-scrollbar py-8">
        <div className="max-w-2xl mx-auto px-6 flex flex-col gap-7">

          {/* DB messages (empty on first visit, populated on return visits) */}
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              videoPlatforms={videoPlatforms}
              streaming={msg.id === streamingMsgId}
            />
          ))}

          {/* Initial thinking dots — stream connected but no events yet */}
          {liveStreaming && liveSteps.length === 0 && !liveText && (
            <div className="flex items-center gap-3 py-1">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </div>
              <span className="text-[13px] text-muted-foreground/50 thinking-shimmer">
                Analyzing videos…
              </span>
            </div>
          )}

          {/* Live streaming assistant message */}
          {liveStreaming && (liveSteps.length > 0 || liveText) && (
            <div className="flex flex-col gap-2">
              <AgentSteps steps={liveSteps} hasText={liveText.length > 0} />
              {liveText && (
                <div className={cn("markdown", "cursor-blink")}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {deferredLiveText}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-[12px] text-destructive/70 font-mono text-center">
              Something went wrong — please try again.
            </p>
          )}

          <div ref={liveStreaming ? liveBottomRef : bottomRef} />
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6 pt-1">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {!liveStreaming && (
            <SuggestedQuestions questions={SUGGESTED} onSelect={(q) => setInput(q)} />
          )}
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
              disabled={isFollowUpLoading && !liveStreaming}
              placeholder={
                liveStreaming
                  ? "Ask a follow-up — will send after analysis…"
                  : "Ask anything about these videos…"
              }
              className={cn(
                "flex-1 resize-none bg-transparent",
                "text-[14px] text-foreground placeholder:text-muted-foreground/35",
                "outline-none font-sans leading-relaxed max-h-[140px] overflow-y-auto py-0.5",
                "disabled:opacity-50",
              )}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || (isFollowUpLoading && !liveStreaming)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 transition-all duration-200",
                !input.trim() || (isFollowUpLoading && !liveStreaming)
                  ? "bg-border/40 text-muted-foreground/25 cursor-not-allowed"
                  : liveStreaming
                    ? "bg-border text-muted-foreground hover:bg-border/80"
                    : "bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95",
              )}
            >
              {isFollowUpLoading && !liveStreaming ? (
                <span className="w-3 h-3 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60 animate-spin" />
              ) : (
                <ArrowUp size={14} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden scroll anchor for follow-up messages */}
      {!liveStreaming && <div ref={bottomRef} />}
      {isBusy && <div className="sr-only" aria-live="polite">Loading…</div>}
    </div>
  );
}
