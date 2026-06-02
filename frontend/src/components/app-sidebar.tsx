"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Aperture,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  MessagesSquare,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { ThreadSummary } from "@/types/thread";

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

interface ExpandedContentProps {
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  showCollapseButton: boolean;
  showCloseButton: boolean;
  activeId: string | null;
  grouped: { label: string; items: ThreadSummary[] }[];
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  threads: ThreadSummary[] | undefined;
}

const fetcher = async (url: string): Promise<ThreadSummary[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load history");
  const json = (await res.json()) as { data: ThreadSummary[] };
  return json.data;
};

function bucketLabel(createdAt: string): string {
  const d = new Date(createdAt);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (differenceInCalendarDays(new Date(), d) <= 7) return "Previous 7 days";
  if (differenceInCalendarDays(new Date(), d) <= 30) return "Previous 30 days";
  return "Older";
}

const BUCKET_ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

/* ── Animation variants ──────────────────────────────────────── */

const SPRING_SNAPPY = { type: "spring" as const, stiffness: 400, damping: 38, mass: 0.8 };

const threadListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.032, delayChildren: 0.04 },
  },
};

const threadItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.6 },
  },
};

const contentFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.1 },
};

/* ── Shared expanded sidebar content ─────────────────────────── */

function ExpandedContent({
  onToggleCollapse,
  onCloseMobile,
  showCollapseButton,
  showCloseButton,
  activeId,
  grouped,
  query,
  setQuery,
  isLoading,
  threads,
}: ExpandedContentProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 h-[54px] shrink-0">
        <div className="flex size-7 items-center justify-center rounded-lg bg-foreground shrink-0">
          <Aperture size={15} className="text-background" strokeWidth={2} />
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-foreground">CreatorLens</span>
        <div className="ml-auto flex items-center gap-0.5">
          {showCollapseButton && (
            <motion.button
              onClick={onToggleCollapse}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              aria-label="Collapse sidebar"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING_SNAPPY}
            >
              <PanelLeftClose size={16} strokeWidth={2} />
            </motion.button>
          )}
          {showCloseButton && (
            <motion.button
              onClick={onCloseMobile}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Close menu"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING_SNAPPY}
            >
              <X size={16} strokeWidth={2} />
            </motion.button>
          )}
        </div>
      </div>

      {/* New comparison */}
      <div className="px-3 pb-2">
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={SPRING_SNAPPY}>
          <Link
            href="/"
            onClick={onCloseMobile}
            className={cn(
              "flex items-center gap-2 w-full h-9 px-3 rounded-lg",
              "bg-foreground text-background text-[13px] font-medium",
              "hover:bg-foreground/90 transition-colors",
            )}
          >
            <Plus size={16} strokeWidth={2.5} />
            New comparison
          </Link>
        </motion.div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className={cn(
              "w-full h-8 pl-8 pr-3 rounded-lg bg-input border border-transparent",
              "text-[13px] text-foreground placeholder:text-muted-foreground/50",
              "outline-none focus:border-border transition-colors",
            )}
          />
        </div>
      </div>

      {/* History */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
        {isLoading && !threads ? (
          <div className="space-y-1 px-1 pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className="h-8 rounded-lg bg-sidebar-accent/60 animate-pulse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <motion.p
            className="px-3 pt-6 text-[12.5px] text-muted-foreground/60 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {query ? "No chats match your search." : "No comparisons yet. Start a new one above."}
          </motion.p>
        ) : (
          <motion.div
            key={`threads-${isLoading ? "loading" : "loaded"}`}
            variants={threadListVariants}
            initial="hidden"
            animate="visible"
          >
            {grouped.map((group) => (
              <div key={group.label} className="mb-3">
                <motion.p
                  variants={threadItemVariants}
                  className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50"
                >
                  {group.label}
                </motion.p>
                <div className="space-y-0.5">
                  {group.items.map((t) => (
                    <motion.div key={t.threadId} variants={threadItemVariants}>
                      <Link
                        href={`/c/${t.threadId}`}
                        onClick={onCloseMobile}
                        className={cn(
                          "group/item flex items-center gap-2.5 px-3 h-9 rounded-lg",
                          "text-[13px] transition-colors",
                          activeId === t.threadId
                            ? "bg-sidebar-accent text-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                        )}
                      >
                        <MessagesSquare size={14} strokeWidth={2} className="shrink-0 opacity-60" />
                        <span className="truncate flex-1">{t.title}</span>
                        {t.status !== "completed" && t.status !== "error" && (
                          <span className="size-1.5 rounded-full bg-foreground/70 animate-pulse shrink-0" />
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </nav>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-3 py-2.5 shrink-0">
        <span className="text-[12px] text-muted-foreground/70 truncate">Video Intelligence</span>
        <ThemeToggle />
      </div>
    </>
  );
}

/* ── AppSidebar ───────────────────────────────────────────────── */

export function AppSidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const activeId = pathname?.startsWith("/c/") ? pathname.slice(3) : null;
  const [query, setQuery] = useState("");

  const { data: threads, isLoading } = useSWR("/api/threads", fetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (threads ?? []).filter((t) =>
      q ? t.title.toLowerCase().includes(q) || t.videoTitles.some((v) => v.toLowerCase().includes(q)) : true,
    );
    const buckets = new Map<string, ThreadSummary[]>();
    for (const t of list) {
      const b = bucketLabel(t.createdAt);
      const arr = buckets.get(b) ?? [];
      arr.push(t);
      buckets.set(b, arr);
    }
    return BUCKET_ORDER.filter((b) => buckets.has(b)).map((b) => ({ label: b, items: buckets.get(b)! }));
  }, [threads, query]);

  const sharedProps: Omit<ExpandedContentProps, "showCollapseButton" | "showCloseButton"> = {
    onToggleCollapse,
    onCloseMobile,
    activeId,
    grouped,
    query,
    setQuery,
    isLoading,
    threads,
  };

  return (
    <>
      {/* ── Desktop sidebar — width animates on collapse ────────── */}
      <motion.aside
        className="hidden md:flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar overflow-hidden"
        initial={false}
        animate={{ width: collapsed ? 60 : 272 }}
        transition={SPRING_SNAPPY}
        style={{ willChange: "width" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.div
              key="rail"
              className="flex flex-col items-center gap-2 py-3 w-[60px] h-full"
              {...contentFade}
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-foreground">
                <Aperture size={17} className="text-background" strokeWidth={2} />
              </div>
              <motion.button
                onClick={onToggleCollapse}
                className="mt-1 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                aria-label="Expand sidebar"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                transition={SPRING_SNAPPY}
              >
                <PanelLeftOpen size={17} strokeWidth={2} />
              </motion.button>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} transition={SPRING_SNAPPY}>
                <Link
                  href="/"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                  aria-label="New comparison"
                >
                  <Plus size={18} strokeWidth={2} />
                </Link>
              </motion.div>
              <div className="mt-auto">
                <ThemeToggle />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              className="flex flex-col h-full w-[272px]"
              {...contentFade}
            >
              <ExpandedContent {...sharedProps} showCollapseButton showCloseButton={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ── Mobile sidebar — slides in from left ─────────────────── */}
      <motion.aside
        className="md:hidden fixed inset-y-0 left-0 z-50 flex h-full w-[272px] flex-col border-r border-sidebar-border bg-sidebar overflow-hidden"
        initial={false}
        animate={{ x: mobileOpen ? 0 : "-100%" }}
        transition={SPRING_SNAPPY}
        style={{ willChange: "transform" }}
      >
        <ExpandedContent {...sharedProps} showCollapseButton={false} showCloseButton />
      </motion.aside>
    </>
  );
}
