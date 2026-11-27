"""Unit tests for Skill Extraction and Normalization Engine."""

import pytest

from src.extractors.skill_extractor import SkillExtractor
from src.normalizers.skill_normalizer import SkillNormalizer


@pytest.fixture
def extractor():
    return SkillExtractor()


@pytest.fixture
def normalizer():
    return SkillNormalizer()


def test_canonical_normalization(normalizer):
    """Verifies that common variations map to canonical skills."""
    test_cases = [
        ("ReactJS", "React", "Frontend Engineering"),
        ("react.js", "React", "Frontend Engineering"),
        ("golang", "Go", "Backend Engineering"),
        ("k8s", "Kubernetes", "Cloud & DevOps"),
        ("Postgres", "PostgreSQL", "Databases & Storage"),
        ("amazon web services", "AWS", "Cloud & DevOps"),
        ("TypeScript", "TypeScript", "Backend Engineering")
    ]

    for raw, expected_can, expected_cat in test_cases:
        res = normalizer.normalize_single(raw)
        assert res["matched"] is True
        assert res["canonical"] == expected_can
        assert res["category"] == expected_cat


def test_skill_extractor_token_boundaries(extractor):
    """Ensures token boundaries prevent false positive substring matching."""
    text = (
        "We are looking for someone who loves to go on hikes and has good trust in colleagues. "
        "Candidate has excellent communication and received Grade C in chemistry."
    )
    # Neither 'Go', 'Rust', nor 'C' should be detected from "to go", "trust", or "Grade C"
    skills = extractor.extract_from_text(text)
    detected_names = [s["canonical_name"] for s in skills]

    assert "Rust" not in detected_names
    assert "Go" not in detected_names
    assert "C" not in detected_names


def test_skill_extractor_valid_technical_context(extractor):
    """Ensures skills in technical context are correctly identified."""
    text = "Proficient in Python, Go (golang), Docker, PostgreSQL, and PyTorch for distributed deep learning."
    skills = extractor.extract_from_text(text)
    detected_names = {s["canonical_name"] for s in skills}

    assert "Python" in detected_names
    assert "Go" in detected_names
    assert "Docker" in detected_names
    assert "PostgreSQL" in detected_names
    assert "PyTorch" in detected_names


def test_section_weighted_extraction(extractor):
    """Verifies skills in the 'skills' section have higher confidence than unstructured sections."""
    sections = {
        "skills": "Python, FastAPI, Redis",
        "summary": "Experienced engineer familiar with Docker"
    }
    extracted = extractor.extract_from_sections(sections)
    skills_map = {s["canonical_name"]: s for s in extracted}

    assert "Python" in skills_map
    assert "FastAPI" in skills_map
    assert "Docker" in skills_map
    # Confidence in 'skills' section should be >= 0.90
    assert skills_map["Python"]["confidence"] >= 0.90


def test_cross_domain_skills_normalization(normalizer):
    """Verifies that non-tech domains (Accounting, Healthcare, Business, Project) normalize correctly."""
    cases = [
        ("accounts payable", "Accounts Payable", "Accounting & Finance"),
        ("tally prime", "Tally", "Accounting & Finance"),
        ("vital signs", "Vital Signs Monitoring", "Healthcare & Nursing"),
        ("ehr", "Electronic Health Records", "Healthcare & Nursing"),
        ("powerbi", "Power BI", "Business Analysis"),
        ("seo", "Search Engine Optimization", "Digital Marketing"),
    ]
    for raw, expected_can, expected_cat in cases:
        res = normalizer.normalize_single(raw)
        assert res["matched"] is True
        assert res["canonical"] == expected_can
        assert res["category"] == expected_cat


def test_cross_domain_ambiguity_disambiguation(extractor):
    """Verifies that ambiguous short terms like 'AP', 'AR', 'GL', 'BLS' require proper context."""
    # Without proper context:
    unrelated_text = "The AP exam was scheduled. AR filters were used. GL was updated."
    detected = {s["canonical_name"] for s in extractor.extract_from_text(unrelated_text)}
    assert "Accounts Payable" not in detected
    assert "Accounts Receivable" not in detected
    assert "General Ledger" not in detected

    # With proper accounting context:
    accounting_text = "Managed AP and AR invoices, reconciled bank accounts, and updated the general ledger."
    detected_acc = {s["canonical_name"] for s in extractor.extract_from_text(accounting_text)}
    assert "Accounts Payable" in detected_acc
    assert "Accounts Receivable" in detected_acc
    assert "General Ledger" in detected_acc


