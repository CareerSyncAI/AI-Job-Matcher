"""
CareerSyncAI - Data Normalization Pipeline
Normalizes raw job postings, resumes, and taxonomies into standard canonical schemas.
"""
from __future__ import annotations

import csv
import json
import logging
import re
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import pandas as pd
import pyarrow.parquet as pq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.normalize")


@dataclass
class NormalizedJob:
    job_id: str
    source_id: str
    source_name: str
    original_title: str
    normalized_title: str
    company: str
    location: str
    country: str
    employment_type: str
    experience_requirements: str
    education_requirements: str
    required_skills: list[str] = field(default_factory=list)
    preferred_skills: list[str] = field(default_factory=list)
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    description: str = ""
    responsibilities: str = ""
    qualifications: str = ""
    source_url: str = ""
    published_date: str = ""
    collected_at: str = ""
    licence_reference: str = ""


@dataclass
class NormalizedResume:
    resume_id: str
    source_dataset: str
    occupational_category: str
    extracted_skills: list[str] = field(default_factory=list)
    education: list[dict[str, Any]] = field(default_factory=list)
    experience: list[dict[str, Any]] = field(default_factory=list)
    certifications: list[str] = field(default_factory=list)
    projects: list[str] = field(default_factory=list)
    source_format: str = "text"
    anonymization_status: str = "anonymized"
    record_type: str = "annotated_resume"
    annotation_labels: dict[str, Any] = field(default_factory=dict)
    extraction_metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedCandidateProfile:
    candidate_id: str
    source_dataset: str
    position_title: str
    normalized_title: str
    primary_keyword: str
    english_level: str
    experience_years: Optional[float]
    highlights: str
    looking_for: str
    cv_summary: str
    cv_lang: str
    record_type: str = "candidate_profile"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedCareerTrajectory:
    trajectory_id: str
    source_dataset: str
    person_id: str
    matched_esco_code: str
    start_date: str
    end_date: str
    university_level: str
    record_type: str = "career_trajectory"



def clean_html_text(raw_html: str) -> str:
    """Strip HTML tags and unescape entities cleanly."""
    if not raw_html:
        return ""
    import html
    text = re.sub(r"<br\s*/?>|</p>|</div>|</li>", "\n", raw_html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def normalize_open_apply_jobs(
    parquet_path: Path,
    output_path: Path,
    max_records: int = 5000,
) -> int:
    """Normalize Open Apply parquet partition into canonical NormalizedJob records."""
    if not parquet_path.exists():
        logger.warning("Open Apply parquet file not found at %s", parquet_path)
        return 0

    table = pq.read_table(parquet_path)
    df = table.to_pandas()
    logger.info("Loaded Open Apply parquet with %d rows. Columns: %s", len(df), list(df.columns))

    records: list[dict[str, Any]] = []
    collected_iso = datetime.now(timezone.utc).isoformat()

    count = 0
    for _, row in df.iterrows():
        if count >= max_records:
            break

        orig_title = str(row.get("title") or row.get("job_title") or "").strip()
        if not orig_title or orig_title.lower() == "nan":
            continue

        company = str(row.get("source_slug") or row.get("company_name") or row.get("company") or "").strip()

        # Handle location which could be an array, list, or scalar
        loc_val = row.get("locations")
        if loc_val is not None:
            if hasattr(loc_val, "__iter__") and not isinstance(loc_val, (str, bytes)):
                location = ", ".join(str(x) for x in loc_val if x and str(x).lower() != "nan")
            else:
                location = str(loc_val) if pd.notna(loc_val) else ""
        else:
            loc_val2 = row.get("location")
            location = str(loc_val2) if loc_val2 is not None and pd.notna(loc_val2) else str(row.get("city") or "")
        location = location.strip()
        country = str(row.get("country") or "").strip()

        # Clean description HTML
        raw_desc = str(row.get("description_html") or row.get("description") or row.get("body") or "")
        clean_desc = clean_html_text(raw_desc) if ("<" in raw_desc and ">" in raw_desc) else raw_desc.strip()
        if len(clean_desc) < 50:
            continue

        source_url = str(row.get("apply_url") or row.get("url") or row.get("job_url") or "").strip()
        source_id = str(row.get("id") or row.get("job_id") or uuid.uuid5(uuid.NAMESPACE_URL, source_url or orig_title))
        pub_date = str(row.get("posted_at") or row.get("date_posted") or row.get("created_at") or "").strip()

        # Title normalizer
        norm_title = re.sub(r"\b(remote|hybrid|onsite|full[-\s]time|part[-\s]time|contract|urgent)\b", "", orig_title, flags=re.IGNORECASE)
        norm_title = re.sub(r"[_\-\|\(\)]+", " ", norm_title)
        norm_title = " ".join(norm_title.split()).title()

        sal_min = float(row.get("salary_min")) if pd.notna(row.get("salary_min")) else None
        sal_max = float(row.get("salary_max")) if pd.notna(row.get("salary_max")) else None
        curr = str(row.get("salary_currency")) if pd.notna(row.get("salary_currency")) else None

        job_record = NormalizedJob(
            job_id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"openapply:{source_id}")),
            source_id=source_id,
            source_name="open_apply",
            original_title=orig_title,
            normalized_title=norm_title or orig_title,
            company=company if company.lower() != "nan" else "Unknown",
            location=location if location.lower() != "nan" else "Unspecified",
            country=country if country.lower() != "nan" else "Global",
            employment_type=str(row.get("employment_type") or "Full-time"),
            experience_requirements="",
            education_requirements="",
            required_skills=[],
            preferred_skills=[],
            salary_min=sal_min,
            salary_max=sal_max,
            currency=curr,
            description=clean_desc,
            responsibilities="",
            qualifications="",
            source_url=source_url,
            published_date=pub_date,
            collected_at=collected_iso,
            licence_reference="Public Employer ATS Postings",
        )
        records.append(asdict(job_record))
        count += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_df = pd.DataFrame(records)
    out_df.to_parquet(output_path, index=False)
    logger.info("Normalized %d job records saved to %s", len(records), output_path)
    return len(records)


