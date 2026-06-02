"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ArrowUp, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { MessageItem, makeMdComponents, EMPTY_CITATIONS } from "@/components/message-item";
import { AgentSteps, type AgentStep } from "@/components/agent-steps";
import { SuggestedQuestions } from "@/components/suggested-questions";
import { subscribeStream, getStreamUserMessage, stopStream } from "@/lib/active-stream";
import type { CitationPayload } from "@shared/events";

type VideoPlatform = "youtube" | "instagram" | "twitter";

export interface ConversationPanelProps {
  threadId: string;
  platformA?: VideoPlatform;
  platformB?: VideoPlatform;
  initialMessages?: UIMessage[];
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

// Batch live deltas so re-renders run at ~22/s — smooth without thrashing.
const LIVE_FLUSH_MS = 45;

/* ── Breathing bubbles — shown while waiting for the first token ─── */
function BreathingBubbles() {
  return (
    <div className="flex items-center gap-[6px] py-1 h-8">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[7px] h-[7px] rounded-full bg-muted-foreground/40"
          animate={{ scale: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
        />
      ))}
    </div>
  );
}

export function ConversationPanel({
  threadId,
  platformA = "youtube",
  platformB = "youtube",
  initialMessages,
  streamOnMount = false,
}: ConversationPanelProps) {
  // Stable reference — keeps MessageItem's memo intact across live deltas.
  const videoPlatforms = useMemo(
    () => ({ A: platformA, B: platformB } as Record<"A" | "B", VideoPlatform>),
    [platformA, platformB],
  );

  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: msgs, body }) => {
        const lastUser = msgs.findLast((m) => m.role === "user");
        const userMessage =
          lastUser?.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("") ?? "";
        // `truncateTo` (set by edit/regenerate) tells the backend to drop the
        // replaced messages before re-running.
        const truncateTo = (body as { truncateTo?: number } | undefined)?.truncateTo;
        return { body: { type: "followup", threadId, userMessage, truncateTo } };
      },
    }),
    messages: initialMessages ?? [],
    id: threadId,
    onError: (err) => console.error("[chat]", err),
  });

  // useChat callbacks are stable, but route through refs so the live-stream
  // effect can stay subscribed to [threadId] only and never re-subscribe.
  const sendMessageRef = useRef(sendMessage);
  const setMessagesRef = useRef(setMessages);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
    setMessagesRef.current = setMessages;
  });

  // ── Live stream state (only active when streamOnMount=true) ──────────────
  const [liveStreaming, setLiveStreaming] = useState(streamOnMount);
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([]);
  const [liveText, setLiveText] = useState("");
  const [liveCitations, setLiveCitations] = useState<CitationPayload[]>([]);

  // Refs mirror the live state so the `done`/`error` commit reads the latest
  // values regardless of React batching.
  const liveTextRef = useRef("");
  const liveStepsRef = useRef<AgentStep[]>([]);
  const liveCitationsRef = useRef<CitationPayload[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveCitationsMap = useMemo(() => {
    if (liveCitations.length === 0) return EMPTY_CITATIONS;
    const m = new Map<string, CitationPayload>();
    liveCitations.forEach((c) => m.set(`${c.video}:${c.timestampLabel}`, c));
    return m;
  }, [liveCitations]);

  const liveMdComponents = useMemo(
    () => makeMdComponents(videoPlatforms, liveCitationsMap),
    [videoPlatforms, liveCitationsMap],
  );

  useEffect(() => {
    if (!streamOnMount) return;

    const userMessage = getStreamUserMessage(threadId);

    // subscribeStream replays the full event buffer on subscribe, so start from
    // a clean slate — otherwise a re-subscribe (StrictMode, fast refresh) would
    // re-accumulate the replayed deltas on top of the existing text.
    liveTextRef.current = "";
    liveStepsRef.current = [];
    liveCitationsRef.current = [];

    // Move the finished live result into the useChat message list so the
    // conversation continues seamlessly — no server round-trip, no remount.
    const commit = () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      const text = liveTextRef.current;
      const steps = liveStepsRef.current;
      const citations = liveCitationsRef.current;

      const committed: UIMessage[] = [];
      if (userMessage) {
        committed.push({
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: userMessage }],
        });
      }
      if (text || steps.length > 0) {
        const parts = [
          ...steps.map((s) => ({ type: "data-agent-step", data: s })),
          ...(text ? [{ type: "text", text }] : []),
          ...(citations.length > 0 ? [{ type: "data-citations", data: { citations } }] : []),
        ] as unknown as UIMessage["parts"];
        committed.push({ id: crypto.randomUUID(), role: "assistant", parts });
      }
      if (committed.length > 0) {
        setMessagesRef.current((prev) => [...prev, ...committed]);
      }

      setLiveStreaming(false);
      setLiveSteps([]);
      setLiveText("");
      setLiveCitations([]);
      liveTextRef.current = "";
      liveStepsRef.current = [];
      liveCitationsRef.current = [];
    };

    const unsub = subscribeStream(threadId, (event) => {
      switch (event.type) {
        case "agent_step": {
          const arr = liveStepsRef.current;
          const idx = arr.findIndex((s) => s.label === event.label);
          const next =
            idx >= 0
              ? arr.map((s, i) =>
                  i === idx ? { ...s, stepStatus: event.stepStatus } : s,
                )
              : [
                  ...arr,
                  {
                    label: event.label,
                    stepStatus: event.stepStatus,
                    tool: event.tool,
                    platform: event.platform,
                  },
                ];
          liveStepsRef.current = next;
          setLiveSteps(next);
          break;
        }

        case "text_delta":
          liveTextRef.current += event.delta;
          if (!flushTimerRef.current) {
            flushTimerRef.current = setTimeout(() => {
              setLiveText(liveTextRef.current);
              flushTimerRef.current = null;
            }, LIVE_FLUSH_MS);
          }
          break;

        case "citations":
          liveCitationsRef.current = event.citations;
          setLiveCitations(event.citations);
          break;

        case "done":
        case "error":
          commit();
          break;
      }
    });

    // null → the active-stream store has no record of this thread (refresh,
    // direct URL visit, or backend crash); no "done" will ever arrive.
    if (unsub === null) setLiveStreaming(false);

    return () => {
      unsub?.();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [threadId, streamOnMount]);

  const [input, setInput] = useState("");
  const isFollowUpLoading = status === "submitted" || status === "streaming";
  const streamingMsgId = useMemo(
    () =>
      status === "streaming" && messages.at(-1)?.role === "assistant"
        ? messages.at(-1)?.id
        : undefined,
    [status, messages],
  );

  // Pulse only before any content exists: the initial wait of a follow-up, or
  // the brief pre-step pause of a live stream. Once steps/text arrive, the
  // AgentSteps + message render carry the progress.
  const showThinking =
    status === "submitted" || (liveStreaming && liveSteps.length === 0 && !liveText);

  // Last assistant message — the only one that can be regenerated.
  const lastAssistantId = useMemo(
    () => messages.filter((m) => m.role === "assistant").at(-1)?.id,
    [messages],
  );

  const getMessageText = useCallback(
    (id: string) =>
      messages
        .find((m) => m.id === id)
        ?.parts.filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join("") ?? "",
    [messages],
  );

  // Edit a user message: drop it and everything after, then resend the new text
  // as a fresh turn (backend truncates the stored thread to match).
  const handleEdit = useCallback(
    (id: string, newText: string) => {
      const text = newText.trim();
      if (!text || isFollowUpLoading) return;
      const idx = messages.findIndex((m) => m.id === id);
      if (idx < 0) return;
      setMessages(messages.slice(0, idx));
      sendMessage({ text }, { body: { truncateTo: idx } });
    },
    [messages, isFollowUpLoading, setMessages, sendMessage],
  );

  // Regenerate an assistant message: re-run its preceding user turn.
  const handleRegenerate = useCallback(
    (id: string) => {
      if (isFollowUpLoading) return;
      const idx = messages.findIndex((m) => m.id === id);
      const userIdx = idx - 1;
      if (userIdx < 0 || messages[userIdx]?.role !== "user") return;
      const text = getMessageText(messages[userIdx]!.id);
      if (!text) return;
      setMessages(messages.slice(0, userIdx));
      sendMessage({ text }, { body: { truncateTo: userIdx } });
    },
    [messages, isFollowUpLoading, setMessages, sendMessage, getMessageText],
  );

  // ── Auto-scroll (rAF-throttled to avoid layout thrash on every token) ────
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollPendingRef = useRef(false);
  const scrollToBottom = useCallback(() => {
    if (scrollPendingRef.current) return;
    scrollPendingRef.current = true;
    requestAnimationFrame(() => {
      scrollPendingRef.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages, liveText, liveSteps.length, showThinking, scrollToBottom]);

  const isBusy = liveStreaming || isFollowUpLoading;

  function handleSend() {
    const msg = input.trim();
    if (!msg || isBusy) return;
    sendMessage({ text: msg });
    setInput("");
  }

  function handleStop() {
    if (liveStreaming) {
      stopStream(threadId);
    } else if (isFollowUpLoading) {
      stop();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isBusy) handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full min-w-0 bg-background">
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-8">
        <div className="max-w-2xl mx-auto w-full min-w-0 px-5 sm:px-6 flex flex-col gap-7">

          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              videoPlatforms={videoPlatforms}
              streaming={msg.id === streamingMsgId}
              isLastAssistant={msg.role === "assistant" && msg.id === lastAssistantId}
              canRegenerate={!isBusy && msg.id === lastAssistantId}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
            />
          ))}

          <AnimatePresence>
            {showThinking && (
              <motion.div
                key="thinking-bubbles"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <BreathingBubbles />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live streaming assistant message (first visit only) */}
          {liveStreaming && (liveSteps.length > 0 || liveText) && (
            <div className="flex flex-col gap-2 min-w-0">
              <AgentSteps steps={liveSteps} hasText={liveText.length > 0} />
              {liveText && (
                <motion.div
                  className="markdown min-w-0 max-w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Markdown text={liveText} components={liveMdComponents} />
                </motion.div>
              )}
            </div>
          )}

          {error && (
            <p className="text-[12px] text-destructive/70 font-mono text-center">
              Something went wrong — please try again.
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 px-5 sm:px-6 pb-6 pt-1">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {!liveStreaming && (
            <SuggestedQuestions questions={SUGGESTED} onSelect={(q) => setInput(q)} />
          )}
          <div
            className={cn(
              "flex items-end gap-2.5 bg-card rounded-2xl px-4 py-3 shadow-sm",
              "border border-border focus-within:border-foreground/30 focus-within:ring-4 focus-within:ring-foreground/5",
              "transition-colors duration-150",
            )}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                isBusy ? "Generating response…" : "Ask anything about these videos…"
              }
              className={cn(
                "flex-1 resize-none bg-transparent",
                "text-[14px] text-foreground placeholder:text-muted-foreground/35",
                "outline-none font-sans leading-relaxed max-h-[140px] overflow-y-auto py-0.5",
              )}
            />
            {isBusy ? (
              <Button
                size="icon"
                onClick={handleStop}
                aria-label="Stop generating"
                className={cn(
                  "rounded-xl mb-0.5",
                  "bg-foreground text-background hover:bg-foreground/90 active:scale-95",
                )}
              >
                <Square size={13} strokeWidth={0} className="fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send message"
                className={cn(
                  "rounded-xl mb-0.5",
                  !input.trim()
                    ? "bg-secondary text-muted-foreground/30"
                    : "bg-foreground text-background hover:bg-foreground/90 active:scale-95",
                )}
              >
                <ArrowUp size={14} strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {isBusy && <div className="sr-only" aria-live="polite">Loading…</div>}
    </div>
  );
}
