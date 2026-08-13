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
  ChevronDown,
  User,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export const Topbar: React.FC = () => {
  const { currentJob, jobs, setSelectedJobId } = useRecruiter();
  const { theme, cycleTheme } = useTheme();

  return (
    <header className="h-16 w-full bg-ink-surface/90 backdrop-blur-2xl border-b border-ink-border sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between select-none">
      
      {/* Active Requisition Picker (Clean & Compact) */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-signal-500/15 border border-signal-500/30 flex items-center justify-center text-signal-500 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="relative min-w-0">
            <select
              value={currentJob?.id || ""}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="appearance-none bg-ink-base/80 border border-ink-border hover:border-signal-500/40 rounded-full px-3.5 py-1.5 pr-8 text-xs font-semibold text-text-primary focus:outline-none cursor-pointer truncate max-w-[200px] sm:max-w-xs md:max-w-sm transition"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-ink-base text-text-primary">
                  {j.title} ({j.applicantCount} applicants)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        
        {/* Switch to Candidate Portal */}
        <Link
          href="/app/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-aperture-500/10 hover:bg-aperture-500/20 text-aperture-500 border border-aperture-500/30 text-xs font-semibold transition-all cursor-pointer group"
          title="Switch to Candidate Experience"
        >
          <User className="w-3.5 h-3.5 text-aperture-500" />
          <span className="hidden sm:inline font-medium">Candidate View</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={cycleTheme}
          className="w-8 h-8 rounded-full border border-ink-border bg-ink-base/80 hover:bg-ink-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-all shrink-0 cursor-pointer"
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
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-signal-500 hover:bg-signal-600 text-white text-xs font-semibold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Requisition</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>
    </header>
  );
};
