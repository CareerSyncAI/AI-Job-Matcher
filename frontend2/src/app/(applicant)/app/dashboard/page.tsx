"use client";

import React, { useEffect, useState } from "react";
import { useApplicant } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { FileText, Briefcase, Award, ArrowRight, CheckCircle2, ChevronRight, AlertCircle, Sparkles, Clock, Compass } from "lucide-react";
import Link from "next/link";
import { Job, Candidate } from "@/types";

export default function ApplicantDashboard() {
  const { profile, applications, profileCompleteness, isLoading } = useApplicant();
  const { jobs } = useRecruiter(); // Fetch all jobs listed

  const [topMatch, setTopMatch] = useState<{ job: Job; score: number } | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<{ job: Job; score: number }[]>([]);

  useEffect(() => {
    if (profile && jobs.length > 0) {
      // Deterministically calculate match scores for all open jobs
      const matches = jobs.map((job) => {
        // Calculate match score based on shared skills + experience years
        const matchedSkills = job.requiredSkills.filter((s) => profile.skills.includes(s));
        const skillScore = Math.min((matchedSkills.length / job.requiredSkills.length) * 100, 100);
        
        let experienceScore = 50;
        if (job.minimumExperience) {
          const ratio = profile.experienceYears / job.minimumExperience;
          experienceScore = Math.min(Math.round(ratio * 100), 100);
        }
        
        const overallScore = Math.round((skillScore * 0.6) + (experienceScore * 0.4));
        return { job, score: overallScore };
      }).sort((a, b) => b.score - a.score);

      if (matches.length > 0) {
        const timer = setTimeout(() => {
          setTopMatch(matches[0]);
          setRecommendedJobs(matches.slice(0, 3));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, jobs]);

  if (isLoading || !profile) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  // Get active applications summary
  const activeApps = applications.filter((app) => app.status !== "rejected" && app.status !== "offered");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-aperture-500/10 text-aperture-500 border border-aperture-500/20";
      case "screened":
        return "bg-warning/10 text-warning border border-warning/20";
      case "shortlisted":
        return "bg-success/10 text-success border border-success/20";
      case "interviewing":
        return "bg-signal-500/10 text-signal-500 border border-signal-500/20";
      default:
        return "bg-ink-border text-text-secondary border border-ink-border";
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Greetings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-border pb-4">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
            Good afternoon, {profile.name}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Analyze your credentials, track applications, and inspect requirement matches.
          </p>
        </div>
        <div className="text-[11px] text-text-tertiary font-mono">
          Last profile sync: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Profile Completeness */}
        <div className="glass-card p-5 flex flex-col justify-between h-[190px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider">
                Profile Completeness
              </h3>
              <span className="font-mono text-sm font-bold text-aperture-500">
                {profileCompleteness}%
              </span>
            </div>
            
            {/* Completion Bar */}
            <div className="w-full bg-ink-base h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-aperture-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${profileCompleteness}%` }}
              />
            </div>

            <p className="text-xs text-text-secondary mt-4 leading-normal">
              Completing your profile adds credibility and ensures direct compatibility matches against job listings.
            </p>
          </div>

          <Link
            href="/app/profile"
            className="text-xs text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-1 mt-3"
          >
            Complete profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: Strongest Matching Requisition */}
        <div className="glass-card p-5 flex flex-col justify-between h-[190px]">
          {topMatch ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider">
                    Top Job Match
                  </h3>
                  <span className="font-mono text-sm font-bold text-success border border-success/35 px-1.5 py-0.5 rounded bg-success/5">
                    {topMatch.score}%
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-text-primary truncate mt-3">
                  {topMatch.job.title}
                </h4>
                <p className="text-xs text-text-secondary truncate mt-1">
                  {topMatch.job.department} &bull; {topMatch.job.location}
                </p>
              </div>

              <Link
                href={`/app/jobs/${topMatch.job.id}`}
                className="text-xs text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-1 mt-3"
              >
                View Match Breakdown
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Clock className="w-6 h-6 text-text-tertiary mb-2" />
              <p className="text-xs text-text-secondary">Computing score matches...</p>
            </div>
          )}
        </div>

        {/* Card 3: Active Applications Tracker */}
        <div className="glass-card p-5 flex flex-col justify-between h-[190px]">
          <div>
            <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider mb-2">
              Active Tracker
            </h3>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-mono text-3xl font-bold text-text-primary">
                {activeApps.length}
              </span>
              <span className="text-xs text-text-secondary">Active application{activeApps.length !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-xs text-text-secondary mt-3 leading-normal">
              Keep track of interview invites, screening updates, and offers in the application vault.
            </p>
          </div>

          <Link
            href="/app/applications"
            className="text-xs text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-1 mt-3"
          >
            Track applications
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* Recommended Jobs & Applications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recommended Jobs listings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-ink-border pb-2">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Recommended for You
            </h2>
            <Link href="/app/jobs" className="text-xs text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-0.5">
              Browse all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recommendedJobs.length === 0 ? (
              <div className="p-6 glass-card text-center">
                <Compass className="w-8 h-8 text-text-tertiary mx-auto mb-2 animate-spin duration-3000" />
                <p className="text-xs text-text-secondary">No recommendations available. Update your skills to discover matches.</p>
              </div>
            ) : (
              recommendedJobs.map(({ job, score }) => (
                <div
                  key={job.id}
                  className="p-4 glass-card hover:border-aperture-500/50 transition-all flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-text-primary truncate">
                      <Link href={`/app/jobs/${job.id}`} className="hover:text-aperture-500 transition-colors">
                        {job.title}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
                      <span>{job.department}</span>
                      <span>&bull;</span>
                      <span>{job.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-success/35 text-success bg-success/5">
                      {score}% match
                    </span>
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="p-1 rounded hover:bg-ink-border text-text-secondary hover:text-aperture-500 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Skill Gap Analysis Box & Quick Checklist */}
        <div className="space-y-6">
          
          {/* Constructive Skill Gap Highlights */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider border-b border-ink-border pb-2">
              Evidential Skill Gap
            </h3>
            
            {topMatch ? (
              <div className="space-y-3 text-xs">
                <p className="text-text-secondary leading-normal">
                  In your top match role <strong>{topMatch.job.title}</strong>:
                </p>
                
                {/* Visual stats */}
                <div className="flex items-center justify-between bg-ink-base/40 p-2.5 border border-ink-border rounded font-mono">
                  <span className="text-text-secondary">Core requirements:</span>
                  <span className="font-semibold text-text-primary">
                    {topMatch.job.requiredSkills.filter(s => profile.skills.includes(s)).length} / {topMatch.job.requiredSkills.length} Verified
                  </span>
                </div>

                <Link
                  href="/app/skill-gap"
                  className="text-xs text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-1 pt-1"
                >
                  Analyze complete gap matrix
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">Load profile skills to analyze gaps.</p>
            )}
          </div>

          {/* Action Checklist */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider border-b border-ink-border pb-2">
              Next Action Items
            </h3>
            <div className="space-y-3 text-xs">
              {profileCompleteness < 90 && (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-text-tertiary shrink-0" />
                  <div>
                    <Link href="/app/profile" className="font-semibold text-text-primary hover:text-aperture-500 transition-colors">
                      Complete profile credentials
                    </Link>
                    <p className="text-[11px] text-text-secondary mt-0.5">Fill out education and experience to boost fit ratings.</p>
                  </div>
                </div>
              )}
              {profile.resumes.length === 0 && (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-text-tertiary shrink-0" />
                  <div>
                    <Link href="/app/resume" className="font-semibold text-text-primary hover:text-aperture-500 transition-colors">
                      Upload primary resume version
                    </Link>
                    <p className="text-[11px] text-text-secondary mt-0.5">Parse skills and certifications directly from PDF.</p>
                  </div>
                </div>
              )}
              {activeApps.length === 0 && (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-text-tertiary shrink-0" />
                  <div>
                    <Link href="/app/jobs" className="font-semibold text-text-primary hover:text-aperture-500 transition-colors">
                      Browse matched job listings
                    </Link>
                    <p className="text-[11px] text-text-secondary mt-0.5">Identify positions matching your specific skill set.</p>
                  </div>
                </div>
              )}
              {profileCompleteness >= 90 && profile.resumes.length > 0 && activeApps.length > 0 && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                  <span>Profile fully optimized!</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
