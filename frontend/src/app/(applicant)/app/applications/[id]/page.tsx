"use client";

import React, { use } from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  AlertTriangle, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  Target
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "@/components/motion/MotionPrimitives";

export default function ApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appId } = use(params);
  const { profile, applications, isLoading: applicantLoading } = useApplicantContext();
  const { jobs, isLoading: jobsLoading } = useRecruiter();

  const app = applications.find((a) => a.id === appId);
  const job = app ? jobs.find((j) => j.id === app.jobId) : null;

  if (applicantLoading || jobsLoading) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Application Details...</p>
      </div>
    );
  }

  if (!app || !job) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <p className="text-xs">Application record not found.</p>
        <Link href="/app/applications" className="text-xs text-aperture-500 underline font-semibold mt-2 block">
          Back to Applications
        </Link>
      </div>
    );
  }

  const isRejected = app.status === "rejected";

  // Calculate missing skills & experience gaps for AI diagnostic
  const missingSkills = job.requiredSkills.filter(
    (skill) => !(profile?.skills || []).includes(skill)
  );
  const hasExpGap = job.minimumExperience && (profile?.experienceYears || 0) < job.minimumExperience;

  const getStageHeader = (stage: string) => {
    switch (stage) {
      case "applied": return "Application Received";
      case "screened": return "Parsed & Reviewed";
      case "shortlisted": return "Shortlisted for Interview";
      case "interviewing": return "Interview Scheduling Stage";
      case "offered": return "Offer Extended";
      case "rejected": return "Application Decision Completed";
      default: return stage;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "applied": return "text-aperture-500 bg-aperture-500/10 border-aperture-500/20";
      case "screened": return "text-warning bg-warning/10 border-warning/20";
      case "shortlisted": return "text-success bg-success/10 border-success/20";
      case "interviewing": return "text-signal-500 bg-signal-500/10 border-signal-500/20";
      case "offered": return "text-success bg-success/10 border-success/20";
      case "rejected": return "text-text-secondary bg-ink-border/50 border-ink-border";
      default: return "text-text-secondary bg-ink-border/20 border-ink-border";
    }
  };

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/app/applications"
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Application Tracker
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-ink-surface border border-ink-border rounded p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-block px-2.5 py-0.5 bg-aperture-500/10 text-aperture-500 rounded text-[11px] font-semibold uppercase tracking-wider font-mono">
            Requisition ID: {job.id}
          </span>
          <span className={cn(
            "px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider",
            getStageColor(app.status)
          )}>
            Status: {app.status}
          </span>
        </div>
        <h2 className="font-display font-semibold text-xl text-text-primary tracking-tight">
          {job.title}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary pt-1">
          <span>{job.department}</span>
          <span>&bull;</span>
          <span>{job.location}</span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Applied: {new Date(app.appliedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* AI REJECTION DIAGNOSTIC & GROWTH FEEDBACK CARD */}
      {isRejected && (
        <SpotlightCard className="p-6 bg-ink-surface border border-warning/30 rounded-lg space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center text-warning shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning/10 text-warning text-[11px] font-semibold uppercase tracking-wider mb-1">
                AI Transparent Feedback & Gap Analysis
              </div>
              <h3 className="font-display font-bold text-base text-text-primary">
                Why This Application Was Not Selected
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                CareerSync AI analyzed your resume against the recruiter&apos;s hard requirements. Here is the objective breakdown of why other candidates ranked higher for this specific requisition:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Missing Required Skills */}
            <div className="p-3.5 bg-ink-base border border-ink-border rounded space-y-2">
              <h4 className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                Unmet Core Requirements ({missingSkills.length})
              </h4>
              {missingSkills.length > 0 ? (
                <div className="space-y-1.5">
                  {missingSkills.map((skill, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-ink-border/50 last:border-0">
                      <span className="text-text-primary font-medium">{skill}</span>
                      <span className="text-[10px] text-danger bg-danger/10 px-1.5 py-0.5 rounded font-semibold uppercase">
                        Not In Profile
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-success">All required skills were detected in profile.</p>
              )}
            </div>

            {/* Experience & Seniority Gap */}
            <div className="p-3.5 bg-ink-base border border-ink-border rounded space-y-2">
              <h4 className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-signal-500" />
                Experience Threshold
              </h4>
              <div className="text-xs text-text-secondary space-y-1">
                <div className="flex justify-between py-1 border-b border-ink-border/50">
                  <span>Role Minimum Required:</span>
                  <span className="font-semibold text-text-primary">{job.minimumExperience} Years</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/50">
                  <span>Your Current Experience:</span>
                  <span className="font-semibold text-text-primary">{profile?.experienceYears || 0} Years</span>
                </div>
                {hasExpGap && (
                  <p className="text-[11px] text-warning pt-1">
                    Recruiter prioritized candidates with more tenure in production environments.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actionable Next Steps */}
          <div className="p-4 bg-signal-500/5 border border-signal-500/20 rounded space-y-3">
            <h4 className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-signal-500" />
              Actionable Growth Roadmap for Next Opportunity
            </h4>
            <ul className="text-xs text-text-secondary space-y-2 list-disc list-inside leading-relaxed">
              {missingSkills.slice(0, 2).map((skill, idx) => (
                <li key={idx}>
                  <strong className="text-text-primary">Develop {skill}:</strong> Build a portfolio project demonstrating practical use of {skill} and add verifiable links to your resume.
                </li>
              ))}
              <li>
                <strong className="text-text-primary">Target Closely Aligned Roles:</strong> Explore roles where your existing skills in {profile?.skills.slice(0, 3).join(", ")} form the primary core requirement.
              </li>
            </ul>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/app/skill-gap"
                className="px-3 py-1.5 bg-signal-500 hover:bg-signal-600 text-white font-semibold text-xs rounded transition flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5" />
                Open Skill Gap Simulator
              </Link>
              <Link
                href="/app/jobs"
                className="px-3 py-1.5 bg-ink-border hover:bg-ink-border/80 text-text-primary font-semibold text-xs rounded transition flex items-center gap-1.5"
              >
                Browse Matching Openings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </SpotlightCard>
      )}

      {/* Timeline list */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider text-[11px]">
          Application Milestone Timeline
        </h3>

        <div className="relative border-l border-ink-border ml-3 pl-6 space-y-6">
          {app.timeline.map((event, idx) => (
            <div key={idx} className="relative">
              {/* Node indicator dot */}
              <span className={cn(
                "absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 border-ink-surface shrink-0",
                event.stage === "rejected" ? "bg-text-tertiary" : 
                event.stage === "offered" || event.stage === "shortlisted" ? "bg-success animate-pulse" : "bg-aperture-500"
              )} />

              <div className="bg-ink-surface border border-ink-border rounded p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-xs text-text-primary">
                    {getStageHeader(event.stage)}
                  </h4>
                  <span className={cn(
                    "px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider",
                    getStageColor(event.stage)
                  )}>
                    {event.stage === "screened" ? "reviewed" : event.stage}
                  </span>
                </div>

                {/* Event timestamp */}
                <p className="text-[11px] text-text-tertiary flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(event.timestamp).toLocaleString()}
                </p>

                {event.note && (
                  <p className="text-xs text-text-secondary pt-1 border-t border-ink-border/50 flex items-start gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-text-tertiary mt-0.5 shrink-0" />
                    <span>{event.note}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
