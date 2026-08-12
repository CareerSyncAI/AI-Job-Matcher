import { IRecruiterService } from "./api";
import { Job, Candidate, Activity, EvidenceItem } from "@/types";

const initialJobs: Job[] = [
  {
    id: "job-1",
    title: "Senior Software Engineer (Frontend)",
    department: "Product Engineering",
    location: "San Francisco, CA (Hybrid)",
    employmentType: "Full-time",
    description: "We are looking for a Senior Frontend Engineer with strong expertise in React, TypeScript, and modern state management. You will work on architecting modular dashboard features, optimizing client-side performance, and driving developer standards.",
    requiredSkills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
    preferredSkills: ["Zustand", "Framer Motion", "Recharts", "Jest"],
    minimumExperience: 5,
    educationRequirement: "Bachelor's in Computer Science or equivalent",
    applicantCount: 4,
    status: "open",
    createdAt: "2026-08-01T10:00:00Z"
  },
  {
    id: "job-2",
    title: "Lead AI Researcher (NLP)",
    department: "AI Core Team",
    location: "Remote (US/Canada)",
    employmentType: "Full-time",
    description: "Join our AI research unit to design and optimize NLP embedding pipelines, vector search methodologies, and fine-tune large language models for resume screening and entity extraction.",
    requiredSkills: ["Python", "FastAPI", "PyTorch", "NLP", "Transformers"],
    preferredSkills: ["Vector Databases", "spaCy", "LangChain"],
    minimumExperience: 7,
    educationRequirement: "Ph.D. or Master's in CS / AI specializing in NLP",
    applicantCount: 3,
    status: "open",
    createdAt: "2026-08-02T11:00:00Z"
  },
  {
    id: "job-3",
    title: "Staff DevOps Architect",
    department: "Infrastructure",
    location: "Austin, TX (On-site)",
    employmentType: "Full-time",
    description: "Own the cloud infrastructure, CI/CD pipelines, and secure deployment strategy for our enterprise recruitment SaaS products. Deep expertise in AWS, Docker, Kubernetes, and Terraform is required.",
    requiredSkills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
    preferredSkills: ["Ansible", "Prometheus", "Linux Systems"],
    minimumExperience: 8,
    educationRequirement: "Bachelor's in Computer Science, IT, or related field",
    applicantCount: 2,
    status: "open",
    createdAt: "2026-08-03T09:30:00Z"
  }
];

