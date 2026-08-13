# CareerSync AI — Project Status & Roadmap

This document provides a consolidated overview of project requirements, active progress, completed milestones, and development roadmap.

---

## 📌 Project Overview & Objectives

CareerSync AI is an enterprise-grade AI Talent & Career Intelligence platform designed for 5th Semester SGP:
- **For Hiring Teams**: Deterministic multi-factor candidate ranking, transparent evidence inspection, zero black-box bias.
- **For Candidates**: Target role compatibility testing, 1-click skill gap roadmaps, and automated resume parsing.

---

## 🎯 Completed Milestones

### Frontend Architecture (Next.js 16 + Tailwind v4)
- [x] Full migration to single unified `frontend/` directory.
- [x] Tri-Theme visual engine (*Obsidian Aurora*, *Emerald Cyber*, *Titanium Frost*) with default light mode.
- [x] Global `Cmd+K` Command Palette & Toast Notification System.
- [x] Interactive AI Weight & Match Simulator (`matchingEngine.ts`).
- [x] Applicant Career Hub, Skill Gap Optimizer, Resume Vault, and Recruiter Command Center.
- [x] 100% Type-safe Next.js production build with zero errors across all 14 routes.

### Backend Foundation (FastAPI + PostgreSQL + pgvector)
- [x] FastAPI modular monolith structure with Pydantic v2 schemas.
- [x] SQLAlchemy 2.x models for users, candidates, jobs, applications, resumes, and evaluation runs.
- [x] Alembic migration pipeline (`0001_initial_schema.py`).
- [x] JWT authentication with HttpOnly refresh token rotation and RBAC.
- [x] Docker Compose setup (FastAPI, PostgreSQL 16 + pgvector, Redis, Celery worker).

---

## 🚀 Active Roadmap & Upcoming Slices

1. **Integration Phase 1: Real API Hookup**
   - Connect `frontend/` API client services to `backend/` FastAPI endpoints.
   - Replace mock data with live FastAPI + PostgreSQL queries.

2. **Integration Phase 2: AI Worker Pipeline**
   - Wire Celery + Redis worker to execute 4-stage resume OCR & vector embedding using `pgvector`.
   - Implement real cosine similarity search against candidate embeddings.

3. **Integration Phase 3: Audit & Production Hardening**
   - Complete EEOC PII de-identification audit logging.
   - Deploy Docker environment with health checks and SSL reverse proxy.
