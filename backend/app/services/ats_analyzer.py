"""
CareerSync AI — Standalone ATS Resume Analyzer.

Evaluates resume quality, formatting hygiene, and machine-readability across 5 independent dimensions:
1. Section Completeness (Summary, Experience, Skills, Education, Projects, Certifications)
2. Contact Information Detection & Validity (Email, Phone, LinkedIn/GitHub, Location)
3. Action Verbs & Quantifiable Impact Metrics
4. Formatting, Syntax & Readability (Bullet density, word count, structural balance)
5. Skills Presentation & Technical Keyword Clarity

STRICT RULE: The ATS Score measures general resume readiness and formatting health.
It is NEVER merged with the Job Match Score, which measures candidate fit against a specific job requisition.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ATSIssue:
    category: str      # "sections", "contact", "impact", "formatting", "skills"
    severity: str      # "critical", "warning", "info"
    issue: str
    recommendation: str


@dataclass(frozen=True)
class ATSAnalysisResult:
    overall_ats_score: float  # 0.0 to 100.0
    grade: str                # "A" (>=90), "B" (>=80), "C" (>=70), "D" (>=60), "F" (<60)
    section_score: float      # 0.0 to 100.0
    contact_score: float      # 0.0 to 100.0
    impact_score: float       # 0.0 to 100.0
    formatting_score: float   # 0.0 to 100.0
    skills_score: float       # 0.0 to 100.0
    detected_sections: dict[str, bool]
    detected_skills: list[str]
    missing_critical_sections: list[str]
    contact_details: dict[str, Any]
    action_verbs_found: list[str]
    quantifiable_metrics_count: int
    word_count: int
    strengths: list[str]
    issues: list[ATSIssue]


# Curated Strong Action Verbs for ATS evaluation
STRONG_ACTION_VERBS: set[str] = {
    "accelerated", "accomplished", "achieved", "acquired", "adapted", "administered",
    "advanced", "advised", "allocated", "analyzed", "architected", "automated",
    "boosted", "built", "calculated", "centralized", "championed", "coached",
    "collaborated", "compiled", "composed", "configured", "consolidated", "constructed",
    "converted", "coordinated", "created", "customized", "debugged", "decreased",
    "delivered", "deployed", "designed", "developed", "devised", "diagnosed",
    "directed", "documented", "doubled", "drafted", "drove", "eliminated",
    "enabled", "enforced", "engineered", "enhanced", "established", "evaluated",
    "executed", "expanded", "expedited", "formulated", "founded", "generated",
    "governed", "guided", "halted", "headed", "identified", "implemented",
    "improved", "improvised", "increased", "indexed", "initiated", "innovated",
    "inspected", "installed", "instituted", "instructed", "integrated", "intensified",
    "introduced", "invented", "investigated", "launched", "lead", "led",
    "leveraged", "maintained", "managed", "maximized", "mentored", "migrated",
    "minimized", "modernized", "monitored", "motivated", "negotiated", "obtained",
    "operated", "optimized", "orchestrated", "organized", "overhauled", "oversaw",
    "partnered", "performed", "pioneered", "planned", "prepared", "prioritized",
    "produced", "programmed", "projected", "promoted", "proposed", "published",
    "quantified", "raised", "re-engineered", "rebuilt", "recommended", "reconciled",
    "redesigned", "reduced", "refactored", "refined", "reformed", "remodeled",
    "reorganized", "replaced", "resolved", "restructured", "revamped", "reviewed",
    "revitalized", "saved", "scaled", "scheduled", "screened", "secured",
    "selected", "separated", "simplified", "slashed", "solved", "spearheaded",
    "standardized", "steered", "streamlined", "strengthened", "structured", "supervised",
    "surpassed", "synthesized", "systematized", "tested", "tracked", "trained",
    "transformed", "transitioned", "translated", "tripled", "troubleshot", "unified",
    "upgraded", "utilized", "validated", "verified", "yielded"
}

SECTION_HEADER_REGEXES = {
    "summary": re.compile(r"(?:^|\n)\s*(?:summary|professional summary|executive summary|profile|about me|career objective|objective)\s*(?::|\n|$)", re.IGNORECASE),
    "skills": re.compile(r"(?:^|\n)\s*(?:skills|technical skills|core competencies|technologies|tools & frameworks|tech stack|key skills)\s*(?::|\n|$)", re.IGNORECASE),
    "experience": re.compile(r"(?:^|\n)\s*(?:experience|work experience|professional experience|employment history|work history)\s*(?::|\n|$)", re.IGNORECASE),
    "education": re.compile(r"(?:^|\n)\s*(?:education|academic background|academics|qualifications|degrees)\s*(?::|\n|$)", re.IGNORECASE),
    "projects": re.compile(r"(?:^|\n)\s*(?:projects|personal projects|key projects|academic projects|portfolio)\s*(?::|\n|$)", re.IGNORECASE),
    "certifications": re.compile(r"(?:^|\n)\s*(?:certifications|certificates|licenses|accreditations)\s*(?::|\n|$)", re.IGNORECASE),
}


class ATSAnalyzer:
    """Standalone ATS resume analyzer checking structural, syntactic, and content readiness."""

    def analyze(self, text: str) -> ATSAnalysisResult:
        if not text or not text.strip():
            return self._empty_result()

        words = re.findall(r"\b\w+\b", text)
        word_count = len(words)

        issues: list[ATSIssue] = []
        strengths: list[str] = []

        # ── 1. Section Completeness (Weight: 25%) ──
        detected_sections: dict[str, bool] = {}
        for sec_name, pattern in SECTION_HEADER_REGEXES.items():
            detected_sections[sec_name] = bool(pattern.search(text))

        critical_sections = ["experience", "skills", "education"]
        missing_critical = [sec for sec in critical_sections if not detected_sections.get(sec)]

        sec_score = 0.0
        if detected_sections.get("experience"):
            sec_score += 35.0
        if detected_sections.get("skills"):
            sec_score += 25.0
        if detected_sections.get("education"):
            sec_score += 20.0
        if detected_sections.get("summary"):
            sec_score += 10.0
        if detected_sections.get("projects") or detected_sections.get("certifications"):
            sec_score += 10.0
        sec_score = min(100.0, sec_score)

        if missing_critical:
            issues.append(ATSIssue(
                category="sections",
                severity="critical",
                issue=f"Missing standard section headers: {', '.join(missing_critical).title()}.",
                recommendation="Add explicit standard headings like 'Experience', 'Technical Skills', and 'Education' so parsers can index your background.",
            ))
        else:
            strengths.append("All primary resume sections (Experience, Skills, Education) are clearly detectable.")

        # ── 2. Contact Information (Weight: 20%) ──
        email_match = re.search(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b", text)
        phone_match = re.search(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", text)
        linkedin_match = re.search(r"\b(?:linkedin\.com/in/[A-Za-z0-9._%+\-]+|github\.com/[A-Za-z0-9._%+\-]+)\b", text, re.IGNORECASE)
        location_match = re.search(r"\b(?:[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Za-z]+))\b", text)

        contact_details = {
            "email": email_match.group(0) if email_match else None,
            "phone": phone_match.group(0) if phone_match else None,
            "profile_links": linkedin_match.group(0) if linkedin_match else None,
            "location": location_match.group(0) if location_match else None,
        }

        contact_score = 0.0
        if email_match:
            contact_score += 40.0
        else:
            issues.append(ATSIssue(
                category="contact",
                severity="critical",
                issue="No direct email address found in the parsed text.",
                recommendation="Place your primary professional email clearly at the top of page 1.",
            ))

        if phone_match:
            contact_score += 30.0
        else:
            issues.append(ATSIssue(
                category="contact",
                severity="warning",
                issue="No standard contact telephone number detected.",
                recommendation="Include your phone number formatted with area code (e.g. +1 (555) 012-3456).",
            ))

        if linkedin_match:
            contact_score += 20.0
            strengths.append("Includes recognized professional profile links (LinkedIn/GitHub).")
        else:
            issues.append(ATSIssue(
                category="contact",
                severity="info",
                issue="No LinkedIn or GitHub profile link detected.",
                recommendation="Add a clean URL to your LinkedIn or portfolio profile in the header.",
            ))

        if location_match:
            contact_score += 10.0

        contact_score = min(100.0, contact_score)

        # ── 3. Action Verbs & Impact Metrics (Weight: 20%) ──
        words_lower = [w.lower() for w in words]
        verbs_found = sorted(list({w for w in words_lower if w in STRONG_ACTION_VERBS}))

        # Quantifiable metrics: percentages, currency, numerical values with explicit metric units/multipliers.
        # Excludes standalone 4-digit years (e.g. 2021) and software versions (e.g. 3.10).
        metric_matches = re.findall(
            r"(?:\$[\d,]+(?:\.\d+)?(?:k|m|b|million|billion)?|\b\d+(?:\.\d+)?%|\b\d+x\b|\b\d+\s*(?:k|m|million|billion|users|requests|ms|seconds|hours|\+?\s*years\b))",
            text,
            re.IGNORECASE,
        )
        metric_count = len(metric_matches)

        impact_score = 0.0
        # Verb variety evaluation (target: at least 6 distinct strong action verbs)
        verb_ratio = min(1.0, len(verbs_found) / 6.0)
        impact_score += verb_ratio * 50.0

        # Metric presence evaluation (target: at least 4 quantifiable accomplishments)
        metric_ratio = min(1.0, metric_count / 4.0)
        impact_score += metric_ratio * 50.0
        impact_score = min(100.0, impact_score)

        if len(verbs_found) >= 5:
            strengths.append(f"Strong action-driven vocabulary detected ({len(verbs_found)} distinct impact verbs).")
        else:
            issues.append(ATSIssue(
                category="impact",
                severity="warning",
                issue="Low density of strong action verbs in work descriptions.",
                recommendation="Begin bullet points with active power verbs like 'Architected', 'Engineered', 'Streamlined', 'Reduced'.",
            ))

        if metric_count >= 3:
            strengths.append(f"Includes quantifiable achievements ({metric_count} numerical/metric data points).")
        else:
            issues.append(ATSIssue(
                category="impact",
                severity="warning",
                issue="Few quantifiable results or measurable outcomes detected.",
                recommendation="Quantify your impact with concrete numbers (e.g. 'Reduced latency by 35%', 'Scaled service to 100k daily users').",
            ))

        # ── 4. Formatting & Readability (Weight: 20%) ──
        formatting_score = 100.0

        # Word count checks (Ideal: 350 - 1200 words)
        if word_count < 250:
            formatting_score -= 30.0
            issues.append(ATSIssue(
                category="formatting",
                severity="warning",
                issue=f"Resume is very brief ({word_count} words).",
                recommendation="Expand work descriptions and key projects with detailed responsibilities and technologies used.",
            ))
        elif word_count > 1500:
            formatting_score -= 15.0
            issues.append(ATSIssue(
                category="formatting",
                severity="info",
                issue=f"Resume is very long ({word_count} words).",
                recommendation="Aim for a concise 1-2 page format (under 1,000 words) focused on recent and high-impact achievements.",
            ))
        else:
            strengths.append(f"Optimal word count length ({word_count} words) for automated parsing.")

        # Bullet point check
        bullet_count = len(re.findall(r"(?:^|\n)\s*[•\-\*]\s+", text))
        if bullet_count >= 5:
            strengths.append("Clean bulleted achievement structure.")
        else:
            formatting_score -= 15.0
            issues.append(ATSIssue(
                category="formatting",
                severity="info",
                issue="Few bullet points detected in work experience.",
                recommendation="Use bullet points rather than dense paragraphs to improve readability for ATS parsers.",
            ))

        formatting_score = max(20.0, formatting_score)

        # ── 5. Skills Presentation & Clarity (Weight: 15%) ──
        from app.services.taxonomy import taxonomy
        detected_skills_raw = taxonomy.extract_skills_from_text(text)
        extracted_skills = sorted(list({s["canonical_name"] for s in detected_skills_raw}))
        skill_count = len(extracted_skills)

        skills_score = min(100.0, (skill_count / 8.0) * 100.0)

        if skill_count >= 6:
            strengths.append(f"Clear technical competency indexing ({skill_count} recognized skills extracted).")
        else:
            issues.append(ATSIssue(
                category="skills",
                severity="warning",
                issue="Low density of explicitly recognized technical skills.",
                recommendation="Include a dedicated 'Technical Skills' section categorizing languages, frameworks, databases, and tools.",
            ))

        # ── Composite ATS Score Calculation ──
        overall_score = round(
            (0.25 * sec_score) +
            (0.20 * contact_score) +
            (0.20 * impact_score) +
            (0.20 * formatting_score) +
            (0.15 * skills_score),
            1
        )

        # Letter Grade assignment
        if overall_score >= 90.0:
            grade = "A"
        elif overall_score >= 80.0:
            grade = "B"
        elif overall_score >= 70.0:
            grade = "C"
        elif overall_score >= 60.0:
            grade = "D"
        else:
            grade = "F"

        return ATSAnalysisResult(
            overall_ats_score=overall_score,
            grade=grade,
            section_score=round(sec_score, 1),
            contact_score=round(contact_score, 1),
            impact_score=round(impact_score, 1),
            formatting_score=round(formatting_score, 1),
            skills_score=round(skills_score, 1),
            detected_sections=detected_sections,
            detected_skills=extracted_skills,
            missing_critical_sections=missing_critical,
            contact_details=contact_details,
            action_verbs_found=verbs_found[:12],
            quantifiable_metrics_count=metric_count,
            word_count=word_count,
            strengths=strengths,
            issues=issues,
        )

    def _empty_result(self) -> ATSAnalysisResult:
        return ATSAnalysisResult(
            overall_ats_score=0.0,
            grade="F",
            section_score=0.0,
            contact_score=0.0,
            impact_score=0.0,
            formatting_score=0.0,
            skills_score=0.0,
            detected_sections={},
            detected_skills=[],
            missing_critical_sections=["experience", "skills", "education"],
            contact_details={},
            action_verbs_found=[],
            quantifiable_metrics_count=0,
            word_count=0,
            strengths=[],
            issues=[ATSIssue(
                category="sections",
                severity="critical",
                issue="Resume is empty or unreadable.",
                recommendation="Upload a valid text-based PDF or DOCX file.",
            )],
        )


# Global ATS Analyzer instance
ats_analyzer = ATSAnalyzer()
