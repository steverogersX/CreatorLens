"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";
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

  // Collapsed rail (desktop only) — icon-only quick actions.
  if (collapsed) {
    return (
      <aside className="hidden md:flex h-full w-[60px] shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground">
          <Aperture size={17} className="text-background" strokeWidth={2} />
        </div>
        <button
          onClick={onToggleCollapse}
          className="mt-1 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={17} strokeWidth={2} />
        </button>
        <Link
          href="/"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          aria-label="New comparison"
        >
          <Plus size={18} strokeWidth={2} />
        </Link>
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full w-[272px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:transition-transform max-md:duration-200",
        mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 h-[54px] shrink-0">
        <div className="flex size-7 items-center justify-center rounded-lg bg-foreground shrink-0">
          <Aperture size={15} className="text-background" strokeWidth={2} />
        </div>
        <span className="text-[14px] font-semibold tracking-tight text-foreground">CreatorLens</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} strokeWidth={2} />
          </button>
          <button
            onClick={onCloseMobile}
            className="md:hidden flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Close menu"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* New comparison */}
      <div className="px-3 pb-2">
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
              <div key={i} className="h-8 rounded-lg bg-sidebar-accent/60 animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <p className="px-3 pt-6 text-[12.5px] text-muted-foreground/60 leading-relaxed">
            {query ? "No chats match your search." : "No comparisons yet. Start a new one above."}
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((t) => (
                  <Link
                    key={t.threadId}
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
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-3 py-2.5 shrink-0">
        <span className="text-[12px] text-muted-foreground/70 truncate">Video Intelligence</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
