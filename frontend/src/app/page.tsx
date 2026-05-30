"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Aperture, ArrowUp, X } from "lucide-react";
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

const PLATFORM_COLOR: Record<Platform, string> = {
  youtube: "text-[#FF4444]",
  instagram: "text-[#E1306C]",
  twitter: "text-[#1DA1F2]",
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
      "flex items-center gap-2 pr-1 pl-1 h-9 rounded-xl border shrink-0",
      "bg-secondary/60 transition-all duration-150",
      isA ? "border-accent-blue/25" : "border-accent-green/25"
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
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          isA ? "bg-accent-blue/10" : "bg-accent-green/10"
        )}>
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
      )}

      {/* Label + domain */}
      <div className="flex flex-col leading-none gap-0.5 min-w-0">
        <span className={cn(
          "text-[10px] font-bold font-mono tracking-widest",
          isA ? "text-accent-blue" : "text-accent-green"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = videoUrls.length === 2;

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
    const [urlA, urlB] = videoUrls;
    const href =
      `/compare?a=${encodeURIComponent(urlA)}&b=${encodeURIComponent(urlB)}` +
      (question.trim() ? `&q=${encodeURIComponent(question.trim())}` : "");
    router.push(href);
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
    <div className="h-full flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center shrink-0">
          <Aperture size={17} className="text-background" strokeWidth={2} />
        </div>
        <span className="text-[18px] font-semibold tracking-tight text-foreground">
          CreatorLens
        </span>
      </div>

      <h1 className="text-[26px] font-semibold tracking-tight text-foreground text-center mb-1">
        Compare any two videos with AI
      </h1>
      <p className="text-[14px] text-muted-foreground text-center mb-8">
        Paste two video URLs — add a question or just hit enter
      </p>

      {/* Input card */}
      <div className="w-full max-w-[600px]">
        <div className={cn(
          "flex flex-col bg-card border rounded-2xl px-4 py-3.5",
          "transition-all duration-150",
          canSubmit
            ? "border-border focus-within:border-foreground/25"
            : "border-border/60 focus-within:border-border"
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
              <ArrowUp size={14} strokeWidth={2.5} />
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

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