const initialCandidates: Candidate[] = [
  // Job 1 Candidates
  {
    id: "cand-1",
    jobId: "job-1",
    name: "Alice Vance",
    currentRole: "Senior Frontend Engineer",
    location: "San Jose, CA",
    experienceYears: 6,
    education: "B.S. in Computer Science",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Zustand", "Redux", "Webpack"],
    certifications: ["AWS Certified Developer"],
    matchScore: 94,
    skillScore: 95,
    experienceScore: 92,
    educationScore: 95,
    semanticScore: 94,
    matchedSkills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Zustand"],
    transferableSkills: ["Redux", "Webpack"],
    missingSkills: ["Framer Motion", "Recharts", "Jest"],
    status: "shortlisted",
    recruiterNotes: "Excellent technical depth. Good communication during screening. Solid state management experience.",
    evidence: [
      {
        requirement: "React Expertise",
        claim: "Architected core dashboard components and optimized client-side state management using React hooks",
        sourceText: "Senior Frontend Engineer (2020-Present), Acme Corp - page 1",
        type: "matched"
      },
      {
        requirement: "TypeScript Proficiency",
        claim: "Migrated legacy JavaScript codebases to strict TypeScript, defining type guards and complex generics",
        sourceText: "Senior Frontend Engineer (2020-Present), Acme Corp - page 2",
        type: "matched"
      },
      {
        requirement: "Tailwind CSS",
        claim: "Designed custom utility-first token overrides and theme systems using Tailwind",
        sourceText: "Senior Frontend Engineer (2020-Present), Acme Corp - page 2",
        type: "matched"
      },
      {
        requirement: "Next.js Integration",
        claim: "Deployed enterprise SaaS application using Next.js App Router and Server Components",
        sourceText: "Lead Developer (2018-2020), WebCrafters - page 1",
        type: "matched"
      },
      {
        requirement: "Zustand State Management",
        claim: "Replaced heavy Redux stores with lightweight Zustand stores, improving render performance by 40%",
        sourceText: "Senior Frontend Engineer (2020-Present), Acme Corp - page 1",
        type: "matched"
      },
      {
        requirement: "Framer Motion",
        claim: "No direct reference to Framer Motion found, but possesses general web animation experience",
        type: "not_detected",
        details: "Candidate mentions CSS keyframe transitions and Web Animations API, but no specific Framer Motion experience."
      },
      {
        requirement: "Recharts Visualization",
        claim: "Not mentioned in the resume",
        type: "not_provided",
        details: "No charting or data visualization libraries are explicitly listed in the profile."
      },
      {
        requirement: "Jest Unit Testing",
        claim: "Lacks automated testing configuration experience in modern setups",
        type: "gap",
        details: "Explicitly states 'Looking to grow in unit testing and TDD tools like Jest' in cover note."
      }
    ]
  },
  {
    id: "cand-2",
    jobId: "job-1",
    name: "Bob Miller",
    currentRole: "React Developer",
    location: "San Francisco, CA",
    experienceYears: 4,
    education: "B.A. in Web Design",
    skills: ["React", "TypeScript", "HTML5", "CSS3", "Tailwind CSS", "Jest"],
    certifications: [],
    matchScore: 72,
    skillScore: 78,
    experienceScore: 68,
    educationScore: 70,
    semanticScore: 73,
    matchedSkills: ["React", "TypeScript", "Tailwind CSS", "Jest"],
    transferableSkills: ["HTML5", "CSS3"],
    missingSkills: ["Next.js", "Zustand", "Framer Motion", "Recharts"],
    status: "screened",
    recruiterNotes: "Solid React UI skills, but lacks Next.js and architectural experience. Might be a junior/mid fit.",
    evidence: [
      {
        requirement: "React Expertise",
        claim: "Created responsive interactive forms and reusable landing components using React",
        sourceText: "React Developer (2022-Present), Innotech - page 1",
        type: "matched"
      },
      {
        requirement: "TypeScript Proficiency",
        claim: "Utilized basic typed interfaces for state and properties within React applications",
        sourceText: "React Developer (2022-Present), Innotech - page 1",
        type: "matched"
      },
      {
        requirement: "Tailwind CSS",
        claim: "Built mobile-friendly layouts based on Figma designs using utility CSS classes",
        sourceText: "React Developer (2022-Present), Innotech - page 2",
        type: "matched"
      },
      {
        requirement: "Next.js Integration",
        claim: "No Next.js experience listed in historical projects",
        type: "not_detected",
        details: "Work history is strictly centered around standard Create React App setups."
      },
      {
        requirement: "Jest Unit Testing",
        claim: "Wrote unit tests for utility methods and simple components using Jest",
        sourceText: "React Developer (2022-Present), Innotech - page 2",
        type: "matched"
      },
      {
        requirement: "Zustand State Management",
        claim: "State management handled primarily through Redux Toolkit, showing transferable state logic understanding",
        sourceText: "Junior Web Developer (2021-2022), TechLabs - page 1",
        type: "transferable",
        details: "Competent in Redux Toolkit which maps well to learning Zustand."
      }
    ]
  },
  {
    id: "cand-3",
    jobId: "job-1",
    name: "Charlie Green",
    currentRole: "Frontend UI Specialist",
    location: "Oakland, CA",
    experienceYears: 8,
    education: "Master in CS",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Framer Motion", "Recharts", "Jest", "GraphQL"],
    certifications: [],
    matchScore: 98,
    skillScore: 100,
    experienceScore: 98,
    educationScore: 95,
    semanticScore: 99,
    matchedSkills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Framer Motion", "Recharts", "Jest"],
    transferableSkills: ["GraphQL"],
    missingSkills: ["Zustand"],
    status: "interviewing",
    recruiterNotes: "Top-tier candidate. Checks almost all boxes. Very strong visual and interactive portfolio.",
    evidence: [
      {
        requirement: "React Expertise",
        claim: "Led development of client dashboard rewrite using React and state hooks",
        sourceText: "Senior Frontend Engineer (2020-Present), Apex Corp - page 1",
        type: "matched"
      },
      {
        requirement: "TypeScript Proficiency",
        claim: "Designed shared backend-frontend TypeScript typing system, decreasing build bugs by 35%",
        sourceText: "Senior Frontend Engineer (2020-Present), Apex Corp - page 2",
        type: "matched"
      },
      {
        requirement: "Tailwind CSS",
        claim: "Maintained design token variables and dark mode systems using Tailwind CSS configurations",
        sourceText: "Senior Frontend Engineer (2020-Present), Apex Corp - page 1",
        type: "matched"
      },
      {
        requirement: "Next.js Integration",
        claim: "Architected multi-tenant Next.js application using incremental static regeneration (ISR)",
        sourceText: "Software Engineer (2018-2020), DevCo - page 2",
        type: "matched"
      },
      {
        requirement: "Framer Motion",
        claim: "Implemented complex SVG morph animations and page transition sequences via Framer Motion",
        sourceText: "Senior Frontend Engineer (2020-Present), Apex Corp - page 3",
        type: "matched"
      },
      {
        requirement: "Recharts Visualization",
        claim: "Built telemetry dashboards featuring line, bar, and custom scatter plots using Recharts",
        sourceText: "Senior Frontend Engineer (2020-Present), Apex Corp - page 2",
        type: "matched"
      },
      {
        requirement: "Jest Unit Testing",
        claim: "Maintained 85%+ code coverage across interactive client panels with Jest and React Testing Library",
        sourceText: "Software Engineer (2018-2020), DevCo - page 1",
        type: "matched"
      },
      {
        requirement: "Zustand State Management",
        claim: "No direct reference to Zustand, but manages React Context and custom state architectures efficiently",
        type: "not_detected",
        details: "No explicit Zustand keyword in resume. Shows high capability in Redux, Context API, and state hooks."
      }
    ]
  },
  {
    id: "cand-4",
    jobId: "job-1",
    name: "Diana Prince",
    currentRole: "Junior Developer",
    location: "San Mateo, CA",
    experienceYears: 2,
    education: "Self-taught / Bootcamp Graduate",
    skills: ["React", "JavaScript", "CSS", "Git"],
    certifications: [],
    matchScore: 45,
    skillScore: 50,
    experienceScore: 40,
    educationScore: 30,
    semanticScore: 55,
    matchedSkills: ["React"],
    transferableSkills: ["JavaScript", "CSS", "Git"],
    missingSkills: ["TypeScript", "Tailwind CSS", "Next.js", "Zustand", "Framer Motion", "Recharts", "Jest"],
    status: "rejected",
    recruiterNotes: "Lacks core experience requirements. No TypeScript, Next.js or styling framework familiarity.",
    evidence: [
      {
        requirement: "React Expertise",
        claim: "Completed 3-month intensive bootcamp focus on basic React components and API parsing",
        sourceText: "Student (2024), TechAcademy - page 1",
        type: "matched"
      },
      {
        requirement: "TypeScript Proficiency",
        claim: "No TypeScript reference. Relies exclusively on dynamically typed JavaScript",
        type: "gap",
        details: "Explicitly misses strict type checking which is an immediate job mandate."
      },
      {
        requirement: "Next.js Integration",
        claim: "No Next.js experience listed",
        type: "not_provided"
      },
      {
        requirement: "Tailwind CSS",
        claim: "Uses standard CSS files for styling, shows basic HTML/CSS layout understanding",
        sourceText: "Student (2024), TechAcademy - page 2",
        type: "transferable",
        details: "Has standard CSS capabilities but will require training to adopt utility-first models."
      }
    ]
  },

  // Job 2 Candidates (Lead AI Researcher)
  {
    id: "cand-5",
    jobId: "job-2",
    name: "Edward Norton",
    currentRole: "AI Researcher",
    location: "Boston, MA",
    experienceYears: 7,
    education: "Ph.D. in Artificial Intelligence",
    skills: ["Python", "PyTorch", "NLP", "Transformers", "spaCy", "Scikit-Learn"],
    certifications: [],
    matchScore: 91,
    skillScore: 92,
    experienceScore: 90,
    educationScore: 100,
    semanticScore: 92,
    matchedSkills: ["Python", "PyTorch", "NLP", "Transformers", "spaCy"],
    transferableSkills: ["Scikit-Learn"],
    missingSkills: ["FastAPI", "Vector Databases", "LangChain"],
    status: "shortlisted",
    recruiterNotes: "Strong research profile. PhD adds significant value to core AI models.",
    evidence: [
      {
        requirement: "Python Core",
        claim: "Created neural network training loops and preprocessing pipelines in Python",
        sourceText: "AI Researcher (2021-Present), MIT Labs - page 1",
        type: "matched"
      },
      {
        requirement: "PyTorch Deep Learning",
        claim: "Trained transformer architecture variations from scratch using PyTorch",
        sourceText: "AI Researcher (2021-Present), MIT Labs - page 2",
        type: "matched"
      },
      {
        requirement: "NLP & Transformers",
        claim: "Specialized in sequence-to-sequence fine-tuning and tokenization optimization",
        sourceText: "PhD Thesis (2018-2021), Harvard University - page 1",
        type: "matched"
      },
      {
        requirement: "FastAPI Boilerplate",
        claim: "Uses Flask and Django for research model serving, showing transferable REST architecture understanding",
        sourceText: "Graduate Researcher (2019-2021), Harvard - page 2",
        type: "transferable",
        details: "Uses Flask which indicates strong ability to pick up FastAPI swiftly."
      },
      {
        requirement: "Vector Databases",
        claim: "No direct vector storage engine experience listed in project summaries",
        type: "not_detected",
        details: "Relies on direct numpy arrays and matrix computing databases for nearest-neighbor evaluations."
      }
    ]
  },
  {
    id: "cand-6",
    jobId: "job-2",
    name: "Fiona Gallagher",
    currentRole: "Machine Learning Engineer",
    location: "Chicago, IL",
    experienceYears: 5,
    education: "M.S. in CS",
    skills: ["Python", "FastAPI", "PyTorch", "NLP", "Transformers", "Vector Databases", "LangChain", "SQL"],
    certifications: [],
    matchScore: 97,
    skillScore: 98,
    experienceScore: 94,
    educationScore: 95,
    semanticScore: 99,
    matchedSkills: ["Python", "FastAPI", "PyTorch", "NLP", "Transformers", "Vector Databases", "LangChain"],
    transferableSkills: ["SQL"],
    missingSkills: ["spaCy"],
    status: "interviewing",
    recruiterNotes: "Superb practical ML engineer. Great production API hosting experience using FastAPI.",
    evidence: [
      {
        requirement: "Python Core",
        claim: "Built asynchronous ETL scripts and model pipelines in Python",
        sourceText: "ML Engineer (2021-Present), AutoScale - page 1",
        type: "matched"
      },
      {
        requirement: "FastAPI Integration",
        claim: "Deployed ML model inferences via FastAPI with asynchronous request handlers, serving 1M+ requests daily",
        sourceText: "ML Engineer (2021-Present), AutoScale - page 1",
        type: "matched"
      },
      {
        requirement: "PyTorch Deep Learning",
        claim: "Implemented PyTorch neural model evaluation systems and optimized weights compilation",
        sourceText: "ML Engineer (2021-Present), AutoScale - page 2",
        type: "matched"
      },
      {
        requirement: "Vector Databases",
        claim: "Configured Pinecone and Qdrant clusters for fast semantic text retrieval and caching",
        sourceText: "ML Engineer (2021-Present), AutoScale - page 1",
        type: "matched"
      },
      {
        requirement: "NLP & Transformers",
        claim: "Fine-tuned Hugging Face transformer models for domain-specific entity extraction",
        sourceText: "Graduate Intern (2020), AI Systems - page 1",
        type: "matched"
      }
    ]
  }
];

