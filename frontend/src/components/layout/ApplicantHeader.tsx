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
  Clock, 
  Search, 
  Menu, 
  X,
  ArrowRight,
  Building2,
  Check,
  CheckCheck,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: any;
  link: string;
  isRead: boolean;
}

export const ApplicantHeader: React.FC = () => {
  const pathname = usePathname();
  const { profile } = useApplicant();
  const { theme, cycleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  // Close notifications on click outside or touch outside
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Application status: Shortlisted",
      description: "Recruiter moved you to 'Interviewing' for Senior AI Engineer at Stripe.",
      time: "2 hours ago",
      icon: Briefcase,
      link: "/app/applications",
      isRead: false
    },
    {
      id: "notif-2",
      title: "Resume parsed successfully",
      description: "Dhruv_Gajera_Resume_v2.pdf parsed. 8 technical competencies extracted.",
      time: "1 day ago",
      icon: FileText,
      link: "/app/resume",
      isRead: false
    },
    {
      id: "notif-3",
      title: "New High-Match Job Detected",
      description: "94% match identified for 'Principal Distributed Systems Lead' at Datadog.",
      time: "2 days ago",
      icon: Sparkles,
      link: "/app/jobs",
      isRead: false
    }
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const dismissNotification = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const navItems = [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Find Jobs", href: "/app/jobs", icon: Compass },
    { label: "Applications", href: "/app/applications", icon: Briefcase },
    { label: "Skill Gap", href: "/app/skill-gap", icon: Award },
    { label: "Resume Vault", href: "/app/resume", icon: FileText }
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-ink-surface/90 backdrop-blur-2xl border-b border-ink-border select-none">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* =========================================================================
            1. Left: Brand Identity & Role Mode Badge
           ========================================================================= */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-aperture-600 to-signal-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm tracking-tight text-text-primary leading-none">
                CareerSync
              </span>
              <span className="text-[10px] font-mono text-aperture-500 font-semibold uppercase tracking-wider mt-0.5">
                Candidate Hub
              </span>
            </div>
          </Link>
        </div>

        {/* =========================================================================
            2. Center: Segmented Floating Navigation Dock
           ========================================================================= */}
        <nav className="hidden lg:flex items-center bg-ink-base/80 border border-ink-border p-1 rounded-full shadow-glass-sm gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/app/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
                  isActive
                    ? "bg-gradient-to-r from-aperture-600 to-signal-500 text-white shadow-md shadow-aperture-500/25 font-bold"
                    : "text-text-secondary hover:text-aperture-500 hover:bg-aperture-500/15 dark:hover:bg-aperture-500/20 active:scale-95"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 transition-colors duration-150", isActive ? "text-white" : "text-text-tertiary group-hover:text-aperture-500")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* =========================================================================
            3. Right: Recruiter Portal Switcher, Search, Utilities & User Profile
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Recruiter Workspace Switcher Pill */}
          <Link
            href="/recruiter"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-signal-500/10 hover:bg-signal-500/20 text-signal-500 border border-signal-500/30 text-xs font-semibold transition-all shadow-sm group"
            title="Switch to Recruiter Management Center"
          >
            <Building2 className="w-3.5 h-3.5 text-signal-500" />
            <span className="hidden sm:inline font-medium">Recruiter View</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Quick Search Trigger (Cmd+K) */}
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-ink-base/80 border border-ink-border text-xs text-text-secondary hover:text-text-primary hover:border-signal-500/40 transition-all font-mono cursor-pointer"
            title="Quick Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-signal-500" />
            <span>Search</span>
            <kbd className="text-[10px] bg-white/5 px-1 py-0.2 rounded border border-ink-border text-text-tertiary">Cmd+K</kbd>
          </button>

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

          {/* Notifications Popover */}
          <div className="relative shrink-0" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "w-8 h-8 rounded-full border border-ink-border bg-ink-base/80 hover:bg-ink-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-all relative cursor-pointer",
                showNotifications && "bg-white/10 text-text-primary border-aperture-500/40"
              )}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-aperture-500 animate-pulse ring-2 ring-ink-base" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel border border-ink-border shadow-glass-lg rounded-2xl p-3 z-50 max-h-[80vh] overflow-y-auto no-scrollbar"
                >
                  {/* Notifications Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-ink-border px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary tracking-tight">Notifications</span>
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded-full border font-semibold",
                        unreadCount > 0
                          ? "bg-aperture-500/20 text-aperture-500 border-aperture-500/30"
                          : "bg-white/5 text-text-tertiary border-ink-border"
                      )}>
                        {unreadCount > 0 ? `${unreadCount} New` : "All read"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mark all read button with proper disabled logic */}
                      <button
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className={cn(
                          "text-[11px] font-medium flex items-center gap-1 transition-colors select-none",
                          unreadCount > 0
                            ? "text-signal-500 hover:text-signal-600 cursor-pointer hover:underline"
                            : "text-text-tertiary/40 cursor-not-allowed"
                        )}
                        title={unreadCount > 0 ? "Mark all as read" : "All notifications are already read"}
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>

                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-text-tertiary hover:text-danger p-1 rounded transition-colors cursor-pointer"
                          title="Clear all notifications"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="space-y-1.5">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-ink-border flex items-center justify-center mx-auto text-text-tertiary">
                          <Check className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-text-primary">All caught up!</p>
                        <p className="text-[11px] text-text-tertiary max-w-[200px] mx-auto">
                          You have no pending notifications right now.
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const Icon = n.icon;
                        return (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => {
                              markAsRead(n.id);
                              setShowNotifications(false);
                            }}
                            className={cn(
                              "flex items-start gap-3 p-2.5 rounded-xl transition-all group text-left border relative",
                              n.isRead
                                ? "bg-transparent hover:bg-white/5 border-transparent hover:border-ink-border opacity-75 hover:opacity-100"
                                : "bg-aperture-500/5 hover:bg-aperture-500/10 border-aperture-500/20"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5",
                              n.isRead
                                ? "bg-white/5 border-ink-border text-text-tertiary"
                                : "bg-aperture-500/15 border-aperture-500/30 text-aperture-500"
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-1.5">
                                <p className={cn(
                                  "text-xs truncate",
                                  n.isRead ? "font-medium text-text-secondary" : "font-bold text-text-primary"
                                )}>
                                  {n.title}
                                </p>
                                {!n.isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-aperture-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 mt-0.5 font-sans">
                                {n.description}
                              </p>
                              <span className="text-[10px] font-mono text-text-tertiary flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" /> {n.time}
                              </span>
                            </div>

                            {/* Dismiss single notification button */}
                            <button
                              onClick={(e) => dismissNotification(e, n.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-white/10 transition-all absolute top-2 right-2 cursor-pointer"
                              title="Dismiss"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Pill */}
          <Link
            href="/app/profile"
            className={cn(
              "flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-ink-base/80 border border-ink-border hover:border-aperture-500/40 transition-all shrink-0",
              pathname === "/app/profile" && "border-aperture-500/50 bg-aperture-500/10"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-aperture-600 to-signal-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0">
              {profile?.name ? profile.name.charAt(0) : "D"}
            </div>
            <span className="text-xs font-semibold text-text-primary hidden md:inline truncate max-w-[90px]">
              {profile?.name || "Dhruv G."}
            </span>
          </Link>

          {/* Mobile Drawer Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-8 h-8 rounded-full border border-ink-border bg-ink-base/80 hover:bg-ink-surface flex items-center justify-center text-text-secondary hover:text-text-primary lg:hidden shrink-0 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-ink-border px-4 py-3 space-y-1.5 bg-ink-surface/98 backdrop-blur-2xl"
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
                    "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors",
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

            <div className="pt-2 border-t border-ink-border mt-2">
              <Link
                href="/recruiter"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold text-signal-500 bg-signal-500/10 border border-signal-500/20"
              >
                <Building2 className="w-4 h-4" />
                <span>Switch to Recruiter Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
