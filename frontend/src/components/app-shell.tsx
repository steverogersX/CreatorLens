"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Mobile top bar */}
      <motion.button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
        aria-label="Open menu"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        <Menu size={17} strokeWidth={2} />
      </motion.button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="flex-1 min-w-0 h-full overflow-hidden">{children}</main>
    </div>
  );
}
