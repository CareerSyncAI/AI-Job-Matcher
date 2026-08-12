"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Sparkles, 
  Building2, 
  Sliders, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Compass, 
  CheckCircle2, 
  Layers, 
  Search,
  Sun,
  Moon
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  ApertureLoader, 
  SpotlightCard, 
  InteractiveScoreGauge, 
  ShimmerButton, 
  staggerContainer, 
  staggerItem 
} from "@/components/motion/MotionPrimitives";
import { useTheme } from "@/lib/context/ThemeContext";

export default function EntryPortal() {
  const { theme, setTheme, cycleTheme } = useTheme();
  const [apertureState, setApertureState] = useState<"closed" | "opening" | "settled">("closed");

  // Interactive Live Scoring Simulator State
  const [skillsWeight, setSkillsWeight] = useState(45);
  const [expWeight, setExpWeight] = useState(30);
  const [semanticWeight, setSemanticWeight] = useState(25);

  // Compute mock candidate score dynamically
  const mockCandidate = {
    name: "Dhruv Gajera",
    role: "Senior AI & Full-Stack Engineer",
    skillScore: 92,
    expScore: 84,
    semanticScore: 96,
  };

  const totalWeight = skillsWeight + expWeight + semanticWeight || 1;
  const calculatedScore = Math.round(
    mockCandidate.skillScore * (skillsWeight / totalWeight) +
    mockCandidate.expScore * (expWeight / totalWeight) +
    mockCandidate.semanticScore * (semanticWeight / totalWeight)
  );

  useEffect(() => {
    const timer1 = setTimeout(() => setApertureState("opening"), 100);
    const timer2 = setTimeout(() => setApertureState("settled"), 800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden select-none z-10 max-w-7xl mx-auto">
      
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between py-4 border-b border-ink-border">
        <div className="flex items-center gap-3">
          <ApertureLoader state={apertureState} size="md" />
          <div>
            <span className="font-display font-bold text-xl tracking-tight text-text-primary flex items-center gap-2">
              CareerSync <span className="text-xs px-2 py-0.5 rounded-full bg-signal-500/20 text-signal-500 font-mono border border-signal-500/30">AI v2.4</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-gray-200 transition"
          >
            Create Account
          </Link>

          {/* Quick theme selector button */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-card text-xs font-medium text-text-secondary hover:text-text-primary transition-all border border-ink-border"
            title="Cycle theme (Obsidian, Cyber, Frost)"
          >
            {theme === "light" ? <Sun className="w-3.5 h-3.5 text-warning" /> : theme === "cyber" ? <Sparkles className="w-3.5 h-3.5 text-success" /> : <Moon className="w-3.5 h-3.5 text-signal-500" />}
            <span className="capitalize hidden sm:inline">{theme} Theme</span>
          </button>

          <kbd className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-ink-border text-xs text-text-tertiary font-mono">
            <Search className="w-3 h-3" />
            <span>Cmd+K</span>
          </kbd>
        </div>
      </header>

      {/* Hero Section */}
      <main className="my-auto py-12 space-y-16">
        <motion.div 
          className="text-center max-w-3xl mx-auto space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card border border-ink-border text-xs text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-aperture-500 animate-pulse" />
            <span>Explainable AI Match Engine & Career Trajectory Matrix</span>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-text-primary leading-[1.1]"
          >
            Intelligence that puts <br />
            <span className="shimmer-text">your career into focus.</span>
          </motion.h1>
          
          <motion.p
            variants={staggerItem}
            className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed font-sans"
          >
            Deterministic candidate ranking for hiring teams. Intelligent skill gap optimization for engineers. Zero black-box guesswork.
          </motion.p>
        </motion.div>

        {/* Dual Role Launchpads */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {/* Recruiter Route Card */}
          <Link href="/recruiter" className="block focus:outline-none rounded-2xl group">
            <SpotlightCard className="p-8 h-full flex flex-col justify-between hover:border-signal-500/50 hover:shadow-glass-lg transition-all duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-signal-500/15 border border-signal-500/30 flex items-center justify-center text-signal-500 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-2xl font-bold text-text-primary">
                    Recruiter Command Center
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed font-sans">
                    Screen requisitions, adjust custom scoring weights, review transparent candidate evidence, and streamline the hiring pipeline.
                  </p>
                </div>
              </div>

              <div className="pt-8 flex items-center justify-between border-t border-ink-border mt-6">
                <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span>4 Active Requisitions</span>
                </div>
                <span className="inline-flex items-center text-sm font-semibold text-signal-500 group-hover:translate-x-1 transition-transform">
                  Enter Center &rarr;
                </span>
              </div>
            </SpotlightCard>
          </Link>

          {/* Applicant Route Card */}
          <Link 
            href="/app/dashboard" 
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("careersync_user_role", "applicant");
              }
            }}
            className="block focus:outline-none rounded-2xl group"
          >
            <SpotlightCard className="p-8 h-full flex flex-col justify-between hover:border-aperture-500/50 hover:shadow-glass-lg transition-all duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-aperture-500/15 border border-aperture-500/30 flex items-center justify-center text-aperture-500 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-2xl font-bold text-text-primary">
                    Applicant AI Career Hub
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed font-sans">
                    Test target role compatibility, generate customized skill gap roadmaps, and track job applications with deterministic insights.
                  </p>
                </div>
              </div>

              <div className="pt-8 flex items-center justify-between border-t border-ink-border mt-6">
                <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono">
                  <span className="w-2 h-2 rounded-full bg-aperture-500 animate-pulse" />
                  <span>94% Match Identified</span>
                </div>
                <span className="inline-flex items-center text-sm font-semibold text-aperture-500 group-hover:translate-x-1 transition-transform">
                  Enter Portal &rarr;
                </span>
              </div>
            </SpotlightCard>
          </Link>
        </motion.div>

        {/* Live Interactive AI Match Weight Sandbox */}
        <div className="max-w-4xl mx-auto">
          <SpotlightCard className="p-6 sm:p-8 border border-ink-border">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-ink-border">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-signal-500/10 text-signal-500 text-xs font-mono border border-signal-500/20">
                  <Sliders className="w-3 h-3" />
                  <span>Interactive Sandbox</span>
                </div>
                <h3 className="font-display text-xl font-bold text-text-primary">
                  Live Deterministic Weight Simulator
                </h3>
                <p className="text-xs text-text-secondary max-w-md">
                  Adjust the multi-factor scoring weights below to observe real-time candidate score recalculation.
                </p>
              </div>

              {/* Live Circular Score Display */}
              <div className="flex items-center gap-4 shrink-0 bg-white/5 p-3 rounded-2xl border border-ink-border">
                <InteractiveScoreGauge score={calculatedScore} size={90} strokeWidth={8} />
                <div className="space-y-0.5 text-left">
                  <div className="text-xs font-mono text-text-tertiary uppercase">Simulated Fit</div>
                  <div className="text-sm font-bold text-text-primary">{mockCandidate.name}</div>
                  <div className="text-[11px] text-text-secondary">{mockCandidate.role}</div>
                </div>
              </div>
            </div>

            {/* Slider Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              {/* Slider 1: Skills */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary font-medium">Required Skills</span>
                  <span className="font-mono text-signal-500 font-bold">{skillsWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skillsWeight}
                  onChange={(e) => setSkillsWeight(Number(e.target.value))}
                  className="w-full accent-signal-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <div className="text-[11px] text-text-tertiary">Exact keyword & taxonomy alignment</div>
              </div>

              {/* Slider 2: Experience */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary font-medium">Experience Depth</span>
                  <span className="font-mono text-aperture-500 font-bold">{expWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={expWeight}
                  onChange={(e) => setExpWeight(Number(e.target.value))}
                  className="w-full accent-aperture-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <div className="text-[11px] text-text-tertiary">Years in role & senior title weighting</div>
              </div>

              {/* Slider 3: Semantic */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary font-medium">Semantic Similarity</span>
                  <span className="font-mono text-success font-bold">{semanticWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={semanticWeight}
                  onChange={(e) => setSemanticWeight(Number(e.target.value))}
                  className="w-full accent-success h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <div className="text-[11px] text-text-tertiary">768-dimensional vector embeddings</div>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* 4 Feature Pillars Bento Grid */}
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl font-bold text-text-primary">
              Built on Next-Generation Architectural Pillars
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto">
              Combining deterministic algorithmic transparency with deep transformer-based semantic understanding.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SpotlightCard className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-signal-500/10 border border-signal-500/25 flex items-center justify-center text-signal-500">
                <Cpu className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-base text-text-primary">Deterministic Scoring</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Mathematical clarity on why a candidate matched, eliminating opaque hallucinations.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-aperture-500/10 border border-aperture-500/25 flex items-center justify-center text-aperture-500">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-base text-text-primary">Semantic Parsing</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Extracts hidden competencies and maps transferable technical skills across domains.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-success/10 border border-success/25 flex items-center justify-center text-success">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-base text-text-primary">Skill Gap Roadmaps</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Actionable learning roadmaps that empower engineers to bridge target role qualifications.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/25 flex items-center justify-center text-warning">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-base text-text-primary">Zero-Bias Auditing</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Full EEOC compliance with automated PII masking and immutable audit logs.
              </p>
            </SpotlightCard>
          </div>
        </div>

        {/* Live Performance Metric Ticker */}
        <div className="max-w-4xl mx-auto glass-panel p-6 border border-ink-border grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="font-display text-2xl md:text-3xl font-bold text-signal-500">12,840+</div>
            <div className="text-[11px] text-text-secondary uppercase font-mono tracking-wider">Resumes Analyzed</div>
          </div>
          <div className="space-y-1">
            <div className="font-display text-2xl md:text-3xl font-bold text-aperture-500">98.6%</div>
            <div className="text-[11px] text-text-secondary uppercase font-mono tracking-wider">Match Accuracy</div>
          </div>
          <div className="space-y-1">
            <div className="font-display text-2xl md:text-3xl font-bold text-success">&lt; 1.8s</div>
            <div className="text-[11px] text-text-secondary uppercase font-mono tracking-wider">Parsing Latency</div>
          </div>
          <div className="space-y-1">
            <div className="font-display text-2xl md:text-3xl font-bold text-text-primary">100%</div>
            <div className="text-[11px] text-text-secondary uppercase font-mono tracking-wider">Explainable Logic</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-ink-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-tertiary font-mono gap-3">
        <span>&copy; {new Date().getFullYear()} CareerSync AI. Developed as SGP 5th Semester.</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-text-primary transition-colors cursor-pointer">Architecture</span>
          <span className="hover:text-text-primary transition-colors cursor-pointer">API Specs</span>
          <span className="hover:text-text-primary transition-colors cursor-pointer">Security Audit</span>
        </div>
      </footer>
    </div>
  );
}
