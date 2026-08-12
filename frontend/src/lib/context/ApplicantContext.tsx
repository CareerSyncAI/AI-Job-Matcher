"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ApplicantProfile, JobApplication, ResumeVersion } from "@/types";
import { initialProfile, initialApplications } from "@/lib/mocks/mockData";
import { applicationsAPI } from "@/lib/api/applications";
import { env } from "@/lib/config/env";

interface ApplicantContextType {
  profile: ApplicantProfile | null;
  applications: JobApplication[];
  isLoading: boolean;
  profileCompleteness: number;
  refreshData: () => Promise<void>;
  updateProfile: (profileData: Partial<ApplicantProfile>) => Promise<void>;
  applyToJob: (jobId: string) => Promise<JobApplication>;
  uploadResume: (file: File, onProgress: (progress: number, stage: string) => void) => Promise<ResumeVersion>;
  setPrimaryResume: (resumeId: string) => Promise<void>;
  deleteResume: (resumeId: string) => Promise<void>;
}

const ApplicantContext = createContext<ApplicantContextType | undefined>(undefined);

export const ApplicantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<ApplicantProfile | null>(initialProfile);
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications);
  const [isLoading, setIsLoading] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(85);

  const calculateCompleteness = (prof: ApplicantProfile): number => {
    let score = 0;
    if (prof.name) score += 20;
    if (prof.headline) score += 15;
    if (prof.skills && prof.skills.length > 0) score += 30;
    if (prof.experienceYears > 0) score += 15;
    if (prof.resumes && prof.resumes.length > 0) score += 20;
    return Math.min(score, 100);
  };

  const refreshData = useCallback(async () => {
    if (!env.useMock) {
      try {
        const liveApps = await applicationsAPI.getMyApplications();
        if (liveApps && liveApps.length > 0) {
          const mapped: JobApplication[] = liveApps.map((a) => {
            const stage: JobApplication["status"] =
              a.status === "hired" ? "offered" : a.status;
            return {
              id: a.id,
              jobId: a.job_id,
              appliedAt: a.applied_at,
              status: stage,
              timeline: [
                {
                  stage,
                  timestamp: a.applied_at,
                  note: "Application active in system.",
                },
              ],
            };
          });
          setApplications(mapped);
        }
      } catch {
        // Fallback to mock applications if unauthenticated or offline
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateProfile = async (profileData: Partial<ApplicantProfile>) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...profileData };
      setProfileCompleteness(calculateCompleteness(updated));
      return updated;
    });
  };

  const applyToJob = async (jobId: string) => {
    if (!env.useMock) {
      try {
        await applicationsAPI.applyToJob(jobId);
      } catch {
        // Fallback to local state update
      }
    }

    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId,
      appliedAt: new Date().toISOString(),
      status: "applied",
      timeline: [
        {
          stage: "applied",
          timestamp: new Date().toISOString(),
          note: "Application submitted successfully.",
        },
      ],
    };
    setApplications((prev) => [newApp, ...prev]);
    return newApp;
  };

  const uploadResume = async (file: File, onProgress: (progress: number, stage: string) => void) => {
    onProgress(50, "Processing resume document...");
    const newResume: ResumeVersion = {
      id: `res-${Date.now()}`,
      name: file.name,
      uploadedAt: new Date().toISOString(),
      isPrimary: true,
    };
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        resumes: [newResume, ...prev.resumes.map((r) => ({ ...r, isPrimary: false }))],
      };
    });
    onProgress(100, "Resume added.");
    return newResume;
  };

  const setPrimaryResume = async (resumeId: string) => {
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        resumes: prev.resumes.map((r) => ({ ...r, isPrimary: r.id === resumeId })),
      };
    });
  };

  const deleteResume = async (resumeId: string) => {
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        resumes: prev.resumes.filter((r) => r.id !== resumeId),
      };
    });
  };

  return (
    <ApplicantContext.Provider
      value={{
        profile,
        applications,
        isLoading,
        profileCompleteness,
        refreshData,
        updateProfile,
        applyToJob,
        uploadResume,
        setPrimaryResume,
        deleteResume
      }}
    >
      {children}
    </ApplicantContext.Provider>
  );
};

export const useApplicant = () => {
  const context = useContext(ApplicantContext);
  if (context === undefined) {
    throw new Error("useApplicant must be used within an ApplicantProvider");
  }
  return context;
};
