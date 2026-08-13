import { Job, Candidate, Activity, ApplicantProfile, ResumeVersion, JobApplication } from "@/types";

export interface IRecruiterService {
  getJobs(): Promise<Job[]>;
  getJob(jobId: string): Promise<Job | null>;
  getCandidates(jobId: string): Promise<Candidate[]>;
  getCandidate(candidateId: string): Promise<Candidate | null>;
  updateCandidateStatus(candidateId: string, status: Candidate["status"]): Promise<Candidate>;
  updateCandidateNotes(candidateId: string, notes: string): Promise<Candidate>;
  getActivities(): Promise<Activity[]>;
  createJob(job: Omit<Job, "id" | "createdAt" | "applicantCount">): Promise<Job>;
  uploadResume(jobId: string, file: File, onProgress: (progress: number, stage: string) => void): Promise<Candidate>;
}

export interface IApplicantService {
  getApplicantProfile(): Promise<ApplicantProfile>;
  updateApplicantProfile(profile: Partial<ApplicantProfile>): Promise<ApplicantProfile>;
  getApplications(): Promise<JobApplication[]>;
  getApplication(id: string): Promise<JobApplication | null>;
  applyToJob(jobId: string): Promise<JobApplication>;
  uploadResumeVersion(file: File, onProgress: (progress: number, stage: string) => void): Promise<ResumeVersion>;
  setPrimaryResume(resumeId: string): Promise<void>;
  deleteResumeVersion(resumeId: string): Promise<void>;
}
