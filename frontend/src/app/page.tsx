"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Building2, 
  Sliders, 
  ShieldCheck, 
  Compass, 
  CheckCircle2, 
  Layers, 
  Search,
  Sun,
  Moon,
  Target,
  User,
  SlidersHorizontal,
  FileCheck2,
  Cpu,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  ApertureLoader, 
  SpotlightCard, 
  InteractiveScoreGauge, 
  ShimmerButton, 
  staggerContainer, 
  staggerItem,
  AnimatedNumber,
  LiveIndicator,
  TiltCard
} from "@/components/motion/MotionPrimitives";
import { useTheme } from "@/lib/context/ThemeContext";

export default function EntryPortal() {
  const { theme, cycleTheme } = useTheme();
  const [apertureState, setApertureState] = useState<"closed" | "opening" | "settled">("closed");

  // Interactive Live Scoring Simulator State
  const [skillsWeight, setSkillsWeight] = useState(45);
  const [expWeight, setExpWeight] = useState(30);
  const [semanticWeight, setSemanticWeight] = useState(25);

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
    const timer2 = setTimeout(() => setApertureState("settled"), 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden select-none z-10 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <header className="flex items-center justify-between py-4 border-b border-ink-border">
        <div className="flex items-center gap-3">
          <ApertureLoader state={apertureState} size="sm" />
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-lg tracking-tight text-text-primary">
              CareerSync
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-ink-border text-text-tertiary">
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs font-medium text-text-secondary hover:text-text-primary transition-all border border-ink-border cursor-pointer"
            title="Toggle theme (Light / Dark)"
          >
            {theme === "light" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-warning" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-signal-500" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-ink-border text-xs text-text-tertiary font-mono hover:text-text-primary transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-text-secondary" />
            <span>Search</span>
            <kbd className="text-[10px] bg-white/5 px-1 py-0.5 rounded border border-ink-border ml-1">Cmd+K</kbd>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="my-auto py-12 space-y-16">
        <motion.div 
          className="text-center max-w-3xl mx-auto space-y-5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-ink-border text-xs text-text-secondary font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-500" />
            <span>Transparent Candidate Qualification & Skill Matching</span>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-[1.15]"
          >
            Objective qualification. <br className="hidden sm:inline" />
            <span className="text-text-secondary font-normal">Built for clarity and speed.</span>
          </motion.h1>
          
          <motion.p
            variants={staggerItem}
            className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed"
          >
            Deterministic candidate ranking for hiring teams. Actionable skill gap roadmaps for engineering candidates. 100% explainable, zero black-box bias.
          </motion.p>
        </motion.div>

        {/* Dual Role Portals */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto"
        >
          {/* Applicant Route Card */}
          <Link 
            href="/app/dashboard" 
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("careersync_user_role", "applicant");
              }
            }}
            className="block focus:outline-none rounded-xl group"
          >
            <TiltCard maxTilt={4} className="h-full">
              <SpotlightCard className="p-7 h-full flex flex-col justify-between hover:border-signal-500/40 transition-all duration-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-signal-500/10 border border-signal-500/20 flex items-center justify-center text-signal-500">
                      <User className="w-5 h-5" />
                    </div>
                    <LiveIndicator color="green" label="Active Hub" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl font-semibold text-text-primary flex items-center gap-2">
                      Candidate Portal
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                      Test your readiness against live requisitions, discover exact skill overlaps, and get practical bridge roadmaps for target roles.
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between border-t border-ink-border mt-6 text-xs">
                  <span className="text-text-tertiary">Skill Gap Analysis &bull; Real Requisitions</span>
                  <span className="inline-flex items-center gap-1 font-medium text-signal-500 group-hover:translate-x-0.5 transition-transform">
                    Enter Portal <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </SpotlightCard>
            </TiltCard>
          </Link>

          {/* Recruiter Route Card */}
          <Link href="/recruiter" className="block focus:outline-none rounded-xl group">
            <TiltCard maxTilt={4} className="h-full">
              <SpotlightCard className="p-7 h-full flex flex-col justify-between hover:border-aperture-500/40 transition-all duration-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-aperture-500/10 border border-aperture-500/20 flex items-center justify-center text-aperture-500">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <LiveIndicator color="blue" label="Pipeline Ready" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl font-semibold text-text-primary flex items-center gap-2">
                      Recruiter Command Center
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                      Screen applicants with calibrated weights, inspect extracted evidence citations, and evaluate candidate trade-offs side by side.
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between border-t border-ink-border mt-6 text-xs">
                  <span className="text-text-tertiary">Deterministic Scoring &bull; Evidence Logs</span>
                  <span className="inline-flex items-center gap-1 font-medium text-aperture-500 group-hover:translate-x-0.5 transition-transform">
                    Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </SpotlightCard>
            </TiltCard>
          </Link>
        </motion.div>

        {/* Live Interactive Qualification Weight Simulator */}
        <div className="max-w-4xl mx-auto">
          <SpotlightCard className="p-6 sm:p-7 border border-ink-border">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-ink-border">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 text-text-secondary text-xs font-mono border border-ink-border">
                  <SlidersHorizontal className="w-3 h-3 text-signal-500" />
                  <span>Evaluation Parameter Tuner</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  Interactive Scoring Simulator
                </h3>
                <p className="text-xs text-text-secondary max-w-md">
                  Adjust qualification weights to observe how deterministic candidate scores calculate in real time.
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 bg-white/5 p-3 rounded-xl border border-ink-border">
                <InteractiveScoreGauge score={calculatedScore} size={84} strokeWidth={7} />
                <div className="space-y-0.5 text-left">
                  <div className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">Computed Fit</div>
                  <div className="text-sm font-semibold text-text-primary">{mockCandidate.name}</div>
                  <div className="text-xs text-text-secondary">{mockCandidate.role}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-secondary">Required Skills Weight</span>
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
                <div className="text-[11px] text-text-tertiary">Exact taxonomy overlap</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
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
                <div className="text-[11px] text-text-tertiary">Verified tenure & seniority</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-secondary">Semantic Relevance</span>
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
                <div className="text-[11px] text-text-tertiary">Contextual domain similarity</div>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* 4 Core Architectural Principles Bento */}
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="font-display text-xl font-bold text-text-primary">
              Engineered for Transparent Evaluation
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto">
              Combining deterministic scoring with explainable semantic vector representation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SpotlightCard className="p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-signal-500/10 border border-signal-500/20 flex items-center justify-center text-signal-500">
                <Cpu className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-sm text-text-primary">Deterministic Rules</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Mathematical clarity on scoring criteria with zero hidden hallucinations or black-box guessing.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-aperture-500/10 border border-aperture-500/20 flex items-center justify-center text-aperture-500">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-sm text-text-primary">Layout-Aware Parser</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Robust section boundary detection that extracts skills, tenure, and degrees across PDF and DOCX.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center text-success">
                <Target className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-sm text-text-primary">Skill Gap Roadmaps</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Targeted project plans and learning milestones that empower candidates to qualify for roles.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-display font-semibold text-sm text-text-primary">Verifiable Citations</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Every extracted claim links directly to verbatim resume text spans for defensible auditing.
              </p>
            </SpotlightCard>
          </div>
        </div>

        {/* Live Architecture Benchmarks */}
        <div className="max-w-4xl mx-auto glass-panel p-6 border border-ink-border grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="font-display text-2xl font-bold text-signal-500">100%</div>
            <div className="text-[10px] text-text-secondary uppercase font-mono tracking-wider">Explainable Evidence</div>
          </div>
          <div className="space-y-1">
            <div className="font-display text-2xl font-bold text-aperture-500">&lt; 1.0s</div>
            <div className="text-[10px] text-text-secondary uppercase font-mono tracking-wider">Extraction Latency</div>
          </div>
          <div className="space-y-1">
            <div className="font-display text-2xl font-bold text-success">500+</div>
            <div className="text-[10px] text-text-secondary uppercase font-mono tracking-wider">Curated Taxonomy</div>
          </div>
          <div className="space-y-1">
            <div className="font-display text-2xl font-bold text-text-primary">0%</div>
            <div className="text-[10px] text-text-secondary uppercase font-mono tracking-wider">Generative Bias</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-ink-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-tertiary font-mono gap-3">
        <span>CareerSync AI &bull; System Development Project (SGP)</span>
        <div className="flex items-center gap-4">
          <Link href="/recruiter" className="hover:text-text-primary transition-colors">Recruiter Center</Link>
          <Link href="/app/dashboard" className="hover:text-text-primary transition-colors">Candidate Hub</Link>
        </div>
      </footer>
    </div>
  );
}

