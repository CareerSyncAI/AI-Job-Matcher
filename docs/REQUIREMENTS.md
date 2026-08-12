# 📋 System Requirements Specification (`REQUIREMENTS.md`)

> **PHASE 1 DELIVERABLE: REQUIREMENT ANALYSIS**

---

## 🎯 1. Overview & Project Purpose
Define the primary functional goals, scope boundaries, and user personas for the **AI-Based Resume Screening and Candidate Ranking System**.

---

## 👥 2. User Roles & Personas
- **Recruiter / Hiring Manager**: Posts job descriptions, views ranked candidate lists, inspects score breakdowns, filters candidates, and downloads evaluation reports.
- **Candidate / Job Applicant**: Submits resume (PDF/DOCX), tracks application status, and views basic feedback.
- **System Administrator**: Manages system users, database backups, and AI model configurations.

---

## ⚙️ 3. Functional Requirements (FR)
- [ ] **FR-01: Job Description Management**: Recruiters can create, edit, activate, and archive job postings with required skills, experience thresholds, and weights.
- [ ] **FR-02: Multi-Format Resume Upload**: System accepts PDF and DOCX resume files and parses structured text.
- [ ] **FR-03: Automated Information Extraction**: System extracts candidate contact details, work history, skills, and education using NLP models.
- [ ] **FR-04: Multi-Criteria Candidate Scoring**: System evaluates candidates against job criteria using explainable scoring (Skill match, Experience match, Education match, Semantic similarity).
- [ ] **FR-05: Candidate Ranking Dashboard**: Displays candidates in descending order of match percentage with search and filter controls.
- [ ] **FR-06: Optional Blind / Anonymized Screening Mode**: Recruiter can toggle anonymized view hiding demographic data to eliminate evaluation bias.

---

## 🔒 4. Non-Functional Requirements (NFR)
- [ ] **NFR-01: Performance & Response Time**: Resume parsing and scoring completed in under 5 seconds per document.
- [ ] **NFR-02: Scalability**: System supports parsing batches of up to 50 resumes per job posting.
- [ ] **NFR-03: Security & Privacy**: Sensitive candidate data stored securely; authentication via JWT.
- [ ] **NFR-04: Maintainability**: Decoupled Node.js/Express API and Python/FastAPI microservices.
