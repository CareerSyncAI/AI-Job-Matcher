import { IRecruiterService, IApplicantService } from "./api";
import { Job, Candidate, Activity, EvidenceItem, ApplicantProfile, ResumeVersion, JobApplication } from "@/types";

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
  }
];

const initialProfile: ApplicantProfile = {
  name: "Dhruv Gajera",
  headline: "Aspiring Frontend Developer & Software Engineer",
  location: "Surat, Gujarat, India",
  skills: ["React", "TypeScript", "JavaScript", "HTML5", "CSS3"],
  experienceYears: 1,
  education: "B.Tech in Computer Engineering",
  resumes: [
    {
      id: "res-1",
      name: "Dhruv_Gajera_Resume_v1.pdf",
      uploadedAt: "2026-08-05T14:30:00Z",
      isPrimary: true
    }
  ]
};

const initialApplications: JobApplication[] = [
  {
    id: "app-initial-1",
    jobId: "job-1",
    appliedAt: "2026-08-08T10:45:00Z",
    status: "screened",
    timeline: [
      {
        stage: "applied",
        timestamp: "2026-08-08T10:45:00Z",
        note: "Application submitted successfully."
      },
      {
        stage: "screened",
        timestamp: "2026-08-09T09:30:00Z",
        note: "Resume parsed. Fit rating generated."
      }
    ]
  }
];

class RecruiterServiceMock implements IRecruiterService, IApplicantService {
  private jobs: Job[] = [];
  private candidates: Candidate[] = [];
  private activities: Activity[] = [];
  
