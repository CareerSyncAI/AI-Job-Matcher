export type Job = {
  id: string;
  title: string;
  department?: string;
  location?: string;
  employmentType?: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperience?: number;
  educationRequirement?: string;
  applicantCount: number;
  status: "open" | "closed" | "draft";
  createdAt: string;
};

export type EvidenceType = "matched" | "transferable" | "not_detected" | "not_provided" | "gap";

export type EvidenceItem = {
  requirement: string;
  claim: string;
  sourceText?: string;
  type: EvidenceType;
  details?: string;
};

export type Candidate = {
  id: string;
  jobId: string;
  name: string;
  currentRole?: string;
  location?: string;
  experienceYears: number;
  education?: string;
  skills: string[];
  certifications: string[];
  matchScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  semanticScore: number;
  matchedSkills: string[];
  transferableSkills: string[];
  missingSkills: string[];
  status: "screened" | "shortlisted" | "interviewing" | "rejected";
  evidence: EvidenceItem[];
  recruiterNotes?: string;
};

export type Activity = {
  id: string;
  type: "resume_processed" | "candidate_shortlisted" | "job_created" | "candidate_interviewing" | "candidate_rejected";
  title: string;
  candidateName?: string;
  jobTitle: string;
  timestamp: string;
};
