"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  CareerSyncLogo,
  IconDashboard,
  IconBriefcase,
  IconDocument,
  IconUser,
  IconLogout,
  IconCheckCircle,
  IconSun,
  IconMoon,
  IconChevronDown,
  IconSettings,
} from "@/components/Icons";

const navItemsList = [
  { label: "Overview", icon: IconDashboard, href: "/dashboard" },
  { label: "Job Matches", icon: IconBriefcase, href: "/dashboard/jobs" },
  { label: "Resume Studio", icon: IconDocument, href: "/dashboard/resume" },
  { label: "Profile & Settings", icon: IconUser, href: "/dashboard/profile" },
];

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, setTheme, isDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    router.replace("/login");
  };

  return (
    <div
      className={`min-h-screen flex font-sans transition-colors duration-200 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Sidebar Overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 backdrop-blur-xl border-r flex flex-col transition-all duration-300 lg:translate-x-0 ${
          isDark
            ? "bg-slate-900/95 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 px-5 flex items-center gap-3 border-b shrink-0 ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] border border-emerald-500/30 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <CareerSyncLogo size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-base tracking-tight">
            Career<span className="text-[#059669]">Sync</span>
          </span>
          <span className="ml-auto px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20">
            {user?.role === "recruiter" ? "RECRUITER" : "FREE"}
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5">
          {navItemsList.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#059669] text-white shadow-md shadow-emerald-600/20"
                    : isDark
                    ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : isDark ? "text-slate-400" : "text-slate-500"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Mini-Card linking cleanly to Profile */}
        <div
          className={`border-t p-3 ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <Link
            href="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 p-2 rounded-xl transition-all group ${
              isDark ? "hover:bg-slate-800/70" : "hover:bg-slate-100"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {user?.email}
              </p>
              <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-mono">
                {user?.role || "Candidate"} • Active
              </p>
            </div>
            <IconChevronDown
              size={14}
              className={`shrink-0 -rotate-90 transition-transform group-hover:translate-x-0.5 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />
          </Link>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header
          className={`h-16 backdrop-blur-md border-b px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors ${
            isDark
              ? "bg-slate-900/80 border-slate-800 text-slate-100"
              : "bg-white/90 border-slate-200 text-slate-900 shadow-xs"
          }`}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`lg:hidden p-2 rounded-lg ${
              isDark ? "text-slate-400 hover:text-slate-100" : "text-slate-600 hover:text-slate-900"
            }`}
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Right Header Navigation Items */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Free Platform Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-mono font-semibold border border-emerald-500/20">
              <IconCheckCircle size={13} className="text-emerald-500" />
              100% Free Platform
            </span>

            {/* Quick Dark/Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-amber-400 hover:text-amber-300"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs"
              }`}
            >
              {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>

            {/* Public Site Link */}
            <Link
              href="/"
              className={`hidden md:inline-block text-xs font-semibold transition px-3 py-1.5 rounded-xl border ${
                isDark
                  ? "text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800"
                  : "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Public Site →
            </Link>

            {/* Top-Right Profile Section Button & Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all cursor-pointer ${
                  profileMenuOpen
                    ? isDark
                      ? "bg-slate-800 border-emerald-500/40 shadow-sm"
                      : "bg-slate-100 border-emerald-500/40 shadow-sm"
                    : isDark
                    ? "bg-slate-900 hover:bg-slate-800 border-slate-800"
                    : "bg-white hover:bg-slate-100 border-slate-200 shadow-xs"
                }`}
                aria-expanded={profileMenuOpen}
                aria-label="User Account Menu"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#059669] to-[#0d9488] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <span className={`block text-xs font-semibold leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {user?.email?.split("@")[0]}
                  </span>
                  <span className="block text-[10px] text-emerald-500 font-mono capitalize">
                    {user?.role || "Candidate"}
                  </span>
                </div>
                <IconChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    profileMenuOpen ? "rotate-180" : ""
                  } ${isDark ? "text-slate-400" : "text-slate-500"}`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-2xl border p-2 shadow-2xl z-50 animate-fadeIn ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  {/* Account overview header */}
                  <div
                    className={`p-3 border-b mb-1.5 ${
                      isDark ? "border-slate-800" : "border-slate-100"
                    }`}
                  >
                    <p className={`text-xs font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                      {user?.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20 capitalize">
                        {user?.role || "Candidate"}
                      </span>
                      <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Free Platform Tier
                      </span>
                    </div>
                  </div>

                  {/* Profile & Settings link */}
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isDark
                        ? "hover:bg-slate-800 text-slate-200 hover:text-white"
                        : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <IconUser size={16} className="text-emerald-500" />
                    <span>Profile &amp; Settings</span>
                  </Link>

                  {/* Theme Switcher in Menu */}
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isDark ? <IconMoon size={15} /> : <IconSun size={15} />}
                      Theme
                    </span>
                    <div
                      className={`flex rounded-lg p-0.5 border ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          isDark
                            ? "bg-slate-800 text-emerald-400 shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          !isDark
                            ? "bg-white text-emerald-600 shadow-xs"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        Light
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    className={`my-1.5 border-t ${
                      isDark ? "border-slate-800" : "border-slate-100"
                    }`}
                  />

                  {/* Sign Out Button nestled inside menu */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <IconLogout size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
