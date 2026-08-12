"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRecruiter } from "@/lib/context/RecruiterContext";
import { SpotlightCard } from "@/components/motion/MotionPrimitives";

export default function NewJobPage() {
  const router = useRouter();
  const { addJob } = useRecruiter();

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [minimumExperience, setMinimumExperience] = useState(3);
  const [educationRequirement, setEducationRequirement] = useState("Bachelor's degree");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("React, TypeScript, Tailwind CSS");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const requiredSkills = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
      const newJob = await addJob({
        title,
        department,
        location,
        employmentType,
        minimumExperience,
        educationRequirement,
        description,
        requiredSkills,
        preferredSkills: [],
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
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post New Job Requirement</h1>
        <p className="text-sm text-gray-400">Define role criteria, required skills, and experience thresholds.</p>
      </div>

      <SpotlightCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Full Stack Engineer"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA (Hybrid)"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30 text-white"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Min Experience (Years)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={minimumExperience}
                onChange={(e) => setMinimumExperience(Number(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Required Skills (Comma separated)</label>
            <input
              type="text"
              required
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, TypeScript, Next.js, Tailwind CSS"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Education Requirement</label>
            <input
              type="text"
              value={educationRequirement}
              onChange={(e) => setEducationRequirement(e.target.value)}
              placeholder="Bachelor's in Computer Science or equivalent"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Job Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide role description, responsibilities, and expected outcomes..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-white text-black font-semibold rounded text-sm hover:bg-gray-200 transition disabled:opacity-50"
            >
              {submitting ? "Publishing..." : "Publish Job Posting"}
            </button>
          </div>
        </form>
      </SpotlightCard>
    </div>
  );
}
