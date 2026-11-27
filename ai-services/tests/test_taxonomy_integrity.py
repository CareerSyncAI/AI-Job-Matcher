"""Automated Deterministic Taxonomy Integrity Tests for CareerSync AI.

Verifies:
- No duplicate aliases within any canonical skill
- No alias collisions between different canonical skills
- Valid domain references for all canonical skills
- Idempotent and consistent canonical self-normalization
- Integrity and validity of all AMBIGUOUS_SKILLS disambiguation rules
"""

from __future__ import annotations

from src.normalizers.skill_normalizer import SkillNormalizer
from src.normalizers.taxonomy import (
    ALIAS_LOOKUP,
    AMBIGUOUS_SKILLS,
    CANONICAL_SKILLS,
    DOMAINS,
)


def test_domains_validity():
    """Ensure all domains defined in DOMAINS are non-empty strings."""
    assert len(DOMAINS) >= 8
    for domain_code, domain_label in DOMAINS.items():
        assert isinstance(domain_code, str) and domain_code.isupper()
        assert isinstance(domain_label, str) and len(domain_label) > 0


def test_all_canonical_skills_reference_valid_domains():
    """Ensure every canonical skill references a recognized domain in DOMAINS."""
    valid_domain_labels = set(DOMAINS.values())
    for canonical_name, (domain, aliases) in CANONICAL_SKILLS.items():
        assert domain in valid_domain_labels, (
            f"Canonical skill '{canonical_name}' has unrecognized domain '{domain}'"
        )
        assert isinstance(aliases, list) and len(aliases) > 0, (
            f"Canonical skill '{canonical_name}' must have at least one alias"
        )


def test_no_duplicate_aliases_within_any_skill():
    """Ensure no canonical skill lists the same alias multiple times."""
    for canonical_name, (_domain, aliases) in CANONICAL_SKILLS.items():
        lower_aliases = [a.strip().lower() for a in aliases]
        seen = set()
        duplicates = set()
        for a in lower_aliases:
            if a in seen:
                duplicates.add(a)
            seen.add(a)
        assert not duplicates, (
            f"Canonical skill '{canonical_name}' has duplicate aliases: {duplicates}"
        )


def test_no_alias_collisions_between_different_canonical_skills():
    """Ensure no alias maps to more than one canonical skill."""
    alias_to_canonical: dict[str, str] = {}
    collisions: list[tuple[str, str, str]] = []

    for canonical_name, (_domain, aliases) in CANONICAL_SKILLS.items():
        all_variations = [canonical_name.strip().lower()] + [a.strip().lower() for a in aliases]
        for a in all_variations:
            if a in alias_to_canonical and alias_to_canonical[a] != canonical_name:
                collisions.append((a, alias_to_canonical[a], canonical_name))
            else:
                alias_to_canonical[a] = canonical_name

    assert not collisions, (
        f"Found alias collisions between different canonical skills: {collisions}"
    )


def test_alias_lookup_coverage_and_consistency():
    """Verify that ALIAS_LOOKUP maps every canonical skill and alias accurately."""
    for canonical_name, (domain, aliases) in CANONICAL_SKILLS.items():
        # Canonical name itself
        canon_lower = canonical_name.strip().lower()
        assert canon_lower in ALIAS_LOOKUP, f"Canonical '{canonical_name}' missing from ALIAS_LOOKUP"
        assert ALIAS_LOOKUP[canon_lower] == (canonical_name, domain)

        # All aliases
        for alias in aliases:
            a_lower = alias.strip().lower()
            assert a_lower in ALIAS_LOOKUP, f"Alias '{alias}' for '{canonical_name}' missing from ALIAS_LOOKUP"
            assert ALIAS_LOOKUP[a_lower] == (canonical_name, domain)


def test_canonical_skills_normalize_to_themselves_idempotently():
    """Ensure normalizer resolves every canonical skill to itself with 1.0 confidence."""
    normalizer = SkillNormalizer()
    for canonical_name, (domain, _aliases) in CANONICAL_SKILLS.items():
        res = normalizer.normalize_single(canonical_name)
        assert res["matched"] is True
        assert res["canonical"] == canonical_name
        assert res["category"] == domain
        assert res["confidence"] == 1.0


def test_ambiguous_skills_rules_integrity():
    """Verify that all AMBIGUOUS_SKILLS keys exist in ALIAS_LOOKUP with valid contexts."""
    for token, rule in AMBIGUOUS_SKILLS.items():
        assert token.islower(), f"Ambiguous token '{token}' must be lowercase"
        assert token in ALIAS_LOOKUP, (
            f"Ambiguous token '{token}' does not exist in ALIAS_LOOKUP"
        )
        assert "contexts" in rule, f"Ambiguous token '{token}' missing 'contexts' key"
        contexts = rule["contexts"]
        assert isinstance(contexts, list) and len(contexts) > 0, (
            f"Ambiguous token '{token}' must have a non-empty list of contexts"
        )
        for ctx in contexts:
            assert isinstance(ctx, str) and ctx == ctx.lower() and ctx.strip() == ctx, (
                f"Context '{ctx}' for token '{token}' must be a clean lowercase string"
            )
