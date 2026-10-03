"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const candidateNav = [
  { label: "Overview", icon: "dashboard", href: "/dashboard" },
  { label: "Smart Job Matches", icon: "target", href: "/dashboard/jobs" },
  { label: "Resume Studio", icon: "description", href: "/dashboard/resume" },
  { label: "Interview Prep", icon: "quiz", href: "/dashboard/interview-prep" },
];

const recruiterNav = [
  { label: "Overview", icon: "dashboard", href: "/dashboard" },
  { label: "Talent Radar", icon: "radar", href: "/dashboard/talent-radar" },
  { label: "Job Postings", icon: "work", href: "/dashboard/postings" },
  { label: "Candidate Pipeline", icon: "group_work", href: "/dashboard/pipeline" },
];

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role === "recruiter" ? recruiterNav : candidateNav;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#060e20]/95 backdrop-blur-xl border-r border-[#222a3d] flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#222a3d] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff]">
            <span className="material-symbols-outlined text-lg">neurology</span>
          </div>
          <span className="font-headline font-bold text-base tracking-tight">TalentIQ AI</span>
          <span className="ml-auto px-1.5 py-0.5 rounded bg-[#8083ff]/20 text-[#c0c1ff] text-[10px] uppercase font-semibold">
            {user?.role === "recruiter" ? "REC" : "CND"}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#8083ff]/15 text-[#c0c1ff] border border-[#8083ff]/30 shadow-[0_0_12px_rgba(128,131,255,0.1)]"
                    : "text-[#908fa0] hover:text-[#dae2fd] hover:bg-[#171f33]"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-[#222a3d] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#8083ff] to-[#4edea3] flex items-center justify-center text-[#0d0096] font-bold text-xs">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#dae2fd] truncate">{user?.email}</p>
              <p className="text-[10px] text-[#908fa0] uppercase tracking-wider">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#908fa0] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#0b1326]/90 backdrop-blur-xl border-b border-[#222a3d] px-4 sm:px-6 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-[#c7c4d7] hover:bg-[#222a3d] transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="hidden md:flex items-center bg-[#131b2e] px-4 py-2 rounded-lg border border-[#222a3d] w-72 focus-within:border-[#8083ff] transition-colors">
            <span className="material-symbols-outlined text-[#908fa0] text-lg mr-2">search</span>
            <input
              type="text"
              placeholder="Search jobs, skills, candidates..."
              className="bg-transparent text-[#dae2fd] text-xs placeholder:text-[#908fa0] focus:outline-none w-full"
            />
            <kbd className="text-[10px] text-[#c7c4d7] bg-[#171f33] px-1.5 py-0.5 rounded font-mono ml-2 shrink-0">
              ⌘K
            </kbd>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-[#c7c4d7] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ffb4ab] rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
};
