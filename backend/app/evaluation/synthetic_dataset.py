"""
CareerSync AI — Curated Ground-Truth Synthetic Evaluation Benchmark Dataset.

Contains diverse candidate-job pairs spanning the full spectrum:
1. Tier 1 (High Match, 98%): Direct skills, exceeding tenure, exact education
2. Tier 1 (Strong Match, 95%): Direct skills, exact tenure, exact education
3. Tier 1 (Good Match, 85%): Transferable skills, moderate tenure
4. Tier 1 (Moderate Match, 68%): Partial preferred skills, tenure deficit
5. Tier 2 (Required Gap, 25%): Missing mandatory required core skills
"""

from __future__ import annotations

from app.evaluation.benchmark_schema import (
    GroundTruthCandidate,
    GroundTruthItem,
    GroundTruthJob,
)

BENCHMARK_DATASET: list[GroundTruthItem] = [
    # ── Case 1: Senior Full-Stack Top Match (Tier 1, ~97%) ──
    GroundTruthItem(
        id="bench-001",
        candidate=GroundTruthCandidate(
            id="cand-001",
            name="Alice Vance",
            resume_text="""
            Alice Vance — Senior Full-Stack Engineer
            Email: alice.vance@example.com | Phone: (415) 555-0199 | San Francisco, CA
            GitHub: github.com/alice-vance | LinkedIn: linkedin.com/in/alice-vance

            PROFESSIONAL SUMMARY
            Senior Software Engineer with 6 years experience building high-throughput microservices and responsive web applications.

            TECHNICAL SKILLS
            Languages: Python, TypeScript, JavaScript, SQL
            Frameworks: FastAPI, React, Next.js, Django, Node.js
            Cloud & DevOps: Docker, Kubernetes, AWS (EC2, S3), CI/CD, PostgreSQL, Redis

            WORK EXPERIENCE
            Senior Full-Stack Engineer | Acme Fintech (2020 - Present)
            • Architected microservices in Python using FastAPI and PostgreSQL, serving 50k requests/sec.
            • Migrated frontend dashboards to Next.js and TypeScript, improving Core Web Vitals by 45%.
            • Deployed containerized applications with Docker and Kubernetes on AWS.

            Full-Stack Developer | DevCorp Inc (2018 - 2020)
            • Developed customer-facing React components with Tailwind CSS and Redux.
            • Implemented RESTful APIs in Python with Django.

            EDUCATION
            Bachelor of Science in Computer Science | University of California, Berkeley (2014 - 2018)
            """,
            expected_skills=["Python", "TypeScript", "JavaScript", "FastAPI", "React", "Next.js", "Django", "Node.js", "Docker", "Kubernetes", "AWS", "CI/CD", "PostgreSQL", "Redis", "SQL"],
            expected_experience_years=6.0,
            expected_education_degree="Bachelor",
        ),
        job=GroundTruthJob(
            id="job-001",
            title="Senior Full-Stack Engineer",
            description="Seeking Senior Engineer with expertise in Python, FastAPI, React, Next.js, and Docker.",
            required_skills=["Python", "FastAPI", "React", "Next.js"],
            preferred_skills=["Docker", "Kubernetes", "PostgreSQL", "AWS"],
            experience_min_years=5.0,
            education_required="Bachelor",
        ),
        expected_matched_required_skills=["Python", "FastAPI", "React", "Next.js"],
        expected_missing_required_skills=[],
        expected_coverage_tier=1,
        expected_human_fit_rating=99.0,
        notes="Top match: 100% required skills, 100% preferred skills, 6 years tenure against 5 years minimum, Bachelor degree.",
    ),

    # ── Case 2: Cloud Infrastructure & Systems Engineer (Tier 1, ~96.5%) ──
    GroundTruthItem(
        id="bench-002",
        candidate=GroundTruthCandidate(
            id="cand-002",
            name="Clara Chen",
            resume_text="""
            Clara Chen — Systems & Cloud Engineer
            Email: clara.chen@example.com | Phone: (206) 555-0122 | Seattle, WA
            GitHub: github.com/clarachen

            SUMMARY
            Systems programmer with 4 years background writing low-level network daemons in C/C++ and distributed tools in Go.

            TECHNICAL SKILLS
            C language, C++, Go (Golang), Docker, Linux, Kubernetes, gRPC, Bash

            EXPERIENCE
            Systems Engineer | CloudScale Networks (2020 - Present)
            • Built high-performance packet filtering engine in pure C language and C++.
            • Implemented distributed service mesh proxies written in Go microservices.
            • Optimized Linux kernel network queues and containerized deployments using Docker.

            EDUCATION
            Master of Science in Computer Engineering | University of Washington (2018 - 2020)
            """,
            expected_skills=["C", "C++", "Go", "Docker", "Linux", "Kubernetes", "gRPC"],
            expected_experience_years=4.0,
            expected_education_degree="Master",
        ),
        job=GroundTruthJob(
            id="job-002",
            title="Cloud Infrastructure & Systems Engineer",
            description="Needs C++, Go, Docker, Linux, and Kubernetes.",
            required_skills=["C++", "Go", "Docker", "Linux"],
            preferred_skills=["Kubernetes", "gRPC", "Rust"],
            experience_min_years=3.0,
            education_required="Bachelor",
        ),
        expected_matched_required_skills=["C++", "Go", "Docker", "Linux"],
        expected_missing_required_skills=[],
        expected_coverage_tier=1,
        expected_human_fit_rating=96.5,
        notes="Strong match: Tests disambiguation of C and Go, Master degree exceeds Bachelor requirement.",
    ),

    # ── Case 3: Backend Python with Direct API Match (Tier 1, ~98%) ──
    GroundTruthItem(
        id="bench-003",
        candidate=GroundTruthCandidate(
            id="cand-003",
            name="David Kumar",
            resume_text="""
            David Kumar — Backend API Engineer
            Email: david.kumar@example.com | Phone: (617) 555-0188 | Boston, MA

            SUMMARY
            4 years experience designing REST APIs in Python using Django and Django REST Framework.

            SKILLS
            Python, Django, REST APIs, PostgreSQL, Redis, Docker, Git

            EXPERIENCE
            Backend Developer | Apex Commerce (2020 - Present)
            • Developed RESTful services and relational schemas in Python with Django and PostgreSQL.
            • Automated Redis caching layers, cutting database queries by 60%.

            EDUCATION
            Bachelor of Technology in Information Technology | Boston University (2016 - 2020)
            """,
            expected_skills=["Python", "Django", "REST APIs", "PostgreSQL", "Redis", "Docker", "Git"],
            expected_experience_years=4.0,
            expected_education_degree="Bachelor",
        ),
        job=GroundTruthJob(
            id="job-003",
            title="Python Backend Developer",
            description="Requires Python, REST APIs, and PostgreSQL. FastAPI preferred.",
            required_skills=["Python", "REST APIs", "PostgreSQL"],
            preferred_skills=["FastAPI", "Docker", "Redis"],
            experience_min_years=3.0,
            education_required="Bachelor",
        ),
        expected_matched_required_skills=["Python", "REST APIs", "PostgreSQL"],
        expected_missing_required_skills=[],
        expected_coverage_tier=1,
        expected_human_fit_rating=98.0,
        notes="Good match: Direct Python and REST API match.",
    ),

    # ── Case 4: Junior Engineer with Tenure Deficit (Tier 1, ~70%) ──
    GroundTruthItem(
        id="bench-004",
        candidate=GroundTruthCandidate(
            id="cand-004",
            name="Eva Rostova",
            resume_text="""
            Eva Rostova — Junior Frontend Developer
            Email: eva.rostova@example.com | Phone: (312) 555-0177 | Chicago, IL

            SUMMARY
            Passionate frontend engineer with 1.5 years experience building responsive web apps in React and TypeScript.

            SKILLS
            React, TypeScript, JavaScript, HTML5, CSS3, Tailwind CSS, Git

            EXPERIENCE
            Junior Frontend Developer | Chicago Tech (2023 - Present)
            • Developed accessible web user interfaces using React and Tailwind CSS.
            • Maintained typed component libraries in TypeScript.

            EDUCATION
            Bachelor of Science in Web Development | DePaul University (2019 - 2023)
            """,
            expected_skills=["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS", "Git"],
            expected_experience_years=1.5,
            expected_education_degree="Bachelor",
        ),
        job=GroundTruthJob(
            id="job-004",
            title="Senior Frontend Engineer",
            description="Seeking Senior Engineer with 5+ years experience in React, TypeScript, and Next.js.",
            required_skills=["React", "TypeScript"],
            preferred_skills=["Next.js", "Tailwind CSS"],
            experience_min_years=5.0,
            education_required="Bachelor",
        ),
        expected_matched_required_skills=["React", "TypeScript"],
        expected_missing_required_skills=[],
        expected_coverage_tier=1,
        expected_human_fit_rating=70.0,
        notes="Has required skills but significant experience tenure deficit (1.5 yrs vs 5 yrs).",
    ),

    # ── Case 5: Required Skill Gap (Tier 2, ~25%) ──
    GroundTruthItem(
        id="bench-005",
        candidate=GroundTruthCandidate(
            id="cand-005",
            name="Bob Miller",
            resume_text="""
            Bob Miller — Junior Backend Developer
            Email: bob.miller@example.com | Phone: (512) 555-0144 | Austin, TX

            SUMMARY
            Software developer with 2.5 years experience in Java and SQL databases.

            SKILLS
            Java, Spring Boot, MySQL, Git, Linux, Unit Testing

            EXPERIENCE
            Backend Developer | Enterprise Solutions LLC (2022 - Present)
            • Developed Java Spring Boot REST endpoints and maintained MySQL relational databases.
            • Wrote unit tests in JUnit achieving 80% coverage.

            Junior Programmer | Austin Systems (2021 - 2022)
            • Supported internal IT tooling and database scripts.

            EDUCATION
            Associate Degree in Information Technology | Austin Community College (2019 - 2021)
            """,
            expected_skills=["Java", "Spring Boot", "MySQL", "Git", "Linux", "Unit Testing", "REST APIs"],
            expected_experience_years=3.0,
            expected_education_degree="Associate",
        ),
        job=GroundTruthJob(
            id="job-005",
            title="Senior Full-Stack Engineer",
            description="Requires Python, FastAPI, React, Next.js with 5+ years experience.",
            required_skills=["Python", "FastAPI", "React", "Next.js"],
            preferred_skills=["Docker", "PostgreSQL"],
            experience_min_years=5.0,
            education_required="Bachelor",
        ),
        expected_matched_required_skills=[],
        expected_missing_required_skills=["Python", "FastAPI", "React", "Next.js"],
        expected_coverage_tier=2,
        expected_human_fit_rating=25.0,
        notes="Multiple required skill gaps (Python, FastAPI, React, Next.js), tenure deficit, and degree deficit.",
    ),
]
