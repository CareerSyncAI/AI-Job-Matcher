"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import {
  IconBriefcase,
  IconBuilding,
  IconMapPin,
  IconX,
} from "@/components/Icons";

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  work_arrangement: string;
  experience_min_years: number;
  education_required: string;
  description: string;
  status: "draft" | "open" | "closed" | "archived";
  skills: Array<{ name: string; required: boolean }>;
  applicant_count: number;
  created_at: string;
}

export default function RecruiterJobsPage() {
  const { isDark } = useTheme();

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Job form fields
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [workArrangement, setWorkArrangement] = useState("Remote");
  const [experienceMinYears, setExperienceMinYears] = useState(3);
  const [educationRequired, setEducationRequired] = useState("Bachelor");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [skillsList, setSkillsList] = useState<string[]>(["Python", "TypeScript"]);

  useEffect(() => {
    let isMounted = true;
    const loadJobs = async () => {
      try {
        const res = await api.get("/jobs");
        if (isMounted) setJobs(Array.isArray(res.data) ? res.data : []);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn("Could not fetch recruiter jobs:", err);
        setJobs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadJobs();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const clean = skillsInput.trim();
    if (clean && !skillsList.includes(clean)) {
      setSkillsList([...skillsList, clean]);
      setSkillsInput("");
    }
  };

  const handleCreateJob = async (status: "open" | "draft" = "open") => {
    if (!title || !description) {
      setFormError("Title and Job Description are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      await api.post("/jobs", {
        title,
        department: department || undefined,
        location: location || undefined,
        employment_type: employmentType,
        work_arrangement: workArrangement,
        experience_min_years: Number(experienceMinYears),
        education_required: educationRequired,
        description,
        skills: skillsList.map((s) => ({ name: s, required: true })),
        status,
      });
      setModalOpen(false);
      // Reset form
      setTitle("");
      setDepartment("");
      setLocation("");
      setDescription("");
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError(status === "draft" ? "Failed to save draft." : "Failed to publish job opening.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: JobPosting["status"]) => {
    try {
      await api.patch(`/jobs/${jobId}`, { status: newStatus });
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));
    } catch (err) {
      console.error("Failed to update status:", err);
      setRefreshKey((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 text-slate-100 shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                <IconBriefcase size={20} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Job Requisitions Management</h1>
            </div>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Publish new roles, configure required skill vectors, and manage active candidate pipelines.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <span>+</span> Post New Job Requisition
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Active Openings</span>
          <p className={`text-2xl font-bold font-mono leading-none mt-2 ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
            {jobs.filter((j) => j.status?.toLowerCase() === "open").length}
          </p>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Total Requisitions</span>
          <p className={`text-2xl font-bold font-mono leading-none mt-2 ${isDark ? "text-slate-200" : "text-slate-900"}`}>{jobs.length}</p>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Total Applicants</span>
          <p className={`text-2xl font-bold font-mono leading-none mt-2 ${isDark ? "text-teal-400" : "text-teal-700"}`}>
            {jobs.reduce((acc, curr) => acc + (curr.applicant_count || 0), 0)}
          </p>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Draft / Closed</span>
          <p className={`text-2xl font-bold font-mono leading-none mt-2 ${isDark ? "text-amber-400" : "text-amber-700"}`}>
            {jobs.filter((j) => j.status?.toLowerCase() !== "open").length}
          </p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {loading && jobs.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-600"
            } animate-pulse`}
          >
            Loading job requisitions...
          </div>
        ) : jobs.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <IconBriefcase size={32} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold">No job requisitions created yet</h3>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Create your first job posting to start receiving ranked candidate applications.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 px-4 py-2 bg-[#059669] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Post Job Opening
            </button>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className={`p-6 rounded-2xl border transition-all ${
                isDark
                  ? "bg-slate-900 border-slate-800 hover:border-emerald-500/30 text-slate-100 shadow-xs"
                  : "bg-white border-slate-200 hover:border-emerald-500/40 text-slate-900 shadow-xs"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/dashboard/recruiter/pipeline"
                      className="font-semibold text-lg hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      {job.title}
                    </Link>
                    <select
                      value={job.status?.toLowerCase() || "open"}
                      onChange={(e) => handleStatusChange(job.id, e.target.value as JobPosting["status"])}
                      aria-label={`Status for ${job.title}`}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        job.status?.toLowerCase() === "open"
                          ? isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : job.status?.toLowerCase() === "draft"
                          ? isDark
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                          : isDark
                          ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <option value="open">Open (Active)</option>
                      <option value="draft">Draft</option>
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className={`flex flex-wrap items-center gap-4 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    <span className="flex items-center gap-1 font-medium">
                      <IconBuilding size={14} className={isDark ? "text-emerald-400" : "text-emerald-700"} />
                      {job.department || "Engineering"}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconMapPin size={14} />
                      {job.location || "Remote"}
                    </span>
                    <span>{job.work_arrangement} • {job.employment_type}</span>
                    <span>Min {job.experience_min_years} Years Exp</span>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                            isDark
                              ? "bg-slate-800 border-slate-700/60 text-slate-300"
                              : "bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className={`text-xs font-medium block ${isDark ? "text-slate-400" : "text-slate-600"}`}>Applicants</span>
                    <span className={`text-2xl font-bold font-mono leading-none ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                      {job.applicant_count || 0}
                    </span>
                  </div>

                  <Link
                    href="/dashboard/recruiter/pipeline"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#059669] hover:bg-[#047857] text-white shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    View Pipeline →
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Job Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold">Create Job Requisition</h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Define role requirements and skill vectors for candidate scoring.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <IconX size={20} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateJob("open");
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="job-title" className="block text-xs font-medium">Job Title *</label>
                <input
                  id="job-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  required
                  className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="job-department" className="block text-xs font-medium">Department</label>
                  <input
                    id="job-department"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Platform Infrastructure"
                    className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="job-location" className="block text-xs font-medium">Location</label>
                  <input
                    id="job-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA / Remote"
                    className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="job-work-arrangement" className="block text-xs font-medium">Work Arrangement</label>
                  <select
                    id="job-work-arrangement"
                    value={workArrangement}
                    onChange={(e) => setWorkArrangement(e.target.value)}
                    className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">On-site</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="job-employment-type" className="block text-xs font-medium">Employment Type</label>
                  <select
                    id="job-employment-type"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="job-exp-min" className="block text-xs font-medium">Min Experience (Years)</label>
                  <input
                    id="job-exp-min"
                    type="number"
                    min={0}
                    value={experienceMinYears}
                    onChange={(e) => setExperienceMinYears(Number(e.target.value))}
                    className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="job-education-level" className="block text-xs font-medium">Education Level</label>
                  <select
                    id="job-education-level"
                    value={educationRequired}
                    onChange={(e) => setEducationRequired(e.target.value)}
                    className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="Bachelor">Bachelor&apos;s Degree</option>
                    <option value="Master">Master&apos;s Degree</option>
                    <option value="Doctorate">Doctorate / PhD</option>
                    <option value="Associate">Associate Degree / Diploma</option>
                    <option value="Any">Any Level</option>
                  </select>
                </div>
              </div>

              {/* Required Skills Matrix */}
              <div className="space-y-2">
                <label htmlFor="job-skills-input" className="block text-xs font-medium">Required Skill Competencies</label>
                <div className="flex gap-2">
                  <input
                    id="job-skills-input"
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Type skill (e.g. Python) and press Enter"
                    className={`flex-1 text-xs rounded-xl p-2.5 border focus:outline-none focus:border-emerald-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {skillsList.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => setSkillsList(skillsList.filter((s) => s !== skill))}
                        className="hover:text-rose-400 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="job-desc-textarea" className="block text-xs font-medium">Job Description &amp; Responsibilities *</label>
                <textarea
                  id="job-desc-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder="Outline key requirements, technical stack, and responsibilities..."
                  className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:border-emerald-500 resize-none ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCreateJob("draft")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800"
                      : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {submitting ? "Publishing..." : "Publish Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
