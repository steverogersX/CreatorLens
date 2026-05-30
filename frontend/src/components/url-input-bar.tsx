"use client";

import { useState } from "react";
import { Aperture, AlertCircle, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function URLInputBar() {
  const [urlA, setUrlA] = useState("https://youtube.com/watch?v=T_Qwke60mCs");
  const [urlB, setUrlB] = useState("https://youtube.com/watch?v=t6Sl_KiXO9I");
  const [errorA, setErrorA] = useState(false);
  const [errorB, setErrorB] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  function isValidUrl(url: string) {
    return (
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("instagram.com")
    );
  }

  function handleAnalyze() {
    const aOk = isValidUrl(urlA);
    const bOk = isValidUrl(urlB);
    setErrorA(!aOk);
    setErrorB(!bOk);
    if (aOk && bOk) {
      setAnalyzing(true);
      setTimeout(() => setAnalyzing(false), 2000);
    }
  }

  return (
    <header className="h-[58px] flex items-center gap-3 px-4 bg-background border-b border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0 mr-1">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Aperture size={16} className="text-primary-foreground" strokeWidth={2} />
        </div>
        <div className="flex flex-col leading-none gap-0.5">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            CreatorLens
          </span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
            Video Intelligence
          </span>
        </div>
      </div>

      <div className="w-px h-5 bg-border shrink-0" />

      {/* URL inputs */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <UrlInput
          label="A"
          accentClass="text-accent-blue"
          focusBorderClass="focus:border-accent-blue/50"
          value={urlA}
          onChange={(v) => { setUrlA(v); setErrorA(false); }}
          error={errorA}
          placeholder="YouTube or Instagram — Video A"
        />
        <UrlInput
          label="B"
          accentClass="text-accent-green"
          focusBorderClass="focus:border-accent-green/50"
          value={urlB}
          onChange={(v) => { setUrlB(v); setErrorB(false); }}
          error={errorB}
          placeholder="YouTube or Instagram — Video B"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={handleAnalyze}
          disabled={analyzing}
          className={cn(
            "h-9 px-5 rounded-md text-sm font-medium",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                style={{ animation: "spin 0.7s linear infinite" }}
              />
              Analyzing…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <ArrowUp size={14} strokeWidth={2.5} />
              Analyze
            </span>
          )}
        </Button>

        <div className="w-px h-5 bg-border" />
        <ThemeToggle />
      </div>
    </header>
  );
}

interface UrlInputProps {
  label: string;
  accentClass: string;
  focusBorderClass: string;
  value: string;
  onChange: (v: string) => void;
  error: boolean;
  placeholder: string;
}

function UrlInput({
  label,
  accentClass,
  focusBorderClass,
  value,
  onChange,
  error,
  placeholder,
}: UrlInputProps) {
  return (
    <div className="relative flex-1 min-w-0 flex items-center">
      <span
        className={cn(
          "absolute left-3 z-10 text-[10px] font-bold font-mono tracking-widest select-none",
          accentClass
        )}
      >
        {label}
      </span>

      {error && (
        <span className="absolute right-3 z-10 text-destructive">
          <AlertCircle size={13} />
        </span>
      )}

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-9 bg-input rounded-md border text-[12px] font-mono",
          "text-foreground placeholder:text-muted-foreground/50 outline-none",
          "pl-7 pr-8 transition-colors",
          error
            ? "border-destructive/40 bg-destructive/5"
            : cn("border-border", focusBorderClass)
        )}
      />
    </div>
  );
}
