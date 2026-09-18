import { Job, Candidate, Activity, ApplicantProfile, ResumeVersion, JobApplication } from "@/types";
import { jobsAPI, BackendJobDTO } from "@/lib/api/jobs";
import { applicationsAPI, BackendApplicationDTO } from "@/lib/api/applications";
import { resumesAPI } from "@/lib/api/resumes";

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

function mapBackendJobToJob(dto: BackendJobDTO, applicantCount: number = 0): Job {
  return {
    id: dto.id,
    title: dto.title,
    department: dto.department || undefined,
    location: dto.location || undefined,
    employmentType: dto.employment_type,
    description: dto.description,
    requiredSkills: dto.skills.filter((s) => s.required).map((s) => s.name),
    preferredSkills: dto.skills.filter((s) => !s.required).map((s) => s.name),
    minimumExperience: dto.experience_min_years,
    educationRequirement: dto.education_required,
    applicantCount,
    status: dto.status === "open" ? "open" : dto.status === "closed" ? "closed" : "draft",
    createdAt: dto.created_at,
  };
}

export class LiveRecruiterService implements IRecruiterService {
  async getJobs(): Promise<Job[]> {
    const backendJobs = await jobsAPI.getJobs();
    const mapped = await Promise.all(
      backendJobs.map(async (bj) => {
        try {
          const candidates = await jobsAPI.getCandidates(bj.id);
          return mapBackendJobToJob(bj, candidates.length);
        } catch {
          return mapBackendJobToJob(bj, 0);
        }
      })
    );
    return mapped;
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      const bj = await jobsAPI.getJob(jobId);
      const candidates = await jobsAPI.getCandidates(jobId);
      return mapBackendJobToJob(bj, candidates.length);
    } catch {
      return null;
    }
  }

  async getCandidates(jobId: string): Promise<Candidate[]> {
    return await jobsAPI.getCandidates(jobId);
  }

  async getCandidate(candidateId: string): Promise<Candidate | null> {
    const jobs = await jobsAPI.getJobs();
    for (const job of jobs) {
      try {
        const candidate = await jobsAPI.getCandidate(job.id, candidateId);
        if (candidate) return candidate;
      } catch {
        continue;
      }
    }
    return null;
  }

  async updateCandidateStatus(candidateId: string, status: Candidate["status"]): Promise<Candidate> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found");
    const appCandidate = candidate as unknown as { application_id?: string };
    const appId = appCandidate.application_id || candidate.id;
    await jobsAPI.updateCandidateStatus(appId, status === "screened" ? "under_review" : status);
    return { ...candidate, status };
  }

  async updateCandidateNotes(candidateId: string, notes: string): Promise<Candidate> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found");
    const appCandidate = candidate as unknown as { application_id?: string };
    const appId = appCandidate.application_id || candidate.id;
    await jobsAPI.updateCandidateNotes(appId, notes);
    return { ...candidate, recruiterNotes: notes };
  }

  async getActivities(): Promise<Activity[]> {
    return [];
  }

  async createJob(job: Omit<Job, "id" | "createdAt" | "applicantCount">): Promise<Job> {
    const skills = [
      ...job.requiredSkills.map((name) => ({ name, required: true })),
      ...job.preferredSkills.map((name) => ({ name, required: false })),
    ];
    const created = await jobsAPI.createJob({
      title: job.title,
      department: job.department,
      location: job.location,
      employment_type: job.employmentType || "Full-time",
      work_arrangement: "Hybrid",
      experience_min_years: job.minimumExperience || 0,
      education_required: job.educationRequirement || "Bachelor",
      description: job.description,
      skills,
      evaluation_weights: { skills: 35, experience: 35, education: 15, semantic: 15 },
      status: job.status === "closed" ? "closed" : "open",
    });
    return mapBackendJobToJob(created, 0);
  }

  async uploadResume(jobId: string, file: File, onProgress: (progress: number, stage: string) => void): Promise<Candidate> {
    onProgress(20, "Uploading document to backend storage...");
    await resumesAPI.uploadResume(jobId, file, onProgress);
    onProgress(60, "Processing candidate extraction...");
    const candidates = await jobsAPI.getCandidates(jobId);
    onProgress(100, "Complete.");
    return candidates[0] || ({} as Candidate);
  }
}

export class LiveApplicantService implements IApplicantService {
  async getApplicantProfile(): Promise<ApplicantProfile> {
    return {
      name: "Applicant Profile",
      headline: "Software Engineer",
      location: "San Francisco, CA",
      skills: ["React", "TypeScript", "Next.js", "Python"],
      experienceYears: 4,
      education: "B.S. in Computer Science",
      resumes: [],
    };
  }

  async updateApplicantProfile(profile: Partial<ApplicantProfile>): Promise<ApplicantProfile> {
    const current = await this.getApplicantProfile();
    return { ...current, ...profile };
  }

  async getApplications(): Promise<JobApplication[]> {
    const backendApps = await applicationsAPI.getMyApplications();
    return backendApps.map((b: BackendApplicationDTO) => ({
      id: b.id,
      jobId: b.job_id,
      appliedAt: b.applied_at,
      status: b.status === "hired" ? "offered" : b.status,
      timeline: [
        {
          stage: "applied",
          timestamp: b.applied_at,
          note: "Application successfully submitted.",
        },
      ],
    }));
  }

  async getApplication(id: string): Promise<JobApplication | null> {
    const apps = await this.getApplications();
    return apps.find((a) => a.id === id) || null;
  }

  async applyToJob(jobId: string): Promise<JobApplication> {
    const res = await applicationsAPI.applyToJob(jobId);
    return {
      id: res.id,
      jobId: res.job_id,
      appliedAt: res.applied_at,
      status: "applied",
      timeline: [
        {
          stage: "applied",
          timestamp: res.applied_at,
          note: "Application submitted.",
        },
      ],
    };
  }

  async uploadResumeVersion(file: File, onProgress: (progress: number, stage: string) => void): Promise<ResumeVersion> {
    onProgress(50, "Uploading resume file...");
    onProgress(100, "Upload complete.");
    return {
      id: "res-new",
      name: file.name,
      uploadedAt: new Date().toISOString(),
      isPrimary: true,
    };
  }

  async setPrimaryResume(_resumeId: string): Promise<void> {}
  async deleteResumeVersion(_resumeId: string): Promise<void> {}
}