const initialActivities: Activity[] = [
  {
    id: "act-1",
    type: "resume_processed",
    title: "Processed resume for Alice Vance",
    candidateName: "Alice Vance",
    jobTitle: "Senior Software Engineer (Frontend)",
    timestamp: "2026-08-08T10:45:00Z"
  },
  {
    id: "act-2",
    type: "candidate_shortlisted",
    title: "Shortlisted Alice Vance",
    candidateName: "Alice Vance",
    jobTitle: "Senior Software Engineer (Frontend)",
    timestamp: "2026-08-08T11:15:00Z"
  },
  {
    id: "act-3",
    type: "job_created",
    title: "Created job posting Lead AI Researcher (NLP)",
    jobTitle: "Lead AI Researcher (NLP)",
    timestamp: "2026-08-02T11:00:00Z"
  },
  {
    id: "act-4",
    type: "candidate_interviewing",
    title: "Scheduled Fiona Gallagher for technical interview",
    candidateName: "Fiona Gallagher",
    jobTitle: "Lead AI Researcher (NLP)",
    timestamp: "2026-08-08T14:30:00Z"
  }
];

class RecruiterServiceMock implements IRecruiterService {
  private jobs: Job[] = [];
  private candidates: Candidate[] = [];
  private activities: Activity[] = [];

