"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Plus, 
  ArrowRight, 
  Briefcase,
  Layers,
  Zap,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApplicant } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { useToast } from "@/components/ui/ToastProvider";
import { SpotlightCard } from "@/components/motion/MotionPrimitives";

// Smart AI recommendation helper for common skills
const getSkillLearningPlan = (skill: string) => {
  const plans: Record<string, { summary: string; projectIdea: string; timeWeeks: number; difficulty: "Easy" | "Medium" | "Advanced" }> = {
    "PyTorch": {
      summary: "Master tensor computations, autograd mechanics, and building convolutional/transformer neural network architectures.",
      projectIdea: "Train a custom image classifier or fine-tune a small BERT model on a Kaggle dataset.",
      timeWeeks: 3,
      difficulty: "Advanced"
    },
    "FastAPI": {
      summary: "Understand asynchronous request handling, Pydantic data schemas, dependency injection, and auto-generated OpenAPI docs.",
      projectIdea: "Build a high-performance REST API with async endpoints, JWT auth, and PostgreSQL connection pooling.",
      timeWeeks: 1,
      difficulty: "Easy"
    },
    "Docker": {
      summary: "Learn containerization principles, multi-stage Dockerfiles, port mappings, and container orchestration.",
      projectIdea: "Containerize a full-stack Next.js + FastAPI application with a docker-compose.yml setup.",
      timeWeeks: 1,
      difficulty: "Easy"
    },
    "Kubernetes": {
      summary: "Study pods, deployments, services, ingress controllers, configMaps, and horizontal pod autoscalers.",
      projectIdea: "Deploy a multi-service web app to a local Minikube or Kind cluster with rolling updates.",
      timeWeeks: 2,
      difficulty: "Medium"
    },
    "Next.js": {
      summary: "Master Next.js 15 App Router, React Server Components (RSC), server actions, and edge middleware.",
      projectIdea: "Build an SEO-optimized dashboard with streaming SSR, dynamic route handlers, and Tailwind styling.",
      timeWeeks: 2,
      difficulty: "Medium"
    },
    "TypeScript": {
      summary: "Deepen understanding of generics, union & intersection types, utility types, and strict null checks.",
      projectIdea: "Refactor a JavaScript library to 100% strict TypeScript with zero 'any' types.",
      timeWeeks: 1,
      difficulty: "Easy"
    },
    "Tailwind CSS": {
      summary: "Utilize utility-first CSS, custom design tokens, responsive breakpoints, and dark mode classes.",
      projectIdea: "Create a modern, responsive landing page with custom gradients and glassmorphism cards.",
      timeWeeks: 1,
      difficulty: "Easy"
    },
    "NLP": {
      summary: "Understand tokenization, TF-IDF, Word2Vec, BERT/BGE embeddings, and vector similarity search.",
      projectIdea: "Implement a semantic document search engine using sentence-transformers and cosine similarity.",
      timeWeeks: 3,
      difficulty: "Advanced"
    },
    "Transformers": {
      summary: "Study self-attention mechanisms, encoder-decoder architectures, and Hugging Face pipelines.",
      projectIdea: "Fine-tune a pretrained Hugging Face transformer model for multi-class text classification.",
      timeWeeks: 3,
      difficulty: "Advanced"
    },
    "AWS": {
      summary: "Learn core cloud services: EC2, S3, RDS, Lambda, IAM policies, and VPC networking.",
      projectIdea: "Host a serverless REST API using API Gateway + AWS Lambda + S3 static asset storage.",
      timeWeeks: 2,
      difficulty: "Medium"
    },
    "Terraform": {
      summary: "Master Infrastructure-as-Code (IaC), provider configurations, state management, and reusable modules.",
      projectIdea: "Write Terraform scripts to automatically provision a cloud VPC with compute instances.",
      timeWeeks: 2,
      difficulty: "Medium"
    }
  };

  if (plans[skill]) return plans[skill];

  return {
    summary: `Study core documentation, architectural patterns, and production best practices for ${skill}.`,
    projectIdea: `Build a functional proof-of-concept integrating ${skill} into your existing portfolio projects.`,
    timeWeeks: 2,
    difficulty: "Medium" as const
  };
};

