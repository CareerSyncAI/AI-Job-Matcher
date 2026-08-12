"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { ChevronRight, Search, Bell, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { currentJob } = useRecruiter();

  // Simple breadcrumbs generator
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    const crumbs = [];

    // Base Recruiter
    if (parts[0] === "recruiter") {
      crumbs.push({ label: "Recruitment Portal", href: "/recruiter" });

      if (parts[1] === "jobs" && parts[2]) {
        crumbs.push({
          label: currentJob ? currentJob.title : "Job Workspace",
          href: `/recruiter/jobs/${parts[2]}`
        });

        if (parts[3] === "candidates" && parts[4]) {
          crumbs.push({ label: "Candidate Inspector", href: "" });
        }
      } else if (parts[1] === "upload") {
        crumbs.push({ label: "Resume Upload Queue", href: "/recruiter/upload" });
      } else if (parts[1] === "compare") {
        crumbs.push({ label: "Candidate Compare Board", href: "/recruiter/compare" });
      }
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 border-b border-white/10 glass-panel rounded-none px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-secondary">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />}
              {isLast || !crumb.href ? (
                <span className="font-semibold text-text-primary truncate max-w-[200px] md:max-w-xs">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-text-primary transition-colors">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Recruiter Identity Context */}
      <div className="flex items-center gap-4">
        {/* Simple Notification Button */}
        <button
          className="p-1.5 rounded hover:bg-ink-border text-text-secondary hover:text-text-primary transition-colors relative"
          aria-label="View notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-signal-500" />
        </button>

        {/* User Identity info */}
        <div className="flex items-center gap-2 border-l border-ink-border pl-4">
          <div className="w-8 h-8 rounded-full bg-signal-500/20 border border-signal-500/40 text-signal-500 flex items-center justify-center font-display font-semibold text-sm">
            H
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-text-primary">Hit</p>
            <p className="text-[11px] text-text-secondary leading-none">Senior Recruiter</p>
          </div>
        </div>
      </div>
    </header>
  );
};
