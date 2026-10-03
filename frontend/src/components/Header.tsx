"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: "candidate" | "recruiter";
  setUserRole: (role: "candidate" | "recruiter") => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#060e20]/85 backdrop-blur-xl border-b border-[#222a3d] shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
      <div className="h-20 w-full px-6 xl:px-8 flex items-center justify-between gap-6">
        
        {/* Brand & Persona Switcher */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] shadow-[0_0_12px_rgba(128,131,255,0.25)]">
              <span className="material-symbols-outlined text-xl">neurology</span>
            </div>
            <span className="font-headline font-bold text-xl text-[#dae2fd] tracking-tight">
              CareerSync AI
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] uppercase tracking-wider font-semibold border border-emerald-500/30">
              FREE
            </span>
          </div>

          {/* Persona Switcher Toggle */}
          <div className="hidden xl:flex items-center bg-[#171f33] p-1 rounded-full border border-[#222a3d]">
            <button
              onClick={() => setUserRole("candidate")}
              type="button"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                userRole === "candidate"
                  ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.25)]"
                  : "text-[#c7c4d7] hover:text-[#dae2fd]"
              }`}
            >
              Candidate / Job Seeker
            </button>
            <button
              onClick={() => setUserRole("recruiter")}
              type="button"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                userRole === "recruiter"
                  ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.25)]"
                  : "text-[#c7c4d7] hover:text-[#dae2fd]"
              }`}
            >
              Recruiter / Employer
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("smart-job-matches")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "smart-job-matches"
                ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.2)]"
                : "text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d]"
            }`}
          >
            Smart Job Matches
          </button>
          <button
            onClick={() => setActiveTab("resume-studio")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "resume-studio"
                ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.2)]"
                : "text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d]"
            }`}
          >
            Resume Studio & ATS
          </button>
          <button
            onClick={() => setActiveTab("recruiter-radar")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "recruiter-radar"
                ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.2)]"
                : "text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d]"
            }`}
          >
            Talent Radar
          </button>
          <button
            onClick={() => setActiveTab("interview-prep")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "interview-prep"
                ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.2)]"
                : "text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d]"
            }`}
          >
            Interview Prep AI
          </button>
        </nav>

        {/* Quick Search & Actions */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex items-center bg-[#131b2e] px-4 py-2 rounded-lg border border-[#222a3d] w-48 xl:w-56 focus-within:ring-1 focus-within:ring-[#8083ff]">
            <span className="material-symbols-outlined text-[#908fa0] text-lg mr-2">search</span>
            <input
              type="text"
              placeholder="Search talent, roles..."
              className="bg-transparent text-[#dae2fd] placeholder:text-[#908fa0] text-xs focus:outline-none w-full"
            />
            <kbd className="text-[10px] text-[#c7c4d7] bg-[#171f33] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8083ff] text-[#0d0096] text-xs font-semibold hover:bg-[#c0c1ff] transition-all shadow-[0_0_16px_rgba(128,131,255,0.2)]"
          >
            <span className="material-symbols-outlined text-lg">cloud_upload</span>
            <span className="hidden sm:inline">Upload Resume</span>
          </button>

          <button
            type="button"
            aria-label="Notifications"
            className="relative p-2 rounded-lg text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#ffb4ab] text-[#690005] text-[10px] flex items-center justify-center font-bold">
              3
            </span>
          </button>

          <div className="flex items-center gap-2 pl-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8083ff] to-[#4edea3] flex items-center justify-center text-[#0d0096] font-bold text-xs shadow-md">
              DG
            </div>
            <span className="material-symbols-outlined text-[#908fa0] group-hover:text-[#dae2fd] text-lg transition-colors">
              keyboard_arrow_down
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
