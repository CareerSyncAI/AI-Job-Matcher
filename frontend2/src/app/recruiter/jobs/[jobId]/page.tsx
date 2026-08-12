"use client";

import React, { use, useEffect } from "react";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { CandidateTable } from "@/components/recruiter/CandidateTable";
import { MapPin, Clock, Award, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JobWorkspacePage({
  params
}: {
  params: Promise<{ jobId: string }>;
}) {
  const router = useRouter();
  const { jobId } = use(params);
  const { jobs, setSelectedJobId, currentJob, candidates, updateCandidateStatus, isLoading } = useRecruiter();

  // Align the RecruiterContext's active job ID with the URL parameter
  useEffect(() => {
    if (jobId && jobs.length > 0) {
      const matchExists = jobs.some((j) => j.id === jobId);
      if (matchExists) {
        setSelectedJobId(jobId);
      } else {
        // Fallback to dashboard if jobId is invalid
        router.replace("/recruiter");
      }
    }
  }, [jobId, jobs, setSelectedJobId, router]);

  if (isLoading || !currentJob) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Job Workspace...</p>
      </div>
    );
  }

  // Filter candidates for this job scope
  const jobCandidates = candidates.filter((c) => c.jobId === currentJob.id);

  return (
    <div className="space-y-6">
      {/* Job Info Header Panel */}
      <div className="bg-ink-surface border border-ink-border rounded p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-block px-2 py-0.5 bg-signal-500/10 text-signal-500 rounded text-[11px] font-semibold uppercase tracking-wider">
              {currentJob.department || "Engineering"}
            </span>
            <h1 className="font-display font-semibold text-xl text-text-primary tracking-tight">
              {currentJob.title}
            </h1>
            
            {/* Meta info tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                {currentJob.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                {currentJob.employmentType || "Full-time"}
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-text-tertiary" />
                Min {currentJob.minimumExperience || 0} years experience
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-ink-border">
            <Link
              href="/recruiter/upload"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-border hover:bg-ink-border/80 text-text-primary font-semibold text-xs rounded transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Resumes
            </Link>
          </div>
        </div>

        {/* Job details expansion */}
        <div className="mt-5 pt-5 border-t border-ink-border grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-left">
          <div className="md:col-span-2 space-y-2">
            <h3 className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
              Job Description
            </h3>
            <p className="text-text-secondary leading-relaxed max-w-2xl font-sans">
              {currentJob.description}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                Required Core Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {currentJob.requiredSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-ink-base border border-ink-border text-text-primary rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {currentJob.preferredSkills && currentJob.preferredSkills.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                  Preferred Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {currentJob.preferredSkills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-ink-base border border-ink-border/50 text-text-secondary rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Leaderboard Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display font-semibold text-lg text-text-primary tracking-tight">
            Candidate Leaderboard
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Matching candidates ranked by NLP semantic proximity. Inspect pros/cons, gaps, and claim sources.
          </p>
        </div>

        {/* The interactive candidate leaderboard grid */}
        <CandidateTable
          candidates={jobCandidates}
          jobId={currentJob.id}
          onStatusUpdate={updateCandidateStatus}
        />
      </div>
    </div>
  );
}
