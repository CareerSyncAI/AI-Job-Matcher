"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { Briefcase, UserCheck, Clock, Plus, ArrowRight } from "lucide-react";

export default function RecruiterDashboard() {
  const { jobs, candidates, activities, addJob } = useRecruiter();
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  
  // Job Form State
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [minimumExperience, setMinimumExperience] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute metrics
  const totalJobs = jobs.length;
  // All candidates under "screened" are awaiting review
  const awaitingReviewCandidates = candidates.filter((c) => c.status === "screened");
  const awaitingReviewCount = awaitingReviewCandidates.length;

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    
    setIsSubmitting(true);
    try {
      await addJob({
        title,
        department,
        location,
        employmentType,
        description,
        requiredSkills: requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        preferredSkills: preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        minimumExperience: Number(minimumExperience),
        status: "open"
      });
      // Reset state
      setTitle("");
      setDepartment("");
      setLocation("");
      setDescription("");
      setRequiredSkills("");
      setPreferredSkills("");
      setMinimumExperience(3);
      setShowPostJobModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text-primary tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Recruiter overview of active requisitions, review activities, and candidate funnels.
          </p>
        </div>
        <button
          onClick={() => setShowPostJobModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-signal-500 hover:bg-signal-600 text-ink-base font-semibold text-xs rounded transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5px]" />
          Post a Job
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-4 glass-card flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-signal-500/10 text-signal-500 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Active Jobs
            </p>
            <p className="text-xl font-mono font-semibold text-text-primary mt-1">
              {totalJobs}
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 glass-card flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-warning/10 text-warning flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Awaiting Review
            </p>
            <p className="text-xl font-mono font-semibold text-text-primary mt-1">
              {awaitingReviewCount}
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 glass-card flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-success/10 text-success flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Total Applicants
            </p>
            <p className="text-xl font-mono font-semibold text-text-primary mt-1">
              {candidates.length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-ink-border pb-2">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Active Requisitions
            </h2>
            <span className="text-xs font-semibold text-text-tertiary">
              {jobs.length} listed
            </span>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-4 glass-card hover:border-signal-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-semibold text-sm text-text-primary hover:text-signal-500 transition-colors">
                    <Link href={`/recruiter/jobs/${job.id}`}>
                      {job.title}
                    </Link>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1">
                    <span>{job.department}</span>
                    <span className="text-text-tertiary">&bull;</span>
                    <span>{job.location}</span>
                    <span className="text-text-tertiary">&bull;</span>
                    <span className="capitalize">{job.employmentType}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 border-ink-border pt-3 sm:pt-0">
                  <div className="text-right">
                    <p className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider">
                      Applicants
                    </p>
                    <p className="text-sm font-mono font-semibold text-text-primary mt-0.5">
                      {job.applicantCount}
                    </p>
                  </div>
                  <Link
                    href={`/recruiter/jobs/${job.id}`}
                    className="p-1.5 rounded hover:bg-ink-border text-text-secondary hover:text-signal-500 transition-colors"
                    aria-label={`Open job workspace for ${job.title}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Activity & Attention Queue */}
        <div className="space-y-6">
          {/* Candidates Requiring Attention */}
          <div className="space-y-4">
            <div className="border-b border-ink-border pb-2">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Needs Attention
              </h2>
            </div>
            
            {awaitingReviewCandidates.length === 0 ? (
              <div className="p-4 glass-card text-center">
                <p className="text-xs text-text-secondary">No candidates awaiting review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {awaitingReviewCandidates.slice(0, 3).map((candidate) => {
                  const job = jobs.find((j) => j.id === candidate.jobId);
                  return (
                    <div
                      key={candidate.id}
                      className="p-3 glass-card flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {candidate.name}
                        </p>
                        <p className="text-[11px] text-text-secondary truncate mt-0.5">
                          {job ? job.title : "Unknown Job"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-text-tertiary font-semibold uppercase">
                            Score
                          </p>
                          <span className="font-mono text-xs font-semibold text-signal-500">
                            {candidate.matchScore}%
                          </span>
                        </div>
                        <Link
                          href={`/recruiter/jobs/${candidate.jobId}/candidates/${candidate.id}`}
                          className="px-2 py-1 bg-ink-border hover:bg-signal-500 hover:text-ink-base text-text-primary text-[11px] font-semibold rounded transition-colors"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Action Log */}
          <div className="space-y-4">
            <div className="border-b border-ink-border pb-2">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Recent Activities
              </h2>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div key={act.id} className="text-xs flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-signal-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary">{act.title}</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {act.jobTitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Post Job Form Modal */}
      {showPostJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-ink-surface border border-ink-border w-full max-w-lg rounded shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-ink-border flex justify-between items-center bg-ink-base">
              <h3 id="modal-title" className="font-display font-semibold text-sm text-text-primary uppercase tracking-wider">
                Post New Job Listing
              </h3>
              <button
                onClick={() => setShowPostJobModal(false)}
                className="text-text-secondary hover:text-text-primary font-medium text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <form onSubmit={handlePostJob} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block font-semibold text-text-secondary mb-1">
                    Job Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Staff Fullstack Developer"
                    className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs"
                  />
                </div>
                
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Infrastructure"
                    className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Austin, TX (Remote)"
                    className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Minimum Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minimumExperience}
                    onChange={(e) => setMinimumExperience(Number(e.target.value))}
                    className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">
                  Required Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="e.g. AWS, Kubernetes, Terraform"
                  className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">
                  Preferred Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={preferredSkills}
                  onChange={(e) => setPreferredSkills(e.target.value)}
                  placeholder="e.g. Python, Prometheus"
                  className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">
                  Job Description <span className="text-danger">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Define key tasks, system architecture details, and tech requirements..."
                  className="w-full p-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs font-sans"
                />
              </div>

              <div className="pt-2 border-t border-ink-border flex justify-end gap-3 bg-ink-base/20 -mx-5 -mb-5 p-4">
                <button
                  type="button"
                  onClick={() => setShowPostJobModal(false)}
                  className="px-3 py-1.5 bg-ink-border hover:bg-ink-border/80 text-text-primary font-semibold rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-signal-500 hover:bg-signal-600 text-ink-base font-bold rounded transition-colors cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Create Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
