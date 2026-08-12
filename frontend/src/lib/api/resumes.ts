import { apiClient } from "./client";

export interface ResumeUploadResponseDTO {
  id: string;
  mime_type: string;
  byte_size: number;
  processing_status: "queued" | "uploading" | "processing" | "completed" | "needs_attention";
  needs_attention_reason: string | null;
  uploaded_at: string;
}

export const resumesAPI = {
  async uploadResume(
    jobId: string,
    file: File,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<ResumeUploadResponseDTO> {
    const formData = new FormData();
    formData.append("file", file);

    if (onProgress) {
      onProgress(30, "Uploading document to secure storage...");
    }

    const res = await apiClient.post<ResumeUploadResponseDTO>(`/jobs/${jobId}/resumes`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (onProgress) {
      onProgress(100, "Upload completed successfully.");
    }

    return res.data;
  },

  async getResume(resumeId: string): Promise<ResumeUploadResponseDTO> {
    const res = await apiClient.get<ResumeUploadResponseDTO>(`/resumes/${resumeId}`);
    return res.data;
  },
};
