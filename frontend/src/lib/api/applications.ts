import { apiClient } from "./client";

export interface ApplicationCreateDTO {
  job_id: string;
}

export interface ApplicationTimelineEventDTO {
  stage: string;
  timestamp: string;
  note: string | null;
}

export interface BackendApplicationDTO {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string | null;
  status: "applied" | "screened" | "shortlisted" | "interviewing" | "rejected" | "hired";
  match_score: number | null;
  applied_at: string;
  job_title?: string;
}

export const applicationsAPI = {
  async applyToJob(jobId: string): Promise<BackendApplicationDTO> {
    const res = await apiClient.post<BackendApplicationDTO>(`/jobs/${jobId}/applications`);
    return res.data;
  },

  async getMyApplications(): Promise<BackendApplicationDTO[]> {
    const res = await apiClient.get<BackendApplicationDTO[]>("/applications/me");
    return res.data;
  },

  async getApplication(applicationId: string): Promise<BackendApplicationDTO> {
    const res = await apiClient.get<BackendApplicationDTO>(`/applications/${applicationId}`);
    return res.data;
  },
};
