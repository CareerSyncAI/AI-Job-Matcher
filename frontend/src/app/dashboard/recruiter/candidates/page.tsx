"use client";

import React, { useState } from "react";
import { useTheme } from "@/lib/theme";
import {
  IconUsers,
  IconSearch,
  IconMapPin,
  IconX,
} from "@/components/Icons";

interface CandidateProfileSummary {
  id: string;
  name: string;
  headline: string;
  location: string;
  experience_years: number;
  skills: string[];
  bio: string;
  affinity_score: number;
  status: "Available" | "Interviewing" | "Placed";
}

const mockCandidates: CandidateProfileSummary[] = [
  {
    id: "cand-1",
    name: "Alice Vance",
    headline: "Senior Full-Stack & Systems Engineer",
    location: "San Francisco, CA (Open to Remote)",
    experience_years: 6,
    skills: ["Python", "FastAPI", "React", "Next.js", "Docker", "PostgreSQL", "Tailwind CSS"],
    bio: "Ex-fintech engineer focused on high-throughput microservices, vector search indexing, and resilient web architectures.",
    affinity_score: 97,
    status: "Available",
  },
  {
    id: "cand-2",
    name: "Marcus Sterling",
    headline: "Staff Machine Learning & NLP Specialist",
    location: "Seattle, WA / Remote",
    experience_years: 8,
    skills: ["Python", "PyTorch", "Transformers", "Kubernetes", "Vector Databases", "MLOps"],
    bio: "Specializing in dense retrieval pipelines, fine-tuned embedding models, and large-scale semantic ranking systems.",
    affinity_score: 94,
    status: "Available",
  },
  {
    id: "cand-3",
    name: "Elena Rostova",
    headline: "Lead Frontend Engineer & Design Technologist",
    location: "Austin, TX (Remote)",
    experience_years: 5,
    skills: ["TypeScript", "React", "Next.js", "Tailwind CSS", "UI/UX Architecture", "GraphQL"],
    bio: "Obsessed with buttery-smooth user interfaces, design systems, and web performance optimization.",
    affinity_score: 91,
    status: "Interviewing",
  },
  {
    id: "cand-4",
    name: "Devon Clark",
    headline: "Cloud & DevOps Infrastructure Lead",
    location: "Boston, MA / Hybrid",
    experience_years: 7,
    skills: ["AWS", "Terraform", "Kubernetes", "CI/CD", "Docker", "Go", "Prometheus"],
    bio: "Automating cloud infrastructure, zero-downtime deployments, and enterprise security compliance.",
    affinity_score: 88,
    status: "Available",
  },
];

export default function RecruiterCandidatesPage() {
  const { isDark } = useTheme();

  const [candidates] = useState<CandidateProfileSummary[]>(mockCandidates);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("All");
  const [shortlisted, setShortlisted] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfileSummary | null>(null);

  const allSkills = ["All", "Python", "React", "TypeScript", "Next.js", "Docker", "Kubernetes", "PyTorch"];

  const filteredCandidates = candidates.filter((c) => {
    if (selectedSkill !== "All" && !c.skills.includes(selectedSkill)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchHead = c.headline.toLowerCase().includes(q);
      const matchSkill = c.skills.some((s) => s.toLowerCase().includes(q));
      return matchName || matchHead || matchSkill;
    }
    return true;
  });

  const toggleShortlist = (id: string) => {
    if (shortlisted.includes(id)) {
      setShortlisted(shortlisted.filter((x) => x !== id));
    } else {
      setShortlisted([...shortlisted, id]);
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
                <IconUsers size={20} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Talent Discovery &amp; Sourcing</h1>
            </div>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Explore verified candidate profiles scored by deterministic skill affinity against your open requisitions.
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
              isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            Shortlisted Candidates: <strong className="text-emerald-500 font-mono">{shortlisted.length}</strong>
          </div>
        </div>
      </div>

      {/* Search and Skill Filters */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, professional headline, or specific skill..."
            className={`w-full text-xs rounded-xl px-4 py-3 pl-10 border focus:outline-none focus:border-emerald-500 transition ${
              isDark
                ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <IconSearch size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          <span className={`text-xs font-medium shrink-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Filter Skill:
          </span>
          {allSkills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => setSelectedSkill(skill)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                selectedSkill === skill
                  ? "bg-[#059669] text-white"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCandidates.map((candidate) => {
          const isShortlisted = shortlisted.includes(candidate.id);
          return (
            <div
              key={candidate.id}
              className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                isDark
                  ? "bg-slate-900 border-slate-800 hover:border-emerald-500/30 text-slate-100"
                  : "bg-white border-slate-200 hover:border-emerald-500/40 text-slate-900 shadow-xs"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base leading-snug">{candidate.name}</h3>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {candidate.headline}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Match Vector</span>
                    <span className="text-base font-bold font-mono text-emerald-500">{candidate.affinity_score}%</span>
                  </div>
                </div>

                <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  <span className="flex items-center gap-1">
                    <IconMapPin size={13} />
                    {candidate.location}
                  </span>
                  <span>{candidate.experience_years} Years Experience</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold border border-emerald-500/20">
                    {candidate.status}
                  </span>
                </div>

                <p className={`text-xs line-clamp-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {candidate.bio}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {candidate.skills.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-300 text-[10px]"
                    >
                      {skill}
                    </span>
                  ))}
                  {candidate.skills.length > 5 && (
                    <span className="px-2 py-0.5 text-slate-400 text-[10px]">
                      +{candidate.skills.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  }`}
                >
                  View Full Profile
                </button>
                <button
                  type="button"
                  onClick={() => toggleShortlist(candidate.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isShortlisted
                      ? "bg-emerald-600 text-white"
                      : "bg-[#059669] hover:bg-[#047857] text-white shadow-sm"
                  }`}
                >
                  {isShortlisted ? "✓ Shortlisted" : "+ Shortlist"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`relative w-full max-w-lg rounded-2xl border p-6 sm:p-8 shadow-2xl space-y-5 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0d9488] text-white flex items-center justify-center font-bold text-xl">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold">{selectedCandidate.name}</h3>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {selectedCandidate.headline}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="font-semibold block mb-1">Candidate Overview</span>
                <p className={`leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {selectedCandidate.bio}
                </p>
              </div>

              <div>
                <span className="font-semibold block mb-2">Verified Skill Competencies</span>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-slate-400 block mb-0.5">Location</span>
                  <span className="font-medium">{selectedCandidate.location}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-slate-400 block mb-0.5">Experience</span>
                  <span className="font-medium">{selectedCandidate.experience_years} Years</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleShortlist(selectedCandidate.id);
                  setSelectedCandidate(null);
                }}
                className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl"
              >
                {shortlisted.includes(selectedCandidate.id) ? "Remove Shortlist" : "Add to Shortlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
