import { Job, Candidate, Activity, ApplicantProfile, ResumeVersion, JobApplication } from "@/types";

export const initialJobs: Job[] = [
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

export const initialCandidates: Candidate[] = [
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

export const initialActivities: Activity[] = [
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

export const initialProfile: ApplicantProfile = {
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

export const initialApplications: JobApplication[] = [
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
