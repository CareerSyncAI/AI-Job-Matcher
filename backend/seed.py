from __future__ import annotations

import hashlib
from uuid import uuid4

from app.db.session import SessionLocal
from app.models.entities import (
    Application,
    CandidateProfile,
    Job,
    JobSkill,
    RecruiterNote,
    RecruiterProfile,
    Resume,
    User,
)
from app.models.enums import ApplicationStatus, JobStatus, ProcessingStatus, UserRole
from app.security.passwords import hash_password
from app.services.evaluation import EvaluationService


def seed_database() -> None:
    db = SessionLocal()
    print("[*] Seeding CareerSync AI database with deterministic demo data...")
    password_hash = hash_password("Password123456!")

    # 1. Recruiters
    recruiters_data = [
        {
            "email": "recruiter.sarah@careersync.dev",
            "org": "Aurora Intelligence",
        },
        {
            "email": "recruiter.marcus@careersync.dev",
            "org": "Nexus Infrastructure Labs",
        },
    ]

    recruiters: dict[str, RecruiterProfile] = {}
    for r in recruiters_data:
        user = db.query(User).filter(User.email == r["email"]).first()
        if not user:
            user = User(email=r["email"], password_hash=password_hash, role=UserRole.RECRUITER)
            db.add(user)
            db.flush()
            profile = RecruiterProfile(user_id=user.id, organization_name=r["org"])
            db.add(profile)
            db.flush()
        else:
            profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == user.id).first()
        recruiters[r["email"]] = profile

    # 2. Realistic Jobs
    sarah = recruiters["recruiter.sarah@careersync.dev"]
    marcus = recruiters["recruiter.marcus@careersync.dev"]

    jobs_data = [
        {
            "recruiter_id": sarah.id,
            "title": "Senior Frontend Engineer",
            "department": "Product Engineering",
            "location": "San Francisco, CA (Hybrid)",
            "employment_type": "Full-time",
            "work_arrangement": "Hybrid",
            "experience_min_years": 5.0,
            "education_required": "Bachelor",
            "description": "Lead modern client architecture, optimize Next.js App Router performance, and develop accessible UI components using React, TypeScript, and Tailwind CSS.",
            "skills_weight": 35,
            "experience_weight": 35,
            "education_weight": 15,
            "semantic_weight": 15,
            "skills": [
                {"name": "React", "required": True, "min_years": 4.0},
                {"name": "TypeScript", "required": True, "min_years": 3.0},
                {"name": "Next.js", "required": True, "min_years": 2.0},
                {"name": "Tailwind CSS", "required": False, "min_years": 2.0},
            ],
        },
        {
            "recruiter_id": sarah.id,
            "title": "Staff AI Platform Engineer",
            "department": "AI Core Team",
            "location": "Remote (US/Canada)",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 6.0,
            "education_required": "Master",
            "description": "Design high-throughput vector search pipelines, Celery background tasks, and integrate local embedding microservices with PostgreSQL pgvector.",
            "skills_weight": 40,
            "experience_weight": 30,
            "education_weight": 15,
            "semantic_weight": 15,
            "skills": [
                {"name": "Python", "required": True, "min_years": 5.0},
                {"name": "FastAPI", "required": True, "min_years": 3.0},
                {"name": "PyTorch", "required": True, "min_years": 2.0},
                {"name": "Docker", "required": False, "min_years": 2.0},
            ],
        },
        {
            "recruiter_id": marcus.id,
            "title": "Lead DevOps Architect",
            "department": "Infrastructure",
            "location": "Austin, TX (On-site)",
            "employment_type": "Full-time",
            "work_arrangement": "On-site",
            "experience_min_years": 7.0,
            "education_required": "Bachelor",
            "description": "Architect container orchestration, infrastructure-as-code, and automated zero-downtime deployment pipelines using AWS, Docker, and Kubernetes.",
            "skills_weight": 35,
            "experience_weight": 35,
            "education_weight": 15,
            "semantic_weight": 15,
            "skills": [
                {"name": "Kubernetes", "required": True, "min_years": 4.0},
                {"name": "Docker", "required": True, "min_years": 5.0},
                {"name": "AWS", "required": True, "min_years": 4.0},
                {"name": "Python", "required": False, "min_years": 2.0},
            ],
        },
    ]

    jobs: dict[str, Job] = {}
    for jd in jobs_data:
        job = db.query(Job).filter(Job.title == jd["title"], Job.recruiter_id == jd["recruiter_id"]).first()
        if not job:
            job = Job(
                recruiter_id=jd["recruiter_id"],
                title=jd["title"],
                department=jd["department"],
                location=jd["location"],
                employment_type=jd["employment_type"],
                work_arrangement=jd["work_arrangement"],
                experience_min_years=jd["experience_min_years"],
                education_required=jd["education_required"],
                description=jd["description"],
                status=JobStatus.OPEN,
                skills_weight=jd["skills_weight"],
                experience_weight=jd["experience_weight"],
                education_weight=jd["education_weight"],
                semantic_weight=jd["semantic_weight"],
            )
            for s in jd["skills"]:
                job.skills.append(
                    JobSkill(
                        name=s["name"],
                        normalized_name=s["name"].casefold(),
                        required=s["required"],
                        min_years=s["min_years"],
                    )
                )
            db.add(job)
            db.flush()
        jobs[jd["title"]] = job

    # 3. 10 Realistic Candidates with Intentional Variation (Strong, Partial, Weak)
    candidates_data = [
        {
            "email": "alice.vance@example.com",
            "name": "Alice Vance",
            "headline": "Senior Frontend Engineer",
            "location": "San Jose, CA",
            "experience": 6.5,
            "degree": "Bachelor",
            "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS"],
            "resume_text": "Senior Frontend Engineer with 6.5 years experience in React, TypeScript, Next.js, and Tailwind CSS. Built high-traffic web applications.",
        },
        {
            "email": "bob.miller@example.com",
            "name": "Bob Miller",
            "headline": "React Web Developer",
            "location": "San Francisco, CA",
            "experience": 4.0,
            "degree": "Bachelor",
            "skills": ["React", "TypeScript"],
            "resume_text": "React Developer with 4 years experience creating responsive UI components in React and TypeScript. Familiar with CSS utility frameworks.",
        },
        {
            "email": "clara.chen@example.com",
            "name": "Clara Chen",
            "headline": "Junior Frontend Developer",
            "location": "Oakland, CA",
            "experience": 1.5,
            "degree": "Bachelor",
            "skills": ["JavaScript", "HTML", "CSS"],
            "resume_text": "Junior Frontend Developer with 1.5 years experience in HTML, CSS, JavaScript, and basic React web forms.",
        },
        {
            "email": "david.ross@example.com",
            "name": "David Ross",
            "headline": "Senior Machine Learning Architect",
            "location": "Seattle, WA",
            "experience": 8.0,
            "degree": "Master",
            "skills": ["Python", "FastAPI", "PyTorch", "Docker"],
            "resume_text": "Senior ML Architect with 8 years of Python backend experience. Specialized in FastAPI microservices, PyTorch neural architectures, and Docker deployments.",
        },
        {
            "email": "elena.rostova@example.com",
            "name": "Elena Rostova",
            "headline": "Backend Python Developer",
            "location": "Austin, TX",
            "experience": 4.5,
            "degree": "Bachelor",
            "skills": ["Python", "FastAPI"],
            "resume_text": "Backend Engineer with 4.5 years experience in Python and FastAPI REST API development. Strong relational database design.",
        },
        {
            "email": "faisal.khan@example.com",
            "name": "Faisal Khan",
            "headline": "Data Analyst & Junior Python Dev",
            "location": "Chicago, IL",
            "experience": 2.0,
            "degree": "Bachelor",
            "skills": ["Python", "SQL"],
            "resume_text": "Data analyst with 2 years of Python scripting and SQL queries. Looking to transition into software engineering.",
        },
        {
            "email": "grace.hopper@example.com",
            "name": "Grace Hopper",
            "headline": "Principal Cloud Infrastructure Architect",
            "location": "Austin, TX",
            "experience": 9.0,
            "degree": "Master",
            "skills": ["Kubernetes", "Docker", "AWS", "Python"],
            "resume_text": "Principal Infrastructure Architect with 9 years designing enterprise Kubernetes clusters, Docker container platforms, and multi-region AWS cloud systems.",
        },
        {
            "email": "henry.zhao@example.com",
            "name": "Henry Zhao",
            "headline": "Site Reliability Engineer",
            "location": "Dallas, TX",
            "experience": 5.0,
            "degree": "Bachelor",
            "skills": ["Docker", "AWS", "Linux"],
            "resume_text": "SRE with 5 years experience in Docker containerization, AWS operations, and Linux system engineering.",
        },
        {
            "email": "isabella.moretti@example.com",
            "name": "Isabella Moretti",
            "headline": "Junior DevOps Engineer",
            "location": "Houston, TX",
            "experience": 2.0,
            "degree": "Bachelor",
            "skills": ["Docker"],
            "resume_text": "Junior DevOps Engineer with 2 years maintaining Docker containers and basic CI/CD GitHub workflows.",
        },
        {
            "email": "jonathan.taylor@example.com",
            "name": "Jonathan Taylor",
            "headline": "Systems Administrator",
            "location": "Austin, TX",
            "experience": 7.0,
            "degree": "Bachelor",
            "skills": ["Linux", "Bash"],
            "resume_text": "Systems Administrator with 7 years administering on-premise Linux hardware and writing bash scripts.",
        },
    ]

    candidates: dict[str, CandidateProfile] = {}
    for cd in candidates_data:
        user = db.query(User).filter(User.email == cd["email"]).first()
        if not user:
            user = User(email=cd["email"], password_hash=password_hash, role=UserRole.CANDIDATE)
            db.add(user)
            db.flush()
            candidate = CandidateProfile(
                user_id=user.id,
                email=cd["email"],
                name=cd["name"],
                headline=cd["headline"],
                location=cd["location"],
                total_experience_years=cd["experience"],
                education={"degree": cd["degree"], "skills": cd["skills"]},
            )
            db.add(candidate)
            db.flush()
        else:
            candidate = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
        candidates[cd["email"]] = candidate

    # 4. Resumes and Applications
    eval_service = EvaluationService()

    # Map who applies to which job
    application_mappings = [
        # Job: Senior Frontend Engineer
        ("Senior Frontend Engineer", "alice.vance@example.com", candidates_data[0]["resume_text"]),
        ("Senior Frontend Engineer", "bob.miller@example.com", candidates_data[1]["resume_text"]),
        ("Senior Frontend Engineer", "clara.chen@example.com", candidates_data[2]["resume_text"]),
        # Job: Staff AI Platform Engineer
        ("Staff AI Platform Engineer", "david.ross@example.com", candidates_data[3]["resume_text"]),
        ("Staff AI Platform Engineer", "elena.rostova@example.com", candidates_data[4]["resume_text"]),
        ("Staff AI Platform Engineer", "faisal.khan@example.com", candidates_data[5]["resume_text"]),
        # Job: Lead DevOps Architect
        ("Lead DevOps Architect", "grace.hopper@example.com", candidates_data[6]["resume_text"]),
        ("Lead DevOps Architect", "henry.zhao@example.com", candidates_data[7]["resume_text"]),
        ("Lead DevOps Architect", "isabella.moretti@example.com", candidates_data[8]["resume_text"]),
        ("Lead DevOps Architect", "jonathan.taylor@example.com", candidates_data[9]["resume_text"]),
    ]

    for job_title, cand_email, resume_text in application_mappings:
        job = jobs[job_title]
        cand = candidates[cand_email]

        # Check existing application
        existing_app = (
            db.query(Application)
            .filter(Application.job_id == job.id, Application.candidate_id == cand.id)
            .first()
        )
        if not existing_app:
            # Create Resume
            digest = hashlib.sha256(resume_text.encode("utf-8")).hexdigest()
            resume = (
                db.query(Resume)
                .filter(Resume.candidate_id == cand.id, Resume.sha256 == digest)
                .first()
            )
            if not resume:
                resume = Resume(
                    id=uuid4(),
                    candidate_id=cand.id,
                    ingestion_job_id=job.id,
                    original_filename=f"{cand.name.lower().replace(' ', '_')}_resume.pdf",
                    storage_key=f"seeded_{cand.id}_{digest[:8]}.pdf",
                    mime_type="application/pdf",
                    byte_size=len(resume_text),
                    sha256=digest,
                    processing_status=ProcessingStatus.COMPLETED,
                    extracted_text=resume_text,
                )
                db.add(resume)
                db.flush()

            # Create Application
            app = Application(
                job_id=job.id,
                candidate_id=cand.id,
                resume_id=resume.id,
                status=ApplicationStatus.UNDER_REVIEW,
            )
            db.add(app)
            db.flush()

            # Run deterministic evaluation
            eval_service.evaluate_application(db, application_id=app.id, recruiter_id=job.recruiter_id)

            # Add sample recruiter note for top candidate
            if "alice" in cand_email or "david" in cand_email or "grace" in cand_email:
                note = RecruiterNote(
                    application_id=app.id,
                    recruiter_id=job.recruiter_id,
                    body="Demonstrated strong stack alignment during preliminary review. High priority candidate.",
                )
                db.add(note)
                db.flush()

    db.commit()
    db.close()
    print("[+] CareerSync AI database seeded successfully!")


if __name__ == "__main__":
    seed_database()
