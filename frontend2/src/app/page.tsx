"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ApertureLoader } from "@/components/motion/MotionPrimitives";

export default function EntryPortal() {
  const [apertureState, setApertureState] = useState<"closed" | "opening" | "settled">("closed");

  useEffect(() => {
    // Sequence the signature Aperture iris opening animation on mount
    const timer1 = setTimeout(() => {
      setApertureState("opening");
    }, 100);

    const timer2 = setTimeout(() => {
      setApertureState("settled");
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-ink-base flex flex-col justify-between p-6 relative overflow-hidden select-none">
      {/* Subtle brand dots in static positions (no continuous high-cost animation) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-1 h-1 rounded-full bg-signal-500" />
        <div className="absolute top-1/2 left-2/3 w-1.5 h-1.5 rounded-full bg-signal-500" />
        <div className="absolute top-3/4 left-1/4 w-1 h-1 rounded-full bg-signal-500" />
      </div>

      {/* Header with Aperture logo */}
      <header className="flex items-center gap-3">
        <ApertureLoader state={apertureState} size="sm" />
        <span className="font-display font-semibold text-lg tracking-tight text-text-primary">
          CareerSync AI
        </span>
      </header>

      {/* Hero Body */}
      <div className="max-w-2xl mx-auto my-auto text-center space-y-8 py-12 relative z-10">
        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
            className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-tight text-text-primary"
          >
            Bring the right match <br className="hidden sm:inline" />
            <span className="text-signal-500 font-bold">into focus.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.12, ease: [0, 0, 0.2, 1] }}
            className="text-sm sm:text-base text-text-secondary max-w-md mx-auto leading-relaxed"
          >
            Enterprise decision-support dashboard matching qualifications to requirements with claims and evidence.
          </motion.p>
        </div>

        {/* Action Cards with Staggered Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.24, ease: [0, 0, 0.2, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4"
        >
          {/* Recruiter Route */}
          <Link
            href="/recruiter"
            className="group block text-left p-6 bg-ink-surface border border-ink-border hover:border-signal-500/40 hover:bg-ink-surface/80 rounded-lg transition-all duration-150 focus:outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20 active:scale-[0.985]"
          >
            <span className="text-xs font-semibold text-signal-500 uppercase tracking-wider block mb-1">
              For Employers
            </span>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-text-primary">
                I&apos;m hiring
              </span>
              <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-signal-500 group-hover:translate-x-1 transition-transform duration-150" />
            </div>
            <p className="text-xs text-text-tertiary mt-2 font-sans">
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
            className="group block text-left p-6 bg-ink-surface border border-ink-border hover:border-aperture-500/40 hover:bg-ink-surface/80 rounded-lg transition-all duration-150 focus:outline-none focus:border-aperture-500 focus:ring-2 focus:ring-aperture-500/20 active:scale-[0.985] cursor-pointer"
          >
            <span className="text-xs font-semibold text-aperture-500 uppercase tracking-wider block mb-1">
              For Job Seekers
            </span>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-text-primary">
                I&apos;m job-hunting
              </span>
              <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-aperture-500 group-hover:translate-x-1 transition-transform duration-150" />
            </div>
            <p className="text-xs text-text-tertiary mt-2 font-sans">
              Manage resume versions, view match metrics, and track your active job applications.
            </p>
          </Link>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-text-tertiary border-t border-ink-border/50 pt-4">
        &copy; {new Date().getFullYear()} CareerSync AI. Developed as SGP 5th Semester. All Rights Reserved.
      </footer>
    </div>
  );
}
