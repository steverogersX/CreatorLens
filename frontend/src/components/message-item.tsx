"use client";

import { useState, useMemo, useRef, useEffect, memo } from "react";
import type { Components } from "react-markdown";
import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Pencil, Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { CitationBadge } from "@/components/citation-badge";
import { AgentSteps, type AgentStep } from "@/components/agent-steps";
import { useThrottledValue } from "@/lib/use-throttled-value";
import type { UIMessage, TextUIPart } from "ai";
import type { CitationPayload } from "@shared/events";

// Cap full Markdown re-parses to ~12/s while a message streams token-by-token.
const STREAM_THROTTLE_MS = 80;

export type Message = UIMessage;

type VideoPlatform = "youtube" | "instagram" | "twitter";

export interface MessageItemProps {
  message: Message;
  videoPlatforms: Record<"A" | "B", VideoPlatform>;
  streaming?: boolean;
  /** Whether this assistant message can be regenerated (only the latest one). */
  canRegenerate?: boolean;
  /** Always show action buttons without hover (only the latest assistant message). */
  isLastAssistant?: boolean;
  onEdit?: (id: string, newText: string) => void;
  onRegenerate?: (id: string) => void;
}

function getTextContent(message: Message): string {
  return message.parts
    .filter((p): p is TextUIPart => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function getStepsFromMessage(message: Message): AgentStep[] {
  const map = new Map<string, "running" | "done">();
  const order: string[] = [];
  for (const part of message.parts) {
    if (part.type === "data-agent-step") {
      const { label, stepStatus } = (
        part as unknown as { type: string; data: AgentStep }
      ).data;
      if (!map.has(label)) order.push(label);
      map.set(label, stepStatus);
    }
  }
  return order.map((label) => ({ label, stepStatus: map.get(label)! }));
}

function getCitationsFromMessage(message: Message): Map<string, CitationPayload> {
  const map = new Map<string, CitationPayload>();
  for (const part of message.parts) {
    if (part.type === "data-citations") {
      const { citations } = (
        part as unknown as { type: string; data: { citations: CitationPayload[] } }
      ).data;
      for (const c of citations) {
        map.set(`${c.video}:${c.timestampLabel}`, c);
      }
    }
  }
  return map;
}

const CITE_RE = /\[([AB]):(\d+:\d+)\]/g;

function splitOnCitations(
  text: string,
  platforms: Record<"A" | "B", VideoPlatform>,
  citations: Map<string, CitationPayload>,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(CITE_RE.source, "g");

  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) nodes.push(text.slice(cursor, m.index));
    const video = m[1] as "A" | "B";
    const timestamp = m[2]!;
    nodes.push(
      <CitationBadge
        key={`${video}-${m.index}`}
        video={video}
        timestamp={timestamp}
        platform={platforms[video]}
        citation={citations.get(`${video}:${timestamp}`)}
      />
    );
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function parseChildren(
  children: React.ReactNode,
  platforms: Record<"A" | "B", VideoPlatform>,
  citations: Map<string, CitationPayload>,
): React.ReactNode {
  if (typeof children === "string") return splitOnCitations(children, platforms, citations);
  if (Array.isArray(children)) {
    return children.flatMap((child) =>
      typeof child === "string" ? splitOnCitations(child, platforms, citations) : [child]
    );
  }
  return children;
}

export function makeMdComponents(
  platforms: Record<"A" | "B", VideoPlatform>,
  citations: Map<string, CitationPayload>,
): Components {
  return {
    p: ({ children }) => (
      <p className="text-[14px] leading-[1.75] text-foreground/90 mb-3 last:mb-0">
        {parseChildren(children, platforms, citations)}
      </p>
    ),
    li: ({ children }) => (
      <li className="leading-[1.75]">{parseChildren(children, platforms, citations)}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-foreground/70">{children}</em>
    ),
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground transition-colors break-words">
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-[14px] text-foreground/90 space-y-1.5 pl-1 mb-3 last:mb-0">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-[14px] text-foreground/90 space-y-1.5 pl-1 mb-3 last:mb-0">
        {children}
      </ol>
    ),
    code: ({ children, className }) => {
      if (className?.startsWith("language-")) return <code className={className}>{children}</code>;
      return (
        <code className="bg-secondary text-foreground font-mono text-[12px] px-1.5 py-0.5 rounded border border-border break-words">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-secondary border border-border/50 rounded-xl p-4 overflow-x-auto text-[12px] font-mono text-foreground/90 mb-3 last:mb-0">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-border pl-4 text-foreground/60 italic text-[14px] mb-3 last:mb-0">
        {children}
      </blockquote>
    ),
    h1: ({ children }) => <h1 className="text-[15px] font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-[14px] font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h2>,
    h3: ({ children }) => (
      <h3 className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider mt-3 mb-1.5 first:mt-0">{children}</h3>
    ),
  };
}

const EMPTY_CITATIONS = new Map<string, CitationPayload>();

function ActionBtn({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150",
        active
          ? "text-foreground bg-secondary"
          : "text-muted-foreground/40 hover:text-foreground hover:bg-secondary/80"
      )}
    >
      <Icon size={13} strokeWidth={1.75} />
    </button>
  );
}