def normalize_career_corpus(
    excel_path: Path,
    output_path: Path,
) -> int:
    """Normalize CareerCorpus excel workbook into canonical NormalizedResume records."""
    if not excel_path.exists():
        logger.warning("CareerCorpus excel file not found at %s", excel_path)
        return 0

    excel_file = pd.ExcelFile(excel_path)
    logger.info("Loaded CareerCorpus workbook. Sheets: %s", excel_file.sheet_names)

    records: list[dict[str, Any]] = []

    for sheet_name in excel_file.sheet_names:
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        logger.info("Sheet [%s] has %d rows and columns: %s", sheet_name, len(df), list(df.columns))

        for idx, row in df.iterrows():
            domain = str(row.get("Domain") or row.get("Category") or sheet_name).strip()
            edu_text = str(row.get("Education") or "").strip()
            skills_text = str(row.get("Skills and Achievements") or "").strip()
            exp_text = str(row.get("Experience") or "").strip()
            row_id = str(row.get("ID") or idx)

            full_text = (
                f"DOMAIN: {domain}\n\n"
                f"EDUCATION:\n{edu_text}\n\n"
                f"SKILLS AND ACHIEVEMENTS:\n{skills_text}\n\n"
                f"EXPERIENCE:\n{exp_text}"
            ).strip()

            if len(full_text) < 30:
                continue

            ann_1 = row.get("Annotator-1")
            ann_2 = row.get("Annotator-2")
            job_type = row.get("Job_type")

            resume_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"career_corpus:{row_id}"))
            resume_rec = NormalizedResume(
                resume_id=resume_id,
                source_dataset="CareerCorpus",
                occupational_category=domain,
                extracted_skills=[],
                education=[{"degree_text": edu_text}] if edu_text else [],
                experience=[{"experience_text": exp_text}] if exp_text else [],
                certifications=[],
                projects=[],
                source_format="excel_tabular",
                anonymization_status="fully_anonymized",
                annotation_labels={
                    "annotator_1": ann_1 if pd.notna(ann_1) else None,
                    "annotator_2": ann_2 if pd.notna(ann_2) else None,
                    "job_type": str(job_type) if pd.notna(job_type) else None,
                },
                extraction_metadata={
                    "sheet": sheet_name,
                    "row_id": row_id,
                    "char_count": len(full_text),
                    "raw_text": full_text,
                },
            )
            records.append(asdict(resume_rec))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    logger.info("Normalized %d CareerCorpus resumes saved to %s", len(records), output_path)
    return len(records)


