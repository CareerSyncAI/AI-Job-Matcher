"use client";

import React, { useState, useEffect } from "react";
import { useApplicant as useApplicantContext } from "@/lib/context/ApplicantContext";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { Search, Compass, MapPin, Clock, Award, ChevronRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Job } from "@/types";
import { cn } from "@/lib/utils";

export default function JobsPage() {
  const { profile, isLoading: applicantLoading } = useApplicantContext();
  const { jobs, isLoading: jobsLoading } = useRecruiter();

  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");
  const [jobMatches, setJobMatches] = useState<{ job: Job; score: number }[]>([]);

  // Compute matches
  useEffect(() => {
    if (profile && jobs.length > 0) {
      const calculated = jobs.map((job) => {
        // Match calculation based on profile skills + experience
        const matchedSkills = job.requiredSkills.filter((s) => profile.skills.includes(s));
        const skillScore = Math.min((matchedSkills.length / job.requiredSkills.length) * 100, 100);

        let experienceScore = 50;
        if (job.minimumExperience) {
          const ratio = profile.experienceYears / job.minimumExperience;
          experienceScore = Math.min(Math.round(ratio * 100), 100);
        }

        const overallScore = Math.round((skillScore * 0.6) + (experienceScore * 0.4));
        return { job, score: overallScore };
      });

      const timer = setTimeout(() => {
        setJobMatches(calculated);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [profile, jobs]);

  if (applicantLoading || jobsLoading || !profile) {
    return (
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-xs text-text-secondary animate-pulse">Loading Job Directory...</p>
      </div>
    );
  }

  // Departments list for filter
  const departments = Array.from(new Set(jobs.map((j) => j.department).filter(Boolean)));

  // Filter listings
  const filteredMatches = jobMatches.filter(({ job, score }) => {
    // Search keyword
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Department filter
    const matchesDept = deptFilter === "all" ? true : job.department === deptFilter;

    // Match score category filter
    let matchesScore = true;
    if (matchFilter === "high") matchesScore = score >= 80;
    else if (matchFilter === "medium") matchesScore = score >= 50 && score < 80;
    else if (matchFilter === "low") matchesScore = score < 50;

    return matchesSearch && matchesDept && matchesScore;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success border-success/30 bg-success/5";
    if (score >= 50) return "text-aperture-500 border-aperture-500/30 bg-aperture-500/5";
    return "text-text-secondary border-ink-border bg-ink-border/20";
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-ink-border pb-4">
        <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
          Explore Job Openings
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Search open positions and review match scores generated from your profile credentials.
        </p>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-ink-surface p-4 border border-ink-border rounded">
        {/* Keyword Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords or titles..."
            className="w-full pl-9 pr-4 py-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs focus:outline-none focus:border-aperture-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-text-tertiary" />
          
          {/* Department */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="p-2 bg-ink-base border border-ink-border rounded text-text-secondary text-xs focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Match rating filter */}
          <select
            value={matchFilter}
            onChange={(e) => setMatchFilter(e.target.value)}
            className="p-2 bg-ink-base border border-ink-border rounded text-text-secondary text-xs focus:outline-none"
          >
            <option value="all">All Match Levels</option>
            <option value="high">High Match (&ge;80%)</option>
            <option value="medium">Medium Match (50-79%)</option>
            <option value="low">Low Match (&lt;50%)</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="p-12 bg-ink-surface border border-ink-border rounded text-center text-text-secondary">
            <Compass className="w-8 h-8 text-text-tertiary mx-auto mb-2 animate-spin duration-3000" />
            <p className="text-xs font-semibold text-text-primary">No job matches found</p>
            <p className="text-[11px] text-text-tertiary mt-1">Try adjusting your filters or adding skills to your profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map(({ job, score }) => {
              const matchedSkills = job.requiredSkills.filter(s => profile.skills.includes(s));
              return (
                <div
                  key={job.id}
                  className="bg-ink-surface border border-ink-border hover:border-aperture-500/30 rounded p-5 flex flex-col justify-between h-[200px] transition-all relative overflow-hidden group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-text-primary truncate group-hover:text-aperture-500 transition-colors">
                          <Link href={`/app/jobs/${job.id}`}>
                            {job.title}
                          </Link>
                        </h3>
                        <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider mt-0.5">
                          {job.department}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded font-mono font-semibold border text-xs shrink-0",
                          getScoreColor(score)
                        )}
                        title="NLP Compatibility Rating"
                      >
                        {score}% match
                      </span>
                    </div>

                    {/* Meta info tags */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary">
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

                  {/* Skills summary & link */}
                  <div className="flex items-center justify-between border-t border-ink-border/50 pt-3 mt-3">
                    <div className="text-[11px] text-text-secondary">
                      <span className="font-semibold text-text-primary">
                        {matchedSkills.length} of {job.requiredSkills.length}
                      </span>{" "}
                      skills matched
                    </div>
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="text-xs text-aperture-500 hover:text-aperture-600 font-semibold flex items-center gap-0.5"
                    >
                      View Job Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