def test_normalizer_handles_bullets_numbers_and_trailing_punctuation(normalizer):
    """Verifies that normalizer strips leading bullets, list markers, and trailing punctuation."""
    test_cases = [
        ("• Python", "Python", "Backend Engineering"),
        ("1. Docker", "Docker", "Cloud & DevOps"),
        ("1) AWS", "AWS", "Cloud & DevOps"),
        ("- Kubernetes", "Kubernetes", "Cloud & DevOps"),
        ("React,", "React", "Frontend Engineering"),
        ("FastAPI;", "FastAPI", "Backend Engineering"),
        ("C#;", "C#", "Backend Engineering"),
        ("C++.", "C++", "Backend Engineering"),
        (".NET", "C#", "Backend Engineering"),
        ("ASP.NET Core", "C#", "Backend Engineering"),
        ("FastAPI (v0.100)", "FastAPI", "Backend Engineering"),
    ]
    for raw, expected_can, expected_cat in test_cases:
        res = normalizer.normalize_single(raw)
        assert res["matched"] is True, f"Failed to match '{raw}'"
        assert res["canonical"] == expected_can, f"Expected '{expected_can}' for '{raw}', got '{res['canonical']}'"
        assert res["category"] == expected_cat


def test_normalizer_handles_adversarial_spacing_delimiters_and_malformed_input(normalizer):
    """Long noisy input is handled without regex backtracking or losing skill punctuation."""
    cases = [
        ("\t  \u2022\t1.\tPython,,,,;;;;", "Python", True),
        ("React (v18)", "React", True),
        ("--- / React ???", "React", True),
        ("C#", "C#", True),
        ("C++", "C++", True),
        ("Bank reconciliation", "Bank Reconciliation", True),
        ("Uncatalogued community practice", "Uncatalogued Community Practice", False),
    ]
    for raw, expected, matched in cases:
        result = normalizer.normalize_single(raw)
        assert result["canonical"] == expected
        assert result["matched"] is matched

    malformed = normalizer.normalize_single("[" + " " * 5000 + "Python")
    assert malformed["matched"] is True
    assert malformed["canonical"] == "Python"
    long_noise = normalizer.normalize_single((" \t,;" * 10000) + "Unknown Skill")
    assert long_noise["matched"] is False


def test_false_positive_elimination_in_prose(extractor):
    """Ensures that common prose words are NOT falsely extracted as technical skills."""
    prose_cases = [
        ("Please review my attached CV for details on my background.", "Computer Vision"),
        ("Looking for my next career opportunity in a collaborative team.", "Next.js"),
        ("I collaborated closely with the rest of the engineering team.", "REST APIs"),
        ("I would like to express my enthusiasm for this role.", "Express.js"),
        ("Must be able to react quickly to production incidents and outages.", "React"),
        ("Maintained and monitored a 5-node server cluster in the datacenter.", "Node.js"),
        ("We are ready to go forward with the new business strategy.", "Go"),
        ("Please proceed to section R in the appendix.", "R"),
    ]
    for text, unexpected_skill in prose_cases:
        detected = {s["canonical_name"] for s in extractor.extract_from_text(text)}
        assert unexpected_skill not in detected, (
            f"Falsely extracted '{unexpected_skill}' from prose: '{text}'"
        )


def test_no_false_positive_js_from_library_names_or_extensions(extractor):
    """Ensures that Vue.js, Node.js, Next.js do NOT trigger JavaScript via the .js substring."""
    text = "We developed high performance web applications using Vue.js, Node.js, and Express.js."
    skills = extractor.extract_from_text(text)
    detected_names = {s["canonical_name"] for s in skills}

    assert "Vue.js" in detected_names
    assert "Node.js" in detected_names
    assert "Express.js" in detected_names
    # 'JavaScript' should NOT be extracted just because '.js' appears in Vue.js / Node.js
    assert "JavaScript" not in detected_names


def test_technical_punctuation_and_versions_extraction(extractor):
    """Verifies that modern C++, .NET versions, and punctuated technical skills extract cleanly."""
    text = (
        "Built low-latency trading engines with C++17 and C++20. "
        "Also created microservices using ASP.NET Core and .NET 8, deployed via CI/CD pipelines."
    )
    skills = extractor.extract_from_text(text)
    detected_names = {s["canonical_name"] for s in skills}

    assert "C++" in detected_names
    assert "C#" in detected_names
    assert "CI/CD" in detected_names
    assert "Microservices" in detected_names