  constructor() {
    this.loadState();
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  private loadState() {
    if (this.isBrowser()) {
      const saved = sessionStorage.getItem("careersync_mock_db");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.jobs = parsed.jobs || [];
          this.candidates = parsed.candidates || [];
          this.activities = parsed.activities || [];
          return;
        } catch (e) {
          console.error("Failed to parse stored mock state, seeding new...", e);
        }
      }
    }

    this.jobs = [...initialJobs];
    this.candidates = [...initialCandidates];
    this.activities = [...initialActivities];
    this.saveState();
  }

  private saveState() {
    if (this.isBrowser()) {
      sessionStorage.setItem(
        "careersync_mock_db",
        JSON.stringify({
          jobs: this.jobs,
          candidates: this.candidates,
          activities: this.activities
        })
      );
    }
  }

  async getJobs(): Promise<Job[]> {
    this.loadState();
    return this.jobs;
  }

  async getJob(jobId: string): Promise<Job | null> {
    this.loadState();
    const job = this.jobs.find((j) => j.id === jobId);
    return job || null;
  }

  async getCandidates(jobId: string): Promise<Candidate[]> {
    this.loadState();
    return this.candidates.filter((c) => c.jobId === jobId);
  }

  async getCandidate(candidateId: string): Promise<Candidate | null> {
    this.loadState();
    const candidate = this.candidates.find((c) => c.id === candidateId);
    return candidate || null;
  }

  async updateCandidateStatus(candidateId: string, status: Candidate["status"]): Promise<Candidate> {
    this.loadState();
    const candidate = this.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      throw new Error(`Candidate with id ${candidateId} not found`);
    }

    candidate.status = status;

    // Log this activity
    const activityId = `act-${Date.now()}`;
    const job = this.jobs.find((j) => j.id === candidate.jobId);
    const newActivity: Activity = {
      id: activityId,
      type: status === "shortlisted" ? "candidate_shortlisted" : 
            status === "rejected" ? "candidate_rejected" : 
            status === "interviewing" ? "candidate_interviewing" : "resume_processed",
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} ${candidate.name}`,
      candidateName: candidate.name,
      jobTitle: job ? job.title : "Unknown Job",
      timestamp: new Date().toISOString()
    };

    this.activities.unshift(newActivity);
    this.saveState();
    return candidate;
  }

  async updateCandidateNotes(candidateId: string, notes: string): Promise<Candidate> {
    this.loadState();
    const candidate = this.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      throw new Error(`Candidate with id ${candidateId} not found`);
    }
    candidate.recruiterNotes = notes;
    this.saveState();
    return candidate;
  }

  async getActivities(): Promise<Activity[]> {
    this.loadState();
    return this.activities;
  }

  async createJob(jobData: Omit<Job, "id" | "createdAt" | "applicantCount">): Promise<Job> {
    this.loadState();
    const jobId = `job-${Date.now()}`;
    const newJob: Job = {
      ...jobData,
      id: jobId,
      createdAt: new Date().toISOString(),
      applicantCount: 0
    };
    this.jobs.unshift(newJob);

    // Log activity
    const activityId = `act-${Date.now()}`;
    const newActivity: Activity = {
      id: activityId,
      type: "job_created",
      title: `Created job posting ${newJob.title}`,
      jobTitle: newJob.title,
      timestamp: new Date().toISOString()
    };
    this.activities.unshift(newActivity);

    this.saveState();
    return newJob;
  }

  async uploadResume(
    jobId: string,
    file: File,
    onProgress: (progress: number, stage: string) => void
  ): Promise<Candidate> {
    this.loadState();
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const stages = [
      { progress: 10, label: "Validating file type..." },
      { progress: 30, label: "Parsing PDF structure..." },
      { progress: 60, label: "Extracting entities & text content..." },
      { progress: 80, label: "Computing vector embeddings..." },
      { progress: 95, label: "Matching candidate against job specifications..." }
    ];

    for (const stage of stages) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      onProgress(stage.progress, stage.label);
    }

    // Determine candidate details from filename or generate deterministically
    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    const candId = `cand-${Date.now()}`;
    
    // Deterministic metrics based on string values so it's not random
    const charSum = baseName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const scoreSeed = (charSum % 40) + 60; // range 60-99
    
    const newCandidate: Candidate = {
      id: candId,
      jobId: jobId,
      name: baseName,
      currentRole: "Software Engineer",
      location: "San Jose, CA",
      experienceYears: (charSum % 5) + 3, // 3 to 7 years
      education: "B.S. in Computer Science",
      skills: [...job.requiredSkills.slice(0, 3), "Git", "REST APIs"],
      certifications: [],
      matchScore: scoreSeed,
      skillScore: Math.min(scoreSeed + 2, 100),
      experienceScore: Math.max(scoreSeed - 5, 50),
      educationScore: 90,
      semanticScore: scoreSeed,
      matchedSkills: job.requiredSkills.slice(0, 3),
      transferableSkills: ["Git", "REST APIs"],
      missingSkills: [job.requiredSkills[3] || "TypeScript", ...job.preferredSkills.slice(0, 2)],
      status: "screened",
      recruiterNotes: "Uploaded candidate. Needs immediate review.",
      evidence: job.requiredSkills.map((skill, index) => {
        const isMatched = index < 3;
        return {
          requirement: `${skill} requirement`,
          claim: isMatched 
            ? `Demonstrated ${skill} capabilities in core team projects`
            : `Did not detect direct evidence of ${skill} in parsed sections`,
          sourceText: isMatched ? "Work experience section - page 1" : undefined,
          type: isMatched ? "matched" : "not_detected",
          details: isMatched ? undefined : `Candidate mentions adjacent programming concepts but does not list ${skill} directly.`
        };
      })
    };

    this.candidates.push(newCandidate);
    job.applicantCount += 1;

    // Log activity
    const activityId = `act-${Date.now()}`;
    const newActivity: Activity = {
      id: activityId,
      type: "resume_processed",
      title: `Processed resume for ${newCandidate.name}`,
      candidateName: newCandidate.name,
      jobTitle: job.title,
      timestamp: new Date().toISOString()
    };
    this.activities.unshift(newActivity);

    this.saveState();
    return newCandidate;
  }
}

export const recruiterService = new RecruiterServiceMock();
