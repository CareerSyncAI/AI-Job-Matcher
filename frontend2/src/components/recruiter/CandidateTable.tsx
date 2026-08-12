"use client";

import React, { useState } from "react";
import { Candidate } from "@/types";
import { Search, EyeOff, Eye, ArrowUpDown, ChevronDown, CheckSquare, Square, Trash, Check, UserCheck, UserX, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

interface CandidateTableProps {
  candidates: Candidate[];
  jobId: string;
  onStatusUpdate: (candidateId: string, status: Candidate["status"]) => void;
}

export const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  jobId,
  onStatusUpdate
}) => {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "experience">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isBlindScreening, setIsBlindScreening] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Anonymizing mappings
  const getAnonymizedName = (idx: number) => `Candidate #${String.fromCharCode(65 + (idx % 26))}`;
  const getAnonymizedLocation = () => "Location Masked";

  // Handle Multi-Select Comparison
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCompare = () => {
    if (selectedIds.length < 2 || selectedIds.length > 4) return;
    router.push(`/recruiter/compare?candidates=${selectedIds.join(",")}`);
  };

  // Sorting and filtering
  const filteredCandidates = candidates
    .filter((c) => {
      // Search filter
      const matchesSearch = isBlindScreening 
        ? true 
        : c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.currentRole && c.currentRole.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "score") {
        comparison = a.matchScore - b.matchScore;
      } else {
        comparison = a.experienceYears - b.experienceYears;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

  const toggleSort = (field: "score" | "experience") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success border-success/30 bg-success/5";
    if (score >= 50) return "text-signal-500 border-signal-500/30 bg-signal-500/5";
    return "text-text-secondary border-ink-border bg-ink-border/20";
  };

  return (
    <div className="space-y-4">
      {/* Table Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-ink-surface p-4 border border-ink-border rounded">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            disabled={isBlindScreening}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isBlindScreening ? "Search disabled in Blind Mode" : "Search candidate names or roles..."}
            className="w-full pl-9 pr-4 py-2 bg-ink-base border border-ink-border rounded text-text-primary text-xs focus:outline-none focus:border-signal-500 disabled:opacity-50"
          />
        </div>

        {/* Action Buttons & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-ink-base border border-ink-border rounded text-text-secondary text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="screened">Awaiting Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interviewing">Interviewing</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Density Toggle */}
          <button
            onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
            className="p-2 bg-ink-base border border-ink-border hover:border-ink-border/80 text-text-secondary text-xs rounded transition-colors cursor-pointer"
          >
            {density === "comfortable" ? "Compact Table" : "Comfortable Table"}
          </button>

          {/* Blind Screening Toggle */}
          <button
            onClick={() => setIsBlindScreening(!isBlindScreening)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded text-xs font-semibold transition-colors cursor-pointer ${
              isBlindScreening
                ? "bg-signal-500/10 border-signal-500 text-signal-500"
                : "bg-ink-base border-ink-border text-text-secondary hover:border-ink-border/80"
            }`}
          >
            {isBlindScreening ? (
              <>
                <Eye className="w-4 h-4" />
                Blind Screening On
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                Blind Screening Off
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compare Floating Alert/Tray */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-signal-500/10 border border-signal-500/30 px-4 py-3 rounded animate-fade-in">
          <p className="text-xs font-semibold text-text-primary">
            {selectedIds.length} candidate{selectedIds.length > 1 ? "s" : ""} selected for evaluation.
            <span className="text-[10px] text-text-secondary font-normal block sm:inline sm:ml-2">
              (Choose between 2 to 4 candidates to enable side-by-side trade-offs)
            </span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Clear selection
            </button>
            <button
              disabled={selectedIds.length < 2 || selectedIds.length > 4}
              onClick={handleCompare}
              className="px-3 py-1 bg-signal-500 disabled:bg-signal-500/30 hover:bg-signal-600 text-ink-base font-bold text-[11px] rounded transition-colors disabled:cursor-not-allowed cursor-pointer"
            >
              Compare Side-by-Side
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="border border-ink-border rounded bg-ink-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="border-b border-ink-border bg-ink-base select-none">
                <th className="p-3 w-10 text-center">Compare</th>
                <th className="p-3 w-12 text-center">Rank</th>
                <th className="p-3">Candidate / Current Role</th>
                <th className="p-3 w-28 text-center cursor-pointer hover:bg-ink-border" onClick={() => toggleSort("score")}>
                  <div className="flex items-center justify-center gap-1">
                    Match Score
                    <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary" />
                  </div>
                </th>
                <th className="p-3">Matched Strengths</th>
                <th className="p-3">Gaps & Concerns</th>
                <th className="p-3 w-28 text-center cursor-pointer hover:bg-ink-border" onClick={() => toggleSort("experience")}>
                  <div className="flex items-center justify-center gap-1">
                    Experience
                    <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary" />
                  </div>
                </th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-text-secondary">
                    No candidates matching these filters found.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate, index) => {
                  const isSelected = selectedIds.includes(candidate.id);
                  // Calculate mock rank (1-indexed based on filteredCandidates)
                  const candidateIndexInFullList = candidates
                    .slice()
                    .sort((a, b) => b.matchScore - a.matchScore)
                    .findIndex((c) => c.id === candidate.id);
                  const rank = candidateIndexInFullList + 1;

                  // Rendered name and locations based on Blind screening state
                  const displayName = isBlindScreening 
                    ? getAnonymizedName(candidateIndexInFullList) 
                    : candidate.name;
                  const displayLocation = isBlindScreening
                    ? getAnonymizedLocation()
                    : candidate.location || "N/A";
                  const displayRole = isBlindScreening 
                    ? "Software Professional" 
                    : candidate.currentRole || "N/A";

                  // Extract strengths/gaps
                  const matchedList = candidate.evidence.filter((e) => e.type === "matched").map((e) => e.requirement.replace(" requirement", ""));
                  const gapsList = candidate.evidence.filter((e) => e.type === "gap").map((e) => e.requirement.replace(" requirement", ""));
                  const notDetectedList = candidate.evidence.filter((e) => e.type === "not_detected").map((e) => e.requirement.replace(" requirement", ""));

                  return (
                    <motion.tr
                      key={candidate.id}
                      layout={!shouldReduceMotion}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className={cn(
                        "border-b border-ink-border hover:bg-ink-border/20 transition-all",
                        isSelected ? "bg-signal-500/5" : "",
                        density === "compact" ? "h-10" : "h-16"
                      )}
                    >
                      {/* Compare Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSelect(candidate.id)}
                          className="text-text-secondary hover:text-signal-500 transition-colors p-1 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-signal-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Rank */}
                      <td className="p-3 font-mono font-semibold text-center text-text-secondary">
                        #{rank}
                      </td>

                      {/* Name / Role */}
                      <td className="p-3">
                        <div>
                          <Link
                            href={`/recruiter/jobs/${jobId}/candidates/${candidate.id}`}
                            className="font-semibold text-text-primary hover:text-signal-500 transition-colors"
                          >
                            {displayName}
                          </Link>
                          {density === "comfortable" && (
                            <div className="text-[10px] text-text-secondary mt-0.5">
                              {displayRole} &bull; {displayLocation}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Match Score */}
                      <td className="p-3 text-center">
                        <div
                          className={cn(
                            "inline-block px-2 py-0.5 rounded font-mono font-semibold border text-xs",
                            getScoreColor(candidate.matchScore)
                          )}
                        >
                          {candidate.matchScore}%
                        </div>
                      </td>

                      {/* Matched Strengths */}
                      <td className="p-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {matchedList.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-success/10 text-success rounded text-[9px] font-medium uppercase tracking-wider"
                            >
                              {s}
                            </span>
                          ))}
                          {matchedList.length > 3 && (
                            <span className="text-[9px] text-text-tertiary">
                              +{matchedList.length - 3} more
                            </span>
                          )}
                          {matchedList.length === 0 && (
                            <span className="text-text-tertiary">None detected</span>
                          )}
                        </div>
                      </td>

                      {/* Gaps / Not Detected */}
                      <td className="p-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {/* Real hard gaps */}
                          {gapsList.map((g, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-danger/10 text-danger rounded text-[9px] font-medium uppercase tracking-wider"
                              title="Direct constraint mismatch"
                            >
                              {g} (Gap)
                            </span>
                          ))}
                          {/* Not detected claims (Not necessarily a gap!) */}
                          {notDetectedList.slice(0, 2).map((nd, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-ink-border text-text-secondary border border-ink-border rounded text-[9px] font-medium uppercase tracking-wider"
                              title="No direct mention found"
                            >
                              {nd}
                            </span>
                          ))}
                          {(gapsList.length === 0 && notDetectedList.length === 0) && (
                            <span className="text-success text-[10px]">No gaps</span>
                          )}
                        </div>
                      </td>

                      {/* Experience */}
                      <td className="p-3 text-center font-mono font-semibold text-text-secondary">
                        {candidate.experienceYears} yrs
                      </td>

                      {/* Status Badge */}
                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize",
                            candidate.status === "shortlisted" && "bg-success/10 text-success",
                            candidate.status === "interviewing" && "bg-signal-500/10 text-signal-500",
                            candidate.status === "rejected" && "bg-ink-border text-text-secondary", // rejected is grey, never harsh red!
                            candidate.status === "screened" && "bg-warning/10 text-warning"
                          )}
                        >
                          {candidate.status === "screened" ? "Review" : candidate.status}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {candidate.status !== "shortlisted" && (
                            <button
                              onClick={() => onStatusUpdate(candidate.id, "shortlisted")}
                              className="p-1 text-text-secondary hover:text-success transition-colors cursor-pointer"
                              title="Shortlist Candidate"
                            >
                              <Check className="w-4.5 h-4.5" />
                            </button>
                          )}
                          {candidate.status !== "rejected" && (
                            <button
                              onClick={() => onStatusUpdate(candidate.id, "rejected")}
                              className="p-1 text-text-secondary hover:text-danger/80 transition-colors cursor-pointer"
                              title="Reject Candidate"
                            >
                              <UserX className="w-4.5 h-4.5" />
                            </button>
                          )}
                          <Link
                            href={`/recruiter/jobs/${jobId}/candidates/${candidate.id}`}
                            className="p-1 text-text-secondary hover:text-signal-500 transition-colors"
                            title="Inspect Candidate Evidence"
                          >
                            <ArrowRight className="w-4.5 h-4.5" />
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
