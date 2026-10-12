"use client";

import React from "react";
import Link from "next/link";
import { CareerSyncBrand } from "@/components/Icons";

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
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#060e20]/85 backdrop-blur-xl border-b border-[#222a3d] shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
      <div className="h-20 w-full px-4 sm:px-6 xl:px-8 flex items-center justify-between gap-4 xl:gap-6">
        
        {/* Brand & Persona Switcher */}
        <div className="flex items-center gap-4 xl:gap-6 shrink-0">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <CareerSyncBrand size={32} showTagline={true} responsiveTagline={true} isLight={false} />
          </Link>

          {/* Persona Switcher Toggle */}
          <div className="hidden 2xl:flex items-center bg-[#171f33] p-1 rounded-full border border-[#222a3d]">
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
        <nav className="hidden xl:flex items-center gap-1 shrink-0">
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
            <kbd className="text-xs text-[#c7c4d7] bg-[#171f33] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
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
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#ffb4ab] text-[#690005] text-xs flex items-center justify-center font-bold">
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

          {/* Mobile menu toggle button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-lg text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-[#222a3d] bg-[#060e20]/95 backdrop-blur-2xl p-4 space-y-3 shadow-2xl max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Persona Switcher for mobile */}
          <div className="flex items-center bg-[#171f33] p-1 rounded-full border border-[#222a3d]">
            <button
              onClick={() => setUserRole("candidate")}
              type="button"
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                userRole === "candidate"
                  ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.25)]"
                  : "text-[#c7c4d7] hover:text-[#dae2fd]"
              }`}
            >
              Candidate
            </button>
            <button
              onClick={() => setUserRole("recruiter")}
              type="button"
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                userRole === "recruiter"
                  ? "bg-[#8083ff] text-[#0d0096] shadow-[0_0_12px_rgba(128,131,255,0.25)]"
                  : "text-[#c7c4d7] hover:text-[#dae2fd]"
              }`}
            >
              Recruiter
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1 pt-2">
            {[
              { id: "smart-job-matches", label: "Smart Job Matches" },
              { id: "resume-studio", label: "Resume Studio & ATS" },
              { id: "recruiter-radar", label: "Talent Radar" },
              { id: "interview-prep", label: "Interview Prep AI" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileOpen(false);
                }}
                className={`text-left px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-[#8083ff] text-[#0d0096]"
                    : "text-[#c7c4d7] hover:bg-[#171f33] hover:text-[#dae2fd]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
