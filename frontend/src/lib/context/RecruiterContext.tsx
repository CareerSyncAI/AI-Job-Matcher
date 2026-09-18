"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Job, Candidate, Activity } from "@/types";
import { recruiterService as mockRecruiterService } from "@/lib/services/mock";
import { LiveRecruiterService } from "@/lib/services/api";
import { shouldFallbackToMock } from "@/lib/utils/fallback";

const liveRecruiterService = new LiveRecruiterService();

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
      let allJobs: Job[] = [];
      try {
        allJobs = await liveRecruiterService.getJobs();
      } catch (e) {
        if (shouldFallbackToMock(e)) {
          allJobs = await mockRecruiterService.getJobs();
        } else {
          throw e;
        }
      }
      setJobs(allJobs);

      const job = allJobs.find((j) => j.id === selectedJobId) || allJobs[0] || null;
      setCurrentJob(job);

      if (job) {
        let matchingCandidates: Candidate[] = [];
        try {
          matchingCandidates = await liveRecruiterService.getCandidates(job.id);
        } catch (e) {
          if (shouldFallbackToMock(e)) {
            matchingCandidates = await mockRecruiterService.getCandidates(job.id);
          } else {
            throw e;
          }
        }
        setCandidates(matchingCandidates);
      } else {
        setCandidates([]);
      }

      let allActivities: Activity[] = [];
      try {
        allActivities = await liveRecruiterService.getActivities();
        if (allActivities.length === 0) {
          allActivities = await mockRecruiterService.getActivities();
        }
      } catch (e) {
        if (shouldFallbackToMock(e)) {
          allActivities = await mockRecruiterService.getActivities();
        } else {
          throw e;
        }
      }
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
      try {
        await liveRecruiterService.updateCandidateStatus(candidateId, status);
      } catch (e) {
        if (shouldFallbackToMock(e)) {
          await mockRecruiterService.updateCandidateStatus(candidateId, status);
        } else {
          throw e;
        }
      }
      await refreshData();
    } catch (e) {
      console.error("Failed to update candidate status", e);
      throw e;
    }
  }, [refreshData]);

  const updateCandidateNotes = useCallback(async (candidateId: string, notes: string) => {
    try {
      try {
        await liveRecruiterService.updateCandidateNotes(candidateId, notes);
      } catch (e) {
        if (shouldFallbackToMock(e)) {
          await mockRecruiterService.updateCandidateNotes(candidateId, notes);
        } else {
          throw e;
        }
      }
      await refreshData();
    } catch (e) {
      console.error("Failed to update candidate notes", e);
      throw e;
    }
  }, [refreshData]);

  const addJob = useCallback(async (jobData: Omit<Job, "id" | "createdAt" | "applicantCount">) => {
    try {
      let newJob: Job;
      try {
        newJob = await liveRecruiterService.createJob(jobData);
      } catch (e) {
        if (shouldFallbackToMock(e)) {
          newJob = await mockRecruiterService.createJob(jobData);
        } else {
          throw e;
        }
      }
      await refreshData();
      return newJob;
    } catch (e) {
      console.error("Failed to add job", e);
      throw e;
    }
  }, [refreshData]);

  const uploadResume = useCallback(async (file: File, onProgress: (progress: number, stage: string) => void) => {
    try {
      let newCandidate: Candidate;
      try {
        newCandidate = await liveRecruiterService.uploadResume(selectedJobId, file, onProgress);
      } catch (e) {
        if (shouldFallbackToMock(e)) {
          newCandidate = await mockRecruiterService.uploadResume(selectedJobId, file, onProgress);
        } else {
          throw e;
        }
      }
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
