"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Aperture, ArrowUp, X, Loader2 } from "lucide-react";
import { initStream, pushStreamEvent, type LiveEvent } from "@/lib/active-stream";
import { playMockStream, MOCK_THREAD_ID } from "@/lib/mock-stream";
import { cn } from "@/lib/utils";

/* ── URL detection ─────────────────────────────────────────── */
const VIDEO_URL_RE =
  /https?:\/\/(?:(?:www\.)?youtube\.com\/watch\?(?:\S*&)?v=[\w-]+|youtu\.be\/[\w-]+|(?:www\.)?instagram\.com\/(?:p|reel)\/[\w-]+|(?:www\.)?(?:twitter|x)\.com\/\S+\/status\/\d+)\S*/gi;

function findVideoUrls(text: string): string[] {
  return [...new Set(text.match(VIDEO_URL_RE) ?? [])];
}

type Platform = "youtube" | "instagram" | "twitter";

function detectPlatform(url: string): Platform {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  return "twitter";
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

/* ── Platform icons ────────────────────────────────────────── */
function YTIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
    </svg>
  );
}

function IGIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.3 5.7L13.1 12l5.9 6.3H16l-4-4.3-4 4.3H5.1L10.7 12 5.1 5.7H8l3.8 4.1L15.6 5.7H18.3z" />
    </svg>
  );
}

const PLATFORM_ICON: Record<Platform, React.FC<{ className?: string }>> = {
  youtube: YTIcon,
  instagram: IGIcon,
  twitter: XIcon,
};

// Monochrome — platform recognition comes from the glyph shape, not colour.
const PLATFORM_COLOR: Record<Platform, string> = {
  youtube: "text-foreground/70",
  instagram: "text-foreground/70",
  twitter: "text-foreground/70",
};

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "flex items-center gap-2 px-4 py-2.5 rounded-xl",
      "bg-card border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
      "text-[13px] text-foreground/90 font-medium",
      "animate-in fade-in slide-in-from-bottom-2 duration-200"
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-destructive/80 shrink-0" />
      {message}
    </div>
  );
}

/* ── URL chip ──────────────────────────────────────────────── */
function UrlChip({
  url,
  label,
  onRemove,
}: {
  url: string;
  label: "A" | "B";
  onRemove: () => void;
}) {
  const platform = detectPlatform(url);
  const Icon = PLATFORM_ICON[platform];
  const iconColor = PLATFORM_COLOR[platform];
  const ytId = platform === "youtube" ? extractYouTubeId(url) : null;
  const isA = label === "A";

  return (
    <div className={cn(
      "flex items-center gap-2 pr-1.5 pl-1.5 h-10 rounded-xl border border-border shrink-0",
      "bg-secondary transition-colors duration-150",
    )}>
      {/* Thumbnail or icon */}
      {ytId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
          alt=""
          className="w-12 h-[28px] rounded-lg object-cover shrink-0 bg-border/40"
        />
      ) : (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-accent">
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
      )}

      {/* Label + domain */}
      <div className="flex flex-col leading-none gap-0.5 min-w-0">
        <span className={cn(
          "text-[10px] font-bold font-mono tracking-widest",
          isA ? "text-foreground" : "text-muted-foreground"
        )}>
          VIDEO {label}
        </span>
        <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
          {ytId
            ? `youtu.be/${ytId}`
            : (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url.slice(0, 20); } })()
          }
        </span>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="ml-1 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-secondary transition-all duration-100 shrink-0"
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ── Example prompts ───────────────────────────────────────── */
const EXAMPLES = [
  "Which video has better retention?",
  "Compare their teaching styles",
  "Which is better for beginners?",
];

