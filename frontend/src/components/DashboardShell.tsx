"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const candidateNav = [
  { label: "Overview", icon: "📊", href: "/dashboard" },
  { label: "Smart Job Matches", icon: "🎯", href: "/dashboard/jobs" },
  { label: "Resume Studio", icon: "📄", href: "/dashboard/resume" },
];

const recruiterNav = [
  { label: "Overview", icon: "📊", href: "/dashboard" },
  { label: "Job Matches", icon: "🎯", href: "/dashboard/jobs" },
  { label: "Resume Studio", icon: "📄", href: "/dashboard/resume" },
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] border border-emerald-500/30 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/20">
            T
          </div>
          <span className="font-display font-bold text-base tracking-tight text-slate-100">
            Talent<span className="text-[#059669]">IQ</span> AI
          </span>
          <span className="ml-auto px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
            {user?.role === "recruiter" ? "REC" : "FREE"}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#059669] text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] flex items-center justify-center text-white font-bold text-xs">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.email}</p>
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-mono">
                {user?.role || "Candidate"} • Free Account
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition-all cursor-pointer"
          >
            <span>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold border border-emerald-500/20">
              ⚡ 100% Free Intelligence Mode
            </span>
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800"
            >
              Public Site →
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
