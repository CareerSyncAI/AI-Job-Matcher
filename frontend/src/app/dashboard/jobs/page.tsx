"use client";

import React, { useState } from "react";

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Semantic Job Search</h1>
          <p className="text-slate-400 text-xs mt-1">
            AI-powered vector matching based on your experience and skill embeddings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            ⚡ 1,420 Active Jobs Scanned
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg
            className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by role, skill (e.g. Next.js, Vector DB, LLM Fine-tuning)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full md:w-48 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 transition"
        >
          <option value="all">All Locations</option>
          <option value="remote">Remote Only</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>

        <button className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20 shrink-0">
          Match Jobs
        </button>
      </div>

      {/* Job List */}
      <div className="space-y-4">
        {jobsList.map((job) => (
          <div
            key={job.id}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-slate-100">{job.title}</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  {job.matchScore}% Match Score
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium text-blue-400 bg-blue-500/10 rounded-md">
                  {job.type}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  🏛️ {job.company}
                </span>
                <span>📍 {job.location}</span>
                <span>💰 {job.salary}</span>
                <span>🕒 Posted {job.posted}</span>
              </div>
              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                {job.description}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {job.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800/80 rounded-lg border border-slate-700/60"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center justify-center gap-2 shrink-0 border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
              <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-blue-600/20 text-center">
                Apply with AI Resume
              </button>
              <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition text-center">
                View Match Analysis
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const jobsList = [
  {
    id: "1",
    title: "Senior Full Stack AI Engineer",
    company: "Anthropic Partner AI Labs",
    location: "Remote",
    salary: "$140,000 - $180,000",
    matchScore: 96,
    type: "Full-Time",
    posted: "2 days ago",
    description: "Looking for an engineer to architect frontend web interfaces and build semantic matching pipelines with LangChain and vector databases.",
    skills: ["React", "Next.js", "FastAPI", "Pinecone", "TypeScript"],
  },
  {
    id: "2",
    title: "Lead Frontend Engineer (React/Next.js)",
    company: "Stitch Technologies",
    location: "San Francisco, CA (Hybrid)",
    salary: "$150,000 - $190,000",
    matchScore: 94,
    type: "Full-Time",
    posted: "1 day ago",
    description: "Lead the user interface revamp of our enterprise recruiting platform using cutting-edge glassmorphic design systems and Tailwind.",
    skills: ["Next.js", "TypeScript", "Tailwind CSS", "Design Systems"],
  },
  {
    id: "3",
    title: "AI/ML Solutions Architect",
    company: "Cognitive Enterprise",
    location: "Remote",
    salary: "$165,000 - $210,000",
    matchScore: 89,
    type: "Contract",
    posted: "3 days ago",
    description: "Design real-time resume parsing microservices and candidate embedding pipelines using PyTorch and SentenceTransformers.",
    skills: ["Python", "FastAPI", "Transformers", "PostgreSQL", "Docker"],
  },
];