export default function SkillGapPage() {
  const { profile, updateProfile } = useApplicant();
  const { jobs, isLoading: jobsLoading } = useRecruiter();
  const { success, info } = useToast();

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [simulatedSkills, setSimulatedSkills] = useState<string[]>([]);

  // Initialize with first job when jobs load
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      const timer = setTimeout(() => {
        setSelectedJobId(jobs[0].id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [jobs, selectedJobId]);

  const activeJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || jobs[0];
  }, [jobs, selectedJobId]);

  const currentSkills = useMemo(() => {
    return Array.from(new Set([...(profile?.skills || []), ...simulatedSkills]));
  }, [profile, simulatedSkills]);

  // Compute matches and gaps dynamically for the selected active job
  const { matchedSkills, missingSkills, matchPercentage } = useMemo(() => {
    if (!activeJob) return { matchedSkills: [], missingSkills: [], matchPercentage: 0 };

    const required = activeJob.requiredSkills || [];
    const matched = required.filter((s) => currentSkills.includes(s));
    const missing = required.filter((s) => !currentSkills.includes(s));

    const skillScore = required.length > 0 ? (matched.length / required.length) * 100 : 100;
    const expScore = activeJob.minimumExperience && profile?.experienceYears
      ? Math.min((profile.experienceYears / activeJob.minimumExperience) * 100, 100)
      : 80;

    const overall = Math.round(skillScore * 0.7 + expScore * 0.3);

    return {
      matchedSkills: matched,
      missingSkills: missing,
      matchPercentage: overall
    };
  }, [activeJob, currentSkills, profile]);

  const handleSimulateSkill = (skillName: string) => {
    if (simulatedSkills.includes(skillName)) return;
    setSimulatedSkills((prev) => [...prev, skillName]);
    success(
      `Skill Added: ${skillName}`,
      `Simulated your profile with ${skillName}. Match score recalculated!`
    );
  };

  const handleSaveToProfile = async () => {
    if (simulatedSkills.length === 0) return;
    try {
      const updatedList = Array.from(new Set([...(profile?.skills || []), ...simulatedSkills]));
      await updateProfile({ skills: updatedList });
      success("Profile Synchronized", `${simulatedSkills.length} new skill(s) permanently added to your profile.`);
      setSimulatedSkills([]);
    } catch {
      info("Error", "Could not synchronize skills.");
    }
  };

  if (jobsLoading || !activeJob) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Job & Skill Matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left">
      {/* Header */}
      <div className="border-b border-ink-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-aperture-500/10 text-aperture-500 text-xs font-semibold mb-1">
            <Target className="w-3.5 h-3.5" />
            AI Skill Gap Analyzer
          </div>
          <h1 className="font-display font-bold text-2xl text-text-primary">
            Job Requirement & Skill Gap Matrix
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Compare your profile credentials against active job requisitions and get AI-guided learning roadmaps.
          </p>
        </div>

        {simulatedSkills.length > 0 && (
          <button
            onClick={handleSaveToProfile}
            className="px-4 py-2 bg-success hover:bg-success/90 text-white font-semibold text-xs rounded transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save {simulatedSkills.length} Simulated Skill(s) to Profile
          </button>
        )}
      </div>

      {/* Role / Job Selector */}
      <div className="bg-ink-surface border border-ink-border rounded p-4 space-y-3">
        <label className="text-xs font-semibold text-text-primary uppercase tracking-wider block">
          Select Target Job Requisition to Evaluate
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {jobs.map((job) => {
            const isSelected = job.id === activeJob.id;
            return (
              <button
                key={job.id}
                onClick={() => {
                  setSelectedJobId(job.id);
                  setSimulatedSkills([]);
                }}
                className={`p-3 text-left rounded border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-signal-500/10 border-signal-500 text-signal-500"
                    : "bg-ink-base border-ink-border text-text-secondary hover:border-ink-border/80 hover:text-text-primary"
                }`}
              >
                <div>
                  <h4 className="font-semibold text-xs text-text-primary truncate">{job.title}</h4>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{job.department} &bull; {job.location}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-ink-border/50 flex items-center justify-between text-[11px]">
                  <span>Min {job.minimumExperience} yrs exp</span>
                  <span className="font-semibold text-text-primary">{job.requiredSkills.length} core skills</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Match Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SpotlightCard className="p-5 bg-ink-surface border border-ink-border rounded flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-signal-500/10 border border-signal-500/30 flex items-center justify-center font-display font-bold text-xl text-signal-500 shrink-0">
            {matchPercentage}%
          </div>
          <div>
            <h3 className="font-semibold text-sm text-text-primary">Estimated Fit Score</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {matchPercentage >= 80 ? "High Match — Strong Candidate" : matchPercentage >= 50 ? "Moderate Match — Skill Gaps Detected" : "Low Match — Significant Requirements Missing"}
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 bg-ink-surface border border-ink-border rounded flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 flex items-center justify-center font-bold text-lg text-success shrink-0">
            {matchedSkills.length}
          </div>
          <div>
            <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wider">Matched Core Skills</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Verified credentials matching role requirements.
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 bg-ink-surface border border-ink-border rounded flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center font-bold text-lg text-warning shrink-0">
            {missingSkills.length}
          </div>
          <div>
            <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wider">Detected Skill Gaps</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Competencies needed to maximize interview selection.
            </p>
          </div>
        </SpotlightCard>
      </div>

      {/* Side-by-Side Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Matched Skills List */}
        <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-ink-border pb-3">
            <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Matched Requirements ({matchedSkills.length})
            </h3>
            <span className="text-[11px] text-success bg-success/10 px-2 py-0.5 rounded font-semibold">
              Satisfied
            </span>
          </div>

          {matchedSkills.length === 0 ? (
            <p className="text-xs text-text-tertiary py-4 text-center">
              No matching required skills detected yet. Check the recommendations on the right.
            </p>
          ) : (
            <div className="space-y-2">
              {matchedSkills.map((skill, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-ink-base border border-ink-border rounded flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div>
                      <h4 className="font-semibold text-xs text-text-primary">{skill}</h4>
                      <p className="text-[11px] text-text-tertiary">Verified in profile credentials</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-success/10 text-success rounded font-semibold uppercase">
                    100% Fit
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-ink-border/50 flex items-center justify-between text-xs text-text-secondary">
            <span>Minimum Experience Required:</span>
            <span className="font-semibold text-text-primary">
              {activeJob.minimumExperience} Years (You have {profile?.experienceYears || 0} Yrs)
            </span>
          </div>
        </div>

        {/* AI Skill Development Recommendations */}
        <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-ink-border pb-3">
            <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-signal-500" />
              AI Skill Recommendations ({missingSkills.length})
            </h3>
            <span className="text-[11px] text-warning bg-warning/10 px-2 py-0.5 rounded font-semibold">
              Actionable Plan
            </span>
          </div>

          {missingSkills.length === 0 ? (
            <div className="p-8 text-center bg-success/5 border border-success/20 rounded">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <h4 className="font-semibold text-xs text-text-primary">You satisfy all core requirements!</h4>
              <p className="text-[11px] text-text-secondary mt-1">
                Your profile matches all required competencies for {activeJob.title}.
              </p>
              <Link
                href={`/app/jobs/${activeJob.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-signal-500 hover:underline"
              >
                Apply to this Requisition <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {missingSkills.map((skill, idx) => {
                const plan = getSkillLearningPlan(skill);
                const isSimulated = simulatedSkills.includes(skill);

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-ink-base border border-ink-border rounded space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                        <h4 className="font-semibold text-xs text-text-primary">{skill}</h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-warning/10 text-warning rounded font-semibold uppercase">
                        Missing Requirement
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      {plan.summary}
                    </p>

                    <div className="p-2 bg-ink-surface rounded text-[11px] text-text-secondary border border-ink-border/50 space-y-1">
                      <p className="font-semibold text-text-primary flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-signal-500" />
                        Recommended Hands-on Project:
                      </p>
                      <p className="text-text-tertiary">{plan.projectIdea}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-text-tertiary flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Estimated effort: ~{plan.timeWeeks} week(s)
                      </span>

                      <button
                        onClick={() => handleSimulateSkill(skill)}
                        disabled={isSimulated}
                        className="px-2.5 py-1 bg-signal-500/10 hover:bg-signal-500/20 text-signal-500 border border-signal-500/30 rounded font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        {isSimulated ? "Simulated" : "Simulate Learning"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
