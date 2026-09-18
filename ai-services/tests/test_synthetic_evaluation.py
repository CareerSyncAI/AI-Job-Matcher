"""End-to-End Evaluation Tests using Synthetic Full-Document Fixtures."""

import os
from src.parsers.section_detector import SectionDetector
from src.extractors.skill_extractor import SkillExtractor
from src.extractors.experience_extractor import ExperienceExtractor
from src.extractors.education_extractor import EducationExtractor
from src.similarity.semantic_matcher import SemanticMatcher


def test_senior_ai_engineer_fixture_evaluation():
    fixture_path = os.path.join(os.path.dirname(__file__), "..", "fixtures", "synthetic", "senior_ai_engineer.txt")
    with open(fixture_path, "r", encoding="utf-8") as f:
        text = f.read()

    detector = SectionDetector()
    sections = detector.split_sections(text)

    assert "skills" in sections
    assert "experience" in sections
    assert "education" in sections

    # 1. Skill Extraction
    skill_ext = SkillExtractor()
    skills = skill_ext.extract_from_sections(sections)
    skill_names = {s["canonical_name"] for s in skills}

    expected_core = {"Python", "PyTorch", "Transformers", "spaCy", "PostgreSQL", "Kafka", "Docker", "Kubernetes", "AWS"}
    # Verify core skills present in the resume are detected
    overlap = expected_core.intersection(skill_names)
    assert len(overlap) >= 7

    # 2. Experience Extraction
    exp_ext = ExperienceExtractor()
    exp_data = exp_ext.extract(sections["experience"])
    assert len(exp_data["entries"]) >= 2
    assert exp_data["total_experience_years"] >= 5.0

    # 3. Education Extraction
    edu_ext = EducationExtractor()
    edu_data = edu_ext.extract(sections["education"])
    assert len(edu_data) >= 2
    degrees = [e["degree_level"] for e in edu_data]
    assert "Master" in degrees
    assert "Bachelor" in degrees

    # 4. Semantic Match against AI requisition
    matcher = SemanticMatcher()
    candidate_profile = {
        "headline": "Senior AI Systems Architect",
        "skills": list(skill_names),
        "experience_summary": sections.get("summary", "")
    }
    job_req = {
        "job_id": "job-ai-lead",
        "title": "Principal AI Inference Architect",
        "required_skills": ["Python", "PyTorch", "Kubernetes", "FastAPI"],
        "preferred_skills": ["PostgreSQL", "Kafka"],
        "description": "Lead high-scale distributed inference systems using Python, PyTorch and Kubernetes."
    }
    match = matcher.match(candidate_profile, job_req)
    assert match["semantic_similarity_score"] >= 75.0
    assert match["alignment_grade"] in ["High", "Moderate"]


def test_fullstack_developer_fixture_evaluation():
    fixture_path = os.path.join(os.path.dirname(__file__), "..", "fixtures", "synthetic", "fullstack_developer.txt")
    with open(fixture_path, "r", encoding="utf-8") as f:
        text = f.read()

    detector = SectionDetector()
    sections = detector.split_sections(text)

    skill_ext = SkillExtractor()
    skills = skill_ext.extract_from_sections(sections)
    skill_names = {s["canonical_name"] for s in skills}

    assert "React" in skill_names
    assert "Next.js" in skill_names
    assert "TypeScript" in skill_names
    assert "Tailwind CSS" in skill_names
    assert "PostgreSQL" in skill_names

    exp_ext = ExperienceExtractor()
    exp_data = exp_ext.extract(sections["experience"])
    assert len(exp_data["entries"]) >= 2
    assert exp_data["total_experience_years"] >= 3.0
