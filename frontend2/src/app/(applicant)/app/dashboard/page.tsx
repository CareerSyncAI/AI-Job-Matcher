"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Briefcase, 
  Award, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  Compass, 
  ArrowRight, 
  Layers, 
  Send, 
  Clock, 
  Building2, 
  MapPin, 
  SlidersHorizontal 
} from "lucide-react";
import { motion } from "framer-motion";
import { useApplicant } from "@/lib/context/ApplicantContext";
import { useToast } from "@/components/ui/ToastProvider";
import { 
  SpotlightCard, 
  InteractiveScoreGauge, 
  ShimmerButton, 
  LiquidButton,
  staggerContainer, 
  staggerItem 
} from "@/components/motion/MotionPrimitives";

export default function ApplicantDashboard() {
  const { profile, applications, applyToJob, profileCompleteness } = useApplicant();
  const { success, info } = useToast();
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  // Recommended roles tailored to applicant
  const recommendedJobs = [
    {
      id: "job-1",
      title: "Senior AI Systems Engineer",
      company: "Stripe",
      location: "San Francisco, CA (Remote)",
      salary: "$180k - $240k",
      matchScore: 96,
      skills: ["PyTorch", "Distributed Systems", "TypeScript", "FastAPI"],
      matchedReason: "Deep alignment in vector search pipelines and distributed backend architectures."
    },
    {
      id: "job-2",
      title: "Staff Full-Stack Architect",
      company: "Vercel",
      location: "Remote",
      salary: "$195k - $250k",
      matchScore: 92,
      skills: ["Next.js", "React", "Turbopack", "GraphQL"],
      matchedReason: "Demonstrated mastery of App Router, motion orchestration, and design tokens."
    },
    {
      id: "job-3",
      title: "Lead Cloud Infrastructure Engineer",
      company: "Datadog",
      location: "New York, NY (Hybrid)",
      salary: "$175k - $225k",
      matchScore: 88,
      skills: ["Kubernetes", "AWS", "Terraform", "Go"],
      matchedReason: "Strong cloud containerization background with 4+ years production expertise."
    }
  ];

  const handleQuickApply = async (jobId: string, jobTitle: string, company: string) => {
    setApplyingJobId(jobId);
    try {
      await applyToJob(jobId);
      success("Application Submitted!", `Successfully applied to ${jobTitle} at ${company}.`);
    } catch {
      info("Application Recorded", `Your profile is now under recruiter review for ${jobTitle}.`);
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner / Executive Welcome */}
      <motion.div 
        variants={staggerContainer} 
        initial="hidden" 
        animate="visible"
        className="glass-panel p-6 sm:p-8 border border-ink-border relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aperture-500/15 text-aperture-500 text-xs font-mono border border-aperture-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Career Trajectory Optimizer</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">
              Welcome back, {profile?.name || "Dhruv"} 👋
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed font-sans">
              Your profile is currently indexing with a <span className="text-text-primary font-semibold">94% average compatibility</span> across 3 top-tier matching job requisitions.
            </p>
          </div>

          {/* Quick Metrics Widgets */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0 bg-white/5 p-4 rounded-2xl border border-ink-border">
            <InteractiveScoreGauge score={94} size={90} strokeWidth={8} />
            <div className="space-y-1.5 border-l border-ink-border pl-4">
              <div className="text-xs font-mono uppercase text-text-tertiary">Profile Health</div>
              <div className="text-sm font-bold text-text-primary">{profileCompleteness}% Complete</div>
              <Link 
                href="/app/profile" 
                className="text-xs font-semibold text-signal-500 hover:text-signal-600 transition-colors inline-flex items-center gap-1"
              >
                Optimize &rarr;
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SpotlightCard className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary">Active Applications</span>
            <div className="w-8 h-8 rounded-lg bg-signal-500/15 text-signal-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-text-primary">{applications.length || 3}</div>
          <div className="flex items-center gap-1.5 text-xs text-success font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>1 Moved to Interview stage this week</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary">Matching Requisitions</span>
            <div className="w-8 h-8 rounded-lg bg-aperture-500/15 text-aperture-500 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-text-primary">14</div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span>Filtered for score &ge; 85%</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary">Resume Indexing</span>
            <div className="w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-text-primary">v2.4</div>
          <div className="flex items-center gap-1.5 text-xs text-success font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>12 Key competencies extracted</span>
          </div>
        </SpotlightCard>
      </div>

      {/* Main Grid: Recommended Roles & Skill Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Recommended Jobs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-text-primary">Top AI Matched Opportunities</h2>
              <span className="px-2 py-0.5 rounded-full bg-signal-500/20 text-signal-500 text-xs font-mono border border-signal-500/30">
                High Confidence
              </span>
            </div>
            <Link href="/app/jobs" className="text-xs font-semibold text-signal-500 hover:text-signal-600 transition-colors">
              View All 14 Roles &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {recommendedJobs.map((job) => (
              <SpotlightCard key={job.id} className="p-6 hover:border-signal-500/40 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-text-primary hover:text-signal-500 transition-colors">
                        <Link href={`/app/jobs/${job.id}`}>{job.title}</Link>
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1 text-text-primary font-medium">
                        <Building2 className="w-3.5 h-3.5 text-signal-500" /> {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-text-tertiary" /> {job.location}
                      </span>
                      <span className="font-mono text-success font-medium">
                        {job.salary}
                      </span>
                    </div>
                  </div>

                  {/* Score Indicator */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono uppercase text-text-tertiary">Match Fit</div>
                      <div className="font-display text-xl font-bold text-signal-500">{job.matchScore}%</div>
                    </div>
                  </div>
                </div>

                {/* AI Rationale & Skills */}
                <div className="pt-4 space-y-3">
                  <p className="text-xs text-text-secondary leading-relaxed bg-white/5 p-3 rounded-xl border border-ink-border">
                    <span className="text-signal-500 font-semibold">AI Match Rationale: </span>
                    {job.matchedReason}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {job.skills.map((skill) => (
                        <span key={skill} className="px-2.5 py-1 rounded-lg bg-white/5 border border-ink-border text-xs text-text-secondary font-mono">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/app/jobs/${job.id}`}>
                        <LiquidButton variant="secondary" className="text-xs px-3.5 py-1.5">
                          Inspect Fit
                        </LiquidButton>
                      </Link>
                      <LiquidButton
                        variant="primary"
                        onClick={() => handleQuickApply(job.id, job.title, job.company)}
                        disabled={applyingJobId === job.id}
                        className="text-xs px-4 py-1.5"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {applyingJobId === job.id ? "Applying..." : "Quick Apply"}
                      </LiquidButton>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>

        {/* Right Column (1 Col): Skill Matrix & Application Tracker */}
        <div className="space-y-6">
          
          {/* Skill Competency Breakdown */}
          <SpotlightCard className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink-border">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-aperture-500" />
                <h3 className="font-display text-base font-bold text-text-primary">Competency Matrix</h3>
              </div>
              <Link href="/app/skill-gap" className="text-xs font-semibold text-aperture-500 hover:text-aperture-600">
                Optimize &rarr;
              </Link>
            </div>

            <div className="space-y-3.5">
              {[
                { name: "Distributed Systems", level: 95, color: "bg-signal-500" },
                { name: "Next.js / React Architecture", level: 92, color: "bg-aperture-500" },
                { name: "FastAPI / Python Microservices", level: 88, color: "bg-success" },
                { name: "Kubernetes Containerization", level: 78, color: "bg-warning" },
                { name: "Vector Databases & Embeddings", level: 84, color: "bg-signal-500" }
              ].map((skill) => (
                <div key={skill.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary font-medium">{skill.name}</span>
                    <span className="font-mono text-text-primary font-bold">{skill.level}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${skill.level}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <Link href="/app/skill-gap" className="block pt-2">
              <button className="w-full py-2.5 rounded-xl glass-card border border-ink-border text-xs font-semibold text-text-primary hover:border-aperture-500/40 hover:bg-white/5 transition-all text-center">
                Run Target Role Simulation &rarr;
              </button>
            </Link>
          </SpotlightCard>

          {/* Real-time Application Pipeline */}
          <SpotlightCard className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink-border">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-signal-500" />
                <h3 className="font-display text-base font-bold text-text-primary">Application Pipeline</h3>
              </div>
              <Link href="/app/applications" className="text-xs font-semibold text-signal-500 hover:text-signal-600">
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {[
                {
                  company: "Stripe",
                  role: "Senior AI Engineer",
                  stage: "Interviewing",
                  time: "Tomorrow at 2:00 PM",
                  statusColor: "text-aperture-500 bg-aperture-500/15 border-aperture-500/30"
                },
                {
                  company: "Vercel",
                  role: "Staff Full-Stack Architect",
                  stage: "Under Review",
                  time: "Submitted 2d ago",
                  statusColor: "text-signal-500 bg-signal-500/15 border-signal-500/30"
                },
                {
                  company: "Figma",
                  role: "Design Systems Engineer",
                  stage: "Shortlisted",
                  time: "Recruiter reviewed",
                  statusColor: "text-success bg-success/15 border-success/30"
                }
              ].map((app, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-ink-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-text-primary">{app.role}</div>
                    <div className="text-[11px] text-text-secondary">{app.company} &bull; {app.time}</div>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${app.statusColor}`}>
                    {app.stage}
                  </span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
