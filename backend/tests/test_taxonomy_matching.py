"""
Targeted Verification Tests for CareerSyncAI O*NET 31.0 Taxonomy Integrator.
Verifies:
1. Exact and alias-based occupation matching.
2. Short ambiguous skill disambiguation (Go, R, C, IT) with zero prose false positives.
3. Java vs JavaScript token boundaries.
4. C vs C++ vs C# discrimination.
5. Preservation of original skill string, canonical name, method, and heuristic confidence.
"""
from pathlib import Path
import pytest

from scripts.data_ingestion.taxonomy_integrator import TaxonomyIntegrator


@pytest.fixture(scope="module")
def integrator():
    base_dir = Path(__file__).resolve().parent.parent.parent
    occ_p = base_dir / "data" / "processed" / "occupations" / "occupations.parquet"
    skills_p = base_dir / "data" / "processed" / "occupations" / "technology_skills.parquet"
    return TaxonomyIntegrator(occ_p, skills_p)


def test_occupation_exact_and_alias_matches(integrator):
    # Exact SOC title
    exact_res = integrator.match_occupation("Software Developers")
    assert exact_res["soc_code"] == "15-1252.00"
    assert exact_res["method"] == "exact_title_match"
    assert exact_res["confidence"] == 1.0

    # Industry alias
    alias_res = integrator.match_occupation("Senior Frontend Engineer")
    assert alias_res["soc_code"] == "15-1252.00"
    assert alias_res["method"] == "soc_title_alias_match"
    assert alias_res["confidence"] == 0.90

    # Data Scientist
    ds_res = integrator.match_occupation("Lead Data Scientist")
    assert ds_res["soc_code"] == "15-2051.00"
    assert ds_res["method"] == "soc_title_alias_match"


def test_java_vs_javascript_token_boundary(integrator):
    # Java alone must not match as substring of JavaScript
    java_res = integrator.match_skill("Java", surrounding_text="Core Java and Spring Boot backend")
    assert java_res is not None
    assert java_res["canonical_skill"] == "Java"
    assert java_res["original_skill"] == "Java"

    js_res = integrator.match_skill("JavaScript", surrounding_text="JavaScript and React frontend")
    assert js_res is not None
    assert js_res["canonical_skill"] == "JavaScript"
    assert js_res["canonical_skill"] != "Java"


def test_c_vs_cpp_vs_csharp(integrator):
    # C++
    cpp_res = integrator.match_skill("C++", surrounding_text="C++ systems developer")
    assert cpp_res is not None
    assert cpp_res["canonical_skill"] == "C++"

    # C#
    cs_res = integrator.match_skill("C#", surrounding_text=".NET C# backend")
    assert cs_res is not None
    assert cs_res["canonical_skill"] == "C#"

    # Lone letter C without programming context must be rejected
    c_lone = integrator.match_skill("c", surrounding_text="Candidate with grade c in physics")
    assert c_lone is None

    # C with explicit language context must match
    c_valid = integrator.match_skill("c", surrounding_text="Embedded C programming on ARM microcontrollers")
    assert c_valid is not None
    assert c_valid["canonical_skill"] == "C"


def test_go_disambiguation(integrator):
    # Prose word "go" must be rejected
    prose_go = integrator.match_skill("go", surrounding_text="Candidates should go to the assessment portal")
    assert prose_go is None

    # Golang alias
    alias_go = integrator.match_skill("golang", surrounding_text="Golang backend microservices")
    assert alias_go is not None
    assert alias_go["canonical_skill"] == "Go"

    # Go in tech stack context
    tech_go = integrator.match_skill("go", surrounding_text="Building backend services with Go, Docker, and Kubernetes")
    assert tech_go is not None
    assert tech_go["canonical_skill"] == "Go"


def test_r_disambiguation(integrator):
    # Lone letter R in prose must be rejected
    prose_r = integrator.match_skill("r", surrounding_text="Section r of the document")
    assert prose_r is None

    # R in statistics / data context
    tech_r = integrator.match_skill("r", surrounding_text="Statistical modeling with R programming and ggplot")
    assert tech_r is not None
    assert tech_r["canonical_skill"] == "R"


def test_technical_aliases(integrator):
    aliases = [
        ("k8s", "Kubernetes"),
        ("reactjs", "React"),
        ("nodejs", "Node.js"),
        ("postgres", "PostgreSQL"),
        ("ts", "TypeScript"),
        ("py", "Python"),
    ]
    for raw, expected_canonical in aliases:
        res = integrator.match_skill(raw, surrounding_text="")
        assert res is not None, f"Expected alias match for {raw}"
        assert res["canonical_skill"] == expected_canonical
        assert res["method"] == "alias_match"
        assert res["original_skill"] == raw