  // Applicant details
  private profile: ApplicantProfile = { name: "", skills: [], experienceYears: 0, resumes: [] };
  private applications: JobApplication[] = [];

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
          this.profile = parsed.profile || { ...initialProfile };
          this.applications = parsed.applications || [...initialApplications];
          return;
        } catch (e) {
          console.error("Failed to parse stored mock state, seeding new...", e);
        }
      }
    }

    this.jobs = [...initialJobs];
    this.candidates = [...initialCandidates];
    this.activities = [...initialActivities];
    this.profile = { ...initialProfile };
    this.applications = [...initialApplications];

    // Seed Dhruv's pre-application candidate profile in the recruiter database
    const hasDhruv = this.candidates.some(c => c.id === "cand-applicant-job-1");
    if (!hasDhruv) {
      this.candidates.push({
        id: "cand-applicant-job-1",
        jobId: "job-1",
        name: this.profile.name,
        currentRole: this.profile.headline || "Software Engineer",
        location: this.profile.location || "Surat, India",
        experienceYears: this.profile.experienceYears,
        education: this.profile.education || "B.Tech in Computer Engineering",
        skills: this.profile.skills,
        certifications: [],
        matchScore: 82,
        skillScore: 85,
        experienceScore: 75,
        educationScore: 90,
        semanticScore: 80,
        matchedSkills: ["React", "TypeScript"],
        transferableSkills: ["JavaScript", "HTML5", "CSS3"],
        missingSkills: ["Tailwind CSS", "Next.js"],
        status: "screened",
        recruiterNotes: "Applied via candidate portal. Review credentials.",
        evidence: [
          {
            requirement: "React Expertise",
            claim: "Proficient in component states, React hooks, and context bindings",
            sourceText: "Profile Declarations",
            type: "matched"
          },
          {
            requirement: "TypeScript Proficiency",
            claim: "Uses type interfaces and compiler annotations in side-projects",
            sourceText: "Profile Declarations",
            type: "matched"
          },
          {
            requirement: "Tailwind CSS",
            claim: "No direct experience listed on profile",
            type: "not_detected",
            details: "Proficient in vanilla CSS3 and responsive styling models."
          },
          {
            requirement: "Next.js Integration",
            claim: "No Next.js experience declared in profile sections",
            type: "not_provided"
          }
        ]
      });
    }

    this.saveState();
  }

  private saveState() {
    if (this.isBrowser()) {
      sessionStorage.setItem(
        "careersync_mock_db",
        JSON.stringify({
          jobs: this.jobs,
          candidates: this.candidates,
          activities: this.activities,
          profile: this.profile,
          applications: this.applications
        })
      );
    }
  }

  // RECRUITER METHODS
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

    // Synchronize to applicant application status if matching
    if (candidateId.startsWith("cand-applicant-")) {
      const jobId = candidate.jobId;
      const app = this.applications.find((a) => a.jobId === jobId);
      if (app) {
        let appStatus: JobApplication["status"] = "screened";
        if (status === "shortlisted") appStatus = "shortlisted";
        else if (status === "interviewing") appStatus = "interviewing";
        else if (status === "rejected") appStatus = "rejected";

        app.status = appStatus;
        app.timeline.push({
          stage: appStatus,
          timestamp: new Date().toISOString(),
          note: `recruiter changed candidate status to: ${status}`
        });
      }
    }

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
      await new Promise((resolve) => setTimeout(resolve, 300));
      onProgress(stage.progress, stage.label);
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    const candId = `cand-${Date.now()}`;
    const charSum = baseName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const scoreSeed = (charSum % 40) + 60;
    
    const newCandidate: Candidate = {
      id: candId,
      jobId: jobId,
      name: baseName,
      currentRole: "Software Engineer",
      location: "San Jose, CA",
      experienceYears: (charSum % 5) + 3,
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

  // APPLICANT METHODS
  async getApplicantProfile(): Promise<ApplicantProfile> {
    this.loadState();
    return this.profile;
  }

  async updateApplicantProfile(profileData: Partial<ApplicantProfile>): Promise<ApplicantProfile> {
    this.loadState();
    this.profile = {
      ...this.profile,
      ...profileData
    };

    // Update synchronized candidate profile in recruiter candidates list
    const applicantCandidate = this.candidates.find(c => c.id === "cand-applicant-job-1");
    if (applicantCandidate) {
      applicantCandidate.name = this.profile.name;
      applicantCandidate.currentRole = this.profile.headline || "Software Engineer";
      applicantCandidate.location = this.profile.location || "Surat, India";
      applicantCandidate.skills = this.profile.skills;
      applicantCandidate.experienceYears = this.profile.experienceYears;
      applicantCandidate.education = this.profile.education || "";
      applicantCandidate.matchedSkills = applicantCandidate.matchedSkills.filter(s => this.profile.skills.includes(s));
    }

    this.saveState();
    return this.profile;
  }

  async getApplications(): Promise<JobApplication[]> {
    this.loadState();
    return this.applications;
  }

  async getApplication(id: string): Promise<JobApplication | null> {
    this.loadState();
    const app = this.applications.find((a) => a.id === id);
    return app || null;
  }

  async applyToJob(jobId: string): Promise<JobApplication> {
    this.loadState();
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const exists = this.applications.some((app) => app.jobId === jobId);
    if (exists) {
      throw new Error("You have already applied to this job.");
    }

    const appId = `app-${Date.now()}`;
    const newApplication: JobApplication = {
      id: appId,
      jobId: jobId,
      appliedAt: new Date().toISOString(),
      status: "applied",
      timeline: [
        {
          stage: "applied",
          timestamp: new Date().toISOString(),
          note: "Application submitted successfully."
        }
      ]
    };

    this.applications.unshift(newApplication);

    // Sync to Recruiter candidate dataset
    const candId = `cand-applicant-${jobId}`;
    const charSum = this.profile.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const scoreSeed = (charSum % 25) + 70; // range 70-95
    
    const newCandidate: Candidate = {
      id: candId,
      jobId: jobId,
      name: this.profile.name,
      currentRole: this.profile.headline || "Software Developer",
      location: this.profile.location || "Surat, India",
      experienceYears: this.profile.experienceYears,
      education: this.profile.education || "B.Tech in Computer Engineering",
      skills: this.profile.skills,
      certifications: [],
      matchScore: scoreSeed,
      skillScore: Math.min(scoreSeed + 5, 100),
      experienceScore: Math.max(scoreSeed - 10, 60),
      educationScore: 90,
      semanticScore: scoreSeed,
      matchedSkills: job.requiredSkills.filter(s => this.profile.skills.includes(s)),
      transferableSkills: this.profile.skills.filter(s => !job.requiredSkills.includes(s)),
      missingSkills: job.requiredSkills.filter(s => !this.profile.skills.includes(s)),
      status: "screened",
      recruiterNotes: "Applied via candidate portal. Review credentials.",
      evidence: job.requiredSkills.map((skill) => {
        const isMatched = this.profile.skills.includes(skill);
        return {
          requirement: `${skill} requirement`,
          claim: isMatched 
            ? `Proficient in ${skill} based on declared skills`
            : `Did not detect direct evidence of ${skill} in resume`,
          sourceText: isMatched ? "Profile declaration" : undefined,
          type: isMatched ? "matched" : "not_detected",
          details: isMatched ? undefined : `Requirement for ${skill} is not explicitly specified in the profile list.`
        };
      })
    };

    this.candidates.push(newCandidate);
    job.applicantCount += 1;

    // Log recruiter activity
    const activityId = `act-${Date.now()}`;
    const newActivity: Activity = {
      id: activityId,
      type: "resume_processed",
      title: `Processed application for ${this.profile.name}`,
      candidateName: this.profile.name,
      jobTitle: job.title,
      timestamp: new Date().toISOString()
    };
    this.activities.unshift(newActivity);

    this.saveState();
    return newApplication;
  }

  async uploadResumeVersion(
    file: File,
    onProgress: (progress: number, stage: string) => void
  ): Promise<ResumeVersion> {
    this.loadState();

    const stages = [
      { progress: 15, label: "Verifying document schema..." },
      { progress: 45, label: "Scanning text nodes..." },
      { progress: 75, label: "Extracting skills credentials..." },
      { progress: 95, label: "Optimizing profile weights..." }
    ];

    for (const stage of stages) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      onProgress(stage.progress, stage.label);
    }

    const newId = `res-${Date.now()}`;
    const newResume: ResumeVersion = {
      id: newId,
      name: file.name,
      uploadedAt: new Date().toISOString(),
      isPrimary: this.profile.resumes.length === 0
    };

    this.profile.resumes.push(newResume);
    
    // Simulate updating applicant skills with some deterministic additions from resume text
    const baseName = file.name.toLowerCase();
    let addedSkill = "";
    if (baseName.includes("tailwind") && !this.profile.skills.includes("Tailwind CSS")) {
      addedSkill = "Tailwind CSS";
    } else if (baseName.includes("next") && !this.profile.skills.includes("Next.js")) {
      addedSkill = "Next.js";
    } else if (baseName.includes("devops") && !this.profile.skills.includes("AWS")) {
      addedSkill = "AWS";
    }

    if (addedSkill) {
      this.profile.skills = [...this.profile.skills, addedSkill];
    }

    this.saveState();
    return newResume;
  }

  async setPrimaryResume(resumeId: string): Promise<void> {
    this.loadState();
    this.profile.resumes = this.profile.resumes.map((r) => ({
      ...r,
      isPrimary: r.id === resumeId
    }));
    this.saveState();
  }

  async deleteResumeVersion(resumeId: string): Promise<void> {
    this.loadState();
    const wasPrimary = this.profile.resumes.find((r) => r.id === resumeId)?.isPrimary;
    this.profile.resumes = this.profile.resumes.filter((r) => r.id !== resumeId);
    
    if (wasPrimary && this.profile.resumes.length > 0) {
      this.profile.resumes[0].isPrimary = true;
    }
    
    this.saveState();
  }
}

export const recruiterService = new RecruiterServiceMock();
export const applicantService = recruiterService;
