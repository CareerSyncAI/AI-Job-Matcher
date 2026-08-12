"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Job, Candidate, Activity } from "@/types";
import { jobsAPI } from "@/lib/api/jobs";
import { resumesAPI } from "@/lib/api/resumes";
import { env } from "@/lib/config/env";
import { initialJobs, initialCandidates, initialActivities } from "@/lib/mocks/mockData";
import { useTheme, ThemeMode } from "@/lib/context/ThemeContext";

interface RecruiterContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  jobs: Job[];
  currentJob: Job | null;
  candidates: Candidate[];
  activities: Activity[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateCandidateStatus: (candidateId: string, status: Candidate["status"]) => Promise<void>;
  updateCandidateNotes: (candidateId: string, notes: string) => Promise<void>;
  addJob: (job: Omit<Job, "id" | "createdAt" | "applicantCount">) => Promise<Job>;
  uploadResume: (file: File, onProgress: (progress: number, stage: string) => void) => Promise<Candidate>;
}

const RecruiterContext = createContext<RecruiterContextType | undefined>(undefined);

export const RecruiterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, cycleTheme: toggleTheme } = useTheme();
  const [selectedJobId, setSelectedJobIdState] = useState<string>("job-1");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [currentJob, setCurrentJob] = useState<Job | null>(initialJobs[0] || null);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setSelectedJobId = (id: string) => {
    setSelectedJobIdState(id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("careersync_selected_job_id", id);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedJobId = sessionStorage.getItem("careersync_selected_job_id");
      if (savedJobId) {
        const timer = setTimeout(() => {
          setSelectedJobIdState(savedJobId);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!env.useMock) {
        const backendJobs = await jobsAPI.getJobs();
        if (backendJobs && backendJobs.length > 0) {
          const mappedJobs: Job[] = backendJobs.map((bj) => ({
            id: bj.id,
            title: bj.title,
            department: bj.department || "Engineering",
            location: bj.location || "Remote",
            employmentType: bj.employment_type,
            description: bj.description,
            requiredSkills: bj.skills.filter((s) => s.required).map((s) => s.name),
            preferredSkills: bj.skills.filter((s) => !s.required).map((s) => s.name),
            minimumExperience: bj.experience_min_years,
            educationRequirement: bj.education_required,
            applicantCount: 0,
            status: bj.status === "open" ? "open" : "closed",
            createdAt: bj.created_at,
          }));
          setJobs(mappedJobs);
          const activeJob = mappedJobs.find((j) => j.id === selectedJobId) || mappedJobs[0];
          setCurrentJob(activeJob);

          if (activeJob) {
            try {
              const liveCands = await jobsAPI.getCandidates(activeJob.id);
              setCandidates(liveCands);
            } catch {
              setCandidates(initialCandidates.filter((c) => c.jobId === activeJob.id));
            }
          }
          setIsLoading(false);
          return;
        }
      }

      setJobs(initialJobs);
      const job = initialJobs.find((j) => j.id === selectedJobId) || initialJobs[0] || null;
      setCurrentJob(job);
      if (job) {
        setCandidates(initialCandidates.filter((c) => c.jobId === job.id));
      }
      setActivities(initialActivities);
    } catch {
      setJobs(initialJobs);
      setCurrentJob(initialJobs[0] || null);
      setCandidates(initialCandidates);
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    refreshData();
  }, [selectedJobId, refreshData]);

  const updateCandidateStatus = async (candidateId: string, status: Candidate["status"]) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status } : c))
    );
  };

  const updateCandidateNotes = async (candidateId: string, notes: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, recruiterNotes: notes } : c))
    );
  };

  const addJob = async (jobData: Omit<Job, "id" | "createdAt" | "applicantCount">) => {
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
      createdAt: new Date().toISOString(),
      applicantCount: 0,
    };
    setJobs((prev) => [newJob, ...prev]);
    setSelectedJobId(newJob.id);
    return newJob;
  };

  const uploadResume = async (file: File, onProgress: (progress: number, stage: string) => void) => {
    if (!env.useMock && currentJob) {
      try {
        await resumesAPI.uploadResume(currentJob.id, file, onProgress);
      } catch {
        // Fallback to mock behavior if offline
      }
    }

    const mockCand: Candidate = {
      id: `cand-${Date.now()}`,
      jobId: selectedJobId,
      name: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      currentRole: "Software Engineer",
      location: "San Jose, CA",
      experienceYears: 5,
      education: "B.S. in Computer Science",
      skills: ["React", "TypeScript", "Tailwind CSS"],
      certifications: [],
      matchScore: 88,
      skillScore: 90,
      experienceScore: 85,
      educationScore: 90,
      semanticScore: 88,
      matchedSkills: ["React", "TypeScript"],
      transferableSkills: ["Tailwind CSS"],
      missingSkills: [],
      status: "screened",
      recruiterNotes: "Uploaded candidate resume.",
      evidence: [],
    };

    setCandidates((prev) => [...prev, mockCand]);
    return mockCand;
  };

  return (
    <RecruiterContext.Provider
      value={{
        theme,
        toggleTheme,
        selectedJobId,
        setSelectedJobId,
        jobs,
        currentJob,
        candidates,
        activities,
        isLoading,
        refreshData,
        updateCandidateStatus,
        updateCandidateNotes,
        addJob,
        uploadResume,
      }}
    >
      {children}
    </RecruiterContext.Provider>
  );
};

export const useRecruiter = () => {
  const context = useContext(RecruiterContext);
  if (context === undefined) {
    throw new Error("useRecruiter must be used within a RecruiterProvider");
  }
  return context;
};