def normalize_stapply_jobs(
    parquet_path: Path,
    output_path: Path,
    rejections_path: Optional[Path] = None,
    max_records: int = 30000,
    batch_size: int = 5000,
) -> int:
    """Stream and normalize Stapply Open Job Data using bounded batches to protect memory."""
    if not parquet_path.exists():
        logger.warning("Stapply parquet file not found at %s", parquet_path)
        return 0

    pf = pq.ParquetFile(parquet_path)
    logger.info("Reading Stapply from %s (Total rows: %d, Row groups: %d)", parquet_path, pf.metadata.num_rows, pf.num_row_groups)

    cols = [
        "global_id", "uuid", "title", "company", "ats_type", "ats_id",
        "location", "country_iso", "language", "is_stale", "salary_min",
        "salary_max", "salary_currency", "employment_type", "description",
        "posted_at", "url", "apply_url", "experience", "education_requirements",
        "skill_requirements", "fetched_at"
    ]

    records: list[dict[str, Any]] = []
    rejections: dict[str, int] = {
        "missing_title": 0,
        "empty_or_short_description": 0,
        "stale_listing": 0,
        "non_english": 0,
    }
    collected_iso = datetime.now(timezone.utc).isoformat()
    count = 0

    for batch in pf.iter_batches(batch_size=batch_size, columns=cols):
        if count >= max_records:
            break
        df = batch.to_pandas()
        for _, row in df.iterrows():
            if count >= max_records:
                break

            # Filter stale
            if bool(row.get("is_stale")):
                rejections["stale_listing"] += 1
                continue

            # Filter non-English
            lang = str(row.get("language") or "").lower().strip()
            if lang and lang != "en":
                rejections["non_english"] += 1
                continue

            orig_title = str(row.get("title") or "").strip()
            if not orig_title or orig_title.lower() == "nan":
                rejections["missing_title"] += 1
                continue

            raw_desc = str(row.get("description") or "").strip()
            if len(raw_desc) < 50:
                rejections["empty_or_short_description"] += 1
                continue

            clean_desc = clean_html_text(raw_desc) if ("<" in raw_desc and ">" in raw_desc) else raw_desc
            if len(clean_desc) < 50:
                rejections["empty_or_short_description"] += 1
                continue

            gid = str(row.get("global_id") or row.get("uuid") or row.get("ats_id") or "")
            source_url = str(row.get("apply_url") or row.get("url") or "").strip()
            job_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"stapply:{gid or source_url or orig_title}"))

            # Clean title
            norm_title = re.sub(r"\b(remote|hybrid|onsite|full[-\s]time|part[-\s]time|contract|urgent)\b", "", orig_title, flags=re.IGNORECASE)
            norm_title = re.sub(r"[_\-\|\(\)]+", " ", norm_title)
            norm_title = " ".join(norm_title.split()).title()

            company = str(row.get("company") or "Unknown").strip()
            location = str(row.get("location") or "Unspecified").strip()
            country = str(row.get("country_iso") or "Global").strip()
            emp_type = str(row.get("employment_type") or "Full-time").strip()

            sal_min = float(row.get("salary_min")) if pd.notna(row.get("salary_min")) else None
            sal_max = float(row.get("salary_max")) if pd.notna(row.get("salary_max")) else None
            curr = str(row.get("salary_currency")) if pd.notna(row.get("salary_currency")) else None

            pub_date = str(row.get("posted_at") or "").strip()
            exp_req = str(row.get("experience") or "").strip() if pd.notna(row.get("experience")) else ""
            edu_req = str(row.get("education_requirements") or "").strip() if pd.notna(row.get("education_requirements")) else ""

            # Skills
            req_skills = []
            skill_val = str(row.get("skill_requirements") or "")
            if skill_val and skill_val.lower() != "nan":
                req_skills = [s.strip() for s in skill_val.split(",") if s.strip()]

            rec = NormalizedJob(
                job_id=job_id,
                source_id=gid,
                source_name="stapply",
                original_title=orig_title,
                normalized_title=norm_title or orig_title,
                company=company,
                location=location,
                country=country,
                employment_type=emp_type,
                experience_requirements=exp_req,
                education_requirements=edu_req,
                required_skills=req_skills,
                preferred_skills=[],
                salary_min=sal_min,
                salary_max=sal_max,
                currency=curr,
                description=clean_desc,
                responsibilities="",
                qualifications="",
                source_url=source_url,
                published_date=pub_date,
                collected_at=collected_iso,
                licence_reference="Stapply Open Job Data / Employer Postings (data.stapply.ai)",
            )
            records.append(asdict(rec))
            count += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_df = pd.DataFrame(records)
    out_df.to_parquet(output_path, index=False)
    logger.info("Saved %d normalized Stapply jobs to %s", len(records), output_path)

    if rejections_path:
        rejections_path.parent.mkdir(parents=True, exist_ok=True)
        with open(rejections_path, "w", encoding="utf-8") as f:
            json.dump({
                "source": "stapply",
                "normalized_count": len(records),
                "rejections": rejections,
            }, f, indent=2)
        logger.info("Saved Stapply rejections report to %s", rejections_path)

    return len(records)


