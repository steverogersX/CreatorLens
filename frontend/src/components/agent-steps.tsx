"use client";

import { useState, useEffect, useRef, memo } from "react";
import {
  Loader2,
  ChevronDown,
  FileVideo2,
  ScrollText,
  Sparkles,
  Search,
  Brain,
  Lightbulb,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AgentStep {
  label: string;
  stepStatus: "running" | "done";
}

interface AgentStepsProps {
  steps: AgentStep[];
  hasText: boolean;
}

function resolveIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (l.includes("fetch") || l.includes("metadata") || l.includes("video")) return FileVideo2;
  if (l.includes("transcript") || l.includes("analyz")) return ScrollText;
  if (l.includes("generat") || l.includes("compar") || l.includes("writing")) return Sparkles;
  if (l.includes("search") || l.includes("look")) return Search;
  if (l.includes("think") || l.includes("reason")) return Brain;
  if (l.includes("plan")) return Lightbulb;
  return Zap;
}

function AgentStepsInner({ steps, hasText }: AgentStepsProps) {
  const isDone = steps.length > 0 && steps.every((s) => s.stepStatus === "done");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  // Tick while running; the interval stops on done, freezing the last value.
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => {
      if (startRef.current !== null) {
        setElapsedSeconds(Math.round((Date.now() - startRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(id);
  }, [isDone]);

  // Auto-collapse 1.5s after text starts streaming
  useEffect(() => {
    if (!hasText) return;
    const t = setTimeout(() => setIsCollapsed(true), 1500);
    return () => clearTimeout(t);
  }, [hasText]);

  if (steps.length === 0) return null;

  const displaySeconds = Math.max(1, elapsedSeconds);

  return (
    <div className="flex w-full flex-col">
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:text-foreground group"
      >
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
        <span className={cn("text-[12.5px] text-foreground/60", !isDone && "thinking-shimmer")}>
          {isDone ? `Thought for ${displaySeconds}s` : "Thinking…"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="relative pt-2 pb-3 pl-1">
              {steps.map((step, index) => {
                const isLastStep = index === steps.length - 1;
                const isActive = isLastStep && !isDone;
                const Icon = resolveIcon(step.label);

                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: index * 0.06 }}
                    className="relative pb-4 last:pb-0"
                  >
                    {!isLastStep && (
                      <div className="absolute left-[11px] top-[26px] bottom-0 w-px bg-border/60" />
                    )}

                    <div className={cn(
                      "flex items-start gap-3 rounded-lg px-1.5 py-0.5 -mx-1.5",
                      isActive && "step-row-shimmer",
                    )}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.06 }}
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                          isActive
                            ? "border-foreground/20 bg-foreground/8 text-foreground"
                            : "border-border/50 bg-muted/30 text-foreground/40",
                        )}
                      >
                        {isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </motion.div>

                      <span
                        className={cn(
                          "text-[12.5px] leading-5",
                          isActive && "thinking-shimmer",
                          !isActive && "text-foreground/50",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const AgentSteps = memo(AgentStepsInner);