/* ── Landing page ──────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mock flag is client-only (env + URL). useSyncExternalStore returns false
  // during SSR and the real value on the client — no hydration mismatch.
  const isMock = useSyncExternalStore(
    () => () => {},
    () =>
      process.env["NEXT_PUBLIC_MOCK_STREAM"] === "1" ||
      new URLSearchParams(window.location.search).has("mock"),
    () => false,
  );

  const canSubmit = (videoUrls.length === 2 || isMock) && !isSubmitting;

  // auto-grow
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text");
    const foundUrls = findVideoUrls(pasted);
    if (foundUrls.length === 0) return; // normal paste

    e.preventDefault();

    const slots = 2 - videoUrls.length;

    if (slots === 0) {
      showToast("Only 2 videos allowed — remove one to swap");
      return;
    }

    const toAdd = foundUrls.slice(0, slots);
    const overflow = foundUrls.length > slots;

    setVideoUrls((prev) => [...prev, ...toAdd]);

    if (overflow) {
      showToast("Only 2 videos allowed — extra URLs skipped");
    }

    // keep non-URL text as question
    const nonUrl = pasted.replace(VIDEO_URL_RE, "").replace(/\s{2,}/g, " ").trim();
    if (nonUrl) setQuestion((prev) => (prev ? `${prev} ${nonUrl}` : nonUrl));
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    // detect if a full URL was typed/pasted through onChange (fallback)
    const urls = findVideoUrls(val);
    if (urls.length > 0) {
      const slots = 2 - videoUrls.length;
      if (slots > 0) {
        const toAdd = urls.slice(0, slots);
        setVideoUrls((prev) => [...new Set([...prev, ...toAdd])]);
        if (urls.length > slots) showToast("Only 2 videos allowed — extra URLs skipped");
      } else {
        showToast("Only 2 videos allowed — remove one to swap");
      }
      const nonUrl = val.replace(VIDEO_URL_RE, "").replace(/\s{2,}/g, " ").trimStart();
      setQuestion(nonUrl);
    } else {
      setQuestion(val);
    }
  }

  function removeUrl(idx: number) {
    setVideoUrls((prev) => prev.filter((_, i) => i !== idx));
    textareaRef.current?.focus();
  }

  function handleSubmit() {
    if (!canSubmit) return;

    // ── Mock mode ─────────────────────────────────────────────────────────────
    if (isMock) {
      setIsSubmitting(true);
      const tid = playMockStream(MOCK_THREAD_ID);
      setTimeout(() => {
        setIsSubmitting(false);
        router.push(`/c/${tid}`);
      }, 300);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const [urlA, urlB] = videoUrls;
    const userMessage = question.trim() || "Compare these two videos";
    setIsSubmitting(true);

    void (async () => {
      let navigated = false;
      let threadId: string | null = null;
      // Owned by the active-stream store so the thread page's Stop button can abort it.
      const abort = new AbortController();
      try {
        const res = await fetch("/api/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "new", urls: [urlA, urlB], userMessage }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          setIsSubmitting(false);
          showToast("Failed to start — please try again");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (event["type"] === "thread_created" && !navigated) {
              threadId = event["threadId"] as string;
              initStream(threadId, userMessage, abort);
              navigated = true;
              setIsSubmitting(false);
              router.push(`/c/${threadId}`);
            } else if (event["type"] === "error" && !navigated) {
              navigated = true; // prevent fallback toast from firing too
              setIsSubmitting(false);
              showToast((event["message"] as string | undefined) ?? "Something went wrong — please try again");
            } else if (threadId) {
              pushStreamEvent(event as LiveEvent);
            }
          }
        }

        // Stream closed before any event was received
        if (!navigated) {
          setIsSubmitting(false);
          showToast("Something went wrong — please try again");
        }
      } catch {
        if (!navigated) {
          setIsSubmitting(false);
          showToast("Something went wrong — please try again");
        }
      }
    })();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const placeholder =
    videoUrls.length === 0
      ? "Paste a video URL to get started…"
      : videoUrls.length === 1
      ? "Paste a second video URL…"
      : "Ask anything, or just hit enter to compare…";

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background px-4 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col items-center w-full max-w-[640px] py-10">
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-foreground shadow-sm">
          <Aperture size={22} className="text-background" strokeWidth={2} />
        </div>

        {isMock && (
          <div className="mb-4 px-2.5 py-1 rounded-full bg-secondary border border-border text-[11px] font-mono text-muted-foreground tracking-widest">
            MOCK MODE
          </div>
        )}
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-foreground text-center mb-2">
          Compare any two videos with AI
        </h1>
        <p className="text-[14.5px] text-muted-foreground text-center mb-8">
          Paste two video URLs — add a question, or just hit enter to compare.
        </p>

      {/* Input card */}
      <div className="w-full">
        <div className={cn(
          "flex flex-col bg-card border rounded-2xl px-4 py-4 shadow-sm",
          "transition-colors duration-150 border-border",
          "focus-within:border-foreground/30 focus-within:ring-4 focus-within:ring-foreground/5",
        )}>
          {/* URL chips row */}
          {videoUrls.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {videoUrls.map((url, i) => (
                <UrlChip
                  key={url}
                  url={url}
                  label={i === 0 ? "A" : "B"}
                  onRemove={() => removeUrl(i)}
                />
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={question}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className={cn(
              "w-full resize-none bg-transparent outline-none",
              "text-[14px] text-foreground placeholder:text-muted-foreground/35",
              "leading-relaxed max-h-[160px] overflow-y-auto font-sans"
            )}
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-muted-foreground/35 font-mono">
              {videoUrls.length === 2 ? "shift+enter for new line" : `${2 - videoUrls.length} more video URL needed`}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                "transition-all duration-150",
                canSubmit
                  ? "bg-foreground text-background hover:bg-foreground/85 hover:scale-105 active:scale-95"
                  : "bg-border/40 text-muted-foreground/25 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <Loader2 size={13} strokeWidth={2} className="animate-spin" />
              ) : (
                <ArrowUp size={14} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>

        {/* Example prompts */}
        <div className="flex flex-wrap items-center gap-2 mt-4 justify-center">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuestion(q); textareaRef.current?.focus(); }}
              className="text-[12px] text-muted-foreground border border-border/40 rounded-full px-3.5 py-1.5 transition-all duration-150 hover:text-foreground hover:border-border hover:bg-secondary/50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
