"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { ApertureLoader, staggerContainer, staggerItem } from "@/components/motion/MotionPrimitives";

export default function EntryPortal() {
  const [apertureState, setApertureState] = useState<"closed" | "opening" | "settled">("closed");

  useEffect(() => {
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
    <div className="min-h-screen flex flex-col justify-between p-6 md:p-12 relative overflow-hidden select-none z-10">
      
      {/* Header */}
      <header className="flex items-center gap-3">
        <ApertureLoader state={apertureState} size="md" />
        <span className="font-display font-semibold text-xl tracking-tight text-text-primary drop-shadow-md">
          CareerSync AI
        </span>
      </header>

      {/* Hero Body */}
      <div className="max-w-4xl mx-auto my-auto text-center space-y-12 py-12">
        <motion.div 
          className="space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            variants={staggerItem}
            className="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-tight text-white drop-shadow-lg"
          >
            Intelligence that <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-signal-500 to-aperture-500">
              powers your career.
            </span>
          </motion.h1>
          
          <motion.p
            variants={staggerItem}
            className="text-base md:text-lg text-text-primary/80 max-w-xl mx-auto leading-relaxed font-medium"
          >
            Experience the next generation of AI-driven job matching. Whether you're building a world-class team or finding your dream role, CareerSync brings the right fit into perfect focus.
          </motion.p>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-8"
        >
          {/* Recruiter Route */}
          <Link href="/recruiter" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 rounded-3xl">
            <motion.div 
              variants={staggerItem}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group text-left p-8 glass-card border border-white/10 hover:border-signal-500/50 transition-all duration-300 h-full flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-full bg-signal-500/20 flex items-center justify-center mb-6 border border-signal-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-6 h-6 text-signal-500" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-white mb-2">Recruiter Center</h3>
                <p className="text-sm text-text-primary/70 leading-relaxed font-sans mb-6">
                  Review active job requisitions, rank candidates with AI transparency, and track your hiring pipeline.
                </p>
              </div>
              <div className="flex items-center text-signal-500 font-medium text-sm">
                Enter Workspace <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </motion.div>
          </Link>

          {/* Applicant Route */}
          <Link 
            href="/app/dashboard"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("careersync_user_role", "applicant");
              }
            }}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-aperture-500 rounded-3xl"
          >
            <motion.div 
              variants={staggerItem}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group text-left p-8 glass-card border border-white/10 hover:border-aperture-500/50 transition-all duration-300 h-full flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-full bg-aperture-500/20 flex items-center justify-center mb-6 border border-aperture-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-aperture-500" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-white mb-2">AI Career Hub</h3>
                <p className="text-sm text-text-primary/70 leading-relaxed font-sans mb-6">
                  Optimize your resume, discover matching roles, and track your applications with intelligent insights.
                </p>
              </div>
              <div className="flex items-center text-aperture-500 font-medium text-sm">
                Enter Portal <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-text-primary/50 pt-8 font-mono">
        &copy; {new Date().getFullYear()} CareerSync AI. Developed as SGP 5th Semester. All Rights Reserved.
      </footer>
    </div>
  );
}
