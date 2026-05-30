"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Aperture, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const VIDEO_URL_RE =
  /https?:\/\/(?:(?:www\.)?youtube\.com\/watch\?(?:\S*&)?v=[\w-]+|youtu\.be\/[\w-]+|(?:www\.)?instagram\.com\/(?:p|reel)\/[\w-]+|(?:www\.)?(?:twitter|x)\.com\/\S+\/status\/\d+)\S*/gi;

function extractVideoUrls(text: string): string[] {
  const matches = text.match(VIDEO_URL_RE) ?? [];
  // deduplicate, keep first two
  return [...new Set(matches)].slice(0, 2);
}

function stripUrls(text: string, urls: string[]): string {
  let out = text;
  for (const url of urls) out = out.replace(url, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

const EXAMPLES = [
  "Which video has better audience retention?",
  "Compare their teaching styles",
  "Which is better for beginners?",
];

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const detectedUrls = extractVideoUrls(value);
  const urlCount = detectedUrls.length;
  const canSubmit = urlCount >= 2;

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function handleSubmit() {
    if (!canSubmit) {
      setError(
        urlCount === 0
          ? "Paste two video URLs to get started"
          : "Need one more video URL"
      );
      return;
    }
    setError("");
    const [urlA, urlB] = detectedUrls;
    const question = stripUrls(value, detectedUrls);
    const href =
      `/compare?a=${encodeURIComponent(urlA)}&b=${encodeURIComponent(urlB)}` +
      (question ? `&q=${encodeURIComponent(question)}` : "");
    router.push(href);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleExample(q: string) {
    setValue((prev) => {
      const urls = extractVideoUrls(prev);
      const urlPart = urls.join(" ");
      return urlPart ? `${urlPart} ${q}` : q;
    });
    textareaRef.current?.focus();
  }

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

      {/* Headline */}
      <h1 className="text-[26px] font-semibold tracking-tight text-foreground text-center mb-1">
        Compare any two videos with AI
      </h1>
      <p className="text-[14px] text-muted-foreground text-center mb-8">
        Paste two video URLs — add a question or just hit enter
      </p>

      {/* Input */}
      <div className="w-full max-w-[600px]">
        <div
          className={cn(
            "relative flex flex-col bg-card border rounded-2xl px-5 py-4",
            "transition-all duration-150",
            error
              ? "border-destructive/40"
              : canSubmit
              ? "border-border focus-within:border-foreground/30"
              : "border-border/60 focus-within:border-border"
          )}
        >
          {/* URL count badge */}
          {urlCount > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              {detectedUrls.map((url, i) => (
                <span
                  key={url}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 h-[20px] rounded-md",
                    "text-[10px] font-bold font-mono tracking-wider",
                    i === 0
                      ? "bg-accent-blue/15 text-accent-blue"
                      : "bg-accent-green/15 text-accent-green"
                  )}
                >
                  {i === 0 ? "A" : "B"}
                  <span className="font-normal opacity-60 max-w-[120px] truncate">
                    {new URL(url).hostname.replace("www.", "")}
                  </span>
                </span>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
            onKeyDown={handleKey}
            placeholder={
              urlCount === 0
                ? "Paste two video URLs — youtube.com, instagram.com, x.com…"
                : urlCount === 1
                ? "Paste a second video URL…"
                : "Ask anything about these videos, or just hit enter"
            }
            className={cn(
              "w-full resize-none bg-transparent outline-none",
              "text-[14px] text-foreground placeholder:text-muted-foreground/35",
              "leading-relaxed max-h-[200px] overflow-y-auto",
              "font-sans"
            )}
          />

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-muted-foreground/40 font-mono">
              {error ? (
                <span className="text-destructive/70">{error}</span>
              ) : (
                "shift+enter for new line"
              )}
            </span>

            <button
              onClick={handleSubmit}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                "transition-all duration-150",
                canSubmit
                  ? "bg-foreground text-background hover:bg-foreground/85 hover:scale-105 active:scale-95"
                  : "bg-border/40 text-muted-foreground/30 cursor-not-allowed"
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
              onClick={() => handleExample(q)}
              className={cn(
                "text-[12px] text-muted-foreground border border-border/40 rounded-full",
                "px-3.5 py-1.5 transition-all duration-150",
                "hover:text-foreground hover:border-border hover:bg-secondary/50"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
