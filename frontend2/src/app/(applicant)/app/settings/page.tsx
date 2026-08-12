"use client";

import React from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { Sun, Moon, RefreshCw, LogOut, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { profile } = useApplicantContext();
  const { theme, toggleTheme } = useRecruiter();

  const handleReset = () => {
    if (confirm("This will reset all session applications, edited skills, and uploaded resumes to their default mock states. Do you want to proceed?")) {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        window.location.reload();
      }
    }
  };

  const handleExit = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("careersync_user_role");
      router.push("/");
    }
  };

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b border-ink-border pb-4">
        <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
          Portal Configurations
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Adjust sandbox parameters, toggle preferences, or exit to the gateway.
        </p>
      </div>

      <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-5 text-xs">
        {/* Account summary */}
        <div className="border-b border-ink-border/50 pb-4 space-y-3">
          <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4.5 h-4.5 text-aperture-500" />
            Active Session Identity
          </h3>
          <div className="bg-ink-base/40 p-3.5 border border-ink-border/70 rounded flex items-center justify-between">
            <div>
              <p className="font-semibold text-text-primary">{profile?.name || "Dhruv Gajera"}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">Role: Job Seeker (Aperture Profile Mode)</p>
            </div>
            <Link
              href="/app/profile"
              className="text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-0.5"
            >
              Edit Profile
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="border-b border-ink-border/50 pb-4 space-y-3">
          <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            {theme === "dark" ? <Moon className="w-4.5 h-4.5 text-aperture-500" /> : <Sun className="w-4.5 h-4.5 text-aperture-500" />}
            Color Schemes
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-text-primary">Theme Toggle</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">Current select: {theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 bg-ink-border hover:bg-ink-border/80 text-text-primary font-semibold rounded cursor-pointer"
            >
              Switch Theme
            </button>
          </div>
        </div>

        {/* Action controls */}
        <div className="space-y-4 pt-1">
          <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider">
            Danger Zone
          </h3>
          <div className="flex flex-wrap gap-3">
            {/* Reset */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-semibold rounded transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Session Data
            </button>

            {/* Exit */}
            <button
              onClick={handleExit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-border hover:bg-ink-border/80 text-text-secondary hover:text-text-primary font-semibold rounded transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Exit Candidate View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
