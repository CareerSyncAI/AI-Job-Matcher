import { Job, Candidate, Activity } from "@/types";

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
