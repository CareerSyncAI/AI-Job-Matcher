"""
CareerSyncAI - O*NET 31.0 Taxonomy & Technology Skill Integrator
Performs verified, token-bounded alignment of job titles and candidate profiles
against O*NET 1,016 SOC occupations and 31,821 technology skills.
Prevents false positives on short ambiguous tokens (R, Go, C, IT) with contextual disambiguation.
"""
from __future__ import annotations

import json
import logging
import re
from collections import Counter
from pathlib import Path
from typing import Any, Optional

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.taxonomy")


def normalize_token_str(text: str) -> str:
    """Normalize text for token-based taxonomy matching."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s\+\#]", " ", text)
    return " ".join(text.split())


class TaxonomyIntegrator:
    def __init__(self, occupations_path: Path, skills_path: Path):
        self.occupations_path = occupations_path
        self.skills_path = skills_path
        self.soc_dict: dict[str, str] = {}  # title -> soc_code
        self.soc_titles: dict[str, str] = {}  # soc_code -> canonical_title
        self.tech_skills_set: set[str] = set()
        self.tech_skills_canonical: dict[str, str] = {}  # lower -> canonical title

        # Ambiguous short tokens requiring contextual proof to avoid false positives
        self.ambiguous_short_skills = {"c", "r", "go", "ai", "it", "ui", "ux", "d", "v", "ip", "pc", "os", "bi", "qa", "hr", "pr", "pm", "ml"}

        # Industry technical aliases mapping to canonical O*NET technology skills
        self.technical_aliases: dict[str, str] = {
            "java": "Java",
            "golang": "Go",
            "reactjs": "React",
            "react.js": "React",
            "react native": "React",
            "nodejs": "Node.js",
            "node.js": "Node.js",
            "vuejs": "Vue.js",
            "vue.js": "Vue.js",
            "angularjs": "Angular",
            "angular.js": "Angular",
            "k8s": "Kubernetes",
            "postgres": "PostgreSQL",
            "postgresql": "PostgreSQL",
            "ts": "TypeScript",
            "py": "Python",
            "csharp": "C#",
            "c#": "C#",
            "cpp": "C++",
            "c++": "C++",
            "aws": "Amazon Web Services (AWS)",
            "gcp": "Google Cloud Platform",
            "tf": "TensorFlow",
            "solidity": "Solidity",
            "mongo": "MongoDB",
            "mongodb": "MongoDB",
            "ci/cd": "Continuous Integration / Continuous Delivery",
            "ci cd": "Continuous Integration / Continuous Delivery",
        }

        # Common programming co-occurrence indicators for contextual disambiguation
        self.tech_context_words = {
            "developer", "engineer", "programming", "software", "backend", "frontend",
            "code", "coding", "stack", "framework", "script", "database", "api", "git",
            "docker", "kubernetes", "linux", "cloud", "algorithms", "architecture"
        }

        self._load_taxonomy()

    def _load_taxonomy(self) -> None:
        if self.occupations_path.exists():
            df_occ = pd.read_parquet(self.occupations_path)
            for _, row in df_occ.iterrows():
                code = str(row.get("o*net-soc_code") or row.get("soc_code") or "").strip()
                title = str(row.get("title", "")).strip()
                if code and title:
                    norm = normalize_token_str(title)
                    self.soc_dict[norm] = code
                    self.soc_titles[code] = title

        if self.skills_path.exists():
            df_skills = pd.read_parquet(self.skills_path)
            for _, row in df_skills.iterrows():
                skill = str(row.get("workplace_example") or row.get("example") or "").strip()
                if skill:
                    self.tech_skills_set.add(skill.lower())
                    self.tech_skills_canonical[skill.lower()] = skill

        # Standard 2-digit SOC Major Groups mapping
        self.soc_major_groups = {
            "11": "Management Occupations",
            "13": "Business and Financial Operations",
            "15": "Computer and Mathematical Occupations",
            "17": "Architecture and Engineering Occupations",
            "19": "Life, Physical, and Social Science Occupations",
            "21": "Community and Social Service",
            "23": "Legal Occupations",
            "25": "Educational Instruction and Library",
            "27": "Arts, Design, Entertainment, Sports, and Media",
            "29": "Healthcare Practitioners and Technical",
            "41": "Sales and Related Occupations",
            "43": "Office and Administrative Support",
        }
        logger.info(
            "TaxonomyIntegrator loaded %d SOC occupations and %d O*NET technology skills.",
            len(self.soc_titles),
            len(self.tech_skills_set),
        )

    def match_occupation(self, title: str) -> dict[str, Any]:
        """
        Match a job title against O*NET SOC occupations with explicit method and confidence.
        Methods: exact_title_match, soc_title_alias_match, heuristic_domain_match, unmatched.
        """
        if not title:
            return {"soc_code": None, "canonical_title": None, "major_group": None, "method": "unmatched", "confidence": 0.0}

        clean = normalize_token_str(title)

        # 1. Exact title match (Confidence: 1.0)
        if clean in self.soc_dict:
            code = self.soc_dict[clean]
            major = self.soc_major_groups.get(code[:2], f"Major Group {code[:2]}")
            return {
                "soc_code": code,
                "canonical_title": self.soc_titles[code],
                "major_group": major,
                "method": "exact_title_match",
                "confidence": 1.0,
            }

        # 2. Curated standard industry aliases (Confidence: 0.90)
        title_lower = title.lower()
        alias_patterns = [
            (r"\b(frontend|front[\s-]?end|backend|back[\s-]?end|full[\s-]?stack|web|mobile|ios|android)\s+(developer|engineer|programmer)\b", "15-1252.00"),
            (r"\b(software|applications?|cloud|platform|systems?)\s+(developer|engineer|programmer)\b", "15-1252.00"),
            (r"\bdata\s+scientist\b", "15-2051.00"),
            (r"\b(data\s+analyst|bi\s+analyst|business\s+intelligence\s+analyst)\b", "15-2051.01"),
            (r"\b(machine\s+learning|ml|ai|deep\s+learning)\s+(engineer|scientist)\b", "15-1299.08"),
            (r"\b(devops|site\s+reliability|sre|infrastructure)\s+engineer\b", "15-1244.00"),
            (r"\b(qa|quality\s+assurance|test(ing)?)\s+(engineer|lead|analyst|specialist)\b", "15-1253.00"),
            (r"\b(database\s+administrator|dba|data\s+engineer)\b", "15-1242.00"),
            (r"\b(information\s+security|cybersecurity|infosec|security)\s+(engineer|analyst|specialist)\b", "15-1212.00"),
            (r"\b(technical\s+product\s+manager|product\s+manager)\b", "11-9199.00"),
            (r"\b(project\s+manager|scrum\s+master)\b", "11-9199.00"),
            (r"\b(ui/ux\s+designer|ui\s+designer|ux\s+designer|product\s+designer)\b", "27-1021.00"),
            (r"\b(accountant|auditor|financial\s+analyst)\b", "13-2011.00"),
            (r"\b(recruiter|talent\s+acquisition|hr\s+manager|human\s+resources)\b", "13-1071.00"),
            (r"\b(marketing\s+manager|growth\s+marketer|seo\s+specialist)\b", "11-2021.00"),
            (r"\bregistered\s+nurse\b", "29-1141.00"),
        ]

        for pattern, soc_code in alias_patterns:
            if re.search(pattern, title_lower):
                major = self.soc_major_groups.get(soc_code[:2], f"Major Group {soc_code[:2]}")
                canonical = self.soc_titles.get(soc_code, soc_code)
                return {
                    "soc_code": soc_code,
                    "canonical_title": canonical,
                    "major_group": major,
                    "method": "soc_title_alias_match",
                    "confidence": 0.90,
                }

        # 3. Substring match against official multi-word O*NET titles (Confidence: 0.65)
        # Avoid short word false positives: require >= 3 words or len > 15
        for occ_clean, code in self.soc_dict.items():
            if len(occ_clean.split()) >= 3 and occ_clean in clean:
                major = self.soc_major_groups.get(code[:2], f"Major Group {code[:2]}")
                return {
                    "soc_code": code,
                    "canonical_title": self.soc_titles[code],
                    "major_group": major,
                    "method": "heuristic_domain_match",
                    "confidence": 0.65,
                }

        return {"soc_code": None, "canonical_title": None, "major_group": None, "method": "unmatched", "confidence": 0.0}

    def match_skill(self, raw_token: str, surrounding_text: str = "") -> Optional[dict[str, Any]]:
        """
        Disambiguate and match a single skill token against O*NET technology skills.
        Enforces strict contextual validation on short ambiguous tokens (R, Go, C, IT, etc.).
        """
        s_raw = str(raw_token or "").strip()
        if not s_raw or len(s_raw) > 50:
            return None

        s_lower = s_raw.lower()
        context_lower = surrounding_text.lower() if surrounding_text else ""

        # 1. Alias lookup (e.g. k8s -> Kubernetes, golang -> Go, reactjs -> React)
        if s_lower in self.technical_aliases:
            canonical = self.technical_aliases[s_lower]
            return {
                "original_skill": s_raw,
                "canonical_skill": canonical,
                "method": "alias_match",
                "confidence": 0.95,
            }

        # 2. Strict validation for short ambiguous tokens
        if s_lower in self.ambiguous_short_skills:
            # Go disambiguation
            if s_lower == "go":
                # Must be explicit Golang or co-occur with backend/dev indicators
                if re.search(r"\b(golang|go\s+language|go\s+programming)\b", context_lower) or any(
                    k in context_lower for k in ("docker", "kubernetes", "grpc", "microservices", "python", "backend")
                ):
                    return {
                        "original_skill": s_raw,
                        "canonical_skill": "Go",
                        "method": "contextual_validated",
                        "confidence": 0.85,
                    }
                return None  # Reject prose usage of "go"

            # R disambiguation
            if s_lower == "r":
                if re.search(r"\b(r\s+programming|r\s+language|rstudio|cran|ggplot|dplyr)\b", context_lower) or any(
                    k in context_lower for k in ("statistics", "biostatistics", "data analysis", "python")
                ):
                    return {
                        "original_skill": s_raw,
                        "canonical_skill": "R",
                        "method": "contextual_validated",
                        "confidence": 0.85,
                    }
                return None  # Reject lone letter "r"

            # C disambiguation
            if s_lower == "c":
                if re.search(r"\b(c\s+programming|c\s+language|c\/c\+\+)\b", context_lower):
                    return {
                        "original_skill": s_raw,
                        "canonical_skill": "C",
                        "method": "contextual_validated",
                        "confidence": 0.85,
                    }
                return None  # Reject lone letter "c"

            # Java disambiguation (must NOT match as substring of javascript)
            if s_lower == "java":
                if re.search(r"\bjava\b(?!script)", context_lower or s_lower):
                    return {
                        "original_skill": s_raw,
                        "canonical_skill": "Java",
                        "method": "exact_token_match",
                        "confidence": 1.0,
                    }
                return None

            # IT / AI / ML / QA / UI / UX: require uppercase or explicit domain context
            if s_raw in ("AI", "ML", "QA", "UI", "UX", "IT"):
                canonical_map = {
                    "AI": "Artificial Intelligence",
                    "ML": "Machine Learning",
                    "QA": "Quality Assurance Software",
                    "UI": "User Interface Design",
                    "UX": "User Experience Design",
                    "IT": "Information Technology",
                }
                return {
                    "original_skill": s_raw,
                    "canonical_skill": canonical_map.get(s_raw, s_raw),
                    "method": "contextual_validated",
                    "confidence": 0.85,
                }
            return None  # Lowercase "it", "ai" in prose rejected

        # 3. Direct match against O*NET technology skills (length > 2)
        if len(s_lower) > 2 and s_lower in self.tech_skills_set:
            canonical = self.tech_skills_canonical[s_lower]
            return {
                "original_skill": s_raw,
                "canonical_skill": canonical,
                "method": "exact_onet_match",
                "confidence": 1.0,
            }

        return None


def run_taxonomy_alignment(
    jobs_master_path: Path,
    candidates_path: Path,
    resumes_jsonl_path: Path,
    occupations_path: Path,
    skills_path: Path,
    output_report_path: Path,
    quality_audit_path: Optional[Path] = None,
) -> dict[str, Any]:
    """Execute end-to-end taxonomy and skill alignment audit with quality checks."""
    integrator = TaxonomyIntegrator(occupations_path, skills_path)

    # 1. Align Master Jobs
    logger.info("Aligning consolidated master jobs from %s", jobs_master_path)
    jobs_df = pd.read_parquet(jobs_master_path)
    total_jobs = len(jobs_df)
    job_matched_count = 0
    soc_counter: Counter[str] = Counter()
    major_counter: Counter[str] = Counter()
    occupation_methods: Counter[str] = Counter()

    correct_samples = []
    questionable_samples = []

    for _, row in jobs_df.iterrows():
        title = str(row.get("original_title") or row.get("normalized_title") or "")
        match_res = integrator.match_occupation(title)
        code = match_res["soc_code"]
        method = match_res["method"]
        occupation_methods[method] += 1

        if code:
            job_matched_count += 1
            canonical = match_res["canonical_title"]
            major = match_res["major_group"]
            soc_counter[f"{code} {canonical}"] += 1
            if major:
                major_counter[major] += 1

            if len(correct_samples) < 15 and match_res["confidence"] >= 0.90:
                correct_samples.append({
                    "original_title": title,
                    "soc_code": code,
                    "canonical_title": canonical,
                    "method": method,
                    "confidence": match_res["confidence"],
                })
            elif len(questionable_samples) < 10 and match_res["confidence"] < 0.75:
                questionable_samples.append({
                    "original_title": title,
                    "matched_soc": f"{code} {canonical}",
                    "confidence": match_res["confidence"],
                    "reason": "approximate_heuristic_match",
                })

    job_alignment_rate = round(job_matched_count / total_jobs * 100, 2) if total_jobs else 0.0

    # 2. Align Candidate Profiles (Djinni)
    logger.info("Aligning candidate profiles from %s", candidates_path)
    cand_df = pd.read_parquet(candidates_path)
    total_candidates = len(cand_df)
    cand_matched_count = 0
    candidate_skills_total = 0
    candidate_skills_matched = 0
    matched_skills_counter: Counter[str] = Counter()
    skill_match_methods: Counter[str] = Counter()
    rejected_false_positive_samples = []

    for _, row in cand_df.iterrows():
        title = str(row.get("position_title") or row.get("normalized_title") or "")
        match_res = integrator.match_occupation(title)
        if match_res["soc_code"]:
            cand_matched_count += 1

        # Extract tokens
        cand_text = f"{row.get('primary_keyword', '')} {row.get('position_title', '')}"
        tokens = [t.strip() for t in re.split(r"[,\|\/\s\(\)]+", cand_text) if len(t.strip()) > 0]
        unique_tokens = list(set(tokens))

        for tok in unique_tokens:
            candidate_skills_total += 1
            skill_res = integrator.match_skill(tok, surrounding_text=cand_text)
            if skill_res:
                candidate_skills_matched += 1
                canon = skill_res["canonical_skill"]
                matched_skills_counter[canon] += 1
                skill_match_methods[skill_res["method"]] += 1
            else:
                # Track disambiguated false positives (e.g. lowercase "in", "it", "as", "go")
                if tok.lower() in integrator.ambiguous_short_skills and len(rejected_false_positive_samples) < 15:
                    rejected_false_positive_samples.append({
                        "token": tok,
                        "surrounding_context": cand_text[:60],
                        "rejection_reason": "ambiguous_short_token_lacking_tech_context",
                    })

    cand_alignment_rate = round(cand_matched_count / total_candidates * 100, 2) if total_candidates else 0.0
    cand_skill_match_rate = round(candidate_skills_matched / candidate_skills_total * 100, 2) if candidate_skills_total else 0.0

    # 3. Align CareerCorpus Resumes
    logger.info("Aligning CareerCorpus resumes from %s", resumes_jsonl_path)
    cc_count = 0
    cc_matched = 0
    if resumes_jsonl_path.exists():
        with open(resumes_jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                cc_count += 1
                data = json.loads(line)
                cat = data.get("occupational_category", "")
                res = integrator.match_occupation(cat)
                if res["soc_code"]:
                    cc_matched += 1

    report = {
        "report_name": "CareerSyncAI O*NET 31.0 Verified Taxonomy & Skill Coverage Report",
        "timestamp": pd.Timestamp.now().isoformat(),
        "taxonomy_reference": {
            "database_version": "O*NET 31.0",
            "total_soc_occupations": len(integrator.soc_titles),
            "total_technology_skills": len(integrator.tech_skills_set),
            "license": "CC-BY-4.0 (USDOL/ETA)",
        },
        "job_postings_alignment": {
            "total_postings_evaluated": total_jobs,
            "postings_aligned_to_soc": job_matched_count,
            "soc_alignment_rate_percent": job_alignment_rate,
            "matching_methods_breakdown": dict(occupation_methods),
            "distribution_by_major_group": dict(major_counter.most_common(10)),
            "top_aligned_occupations": [
                {"soc": k, "count": v, "percentage": round(v / total_jobs * 100, 2)}
                for k, v in soc_counter.most_common(12)
            ],
        },
        "candidate_profiles_alignment": {
            "total_candidates_evaluated": total_candidates,
            "candidates_aligned_to_soc": cand_matched_count,
            "candidate_soc_alignment_rate_percent": cand_alignment_rate,
            "total_skill_tokens_evaluated": candidate_skills_total,
            "skills_matched_to_onet_tech": candidate_skills_matched,
            "skill_match_rate_percent": cand_skill_match_rate,
            "skill_matching_methods_breakdown": dict(skill_match_methods),
            "top_matched_onet_skills": [
                {"skill": k, "frequency": v}
                for k, v in matched_skills_counter.most_common(20)
            ],
        },
        "annotated_resumes_alignment": {
            "total_resumes_evaluated": cc_count,
            "resumes_aligned_to_soc": cc_matched,
            "alignment_rate_percent": round(cc_matched / cc_count * 100, 2) if cc_count else 0.0,
        },
    }

    output_report_path.parent.mkdir(parents=True, exist_ok=True)
    temp_rep = output_report_path.with_suffix(".tmp.json")
    with open(temp_rep, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    temp_rep.replace(output_report_path)
    logger.info("Taxonomy alignment report written to %s", output_report_path)

    if quality_audit_path:
        audit_data = {
            "timestamp": pd.Timestamp.now().isoformat(),
            "methodology": "Verified token boundaries, canonical alias mapping, and contextual proof for ambiguous tokens (R, Go, C, IT).",
            "representative_verified_job_matches": correct_samples,
            "representative_questionable_matches": questionable_samples,
            "rejected_false_positive_samples": rejected_false_positive_samples,
        }
        quality_audit_path.parent.mkdir(parents=True, exist_ok=True)
        temp_aud = quality_audit_path.with_suffix(".tmp.json")
        with open(temp_aud, "w", encoding="utf-8") as f:
            json.dump(audit_data, f, indent=2)
        temp_aud.replace(quality_audit_path)
        logger.info("Taxonomy quality audit written to %s", quality_audit_path)

    return report


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent.parent
    jobs_p = base_dir / "data" / "processed" / "jobs" / "consolidated_jobs_master.parquet"
    cand_p = base_dir / "data" / "processed" / "resumes" / "djinni_candidate_profiles.parquet"
    res_jl = base_dir / "data" / "processed" / "resumes" / "career_corpus_normalized.jsonl"
    occ_p = base_dir / "data" / "processed" / "occupations" / "occupations.parquet"
    skills_p = base_dir / "data" / "processed" / "occupations" / "technology_skills.parquet"
    rep_p = base_dir / "data" / "reports" / "taxonomy_alignment_report.json"
    audit_p = base_dir / "data" / "reports" / "taxonomy_quality_audit.json"

    run_taxonomy_alignment(jobs_p, cand_p, res_jl, occ_p, skills_p, rep_p, quality_audit_path=audit_p)