def test_legitimate_technical_ambiguous_skills_extracted(extractor):
    """Ensures that ambiguous skills ARE extracted when legitimate technical context is present."""
    cases = [
        (
            "Conducted Computer Vision (CV) research using OpenCV and PyTorch for image segmentation.",
            "Computer Vision",
        ),
        (
            "Built responsive frontend UI components using React and Next.js with Tailwind CSS.",
            "Next.js",
        ),
        (
            "Developed REST APIs with Express and Node.js on a PostgreSQL database.",
            "Express.js",
        ),
        (
            "Experienced in REST APIs and GraphQL for distributed microservice architectures.",
            "REST APIs",
        ),
        (
            "Languages: C, Go, Python, and R for data science and statistical analysis.",
            "C",
        ),
        (
            "Backend microservices in Node and Express on Docker.",
            "Node.js",
        ),
        (
            "Developed responsive user interfaces with React and TypeScript.",
            "React",
        ),
        (
            "High-throughput backend services written in Go with Docker containers.",
            "Go",
        ),
        (
            "Statistical modeling, data science, and analytics using R and Python.",
            "R",
        ),
        (
            "Engineered backend microservices using C# and .NET 8 on Azure.",
            "C#",
        ),
        (
            "Optimized graphics pipeline algorithms in modern C++.",
            "C++",
        ),
    ]
    for text, expected_skill in cases:
        detected = {s["canonical_name"] for s in extractor.extract_from_text(text)}
        assert expected_skill in detected, (
            f"Expected '{expected_skill}' to be extracted from technical text: '{text}'"
        )


def test_cross_section_disambiguation_preserves_acronyms(extractor):
    """Verifies that full document context from experience section disambiguates skills in skills section."""
    sections = {
        "skills": "AP, AR, QuickBooks, Excel",
        "experience": "Senior Accountant managing general ledger, journal entries, and balance sheet reconciliations."
    }
    extracted = extractor.extract_from_sections(sections)
    detected_names = {s["canonical_name"] for s in extracted}

    assert "Accounts Payable" in detected_names
    assert "Accounts Receivable" in detected_names
    assert "QuickBooks" in detected_names


def test_expanded_technical_skills_and_delimiters(extractor, normalizer):
    """Verifies that newly added competencies (Celery, RabbitMQ, Bootstrap, OpenAPI) and delimiters are handled."""
    # 1. Normalization with delimiters
    delimited_cases = [
        ("(Docker)", "Docker", "Cloud & DevOps"),
        ("• Python/", "Python", "Backend Engineering"),
        ("React (v19)/", "React", "Frontend Engineering"),
        ("RabbitMQ", "RabbitMQ", "Backend Engineering"),
        ("celery", "Celery", "Backend Engineering"),
        ("Swagger UI", "OpenAPI", "Backend Engineering"),
        ("bootstrap 5", "Bootstrap", "Frontend Engineering"),
    ]
    for raw, expected_can, expected_cat in delimited_cases:
        res = normalizer.normalize_single(raw)
        assert res["matched"] is True
        assert res["canonical"] == expected_can
        assert res["category"] == expected_cat

    # 2. Extraction from text
    sample_text = "Designed asynchronous worker architecture using Celery and RabbitMQ with OpenAPI specs and Bootstrap UI."
    skills = extractor.extract_from_text(sample_text)
    detected_names = {s["canonical_name"] for s in skills}

    assert "Celery" in detected_names
    assert "RabbitMQ" in detected_names
    assert "OpenAPI" in detected_names
    assert "Bootstrap" in detected_names


def test_helm_and_kubernetes_are_separate_skills(extractor, normalizer):
    """Verifies Helm is a distinct canonical skill, not an alias of Kubernetes."""
    # 1. Normalization distinction
    helm_res = normalizer.normalize_single("helm")
    assert helm_res["matched"] is True
    assert helm_res["canonical"] == "Helm"
    assert helm_res["category"] == "Cloud & DevOps"

    helm_chart_res = normalizer.normalize_single("helm charts")
    assert helm_chart_res["matched"] is True
    assert helm_chart_res["canonical"] == "Helm"

    k8s_res = normalizer.normalize_single("k8s")
    assert k8s_res["matched"] is True
    assert k8s_res["canonical"] == "Kubernetes"

    # 2. Extractor with technical context extracts Helm
    tech_text = "Managed container clusters on Kubernetes using Helm charts for deployment automation."
    tech_skills = {s["canonical_name"] for s in extractor.extract_from_text(tech_text)}
    assert "Kubernetes" in tech_skills
    assert "Helm" in tech_skills

    # 3. Disambiguation prevents false positive in leadership prose
    prose_text = "She served at the helm of the organization for five years, driving record business growth."
    prose_skills = {s["canonical_name"] for s in extractor.extract_from_text(prose_text)}
    assert "Helm" not in prose_skills