def normalize_djinni_jobs(
    parquet_path: Path,
    output_path: Path,
    max_records: int = 15000,
    batch_size: int = 5000,
) -> int:
    """Normalize Djinni English jobs into canonical NormalizedJob records."""
    if not parquet_path.exists():
        logger.warning("Djinni jobs file not found at %s", parquet_path)
        return 0

    pf = pq.ParquetFile(parquet_path)
    records: list[dict[str, Any]] = []
    collected_iso = datetime.now(timezone.utc).isoformat()
    count = 0

    for batch in pf.iter_batches(batch_size=batch_size):
        if count >= max_records:
            break
        df = batch.to_pandas()
        for _, row in df.iterrows():
            if count >= max_records:
                break
            orig_title = str(row.get("Position") or "").strip()
            desc = str(row.get("Long Description") or "").strip()
            if not orig_title or len(desc) < 30:
                continue

            row_id = str(row.get("id") or count)
            job_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"djinni:{row_id}"))

            norm_title = re.sub(r"[_\-\|\(\)]+", " ", orig_title)
            norm_title = " ".join(norm_title.split()).title()

            primary_kw = str(row.get("Primary Keyword") or "").strip()
            req_skills = [primary_kw] if primary_kw and primary_kw.lower() != "nan" else []

            comp = str(row.get("Company Name") or "Unknown").strip()
            if comp.lower() == "nan":
                comp = "Unknown"

            rec = NormalizedJob(
                job_id=job_id,
                source_id=row_id,
                source_name="djinni",
                original_title=orig_title,
                normalized_title=norm_title or orig_title,
                company=comp,
                location="Remote / Global",
                country="Global",
                employment_type="Full-time",
                experience_requirements=str(row.get("Exp Years") or ""),
                education_requirements="",
                required_skills=req_skills,
                preferred_skills=[],
                salary_min=None,
                salary_max=None,
                currency=None,
                description=desc,
                responsibilities="",
                qualifications="",
                source_url=f"https://djinni.co/jobs/{row_id}",
                published_date=str(row.get("Published") or ""),
                collected_at=collected_iso,
                licence_reference="Djinni Recruitment Dataset (MIT / Lang-UK / ACL 2024)",
            )
            records.append(asdict(rec))
            count += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_df = pd.DataFrame(records)
    out_df.to_parquet(output_path, index=False)
    logger.info("Saved %d normalized Djinni jobs to %s", len(records), output_path)
    return len(records)


