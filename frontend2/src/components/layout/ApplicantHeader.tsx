"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApplicant } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext"; // We can reuse theme toggle from RecruiterContext since it mounts on root layout html
import { Briefcase, LayoutDashboard, FileText, Bell, Settings, Menu, X, ArrowLeftRight, Award, Compass, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export const ApplicantHeader: React.FC = () => {
  const pathname = usePathname();
  const { profile } = useApplicant();
  const { theme, toggleTheme } = useRecruiter(); // Unify theme toggling at root
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      href: "/app/dashboard",
      icon: LayoutDashboard
    },
    {
      label: "Find Jobs",
      href: "/app/jobs",
      icon: Compass
    },
    {
      label: "My Applications",
      href: "/app/applications",
      icon: Briefcase
    },
    {
      label: "Skill Gap Matrix",
      href: "/app/skill-gap",
      icon: Award
    },
    {
      label: "Resume Vault",
      href: "/app/resume",
      icon: FileText
    }
  ];

  return (
    <header className="bg-ink-surface border-b border-ink-border sticky top-0 z-50 select-none">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/app/dashboard" className="flex items-center gap-2">
              <div className="relative w-8 h-8 flex items-center justify-center text-aperture-500 shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 stroke-current"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 0-7.07 17.07L12 12V2z" />
                  <circle cx="12" cy="12" r="3.5" className="fill-current" />
                </svg>
              </div>
              <span className="font-display font-semibold text-base tracking-tight text-text-primary">
                CareerSync
              </span>
              <span className="text-[9px] bg-aperture-500/10 text-aperture-500 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider font-mono">
                Job Seeker
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 rounded text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer",
                      isActive
                        ? "bg-aperture-500/10 text-aperture-500"
                        : "text-text-secondary hover:bg-ink-border hover:text-text-primary"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Utility Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded hover:bg-ink-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title={theme === "dark" ? "Toggle Light Theme" : "Toggle Dark Theme"}
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Notifications */}
            <Link
              href="/app/notifications"
              className={cn(
                "p-1.5 rounded hover:bg-ink-border text-text-secondary hover:text-text-primary transition-colors relative cursor-pointer",
                pathname === "/app/notifications" ? "text-aperture-500 hover:text-aperture-500" : ""
              )}
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-aperture-500 rounded-full" />
            </Link>

            {/* Profile link */}
            <Link
              href="/app/settings"
              className={cn(
                "flex items-center gap-2 border-l border-ink-border pl-4 cursor-pointer",
                pathname === "/app/settings" ? "text-aperture-500" : "text-text-secondary hover:text-text-primary"
              )}
              title="Settings"
            >
              <div className="w-8 h-8 rounded-full bg-aperture-500/20 border border-aperture-500/40 text-aperture-500 flex items-center justify-center font-display font-semibold text-sm">
                {(profile?.name || "D").charAt(0)}
              </div>
            </Link>

            {/* Portal Switcher (Recruiter workspace) */}
            <Link
              href="/recruiter"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("careersync_user_role", "recruiter");
                }
              }}
              className="ml-2 text-[10px] text-text-tertiary hover:text-signal-500 font-semibold uppercase tracking-wider flex items-center gap-1 border border-ink-border px-2 py-1 rounded hover:border-signal-500/30"
              title="Switch to employer view"
            >
              <ArrowLeftRight className="w-3 h-3" />
              Employer
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded hover:bg-ink-border text-text-secondary cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-ink-border cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden border-t border-ink-border bg-ink-surface px-4 py-3 space-y-1 animate-fade-in text-left">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-colors cursor-pointer",
                  isActive
                    ? "bg-aperture-500/10 text-aperture-500"
                    : "text-text-secondary hover:bg-ink-border hover:text-text-primary"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <div className="border-t border-ink-border mt-3 pt-3 flex flex-col gap-2">
            <Link
              href="/app/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-xs text-text-secondary hover:text-text-primary"
            >
              <Bell className="w-5 h-5 shrink-0" />
              Notifications
            </Link>
            <Link
              href="/app/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-xs text-text-secondary hover:text-text-primary"
            >
              <Settings className="w-5 h-5 shrink-0" />
              Settings
            </Link>
            <Link
              href="/recruiter"
              onClick={() => {
                setIsOpen(false);
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("careersync_user_role", "recruiter");
                }
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-xs text-text-tertiary hover:text-signal-500"
            >
              <ArrowLeftRight className="w-5 h-5 shrink-0" />
              Switch to Employer View
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
