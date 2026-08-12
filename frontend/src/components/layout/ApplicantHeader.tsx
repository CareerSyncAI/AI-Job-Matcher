"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApplicant } from "@/lib/context/ApplicantContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { 
  Briefcase, 
  LayoutDashboard, 
  FileText, 
  Bell, 
  Award, 
  Compass, 
  Sun, 
  Moon, 
  Sparkles, 
  User, 
  Clock, 
  Search, 
  Menu, 
  X,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "@/features/auth/AuthContext";
import { LogOut } from "lucide-react";

export const ApplicantHeader: React.FC = () => {
  const pathname = usePathname();
  const { profile } = useApplicant();
  const { theme, cycleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: "notif-1",
      title: "Application status: Shortlisted",
      description: "Recruiter moved you to 'Interviewing' for Senior AI Engineer at Stripe.",
      time: "2 hours ago",
      icon: Briefcase,
      link: "/app/applications"
    },
    {
      id: "notif-2",
      title: "Resume parsed successfully",
      description: "Dhruv_Gajera_Resume_v2.pdf parsed. 8 technical competencies extracted.",
      time: "1 day ago",
      icon: FileText,
      link: "/app/resume"
    },
    {
      id: "notif-3",
      title: "New High-Match Job Detected",
      description: "94% match identified for 'Principal Distributed Systems Lead' at Datadog.",
      time: "2 days ago",
      icon: Sparkles,
      link: "/app/jobs"
    }
  ];

  const navItems = [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Find Jobs", href: "/app/jobs", icon: Compass },
    { label: "My Applications", href: "/app/applications", icon: Briefcase },
    { label: "Skill Gap Matrix", href: "/app/skill-gap", icon: Award },
    { label: "Resume Vault", href: "/app/resume", icon: FileText }
  ];

  return (
    <header className="glass-panel rounded-none border-t-0 border-l-0 border-r-0 border-b border-ink-border sticky top-0 z-50 select-none bg-ink-surface/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Left Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/app/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-aperture-500/15 border border-aperture-500/30 flex items-center justify-center text-aperture-500 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-text-primary">
                CareerSync <span className="text-xs text-aperture-500 font-mono">Hub</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/app/dashboard" && pathname.startsWith(item.href));
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-aperture-500/15 text-aperture-500 border border-aperture-500/30 shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                    )}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2.5">
            
            {/* Quick Command Launcher (Cmd+K) */}
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-ink-border text-xs text-text-secondary hover:text-text-primary hover:border-signal-500/40 transition-all font-mono"
            >
              <Search className="w-3.5 h-3.5 text-signal-500" />
              <span>Search</span>
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

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 rounded-xl border border-ink-border glass-card text-text-secondary hover:text-text-primary transition-all relative",
                  showNotifications && "bg-white/10 text-text-primary border-aperture-500/40"
                )}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-aperture-500 animate-pulse ring-2 ring-ink-base" />
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel border border-ink-border shadow-glass-lg rounded-2xl p-3 z-50 max-h-[85vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-ink-border px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary tracking-tight">Notifications</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-aperture-500/20 text-aperture-500 border border-aperture-500/30">
                          {notifications.length} New
                        </span>
                      </div>
                      <span className="text-[11px] text-text-tertiary hover:text-text-secondary cursor-pointer">
                        Mark all read
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {notifications.map((n) => {
                        const Icon = n.icon;
                        return (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => setShowNotifications(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left border border-transparent hover:border-ink-border"
                          >
                            <div className="w-8 h-8 rounded-lg bg-aperture-500/10 border border-aperture-500/20 flex items-center justify-center text-aperture-500 shrink-0 mt-0.5">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-text-primary truncate">{n.title}</p>
                              <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 mt-0.5 font-sans">
                                {n.description}
                              </p>
                              <span className="text-[10px] font-mono text-text-tertiary flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" /> {n.time}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar / Link */}
            <Link
              href="/app/profile"
              className={cn(
                "flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl glass-card border border-ink-border hover:border-aperture-500/40 transition-all",
                pathname === "/app/profile" && "border-aperture-500/40 bg-aperture-500/10"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-aperture-600 to-signal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {profile?.name ? profile.name.charAt(0) : "D"}
              </div>
              <span className="text-xs font-medium text-text-primary hidden sm:inline truncate max-w-[100px]">
                {profile?.name || "Dhruv G."}
              </span>
            </Link>

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

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl glass-card border border-ink-border text-text-secondary hover:text-text-primary md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-ink-border px-4 py-3 space-y-1 bg-ink-surface/95 backdrop-blur-2xl"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-aperture-500/15 text-aperture-500 border border-aperture-500/30"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
