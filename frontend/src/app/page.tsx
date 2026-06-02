"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Aperture, ArrowUp, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-4 py-2.5 rounded-xl",
        "bg-card border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        "text-[13px] text-foreground/90 font-medium",
      )}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-destructive/80 shrink-0" />
      {message}
    </motion.div>
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

/* ── Animation variants ────────────────────────────────────── */
const SPRING_PAGE = { type: "spring" as const, stiffness: 340, damping: 28, mass: 0.7 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING_PAGE,
  },
};

/* ── Landing page ──────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isMock = useSyncExternalStore(
    () => () => {},
    () =>
      process.env["NEXT_PUBLIC_MOCK_STREAM"] === "1" ||
      new URLSearchParams(window.location.search).has("mock"),
    () => false,
  );

  const canSubmit = (videoUrls.length === 2 || isMock) && !isSubmitting;

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
    if (foundUrls.length === 0) return;

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

    const nonUrl = pasted.replace(VIDEO_URL_RE, "").replace(/\s{2,}/g, " ").trim();
    if (nonUrl) setQuestion((prev) => (prev ? `${prev} ${nonUrl}` : nonUrl));
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
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

    if (isMock) {
      setIsSubmitting(true);
      const tid = playMockStream(MOCK_THREAD_ID);
      setTimeout(() => {
        setIsSubmitting(false);
        router.push(`/c/${tid}`);
      }, 300);
      return;
    }

    const [urlA, urlB] = videoUrls;
    const userMessage = question.trim() || "Compare these two videos";
    setIsSubmitting(true);

    void (async () => {
      let navigated = false;
      let threadId: string | null = null;
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
              navigated = true;
              setIsSubmitting(false);
              showToast((event["message"] as string | undefined) ?? "Something went wrong — please try again");
            } else if (threadId) {
              pushStreamEvent(event as LiveEvent);
            }
          }
        }

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
      <motion.div
        className="flex flex-col items-center w-full max-w-[640px] py-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div
          variants={sectionVariants}
          className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-foreground shadow-sm"
          whileHover={{ scale: 1.06, rotate: 6 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          <Aperture size={22} className="text-background" strokeWidth={2} />
        </motion.div>

        {isMock && (
          <motion.div variants={sectionVariants} className="mb-4 px-2.5 py-1 rounded-full bg-secondary border border-border text-[11px] font-mono text-muted-foreground tracking-widest">
            MOCK MODE
          </motion.div>
        )}

        {/* Headline */}
        <motion.h1
          variants={sectionVariants}
          className="text-[30px] leading-tight font-semibold tracking-tight text-foreground text-center mb-2"
        >
          Compare any two videos with AI
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={sectionVariants}
          className="text-[14.5px] text-muted-foreground text-center mb-8"
        >
          Paste two video URLs — add a question, or just hit enter to compare.
        </motion.p>

        {/* Input card */}
        <motion.div variants={sectionVariants} className="w-full">
          <div className={cn(
            "flex flex-col bg-card border rounded-2xl px-4 py-4 shadow-sm",
            "transition-colors duration-150 border-border",
            "focus-within:border-foreground/30 focus-within:ring-4 focus-within:ring-foreground/5",
          )}>
            {/* URL chips row */}
            <AnimatePresence mode="popLayout">
              {videoUrls.length > 0 && (
                <motion.div
                  key="chips-row"
                  className="flex items-center gap-2 mb-3 flex-wrap"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.7 }}
                >
                  <AnimatePresence mode="popLayout">
                    {videoUrls.map((url, i) => (
                      <motion.div
                        key={url}
                        initial={{ opacity: 0, scale: 0.78, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.78, y: -6 }}
                        transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.6 }}
                      >
                        <UrlChip
                          url={url}
                          label={i === 0 ? "A" : "B"}
                          onRemove={() => removeUrl(i)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

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
              <motion.button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  "transition-colors duration-150",
                  canSubmit
                    ? "bg-foreground text-background hover:bg-foreground/85 cursor-pointer"
                    : "bg-border/40 text-muted-foreground/25 cursor-not-allowed"
                )}
                whileHover={canSubmit ? { scale: 1.1 } : {}}
                whileTap={canSubmit ? { scale: 0.88 } : {}}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                {isSubmitting ? (
                  <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                ) : (
                  <ArrowUp size={14} strokeWidth={2.5} />
                )}
              </motion.button>
            </div>
          </div>

          {/* Example prompts */}
          <motion.div
            variants={sectionVariants}
            className="flex flex-wrap items-center gap-2 mt-4 justify-center"
          >
            {EXAMPLES.map((q) => (
              <motion.button
                key={q}
                onClick={() => { setQuestion(q); textareaRef.current?.focus(); }}
                className="text-[12px] text-muted-foreground border border-border/40 rounded-full px-3.5 py-1.5 transition-colors duration-150 hover:text-foreground hover:border-border hover:bg-secondary/50"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
              >
                {q}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast key="toast" message={toast} onDone={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
