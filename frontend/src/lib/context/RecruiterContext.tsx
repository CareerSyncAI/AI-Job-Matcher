"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Job, Candidate, Activity } from "@/types";
import { recruiterService } from "@/lib/services/mock";

interface RecruiterContextType {
  theme: "dark" | "light";
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
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [selectedJobId, setSelectedJobIdState] = useState<string>("job-1");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize theme from local storage if available
  useEffect(() => {
    const savedTheme = localStorage.getItem("careersync_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("careersync_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      return newTheme;
    });
  }, []);

  const setSelectedJobId = useCallback((id: string) => {
    setSelectedJobIdState(id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("careersync_selected_job_id", id);
    }
  }, []);

  // Load saved selected job ID from session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedJobId = sessionStorage.getItem("careersync_selected_job_id");
      if (savedJobId) {
        setSelectedJobIdState(savedJobId);
      }
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allJobs = await recruiterService.getJobs();
      setJobs(allJobs);

      const job = allJobs.find((j) => j.id === selectedJobId) || allJobs[0] || null;
      setCurrentJob(job);

      if (job) {
        const matchingCandidates = await recruiterService.getCandidates(job.id);
        setCandidates(matchingCandidates);
      } else {
        setCandidates([]);
      }

      const allActivities = await recruiterService.getActivities();
      setActivities(allActivities);
    } catch (e) {
      console.error("Failed to load recruiter context data", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateCandidateStatus = useCallback(async (candidateId: string, status: Candidate["status"]) => {
    try {
      await recruiterService.updateCandidateStatus(candidateId, status);
      await refreshData();
    } catch (e) {
      console.error("Failed to update candidate status", e);
    }
  }, [refreshData]);

  const updateCandidateNotes = useCallback(async (candidateId: string, notes: string) => {
    try {
      await recruiterService.updateCandidateNotes(candidateId, notes);
      await refreshData();
    } catch (e) {
      console.error("Failed to update candidate notes", e);
    }
  }, [refreshData]);

  const addJob = useCallback(async (jobData: Omit<Job, "id" | "createdAt" | "applicantCount">) => {
    try {
      const newJob = await recruiterService.createJob(jobData);
      await refreshData();
      return newJob;
    } catch (e) {
      console.error("Failed to add job", e);
      throw e;
    }
  }, [refreshData]);

  const uploadResume = useCallback(async (file: File, onProgress: (progress: number, stage: string) => void) => {
    try {
      const newCandidate = await recruiterService.uploadResume(selectedJobId, file, onProgress);
      await refreshData();
      return newCandidate;
    } catch (e) {
      console.error("Failed to upload resume", e);
      throw e;
    }
  }, [selectedJobId, refreshData]);

  const value = useMemo<RecruiterContextType>(() => ({
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
    uploadResume
  }), [
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
    uploadResume
  ]);

  return (
    <RecruiterContext.Provider value={value}>
      {children}
    </RecruiterContext.Provider>
  );
};

export const useRecruiter = () => {
  const context = useContext(RecruiterContext);
  if (!context) {
    throw new Error("useRecruiter must be used within a RecruiterProvider");
  }
  return context;
};
