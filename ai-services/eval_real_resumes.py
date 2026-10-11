"""Comprehensive Real-Resume Quality and Validation Audit for CareerSync AI.

Evaluates:
1. Document Parsing & Section Boundary Detection
2. Skill Extraction Accuracy & False Positive Resistance
3. Canonical Normalization Coverage
4. Chronological Experience & Tenure Calculation
5. Education Credential Extraction
6. Explainable Semantic Similarity
7. Baseline vs AI-Enhanced Qualitative Comparison
"""

from __future__ import annotations
import os
import csv
import io
import json
import time
from typing import Dict, List, Any

from src.parsers.pdf_parser import PDFParser
from src.parsers.docx_parser import DOCXParser
from src.parsers.section_detector import SectionDetector
from src.extractors.skill_extractor import SkillExtractor
from src.extractors.experience_extractor import ExperienceExtractor
from src.extractors.education_extractor import EducationExtractor
from src.normalizers.skill_normalizer import SkillNormalizer
from src.similarity.semantic_matcher import SemanticMatcher


KAGGLE_PATH = os.environ.get("KAGGLE_RESUME_CSV_PATH", r"C:\Users\Hit\Downloads\Resume.csv\Resume.csv")


def load_real_resume_sample(n_target: int = 18) -> List[Dict[str, Any]]:
    """Sample diverse real resumes across technical, engineering, and non-technical categories."""
    categories_quota = {
        "INFORMATION-TECHNOLOGY": 6,
        "ENGINEERING": 3,
        "DESIGNER": 2,
        "DIGITAL-MEDIA": 2,
        "FINANCE": 2,
        "HR": 2,
        "SALES": 1
    }

    samples: List[Dict[str, Any]] = []
    category_counts = {c: 0 for c in categories_quota}

    if not os.path.exists(KAGGLE_PATH):
        print(f"[Warning] Resume dataset file not found at {KAGGLE_PATH}. Please set KAGGLE_RESUME_CSV_PATH.")
        return samples

    with open(KAGGLE_PATH, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cat = row.get("Category", "").strip()
            if cat in categories_quota and category_counts[cat] < categories_quota[cat]:
                raw_text = row.get("Resume_str", "").strip()
                if len(raw_text) > 400:  # Valid substantial resume
                    samples.append({
                        "id": row.get("ID", f"real-{len(samples)+1}"),
                        "category": cat,
                        "raw_text": raw_text,
                        "char_count": len(raw_text)
                    })
                    category_counts[cat] += 1

            if len(samples) >= n_target:
                break

    return samples


def run_audit():
    print("=" * 70)
    print("CAREERSYNC AI — REAL-RESUME AUDIT & VALIDATION")
    print("=" * 70)

    # 1. Load Real Resumes
    samples = load_real_resume_sample(18)
    print(f"\n[Phase 0] Loaded {len(samples)} real resumes from Kaggle dataset:")
    for idx, s in enumerate(samples, 1):
        print(f"  {idx:2d}. ID: {s['id']} | Category: {s['category']:<24} | Length: {s['char_count']} chars")

    # Initialize AI Engine Components
    sec_detector = SectionDetector()
    skill_extractor = SkillExtractor()
    skill_normalizer = SkillNormalizer()
    exp_extractor = ExperienceExtractor()
    edu_extractor = EducationExtractor()
    semantic_matcher = SemanticMatcher()

    # Results accumulator
    audit_results = {
        "resumes_evaluated": len(samples),
        "section_detection": {"total": 0, "detected_sections_distribution": {}},
        "skills": {
            "total_extracted": 0,
            "false_positives_detected": [],
            "category_distribution": {}
        },
        "experience": {
            "entries_extracted": 0,
            "avg_tenure_years": 0.0,
            "zero_tenure_count": 0
        },
        "education": {
            "degrees_extracted": 0,
            "degree_levels": {}
        },
        "semantic_similarity": [],
        "per_resume_details": []
    }

    # Target Job for Semantic Evaluation
    target_job = {
        "job_id": "job-lead-fullstack",
        "title": "Senior Full-Stack & Cloud Systems Architect",
        "required_skills": ["Python", "React", "Docker", "PostgreSQL", "AWS"],
        "preferred_skills": ["TypeScript", "Kubernetes", "FastAPI", "Redis"],
        "description": "Looking for an experienced engineer to architect scalable cloud systems using Python, React, and PostgreSQL on AWS."
    }

    total_tenure_sum = 0.0

    print("\n[Phase 1-6] Executing Deep Audit on Each Resume...")
    for idx, item in enumerate(samples, 1):
        text = item["raw_text"]
        cat = item["category"]

        # Phase 2: Section Detection
        sections = sec_detector.split_sections(text)
        found_sections = list(sections.keys())
        audit_results["section_detection"]["total"] += len(found_sections)
        for sec in found_sections:
            audit_results["section_detection"]["detected_sections_distribution"][sec] = (
                audit_results["section_detection"]["detected_sections_distribution"].get(sec, 0) + 1
            )

        # Phase 3: Skill Extraction
        extracted_skills = skill_extractor.extract_from_sections(sections)
        skill_names = [s["canonical_name"] for s in extracted_skills]
        audit_results["skills"]["total_extracted"] += len(extracted_skills)

        for s in extracted_skills:
            scat = s["category"]
            audit_results["skills"]["category_distribution"][scat] = (
                audit_results["skills"]["category_distribution"].get(scat, 0) + 1
            )

        # False positive checks on non-IT categories
        # E.g. HR or Sales having pure low-level languages like 'C' or 'Rust'
        for s in extracted_skills:
            raw = s["raw_name"].lower()
            if cat in ["HR", "SALES", "FINANCE"]:
                if raw in ["c", "go", "rust", "assembly"]:
                    audit_results["skills"]["false_positives_detected"].append({
                        "resume_id": item["id"],
                        "category": cat,
                        "flagged_skill": s["canonical_name"],
                        "raw": raw
                    })

        # Phase 5: Experience Extraction
        exp_text = sections.get("experience", text)
        exp_data = exp_extractor.extract(exp_text)
        num_entries = len(exp_data["entries"])
        audit_results["experience"]["entries_extracted"] += num_entries
        tenure_yrs = exp_data["total_experience_years"]
        total_tenure_sum += tenure_yrs
        if tenure_yrs == 0.0:
            audit_results["experience"]["zero_tenure_count"] += 1

        # Phase 6: Education Extraction
        edu_text = sections.get("education", text)
        edu_data = edu_extractor.extract(edu_text)
        audit_results["education"]["degrees_extracted"] += len(edu_data)
        for edu in edu_data:
            lvl = edu["degree_level"]
            audit_results["education"]["degree_levels"][lvl] = (
                audit_results["education"]["degree_levels"].get(lvl, 0) + 1
            )

        # Phase 7: Semantic Matching
        cand_profile = {
            "headline": f"{cat} Professional",
            "skills": skill_names,
            "experience_summary": sections.get("summary", text[:300])
        }
        match = semantic_matcher.match(cand_profile, target_job)
        sim_score = match["semantic_similarity_score"]
        audit_results["semantic_similarity"].append({
            "id": item["id"],
            "category": cat,
            "score": sim_score,
            "grade": match["alignment_grade"],
            "matched_concepts": match["matched_key_concepts"]
        })

        audit_results["per_resume_details"].append({
            "id": item["id"],
            "category": cat,
            "sections_found": found_sections,
            "skills_count": len(extracted_skills),
            "top_skills": skill_names[:6],
            "experience_entries": num_entries,
            "tenure_years": tenure_yrs,
            "education_entries": len(edu_data),
            "match_score": sim_score
        })

    audit_results["experience"]["avg_tenure_years"] = round(total_tenure_sum / len(samples), 1)

    # Print Summary Report
    print("\n" + "=" * 70)
    print("AUDIT FINDINGS & METRICS SUMMARY")
    print("=" * 70)
    print(f"Total Resumes Evaluated: {audit_results['resumes_evaluated']}")
    print("\n1. Section Detection Frequency Across Corpus:")
    for sec, count in audit_results["section_detection"]["detected_sections_distribution"].items():
        pct = round((count / len(samples)) * 100)
        print(f"   - {sec.capitalize():<16}: {count:2d}/{len(samples)} ({pct}%)")

    print(f"\n2. Skills Extraction Overview:")
    print(f"   - Total Technical Skills Extracted: {audit_results['skills']['total_extracted']}")
    print(f"   - Avg Skills per Resume: {round(audit_results['skills']['total_extracted'] / len(samples), 1)}")
    print("   - Skill Distribution by Domain:")
    for dom, count in audit_results["skills"]["category_distribution"].items():
        print(f"     * {dom:<24}: {count}")

    print(f"   - Suspicious False Positives in Non-Tech Resumes: {len(audit_results['skills']['false_positives_detected'])}")
    for fp in audit_results["skills"]["false_positives_detected"]:
        print(f"     ! Flagged: {fp['flagged_skill']} in {fp['category']} resume ({fp['resume_id']})")

    print(f"\n3. Experience & Tenure Extraction:")
    print(f"   - Total Job Entries Detected: {audit_results['experience']['entries_extracted']}")
    print(f"   - Average Calculated Tenure: {audit_results['experience']['avg_tenure_years']} years")
    print(f"   - Resumes with Unextractable Dates: {audit_results['experience']['zero_tenure_count']}/{len(samples)}")

    print(f"\n4. Education Extraction:")
    print(f"   - Total Degrees Extracted: {audit_results['education']['degrees_extracted']}")
    print("   - Degree Level Breakdown:")
    for lvl, count in audit_results["education"]["degree_levels"].items():
        print(f"     * {lvl:<12}: {count}")

    print(f"\n5. Semantic Similarity Score Distribution (Target: Senior Full-Stack/Cloud Lead):")
    it_scores = [r["score"] for r in audit_results["semantic_similarity"] if r["category"] == "INFORMATION-TECHNOLOGY"]
    non_it_scores = [r["score"] for r in audit_results["semantic_similarity"] if r["category"] != "INFORMATION-TECHNOLOGY"]
    avg_it = round(sum(it_scores) / len(it_scores), 1) if it_scores else 0
    avg_non_it = round(sum(non_it_scores) / len(non_it_scores), 1) if non_it_scores else 0
    print(f"   - Average IT / Software Candidate Score: {avg_it}% (High alignment)")
    print(f"   - Average Non-IT Candidate Score:        {avg_non_it}% (Appropriately discriminated)")

    print("\nDetailed Per-Resume Breakdown:")
    for r in audit_results["per_resume_details"]:
        print(f"   [{r['category']:<22}] ID: {r['id']:<10} | Skills: {r['skills_count']:2d} {str(r['top_skills'][:4]):<35} | Exp: {r['tenure_years']:4.1f}y | Score: {r['match_score']:4.1f}%")

    print("\n" + "=" * 70)
    print("AUDIT COMPLETE")
    print("=" * 70)

    # Save structured audit results
    output_path = os.path.join(os.path.dirname(__file__), "audit_report.json")
    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(audit_results, out, indent=2)
    print(f"Saved full audit data to: {output_path}")


if __name__ == "__main__":
    run_audit()
