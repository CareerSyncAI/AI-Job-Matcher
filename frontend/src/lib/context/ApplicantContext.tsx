"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { ApplicantProfile, JobApplication, ResumeVersion } from "@/types";
import { applicantService } from "@/lib/services/mock";

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
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileCompleteness, setProfileCompleteness] = useState(0);

  const calculateCompleteness = useCallback((prof: ApplicantProfile): number => {
    let score = 0;
    if (prof.name) score += 10;
    if (prof.headline) score += 15;
    if (prof.location) score += 15;
    if (prof.education) score += 15;
    if (prof.experienceYears > 0) score += 15;
    if (prof.resumes && prof.resumes.length > 0) score += 15;
    
    // Skills contribution: up to 15 points
    const skillsCount = prof.skills?.length || 0;
    score += Math.min(skillsCount * 3, 15);

    return Math.min(score, 100);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const prof = await applicantService.getApplicantProfile();
      setProfile(prof);
      setProfileCompleteness(calculateCompleteness(prof));

      const apps = await applicantService.getApplications();
      setApplications(apps);
    } catch (e) {
      console.error("Failed to load applicant context data", e);
    } finally {
      setIsLoading(false);
    }
  }, [calculateCompleteness]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateProfile = useCallback(async (profileData: Partial<ApplicantProfile>) => {
    try {
      const updated = await applicantService.updateApplicantProfile(profileData);
      setProfile(updated);
      setProfileCompleteness(calculateCompleteness(updated));
    } catch (e) {
      console.error("Failed to update profile", e);
      throw e;
    }
  }, [calculateCompleteness]);

  const applyToJob = useCallback(async (jobId: string) => {
    try {
      const newApp = await applicantService.applyToJob(jobId);
      await refreshData();
      return newApp;
    } catch (e) {
      console.error("Failed to apply to job", e);
      throw e;
    }
  }, [refreshData]);

  const uploadResume = useCallback(async (file: File, onProgress: (progress: number, stage: string) => void) => {
    try {
      const result = await applicantService.uploadResumeVersion(file, onProgress);
      await refreshData();
      return result;
    } catch (e) {
      console.error("Failed to upload resume", e);
      throw e;
    }
  }, [refreshData]);

  const setPrimaryResume = useCallback(async (resumeId: string) => {
    try {
      await applicantService.setPrimaryResume(resumeId);
      await refreshData();
    } catch (e) {
      console.error("Failed to set primary resume", e);
      throw e;
    }
  }, [refreshData]);

  const deleteResume = useCallback(async (resumeId: string) => {
    try {
      await applicantService.deleteResumeVersion(resumeId);
      await refreshData();
    } catch (e) {
      console.error("Failed to delete resume", e);
      throw e;
    }
  }, [refreshData]);

  const value = useMemo<ApplicantContextType>(() => ({
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
  }), [
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
  ]);

  return (
    <ApplicantContext.Provider value={value}>
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