def normalize_djinni_candidates(
    parquet_path: Path,
    output_path: Path,
    max_records: int = 15000,
    batch_size: int = 5000,
) -> int:
    """Normalize Djinni candidate profiles into structured profiles Parquet."""
    if not parquet_path.exists():
        logger.warning("Djinni candidates file not found at %s", parquet_path)
        return 0

    pf = pq.ParquetFile(parquet_path)
    records: list[dict[str, Any]] = []
    count = 0

    for batch in pf.iter_batches(batch_size=batch_size):
        if count >= max_records:
            break
        df = batch.to_pandas()
        for _, row in df.iterrows():
            if count >= max_records:
                break
            pos = str(row.get("Position") or "").strip()
            cid = str(row.get("id") or count)
            if not pos:
                continue

            exp_yrs = float(row.get("Experience Years")) if pd.notna(row.get("Experience Years")) else None
            norm_title = " ".join(re.sub(r"[_\-\|\(\)]+", " ", pos).split()).title()

            prof = NormalizedCandidateProfile(
                candidate_id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"djinni_candidate:{cid}")),
                source_dataset="Djinni",
                position_title=pos,
                normalized_title=norm_title,
                primary_keyword=str(row.get("Primary Keyword") or ""),
                english_level=str(row.get("English Level") or ""),
                experience_years=exp_yrs,
                highlights=str(row.get("Highlights") or ""),
                looking_for=str(row.get("Looking For") or ""),
                cv_summary=str(row.get("Moreinfo") or ""),
                cv_lang=str(row.get("CV_lang") or "en"),
                record_type="candidate_profile",
                metadata={"raw_id": cid},
            )
            records.append(asdict(prof))
            count += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_df = pd.DataFrame(records)
    out_df.to_parquet(output_path, index=False)
    logger.info("Saved %d normalized Djinni candidate profiles to %s", len(records), output_path)
    return len(records)


def normalize_jobhop_trajectories(
    parquet_path: Path,
    output_path: Path,
    max_records: int = 25000,
    batch_size: int = 5000,
) -> int:
    """Normalize JobHop career trajectories into structured career transitions Parquet."""
    if not parquet_path.exists():
        logger.warning("JobHop parquet file not found at %s", parquet_path)
        return 0

    pf = pq.ParquetFile(parquet_path)
    records: list[dict[str, Any]] = []
    count = 0

    for batch in pf.iter_batches(batch_size=batch_size):
        if count >= max_records:
            break
        df = batch.to_pandas()
        for _, row in df.iterrows():
            if count >= max_records:
                break
            rid = str(row.get("resume_id") or count)
            code = str(row.get("matched_code") or "")
            s_date = str(row.get("start_date") or "")
            e_date = str(row.get("end_date") or "")
            u_level = str(row.get("university_level") or "")

            traj = NormalizedCareerTrajectory(
                trajectory_id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"jobhop:{rid}:{code}:{s_date}")),
                source_dataset="JobHop_v2",
                person_id=rid,
                matched_esco_code=code,
                start_date=s_date,
                end_date=e_date,
                university_level=u_level,
                record_type="career_trajectory",
            )
            records.append(asdict(traj))
            count += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_df = pd.DataFrame(records)
    out_df.to_parquet(output_path, index=False)
    logger.info("Saved %d normalized JobHop career trajectories to %s", len(records), output_path)
    return len(records)


def normalize_onet_taxonomy(
    extracted_dir: Path,
    output_dir: Path,
) -> dict[str, int]:
    """Normalize O*NET 31.0 text tables into clean Parquet taxonomy lookup tables."""
    if not extracted_dir.exists():
        logger.warning("O*NET extracted directory not found at %s", extracted_dir)
        return {}

    output_dir.mkdir(parents=True, exist_ok=True)
    results = {}

    # Find the extracted folder (e.g. db_31_0_text/)
    data_dir = extracted_dir
    subdirs = [d for d in extracted_dir.iterdir() if d.is_dir()]
    if subdirs:
        data_dir = subdirs[0]

    logger.info("Reading O*NET tables from %s", data_dir)

    # 1. Occupations
    occ_file = data_dir / "Occupation Data.txt"
    if occ_file.exists():
        df_occ = pd.read_csv(occ_file, sep="\t", dtype=str)
        df_occ.columns = [c.strip().lower().replace(" ", "_") for c in df_occ.columns]
        out_occ = output_dir / "occupations.parquet"
        df_occ.to_parquet(out_occ, index=False)
        results["occupations"] = len(df_occ)
        logger.info("Saved %d O*NET occupations to %s", len(df_occ), out_occ)

    # 2. Skills
    skills_file = data_dir / "Skills.txt"
    if skills_file.exists():
        df_skills = pd.read_csv(skills_file, sep="\t", dtype=str)
        df_skills.columns = [c.strip().lower().replace(" ", "_") for c in df_skills.columns]
        out_skills = output_dir / "skills.parquet"
        df_skills.to_parquet(out_skills, index=False)
        results["skills"] = len(df_skills)
        logger.info("Saved %d O*NET skill ratings to %s", len(df_skills), out_skills)

    # 3. Technology / Software Skills
    tech_file = data_dir / "Technology Skills.txt"
    if not tech_file.exists():
        tech_file = data_dir / "Software Skills.txt"
    if tech_file.exists():
        df_tech = pd.read_csv(tech_file, sep="\t", dtype=str)
        df_tech.columns = [c.strip().lower().replace(" ", "_") for c in df_tech.columns]
        out_tech = output_dir / "technology_skills.parquet"
        df_tech.to_parquet(out_tech, index=False)
        results["technology_skills"] = len(df_tech)
        logger.info("Saved %d O*NET technology skills to %s", len(df_tech), out_tech)

    return results


