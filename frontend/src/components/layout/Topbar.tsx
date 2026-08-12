"use client";

import React from "react";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { 
  Building2, 
  Search, 
  Sun, 
  Moon, 
  Sparkles, 
  Plus, 
  Bell, 
  Sliders, 
  ChevronDown,
  LogOut 
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthContext";

export const Topbar: React.FC = () => {
  const { currentJob, jobs, setSelectedJobId } = useRecruiter();
  const { theme, cycleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="h-16 glass-panel rounded-none border-t-0 border-l-0 border-r-0 border-b border-ink-border sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between bg-ink-surface/90 backdrop-blur-xl select-none">
      
      {/* Active Requisition Picker */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-signal-500/15 border border-signal-500/30 flex items-center justify-center text-signal-500">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="relative">
            <select
              value={currentJob?.id || ""}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="appearance-none bg-white/5 border border-ink-border hover:border-signal-500/40 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-text-primary focus:outline-none cursor-pointer"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-ink-base text-text-primary">
                  {j.title} ({j.applicantCount} candidates)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        
        {/* Quick Search Trigger (Cmd+K) */}
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-ink-border text-xs text-text-secondary hover:text-text-primary hover:border-signal-500/40 transition-all font-mono"
        >
          <Search className="w-3.5 h-3.5 text-signal-500" />
          <span>Quick Find</span>
          <kbd className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-ink-border">Cmd+K</kbd>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={cycleTheme}
          className="p-2 rounded-xl border border-ink-border glass-card text-text-secondary hover:text-text-primary transition-all"
          title={`Switch Theme (Current: ${theme})`}
        >
          {theme === "light" ? (
            <Sun className="w-4 h-4 text-warning" />
          ) : theme === "cyber" ? (
            <Sparkles className="w-4 h-4 text-success" />
          ) : (
            <Moon className="w-4 h-4 text-signal-500" />
          )}
        </button>

        {/* New Job CTA */}
        <Link
          href="/recruiter/jobs/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-signal-500/15 border border-signal-500/30 text-xs font-semibold text-signal-500 hover:bg-signal-500/25 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Requisition</span>
        </Link>

        {/* Auth / Logout Button */}
        {user ? (
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/30 transition"
            title={`Signed in as ${user.email}`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-gray-200 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
