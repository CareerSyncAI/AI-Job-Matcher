"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { SpotlightCard } from "@/components/motion/MotionPrimitives";
import { Briefcase, CheckCircle2, Star, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewJobPage() {
  const router = useRouter();
  const { addJob } = useRecruiter();

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [minimumExperience, setMinimumExperience] = useState(3);
  const [educationRequirement, setEducationRequirement] = useState("Bachelor's in Computer Science or equivalent");
  const [description, setDescription] = useState("");
  const [requiredSkillsInput, setRequiredSkillsInput] = useState("React, TypeScript, Next.js");
  const [preferredSkillsInput, setPreferredSkillsInput] = useState("Tailwind CSS, Zustand, GraphQL");
  const [submitting, setSubmitting] = useState(false);

  const parsedRequiredSkills = requiredSkillsInput.split(",").map((s) => s.trim()).filter(Boolean);
  const parsedPreferredSkills = preferredSkillsInput.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newJob = await addJob({
        title,
        department: department || "Engineering",
        location: location || "Remote",
        employmentType,
        minimumExperience,
        educationRequirement,
        description,
        requiredSkills: parsedRequiredSkills,
        preferredSkills: parsedPreferredSkills,
        status: "open",
      });
      router.push(`/recruiter/jobs/${newJob.id}`);
    } catch (err) {
      console.error("Failed to create job", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back link & Title */}
      <div className="space-y-2">
        <Link
          href="/recruiter"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Recruiter Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-signal-500" />
              Post New Job Requisition
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Define required skills, experience thresholds, and criteria for deterministic AI candidate ranking.
            </p>
          </div>
        </div>
      </div>

      <SpotlightCard className="p-6 bg-ink-surface border border-ink-border rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Job Title <span className="text-signal-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Department / Team
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Product Engineering"
                className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote or San Francisco, CA"
                className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Min Experience (Years)
              </label>
              <input
                type="number"
                min={0}
                max={40}
                value={minimumExperience}
                onChange={(e) => setMinimumExperience(Number(e.target.value))}
                className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
              />
            </div>
          </div>

          {/* Required Skills Criteria */}
          <div className="space-y-2 pt-2 border-t border-ink-border/50">
            <label className="block text-xs font-semibold text-text-primary">
              Required Core Skills (Comma-separated) <span className="text-signal-500">*</span>
            </label>
            <input
              type="text"
              required
              value={requiredSkillsInput}
              onChange={(e) => setRequiredSkillsInput(e.target.value)}
              placeholder="e.g. Python, FastAPI, PyTorch, Docker"
              className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
            />
            {parsedRequiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedRequiredSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-signal-500/10 text-signal-500 border border-signal-500/20"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preferred Skills Criteria */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-primary">
              Preferred / Bonus Skills (Comma-separated)
            </label>
            <input
              type="text"
              value={preferredSkillsInput}
              onChange={(e) => setPreferredSkillsInput(e.target.value)}
              placeholder="e.g. AWS, Kubernetes, Redis, CI/CD"
              className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
            />
            {parsedPreferredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedPreferredSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-aperture-500/10 text-aperture-500 border border-aperture-500/20"
                  >
                    <Star className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">Education Requirement</label>
            <input
              type="text"
              value={educationRequirement}
              onChange={(e) => setEducationRequirement(e.target.value)}
              placeholder="e.g. Bachelor's in Computer Science, IT, or equivalent"
              className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Job Description & Responsibilities <span className="text-signal-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe key responsibilities, team structure, and expectations..."
              className="w-full px-3 py-2 bg-ink-base/80 border border-ink-border rounded text-sm text-text-primary focus:outline-none focus:border-signal-500 transition"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-ink-border hover:bg-ink-border/80 text-text-primary rounded text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-signal-500 hover:bg-signal-600 text-white font-semibold rounded text-xs transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Publishing Job..." : "Publish Job Posting"}
            </button>
          </div>
        </form>
      </SpotlightCard>
    </div>
  );
}