function MessageItemInner({
  message,
  videoPlatforms,
  streaming = false,
  canRegenerate = false,
  isLastAssistant = false,
  onEdit,
  onRegenerate,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const textContent = useMemo(() => getTextContent(message), [message]);
  const throttledText = useThrottledValue(textContent, streaming ? STREAM_THROTTLE_MS : 0);
  // A stopped stream can leave a step "running"; once idle, show it as done.
  const steps = useMemo(() => {
    const s = getStepsFromMessage(message);
    return streaming
      ? s
      : s.map((x) => (x.stepStatus === "running" ? { ...x, stepStatus: "done" as const } : x));
  }, [message, streaming]);
  const citationsMap = useMemo(() => getCitationsFromMessage(message), [message]);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);

  const mdComponents = useMemo(
    () => makeMdComponents(videoPlatforms, citationsMap),
    [videoPlatforms, citationsMap],
  );

  useEffect(() => {
    if (!isEditing) return;
    const el = editRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [isEditing]);

  function handleCopy() {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 1800);
  }

  function startEdit() {
    setDraft(textContent);
    setIsEditing(true);
  }

  function submitEdit() {
    const next = draft.trim();
    if (next && next !== textContent) onEdit?.(message.id, next);
    setIsEditing(false);
  }

  function handleEditKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
    }
  }

  if (!isUser && !textContent && steps.length === 0) return null;

  if (isUser) {
    if (isEditing) {
      return (
        <div className="flex flex-col items-end gap-2 min-w-0">
          <div className="w-full max-w-[90%] bg-card border border-border rounded-2xl px-3.5 py-3 shadow-sm">
            <textarea
              ref={editRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleEditKey}
              className={cn(
                "w-full resize-none bg-transparent outline-none",
                "text-[14px] leading-[1.6] text-foreground max-h-[200px] overflow-y-auto",
              )}
            />
            <div className="flex items-center justify-end gap-2 mt-2.5">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 h-7 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={!draft.trim() || draft.trim() === textContent}
                className={cn(
                  "px-3 h-7 rounded-lg text-[12.5px] font-medium transition-colors",
                  !draft.trim() || draft.trim() === textContent
                    ? "bg-secondary text-muted-foreground/40"
                    : "bg-foreground text-background hover:bg-foreground/90",
                )}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="group/msg flex flex-col items-end gap-1.5 min-w-0">
        <div className={cn(
          "max-w-[80%] bg-secondary border border-border",
          "rounded-2xl rounded-tr-md px-4 py-2.5",
          "text-[14px] leading-[1.6] text-foreground",
          "whitespace-pre-wrap break-words",
        )}>
          {textContent}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 pr-1">
          <ActionBtn icon={copied ? Check : Copy} label="Copy" active={copied} onClick={handleCopy} />
          {onEdit && <ActionBtn icon={Pencil} label="Edit" onClick={startEdit} />}
        </div>
      </div>
    );
  }

  return (
    <div className="group/msg flex flex-col gap-2 min-w-0">
      <AgentSteps steps={steps} hasText={textContent.length > 0} />

      {textContent && (
        <div className={cn("markdown min-w-0 max-w-full", streaming && "cursor-blink")}>
          <Markdown text={throttledText} components={mdComponents} />
        </div>
      )}

      {!streaming && textContent && (
        <div className={cn(
          "flex items-center gap-0.5 transition-opacity duration-150 -ml-1",
          isLastAssistant ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100",
        )}>
          <ActionBtn icon={copied ? Check : Copy} label="Copy" active={copied} onClick={handleCopy} />
          <ActionBtn icon={shared ? Check : Share2} label="Share" active={shared} onClick={handleShare} />
          <ActionBtn
            icon={ThumbsUp}
            label="Good response"
            active={liked}
            onClick={() => { setLiked(true); setDisliked(false); }}
          />
          <ActionBtn
            icon={ThumbsDown}
            label="Bad response"
            active={disliked}
            onClick={() => { setDisliked(true); setLiked(false); }}
          />
          {canRegenerate && onRegenerate && (
            <ActionBtn icon={RotateCcw} label="Regenerate" onClick={() => onRegenerate(message.id)} />
          )}
        </div>
      )}
    </div>
  );
}

export { EMPTY_CITATIONS };
export const MessageItem = memo(MessageItemInner);
