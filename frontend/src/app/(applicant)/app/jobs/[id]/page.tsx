"use client";

import React, { use, useState, useEffect } from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { ArrowLeft, MapPin, Clock, Award, Briefcase, Check, HelpCircle, AlertTriangle, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EvidenceType } from "@/types";
import { cn } from "@/lib/utils";

export default function JobDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: jobId } = use(params);
  const { profile, applications, applyToJob, isLoading: applicantLoading } = useApplicantContext();
  const { jobs, isLoading: jobsLoading } = useRecruiter();

  const [matchScore, setMatchScore] = useState<number>(0);
  const [evidenceList, setEvidenceList] = useState<{ requirement: string; claim: string; type: EvidenceType; details?: string }[]>([]);
  
  const [isApplying, setIsApplying] = useState(false);
  const [showApplySuccess, setShowApplySuccess] = useState(false);

  const job = jobs.find((j) => j.id === jobId);
  const application = applications.find((app) => app.jobId === jobId);

  useEffect(() => {
    if (profile && job) {
      // Calculate match score
      const matchedSkills = job.requiredSkills.filter((s) => profile.skills.includes(s));
      const skillScore = Math.min((matchedSkills.length / job.requiredSkills.length) * 100, 100);

      let experienceScore = 50;
      if (job.minimumExperience) {
        const ratio = profile.experienceYears / job.minimumExperience;
        experienceScore = Math.min(Math.round(ratio * 100), 100);
      }

      const overallScore = Math.round((skillScore * 0.6) + (experienceScore * 0.4));

      // Compute matching evidence items contextually
      const computedEvidence = job.requiredSkills.map((skill) => {
        const hasSkill = profile.skills.includes(skill);
        if (hasSkill) {
          return {
            requirement: `${skill} Core Requirement`,
            claim: `Self-declared competency in ${skill} discovered in your profile.`,
            type: "matched" as EvidenceType
          };
        } else {
          // Check if there's adjacent transferable skills
          let isTransferable = false;
          let claim = "";
          if (skill === "Tailwind CSS" && profile.skills.includes("CSS3")) {
            isTransferable = true;
            claim = "Transferable skill: CSS3 knowledge maps directly to functional utility styling frames like Tailwind CSS.";
          } else if (skill === "Next.js" && profile.skills.includes("React")) {
            isTransferable = true;
            claim = "Transferable skill: Next.js is a React-based framework; React component expertise provides a solid baseline.";
          }

          if (isTransferable) {
            return {
              requirement: `${skill} Requirement`,
              claim,
              type: "transferable" as EvidenceType,
              details: "Recruiters evaluate adjacent tool competencies constructively."
            };
          }

          return {
            requirement: `${skill} Requirement`,
            claim: "Unverified on resume.",
            type: "not_detected" as EvidenceType,
            details: "This skill was not detected in your current profile listings. Add it to your credentials if you possess this experience."
          };
        }
      });

      // Experience comparison evidence
      const expGap = job.minimumExperience && profile.experienceYears < job.minimumExperience;
      computedEvidence.push({
        requirement: "Experience Fit Threshold",
        claim: expGap 
          ? `Currently declared experience is ${profile.experienceYears} year(s), compared to the required ${job.minimumExperience} years.`
          : `Declared experience of ${profile.experienceYears} year(s) satisfies the required ${job.minimumExperience} years threshold.`,
        type: expGap ? "gap" as EvidenceType : "matched" as EvidenceType,
        details: expGap 
          ? "This is flagged as a requirement gap. However, recruiters may consider adjacent project portfolios."
          : undefined
      });

      const timer = setTimeout(() => {
        setMatchScore(overallScore);
        setEvidenceList(computedEvidence);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [profile, job]);

  if (applicantLoading || jobsLoading) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Job Details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <p className="text-xs">Position listing not found.</p>
        <Link href="/app/jobs" className="text-xs text-aperture-500 underline font-semibold mt-2 block">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await applyToJob(job.id);
      setShowApplySuccess(true);
      setTimeout(() => setShowApplySuccess(false), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  const getEvidenceBadge = (type: EvidenceType) => {
    switch (type) {
      case "matched":
        return {
          label: "Evidence Found",
          classes: "bg-success/10 text-success border-success/20",
          icon: CheckCircle2
        };
      case "transferable":
        return {
          label: "Transferable Skill",
          classes: "bg-aperture-500/10 text-aperture-500 border-aperture-500/20",
          icon: HelpCircle
        };
      case "not_detected":
        return {
          label: "Not Detected on Resume",
          classes: "bg-ink-border text-text-secondary border-ink-border",
          icon: EyeOff
        };
      case "gap":
        return {
          label: "Requirement Gap",
          classes: "bg-danger/10 text-danger border-danger/20",
          icon: AlertTriangle
        };
      default:
        return {
          label: "Not Provided",
          classes: "bg-ink-border/50 text-text-tertiary border-ink-border/30",
          icon: HelpCircle
        };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success border-success/30 bg-success/5";
    if (score >= 50) return "text-aperture-500 border-aperture-500/30 bg-aperture-500/5";
    return "text-text-secondary border-ink-border bg-ink-border/20";
  };

  return (
    <div className="space-y-6 text-left">
      {/* Back navigation */}
      <div>
        <Link
          href="/app/jobs"
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore Listings
        </Link>
      </div>

      {/* Success alert banner */}
      {showApplySuccess && (
        <div className="bg-success/10 border border-success/30 p-4 rounded text-xs text-success flex items-start gap-2.5 animate-fade-in">
          <Check className="w-4 h-4 stroke-[2.5px] mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Application Submitted Successfully!</p>
            <p className="text-[10.5px] text-text-secondary mt-0.5">
              You are now tracking this position. Recruiters can review your matching credentials under the candidate queue.
            </p>
          </div>
        </div>
      )}

      {/* Split details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job title panel */}
          <div className="bg-ink-surface border border-ink-border rounded p-6 space-y-4">
            <div className="space-y-2">
              <span className="inline-block px-2.5 py-0.5 bg-aperture-500/10 text-aperture-500 rounded text-[11px] font-semibold uppercase tracking-wider font-mono">
                {job.department}
              </span>
              <h1 className="font-display font-semibold text-xl text-text-primary tracking-tight">
                {job.title}
              </h1>
              
              {/* Meta details */}
              <div className="flex flex-wrap gap-4 text-xs text-text-secondary pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                  {job.employmentType || "Full-time"}
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-text-tertiary" />
                  Min {job.minimumExperience} yrs exp
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-ink-border pt-4 text-xs space-y-2">
              <h3 className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                Position Overview
              </h3>
              <p className="text-text-secondary leading-relaxed font-sans">
                {job.description}
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: NLP Match breakdown */}
        <div className="space-y-6">
          {/* Compatibility Card */}
          <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-ink-border pb-2">
              <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider">
                Match Diagnostics
              </h3>
              <span className={cn("px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold border", getScoreColor(matchScore))}>
                {matchScore}% fit
              </span>
            </div>

            {/* Circular match ring */}
            <div className="flex justify-center py-2 relative">
              <div className="relative w-24 h-24 flex items-center justify-center border-8 border-aperture-500/20 rounded-full">
                <span className="font-display font-bold text-2xl text-aperture-500">
                  {matchScore}%
                </span>
              </div>
            </div>

            <p className="text-xs text-text-secondary text-center leading-normal">
              Based on the information currently available in your profile and primary resume version.
            </p>

            {/* Application action button */}
            {application ? (
              <button
                disabled
                className="w-full py-2 bg-ink-border text-text-tertiary font-semibold text-xs rounded border border-ink-border flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                Applied &bull; {new Date(application.appliedAt).toLocaleDateString()}
              </button>
            ) : (
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="w-full py-2 bg-aperture-500 hover:bg-aperture-600 text-ink-base font-bold text-xs rounded transition-colors cursor-pointer"
              >
                {isApplying ? "Submitting application..." : "Apply to position"}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Audit Evidence Stack (Why Ranked Here? explanation) */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display font-semibold text-lg text-text-primary tracking-tight">
            Why this score?
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Structural analysis mapping your skill listings and work histories against required job criteria.
          </p>
        </div>

        {/* Evidence List */}
        <div className="space-y-3">
          {evidenceList.map((item, idx) => {
            const badge = getEvidenceBadge(item.type);
            const BadgeIcon = badge.icon;
            return (
              <div
                key={idx}
                className="bg-ink-surface border border-ink-border rounded p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <h4 className="font-semibold text-text-primary">
                    {item.requirement}
                  </h4>
                  <p className="text-text-secondary font-sans leading-relaxed italic">
                    &ldquo;{item.claim}&rdquo;
                  </p>
                  {item.details && (
                    <p className="text-[11px] text-text-tertiary font-sans leading-normal pt-1">
                      {item.details}
                    </p>
                  )}
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider shrink-0 self-start sm:self-center ${badge.classes}`}
                >
                  <BadgeIcon className="w-3.5 h-3.5 stroke-[2px]" />
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
