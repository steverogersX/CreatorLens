"use client";

import { useState, useMemo, memo, useDeferredValue } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CitationBadge } from "@/components/citation-badge";
import { AgentSteps, type AgentStep } from "@/components/agent-steps";
import type { UIMessage, TextUIPart } from "ai";

export type Message = UIMessage;

type VideoPlatform = "youtube" | "instagram" | "twitter";

export interface MessageItemProps {
  message: Message;
  videoPlatforms: Record<"A" | "B", VideoPlatform>;
  streaming?: boolean;
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

const CITE_RE = /\[([AB]):([^\]]+)\]/g;

function splitOnCitations(
  text: string,
  platforms: Record<"A" | "B", VideoPlatform>
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(CITE_RE.source, "g");

  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) nodes.push(text.slice(cursor, m.index));
    const video = m[1] as "A" | "B";
    nodes.push(
      <CitationBadge
        key={`${video}-${m.index}`}
        video={video}
        timestamp={m[2]}
        platform={platforms[video]}
      />
    );
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function parseChildren(
  children: React.ReactNode,
  platforms: Record<"A" | "B", VideoPlatform>
): React.ReactNode {
  if (typeof children === "string") return splitOnCitations(children, platforms);
  if (Array.isArray(children)) {
    return children.flatMap((child) =>
      typeof child === "string" ? splitOnCitations(child, platforms) : [child]
    );
  }
  return children;
}

function makeMdComponents(
  platforms: Record<"A" | "B", VideoPlatform>
): React.ComponentProps<typeof ReactMarkdown>["components"] {
  return {
    p: ({ children }) => (
      <p className="text-[14px] leading-[1.75] text-foreground/90 mb-3 last:mb-0">
        {parseChildren(children, platforms)}
      </p>
    ),
    li: ({ children }) => (
      <li className="leading-[1.75]">{parseChildren(children, platforms)}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-foreground/70">{children}</em>
    ),
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="text-accent-blue underline underline-offset-2 hover:text-accent-blue/80 transition-colors">
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
        <code className="bg-secondary text-accent-blue font-mono text-[12px] px-1.5 py-0.5 rounded border border-border/50">
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
          ? "text-accent-green"
          : "text-muted-foreground/35 hover:text-muted-foreground hover:bg-secondary/80"
      )}
    >
      <Icon size={13} strokeWidth={1.75} />
    </button>
  );
}

function MessageItemInner({ message, videoPlatforms, streaming = false }: MessageItemProps) {
  const isUser = message.role === "user";
  const textContent = useMemo(() => getTextContent(message), [message]);
  const deferredText = useDeferredValue(textContent);
  const steps = useMemo(() => getStepsFromMessage(message), [message]);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const mdComponents = useMemo(() => makeMdComponents(videoPlatforms), [videoPlatforms]);

  function handleCopy() {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!isUser && !textContent && steps.length === 0) return null;

  if (isUser) {
    return (
      <div className="group/msg flex flex-col items-end gap-1.5">
        <div className={cn(
          "max-w-[75%] bg-secondary border border-border/40",
          "rounded-3xl rounded-tr-lg px-5 py-3",
          "text-[14px] leading-[1.75] text-foreground"
        )}>
          {textContent}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 pr-1">
          <ActionBtn icon={copied ? Check : Copy} label="Copy" active={copied} onClick={handleCopy} />
          <ActionBtn icon={Pencil} label="Edit" />
        </div>
      </div>
    );
  }

  return (
    <div className="group/msg flex flex-col gap-2">
      <AgentSteps steps={steps} hasText={textContent.length > 0} />

      {textContent && (
        <div className={cn("markdown", streaming && "cursor-blink")}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={mdComponents}
          >
            {deferredText}
          </ReactMarkdown>
        </div>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 -ml-1">
        <ActionBtn icon={copied ? Check : Copy} label="Copy" active={copied} onClick={handleCopy} />
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
        <ActionBtn icon={RotateCcw} label="Regenerate" />
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemInner);
