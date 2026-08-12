"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function EntryPortal() {

  return (
    <div className="min-h-screen bg-ink-base flex flex-col justify-between p-6 relative overflow-hidden select-none">
      {/* CSS Particle background (Aperture drifting dots style) */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse duration-3000" />
        <div className="absolute top-1/2 left-2/3 w-2.5 h-2.5 rounded-full bg-signal-500 animate-pulse duration-4000" />
        <div className="absolute top-3/4 left-1/4 w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse duration-2500" />
        <div className="absolute top-1/3 left-3/4 w-2 h-2 rounded-full bg-signal-500 animate-pulse duration-3500" />
      </div>

      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="relative w-8 h-8 text-signal-500">
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full stroke-current"
            fill="none"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" className="fill-current" />
            <path d="M12 2a10 10 0 0 0-7.07 17.07L12 12V2z" />
          </svg>
        </div>
        <span className="font-display font-semibold text-lg tracking-tight">
          CareerSync AI
        </span>
      </header>

      {/* Hero Body */}
      <div className="max-w-2xl mx-auto my-auto text-center space-y-8 py-12 relative z-10">
        <div className="space-y-4">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
            Bring the right match <br className="hidden sm:inline" />
            <span className="text-signal-500 font-bold">into focus.</span>
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-md mx-auto leading-relaxed">
            Enterprise decision-support dashboard matching qualifications to requirements with claims and evidence.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
          {/* Recruiter Route */}
          <Link
            href="/recruiter"
            className="group block text-left p-6 bg-ink-surface border border-ink-border hover:border-signal-500/50 rounded-lg transition-all focus:outline-none focus:border-signal-500 focus:ring-1 focus:ring-signal-500"
          >
            <span className="text-xs font-semibold text-signal-500 uppercase tracking-wider block mb-1">
              For Employers
            </span>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-text-primary">
                I&apos;m hiring
              </span>
              <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-signal-500 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              Review active jobs, rank candidates, inspect source evidence, and track hiring pipelines.
            </p>
          </Link>

          {/* Applicant Route */}
          <Link
            href="/app/dashboard"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("careersync_user_role", "applicant");
              }
            }}
            className="group block text-left p-6 bg-ink-surface border border-ink-border hover:border-aperture-500/50 rounded-lg transition-all focus:outline-none focus:border-aperture-500 focus:ring-1 focus:ring-aperture-500 cursor-pointer"
          >
            <span className="text-xs font-semibold text-aperture-500 uppercase tracking-wider block mb-1">
              For Job Seekers
            </span>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-text-primary">
                I&apos;m job-hunting
              </span>
              <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-aperture-500 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              Manage resume versions, view match metrics, and track your active job applications.
            </p>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-text-tertiary border-t border-ink-border/50 pt-4">
        &copy; {new Date().getFullYear()} CareerSync AI. Developed as SGP 5th Semester. All Rights Reserved.
      </footer>
    </div>
  );
}
