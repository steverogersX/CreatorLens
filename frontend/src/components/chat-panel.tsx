"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/components/chat-message";
import { SuggestedQuestions } from "@/components/suggested-questions";

type VideoPlatform = "youtube" | "instagram" | "twitter";

interface ChatPanelProps {
  platformA?: VideoPlatform;
  platformB?: VideoPlatform;
  urls: [string, string];
  initialQuestion?: string;
}

const SUGGESTED = [
  "Which video has better audience retention?",
  "What topics does A cover that B doesn't?",
  "Compare their teaching styles",
  "Which is better for beginners?",
  "Summarize key differences",
];

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "init-1",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "I've analyzed both videos. Ask me anything about their content, structure, teaching style, or how they compare.",
      },
    ],
  },
];

export function ChatPanel({
  platformA = "youtube",
  platformB = "youtube",
  urls,
  initialQuestion,
}: ChatPanelProps) {
  const videoPlatforms: Record<"A" | "B", VideoPlatform> = {
    A: platformA,
    B: platformB,
  };

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: msgs }) => {
        const lastUserMsg = msgs.findLast((m) => m.role === "user");
        const text = lastUserMsg?.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") ?? "";
        return { body: { urls, message: text } };
      },
    }),
    messages: INITIAL_MESSAGES,
    id: urls.join("||"),
    onError: (err) => console.error("[chat]", err),
  });

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
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-muted-foreground/60" strokeWidth={2} />
          <span className="text-[13px] font-medium text-foreground/70 tracking-tight">
            CreatorLens AI
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 font-mono">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors duration-300",
            isLoading ? "bg-accent-blue/70" : "bg-accent-green/70"
          )} />
          {isLoading ? "thinking…" : `${messages.filter((m) => m.role === "user").length} turns`}
        </div>
      </div>

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
          <div className={cn(
            "flex items-end gap-3 bg-secondary rounded-3xl px-5 py-3.5",
            "border border-border/50 focus-within:border-border transition-colors duration-150"
          )}>
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
                "disabled:opacity-50"
              )}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 transition-all duration-200",
                isLoading || !input.trim()
                  ? "bg-border/40 text-muted-foreground/25 cursor-not-allowed"
                  : "bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95"
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