def run_normalization_step(base_dir: Optional[Path] = None) -> dict[str, int]:
    """Execute normalization across all downloaded and manual datasets."""
    root = base_dir or Path.cwd()
    stats = {}

    # 1. Jobs: Open Apply
    oa_in = root / "data/raw/jobs/open_apply/0.parquet"
    oa_out = root / "data/processed/jobs/open_apply_normalized.parquet"
    if oa_in.exists():
        stats["open_apply_jobs"] = normalize_open_apply_jobs(oa_in, oa_out, max_records=5000)

    # 2. Jobs: Djinni English Postings
    dj_in = root / "data/raw/jobs/djinni/djinni_jobs_en.parquet"
    dj_out = root / "data/processed/jobs/djinni_jobs_normalized.parquet"
    if dj_in.exists():
        stats["djinni_jobs"] = normalize_djinni_jobs(dj_in, dj_out, max_records=15000)

    # 3. Jobs: Stapply Open Job Data (all.parquet)
    stapply_candidates = [
        root / "data/raw/jobs/stapply/all.parquet",
        root / "data/raw/jobs/stapply/stapply_aggregated.parquet",
        root.parent / "all.parquet",
        Path(r"C:\Users\Hit\Desktop\SGP 5TH Sem\all.parquet"),
    ]
    stapply_in = next((p for p in stapply_candidates if p.exists()), None)
    if stapply_in:
        st_out = root / "data/processed/jobs/stapply_normalized.parquet"
        st_rej = root / "data/reports/stapply_ingestion_rejections.json"
        stats["stapply_jobs"] = normalize_stapply_jobs(stapply_in, st_out, st_rej, max_records=30000)

    # 4. Resumes: CareerCorpus
    cc_in = root / "data/raw/resumes/career_corpus/CareerCorpus.xlsx"
    cc_out = root / "data/processed/resumes/career_corpus_normalized.jsonl"
    if cc_in.exists():
        stats["career_corpus_resumes"] = normalize_career_corpus(cc_in, cc_out)

    # 5. Candidate Profiles: Djinni
    dj_cv_in = root / "data/raw/resumes/djinni/djinni_candidates_en.parquet"
    dj_cv_out = root / "data/processed/resumes/djinni_candidate_profiles.parquet"
    if dj_cv_in.exists():
        stats["djinni_candidate_profiles"] = normalize_djinni_candidates(dj_cv_in, dj_cv_out, max_records=15000)

    # 6. Career Trajectories: JobHop v2
    jh_in = root / "data/raw/taxonomies/jobhop/JobHop_v2_train.parquet"
    jh_out = root / "data/processed/occupations/jobhop_career_trajectories.parquet"
    if jh_in.exists():
        stats["jobhop_trajectories"] = normalize_jobhop_trajectories(jh_in, jh_out, max_records=25000)

    # 7. Taxonomy: O*NET 31.0
    onet_in = root / "data/raw/taxonomies/onet/extracted"
    onet_out = root / "data/processed/occupations"
    stats.update(normalize_onet_taxonomy(onet_in, onet_out))

    return stats


if __name__ == "__main__":
    run_normalization_step()
