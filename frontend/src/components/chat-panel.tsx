"use client";

import { useRef, useEffect, useReducer } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/components/chat-message";
import { SuggestedQuestions } from "@/components/suggested-questions";
import type { Message } from "@/components/chat-message";

type VideoPlatform = "youtube" | "instagram" | "twitter";

interface ChatPanelProps {
  platformA?: VideoPlatform;
  platformB?: VideoPlatform;
  initialQuestion?: string;
}

const SUGGESTED = [
  "Which video has better audience retention?",
  "What topics does A cover that B doesn't?",
  "Compare their teaching styles",
  "Which is better for beginners?",
  "Summarize key differences",
];

/*
  Inline citation syntax: [A:timestamp] or [B:timestamp]
  These are parsed by ChatMessage into CitationBadge components.
  No chunk refs — only timestamps.
*/
const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "I've analyzed both videos. Ask me anything about their content, structure, teaching style, or how they compare.",
  },
  {
    id: "2",
    role: "user",
    content: "Which video has better audience retention based on comment quality?",
  },
  {
    id: "3",
    role: "assistant",
    content:
      "Video A shows significantly stronger retention signals.[A:0:42] Comments frequently reference specific timestamps and sections,[A:1:18:05] with viewers returning weeks later to ask follow-up questions. Video B's comments are mostly surface-level compliments with far less timestamp engagement.[B:3:12]",
  },
  {
    id: "4",
    role: "user",
    content: "What topics does Video A cover that B doesn't?",
  },
  {
    id: "5",
    role: "assistant",
    content:
      "Video A covers full-stack deployment pipelines,[A:2:14:30] database schema migrations with Prisma,[A:3:47:12] and authentication with NextAuth — none of which appear in Video B. Video B is focused exclusively on CSS layout mechanics[B:0:58] without any backend content.",
  },
];

interface State {
  messages: Message[];
  input: string;
  turnCount: number;
}

type Action =
  | { type: "SET_INPUT"; value: string }
  | { type: "SEND" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.value };
    case "SEND": {
      if (!state.input.trim()) return state;
      const userMsg: Message = {
        id: String(Date.now()),
        role: "user",
        content: state.input.trim(),
      };
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: "Analyzing both videos for context relevant to your question…[A:1:05][B:0:30]",
      };
      return {
        messages: [...state.messages, userMsg, aiMsg],
        input: "",
        turnCount: state.turnCount + 1,
      };
    }
  }
}

export function ChatPanel({ platformA = "youtube", platformB = "youtube", initialQuestion }: ChatPanelProps) {
  const [state, dispatch] = useReducer(reducer, {
    messages: INITIAL_MESSAGES,
    input: initialQuestion ?? "",
    turnCount: 12,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const videoPlatforms: Record<"A" | "B", VideoPlatform> = { A: platformA, B: platformB };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  function handleSend() {
    dispatch({ type: "SEND" });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-app-bg">

      {/* ── Minimal header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-muted-foreground/60" strokeWidth={2} />
          <span className="text-[13px] font-medium text-foreground/70 tracking-tight">
            CreatorLens AI
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green/70" />
          {state.turnCount} turns
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-8">
        <div className="max-w-2xl mx-auto px-6 flex flex-col gap-7">
          {state.messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              videoPlatforms={videoPlatforms}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Bottom zone ── */}
      <div className="shrink-0 px-6 pb-6 pt-1">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">

          <SuggestedQuestions
            questions={SUGGESTED}
            onSelect={(q) => dispatch({ type: "SET_INPUT", value: q })}
          />

          {/* Input bar */}
          <div className={cn(
            "flex items-end gap-3 bg-secondary rounded-3xl px-5 py-3.5",
            "border border-border/50 focus-within:border-border transition-colors duration-150"
          )}>
            <textarea
              rows={1}
              value={state.input}
              onChange={(e) => dispatch({ type: "SET_INPUT", value: e.target.value })}
              onKeyDown={handleKey}
              placeholder="Ask anything about these videos…"
              className={cn(
                "flex-1 resize-none bg-transparent",
                "text-[14px] text-foreground placeholder:text-muted-foreground/35",
                "outline-none font-sans leading-relaxed max-h-[140px] overflow-y-auto py-0.5"
              )}
            />
            <button
              onClick={handleSend}
              disabled={!state.input.trim()}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 transition-all duration-200",
                state.input.trim()
                  ? "bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95"
                  : "bg-border/40 text-muted-foreground/25 cursor-not-allowed"
              )}
            >
              <ArrowUp size={14} strokeWidth={2.5} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
