import { apiClient } from "./client";
import { Job, Candidate } from "@/types";

export interface JobSkillDTO {
  name: string;
  required: boolean;
  min_years?: number;
}

export interface JobWeightsDTO {
  skills: number;
  experience: number;
  education: number;
  semantic: number;
}

export interface JobCreateDTO {
  title: string;
  department?: string;
  location?: string;
  employment_type: string;
  work_arrangement: string;
  experience_min_years: number;
  education_required: string;
  description: string;
  skills: JobSkillDTO[];
  evaluation_weights: JobWeightsDTO;
  status: "draft" | "open" | "closed" | "archived";
}

export interface BackendJobDTO {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  work_arrangement: string;
  experience_min_years: number;
  education_required: string;
  description: string;
  status: "draft" | "open" | "closed" | "archived";
  skills: { id: string; name: string; required: boolean; min_years: number | null }[];
  evaluation_weights: JobWeightsDTO;
  created_at: string;
}

export const jobsAPI = {
  async getJobs(): Promise<BackendJobDTO[]> {
    const res = await apiClient.get<BackendJobDTO[]>("/jobs");
    return res.data;
  },

  async getJob(jobId: string): Promise<BackendJobDTO> {
    const res = await apiClient.get<BackendJobDTO>(`/jobs/${jobId}`);
    return res.data;
  },

  async createJob(payload: JobCreateDTO): Promise<BackendJobDTO> {
    const res = await apiClient.post<BackendJobDTO>("/jobs", payload);
    return res.data;
  },

  async getCandidates(jobId: string): Promise<Candidate[]> {
    const res = await apiClient.get<Candidate[]>(`/jobs/${jobId}/candidates`);
    return res.data;
  },

  async getCandidate(jobId: string, candidateId: string): Promise<Candidate | null> {
    const res = await apiClient.get<Candidate>(`/jobs/${jobId}/candidates/${candidateId}`);
    return res.data;
  },

  async getPublicOpenJobs(): Promise<BackendJobDTO[]> {
    const res = await apiClient.get<BackendJobDTO[]>("/jobs/public/open");
    return res.data;
  },

  async updateCandidateStatus(applicationId: string, status: string): Promise<void> {
    await apiClient.patch(`/applications/${applicationId}/status`, { status });
  },

  async updateCandidateNotes(applicationId: string, body: string): Promise<void> {
    await apiClient.post(`/applications/${applicationId}/notes`, { body });
  },

  async evaluateCandidate(applicationId: string): Promise<void> {
    await apiClient.post(`/applications/${applicationId}/evaluate`);
  },
};
