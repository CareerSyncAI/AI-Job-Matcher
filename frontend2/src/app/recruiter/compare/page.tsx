"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, ArrowLeftRight, X } from "lucide-react";
import Link from "next/link";
import { Candidate, EvidenceItem, EvidenceType } from "@/types";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { jobs, candidates, updateCandidateStatus, currentJob } = useRecruiter();
  const shouldReduceMotion = useReducedMotion();

  const [compareList, setCompareList] = useState<Candidate[]>([]);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

  // Parse candidate IDs from search params
  const paramCandidates = searchParams.get("candidates");

  const removeFromCompare = (candidateId: string) => {
    const newIds = compareList.filter((c) => c.id !== candidateId).map((c) => c.id);
    if (newIds.length === 0) {
      const jobId = compareList[0]?.jobId || currentJob?.id;
      router.push(jobId ? `/recruiter/jobs/${jobId}` : "/recruiter");
    } else {
      router.push(`/recruiter/compare?candidates=${newIds.join(",")}`);
    }
  };

  useEffect(() => {
    if (paramCandidates) {
      const ids = paramCandidates.split(",");
      const selected = candidates.filter((c) => ids.includes(c.id));
      setCompareList(selected);
    } else {
      setCompareList([]);
    }
  }, [paramCandidates, candidates]);

  if (compareList.length === 0) {
    return (
      <div className="space-y-4 p-8 text-center glass-panel">
        <ArrowLeftRight className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
        <h2 className="font-semibold text-text-primary">No candidates selected for comparison</h2>
        <p className="text-xs text-text-secondary max-w-sm mx-auto">
          Go back to your active Job Workspace and select candidates using the checkboxes to evaluate their qualifications side-by-side.
        </p>
        <div className="pt-3">
          <Link
            href="/recruiter"
            className="px-3 py-1.5 bg-signal-500 hover:bg-signal-600 text-ink-base font-semibold text-xs rounded transition-colors"
          >
            Go to Workspace
          </Link>
        </div>
      </div>
    );
  }

  // Ensure all candidates belong to the same job (job-scoped comparison)
  const firstCandidateJobId = compareList[0]?.jobId;
  const targetJob = jobs.find((j) => j.id === firstCandidateJobId) || currentJob;

  if (!targetJob) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Failed to load target job specification.
      </div>
    );
  }

  // Gather unique requirements (skills requirements)
  const requirements = targetJob.requiredSkills;

  // Filter differences logic:
  // A requirement has a difference if the candidates' match types for that requirement differ.
  const getCandidateEvidenceForRequirement = (candidate: Candidate, req: string): EvidenceItem | undefined => {
    return candidate.evidence.find((e) => e.requirement.toLowerCase().includes(req.toLowerCase()));
  };

  const isDifference = (req: string) => {
    if (compareList.length < 2) return false;
    const firstType = getCandidateEvidenceForRequirement(compareList[0], req)?.type || "not_provided";
    return compareList.some((c) => {
      const type = getCandidateEvidenceForRequirement(c, req)?.type || "not_provided";
      return type !== firstType;
    });
  };

  const filteredRequirements = showDifferencesOnly
    ? requirements.filter((r) => isDifference(r))
    : requirements;

  const getEvidenceColor = (type?: EvidenceType) => {
    switch (type) {
      case "matched":
        return "text-success border-success/35 bg-success/5";
      case "transferable":
        return "text-signal-500 border-signal-500/35 bg-signal-500/5";
      case "gap":
        return "text-danger border-danger/35 bg-danger/5";
      case "not_detected":
        return "text-text-secondary border-ink-border bg-ink-border/20";
      default:
        return "text-text-tertiary border-ink-border/40 bg-ink-border/10";
    }
  };

  const getEvidenceIcon = (type?: EvidenceType) => {
    switch (type) {
      case "matched":
        return <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />;
      case "transferable":
        return <HelpCircle className="w-3.5 h-3.5 text-signal-500 shrink-0" />;
      case "gap":
        return <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />;
      default:
        return <EyeOff className="w-3.5 h-3.5 text-text-tertiary shrink-0" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success border-success/30 bg-success/5";
    if (score >= 50) return "text-signal-500 border-signal-500/30 bg-signal-500/5";
    return "text-text-secondary border-ink-border bg-ink-border/20";
  };

  const EyeOff = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" className="opacity-10" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Back to Job Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href={`/recruiter/jobs/${targetJob.id}`}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {targetJob.title} Leaderboard
        </Link>

        {/* Differences Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDifferencesOnly(!showDifferencesOnly)}
            className={`px-3 py-1.5 border rounded text-xs font-semibold transition-colors cursor-pointer ${
              showDifferencesOnly
                ? "bg-signal-500/10 border-signal-500 text-signal-500"
                : "glass-card text-text-secondary hover:border-ink-border/80"
            }`}
          >
            {showDifferencesOnly ? "Showing Differences Only" : "Show Differences Only"}
          </button>
        </div>
      </div>

      {/* Compare Candidates Profile Cards (Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-4 glass-panel rounded-xl text-left overflow-hidden">
        {/* Requirement Baseline Column */}
        <div className="p-4 flex flex-col justify-between h-44 bg-ink-base/40">
          <div>
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Comparison Board
            </h3>
            <p className="text-[11px] text-text-secondary mt-1 leading-normal">
              Evaluating trade-offs side-by-side for <strong>{compareList.length}</strong> candidates matching the job specification.
            </p>
          </div>
          <div className="text-[11px] text-text-tertiary font-mono">
            Job Scope: {targetJob.title}
          </div>
        </div>

        {/* Candidate Columns */}
        {compareList.map((candidate) => (
          <motion.div
            key={candidate.id}
            layout={!shouldReduceMotion}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="p-4 flex flex-col justify-between h-44 space-y-4 border-t md:border-t-0 md:border-l border-ink-border relative"
          >
            <button
              onClick={() => removeFromCompare(candidate.id)}
              className="absolute top-2 right-2 text-text-tertiary hover:text-text-primary p-1 cursor-pointer"
              title="Remove candidate from comparison"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="space-y-1 min-w-0 pr-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/recruiter/jobs/${candidate.jobId}/candidates/${candidate.id}`}
                  className="font-semibold text-sm text-text-primary hover:text-signal-500 transition-colors truncate block"
                >
                  {candidate.name}
                </Link>
                <span
                  className={cn(
                    "inline-block px-1.5 py-0.5 rounded font-mono font-semibold border text-[11px] shrink-0",
                    getScoreColor(candidate.matchScore)
                  )}
                >
                  {candidate.matchScore}%
                </span>
              </div>
              <p className="text-xs text-text-secondary truncate">{candidate.currentRole}</p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                disabled={candidate.status === "shortlisted"}
                onClick={() => updateCandidateStatus(candidate.id, "shortlisted")}
                className="flex-1 py-1 bg-success disabled:opacity-40 text-ink-base font-semibold text-[11px] rounded transition-colors cursor-pointer"
              >
                {candidate.status === "shortlisted" ? "Shortlisted" : "Shortlist"}
              </button>
              <button
                disabled={candidate.status === "rejected"}
                onClick={() => updateCandidateStatus(candidate.id, "rejected")}
                className="flex-1 py-1 bg-ink-border hover:bg-ink-border/80 border border-ink-border text-text-secondary text-[11px] rounded transition-colors cursor-pointer"
              >
                Reject
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid details mapping requirements */}
      <div className="glass-panel rounded-xl overflow-hidden mt-6">
        <div className="border-b border-white/10 bg-white/5 p-3 text-left">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Evidential Breakdown Grid
          </h3>
        </div>

        <div className="divide-y divide-ink-border">
          {/* Row: Experience */}
          {!showDifferencesOnly && (
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-ink-border items-center">
              <div className="p-4 font-semibold text-xs text-text-secondary bg-ink-base/10 text-left">
                Experience
              </div>
              {compareList.map((candidate) => (
                <div key={candidate.id} className="p-4 text-xs font-mono font-semibold text-text-primary text-left">
                  {candidate.experienceYears} Years
                </div>
              ))}
            </div>
          )}

          {/* Row: Education */}
          {!showDifferencesOnly && (
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-ink-border items-center">
              <div className="p-4 font-semibold text-xs text-text-secondary bg-ink-base/10 text-left">
                Education
              </div>
              {compareList.map((candidate) => (
                <div key={candidate.id} className="p-4 text-xs text-text-secondary text-left truncate" title={candidate.education}>
                  {candidate.education || "Not specified"}
                </div>
              ))}
            </div>
          )}

          {/* Requirements Rows */}
          <AnimatePresence initial={false}>
            {filteredRequirements.map((req) => (
              <motion.div
                key={req}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-ink-border items-stretch overflow-hidden"
              >
                {/* Requirement title */}
                <div className="p-4 font-semibold text-xs text-text-secondary bg-ink-base/10 flex items-center justify-between gap-2">
                  <span className="truncate text-left">{req}</span>
                  {isDifference(req) && (
                    <span className="px-1 py-0.5 bg-signal-500/10 text-signal-500 rounded-[3px] text-[8px] font-semibold uppercase tracking-wider shrink-0">
                      Delta
                    </span>
                  )}
                </div>

                {/* Candidates' Evidences */}
                {compareList.map((candidate) => {
                  const evidence = getCandidateEvidenceForRequirement(candidate, req);
                  const badgeColor = getEvidenceColor(evidence?.type);
                  const badgeIcon = getEvidenceIcon(evidence?.type);
                  const label = evidence ? (evidence.type === "matched" ? "Matched" : 
                                 evidence.type === "transferable" ? "Transferable" :
                                 evidence.type === "gap" ? "Constraint Gap" : "Not Detected") : "Not Mentioned";

                  return (
                    <div key={candidate.id} className="p-4 text-xs flex flex-col justify-between space-y-2 text-left">
                      <div className="flex items-center gap-2">
                        {badgeIcon}
                        <span className={cn("px-1.5 py-0.5 rounded border font-semibold text-[10px] uppercase tracking-wider", badgeColor)}>
                          {label}
                        </span>
                      </div>
                      {evidence && (
                        <p className="text-text-secondary italic font-sans leading-relaxed text-xs">
                          &quot;{evidence.claim}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
