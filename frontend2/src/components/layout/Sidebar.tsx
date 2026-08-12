"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRecruiter as useRecruiterContext } from "@/lib/context/RecruiterContext";
import { Briefcase, LayoutDashboard, Upload, Users, Moon, Sun, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, jobs, selectedJobId, setSelectedJobId } = useRecruiterContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      href: "/recruiter",
      icon: LayoutDashboard
    },
    {
      label: "Upload Portal",
      href: "/recruiter/upload",
      icon: Upload
    },
    {
      label: "Trade-off Compare",
      href: "/recruiter/compare",
      icon: ArrowLeftRight
    }
  ];

  return (
    <aside
      className={cn(
        "h-screen bg-ink-surface border-r border-ink-border flex flex-col justify-between transition-all duration-200 sticky top-0 z-30",
        isCollapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="h-16 border-b border-ink-border flex items-center px-4 justify-between">
          <Link href="/recruiter" className="flex items-center gap-3 select-none">
            {/* Aperture Logo */}
            <div className="relative w-8 h-8 flex items-center justify-center text-signal-500 shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7 stroke-current"
                fill="none"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6a6 6 0 0 0-4.24 1.76M12 18a6 6 0 0 0 4.24-1.76M6 12a6 6 0 0 0 1.76 4.24M18 12a6 6 0 0 0-1.76-4.24" />
                <circle cx="12" cy="12" r="2.5" className="fill-current" />
              </svg>
            </div>
            {!isCollapsed && (
              <span className="font-display font-semibold text-lg tracking-tight text-text-primary whitespace-nowrap">
                CareerSync
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center p-1 rounded hover:bg-ink-border text-text-secondary cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={cn("w-4 h-4 transition-transform", isCollapsed ? "rotate-180" : "")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-signal-500/10 text-signal-500 stroke-[2.2px]"
                    : "text-text-secondary hover:bg-ink-border hover:text-text-primary"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Job Scope Context Selector */}
        <div className="p-3 border-t border-ink-border mt-auto">
          {!isCollapsed && (
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block mb-2 px-1">
              Active Job Scope
            </label>
          )}
          <div className="space-y-1">
            {jobs.map((job) => {
              const isSelected = selectedJobId === job.id;
              return (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    // Navigate to the job space when changing jobs
                    router.push(`/recruiter/jobs/${job.id}`);
                  }}
                  className={cn(
                    "w-full flex items-center text-left py-2 rounded text-xs transition-colors cursor-pointer",
                    isCollapsed ? "justify-center px-1" : "px-3",
                    isSelected
                      ? "bg-ink-border text-signal-500 border border-signal-500/30"
                      : "text-text-secondary hover:bg-ink-border/50 hover:text-text-primary"
                  )}
                  title={job.title}
                >
                  <Briefcase className="w-4 h-4 shrink-0 mr-2" />
                  {!isCollapsed && (
                    <span className="truncate font-medium">{job.title}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Theme Toggler & Footer */}
      <div className="p-3 border-t border-ink-border flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded text-xs font-medium text-text-secondary hover:bg-ink-border hover:text-text-primary cursor-pointer",
            isCollapsed ? "justify-center" : ""
          )}
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4 text-warning" />
              {!isCollapsed && <span>Light Theme</span>}
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-signal-600" />
              {!isCollapsed && <span>Dark Theme</span>}
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
