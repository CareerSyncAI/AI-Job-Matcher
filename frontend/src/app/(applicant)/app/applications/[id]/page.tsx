"use client";

import React, { use } from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appId } = use(params);
  const { applications, isLoading: applicantLoading } = useApplicantContext();
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

  const getStageHeader = (stage: string) => {
    switch (stage) {
      case "applied": return "Application Received";
      case "screened": return "Parsed & Reviewed";
      case "shortlisted": return "Shortlisted for Interview";
      case "interviewing": return "Interview Scheduling Stage";
      case "offered": return "Offer Extended";
      case "rejected": return "Application Closed";
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
      case "rejected": return "text-text-tertiary bg-ink-border/50 border-ink-border/30";
      default: return "text-text-secondary bg-ink-border/20 border-ink-border";
    }
  };

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto">
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
        <span className="inline-block px-2.5 py-0.5 bg-aperture-500/10 text-aperture-500 rounded text-[11px] font-semibold uppercase tracking-wider font-mono">
          Requisition ID: {job.id}
        </span>
        <h2 className="font-display font-semibold text-lg text-text-primary tracking-tight">
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

      {/* Timeline list */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider text-[11px]">
          Milestone Timeline
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
