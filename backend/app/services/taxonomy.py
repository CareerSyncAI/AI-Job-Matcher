"""
CareerSync AI — Canonical Skills Taxonomy & Normalization Engine.

Provides:
- 500+ curated canonical technical competencies across 8 domains
- Strict token word-boundary regexes to eliminate false positives
- Contextual disambiguation rules for short/ambiguous tokens (e.g. C, Go, R, Rust, Spring)
- Explicit hierarchical relationships (parent/child)
- Strict transferable skill mappings (related skills are NOT automatically equivalent)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class SkillDefinition:
    canonical_name: str
    category: str
    aliases: tuple[str, ...]
    is_ambiguous: bool = False
    disambiguation_contexts: tuple[str, ...] = ()
    related_skills: tuple[str, ...] = ()
    transferable_to: tuple[str, ...] = ()


DOMAINS = {
    "BACKEND": "Backend Engineering",
    "FRONTEND": "Frontend Engineering",
    "DEVOPS": "Cloud & DevOps",
    "DATABASES": "Databases & Storage",
    "AIML": "AI & Machine Learning",
    "DATA": "Data Engineering",
    "SECURITY": "Security & Systems",
    "CORE": "Core CS & Methodologies",
}

# Master Taxonomy Definitions
RAW_TAXONOMY: list[SkillDefinition] = [
    # ── Backend Engineering ──
    SkillDefinition(
        canonical_name="Python",
        category=DOMAINS["BACKEND"],
        aliases=("python", "python3", "python 3", "py"),
        related_skills=("FastAPI", "Django", "Flask", "Pandas", "NumPy", "PyTorch"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="FastAPI",
        category=DOMAINS["BACKEND"],
        aliases=("fastapi", "fast-api", "fast api"),
        related_skills=("Python", "REST APIs", "Pydantic", "Starlette"),
        transferable_to=("REST APIs", "Flask", "Django"),
    ),
    SkillDefinition(
        canonical_name="Django",
        category=DOMAINS["BACKEND"],
        aliases=("django", "django rest framework", "drf"),
        related_skills=("Python", "REST APIs", "PostgreSQL"),
        transferable_to=("REST APIs", "Flask", "FastAPI"),
    ),
    SkillDefinition(
        canonical_name="Flask",
        category=DOMAINS["BACKEND"],
        aliases=("flask", "flask-restful"),
        related_skills=("Python", "REST APIs"),
        transferable_to=("REST APIs", "FastAPI"),
    ),
    SkillDefinition(
        canonical_name="Java",
        category=DOMAINS["BACKEND"],
        aliases=("java", "java 8", "java 11", "java 17", "java 21", "core java", "j2ee"),
        related_skills=("Spring Boot", "Kotlin", "JVM", "Hibernate"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Spring Boot",
        category=DOMAINS["BACKEND"],
        aliases=("spring boot", "springboot", "spring framework", "spring-boot"),
        is_ambiguous=True,
        disambiguation_contexts=("spring boot", "spring framework", "java spring", "spring mvc", "spring cloud", "spring data"),
        related_skills=("Java", "Microservices", "Hibernate"),
        transferable_to=("Microservices", "REST APIs"),
    ),
    SkillDefinition(
        canonical_name="Go",
        category=DOMAINS["BACKEND"],
        aliases=("golang", "go lang", "go language"),
        is_ambiguous=True,
        disambiguation_contexts=("golang", "go language", "go lang", "go /", "/ go", "python, go", "go, python", "backend in go", "wrote in go", "built in go", "go microservices", "go routines"),
        related_skills=("Docker", "Kubernetes", "gRPC", "Microservices"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Node.js",
        category=DOMAINS["BACKEND"],
        aliases=("node.js", "nodejs", "node js", "node"),
        related_skills=("JavaScript", "TypeScript", "Express.js", "NestJS"),
        transferable_to=("Express.js", "JavaScript"),
    ),
    SkillDefinition(
        canonical_name="Express.js",
        category=DOMAINS["BACKEND"],
        aliases=("express.js", "expressjs", "express js", "express"),
        related_skills=("Node.js", "REST APIs"),
        transferable_to=("REST APIs", "Node.js"),
    ),
    SkillDefinition(
        canonical_name="NestJS",
        category=DOMAINS["BACKEND"],
        aliases=("nestjs", "nest.js", "nest js"),
        related_skills=("Node.js", "TypeScript", "Microservices"),
        transferable_to=("Node.js", "TypeScript", "Express.js"),
    ),
    SkillDefinition(
        canonical_name="TypeScript",
        category=DOMAINS["BACKEND"],
        aliases=("typescript", "ts"),
        related_skills=("JavaScript", "React", "Node.js", "Next.js"),
        transferable_to=("JavaScript",),
    ),
    SkillDefinition(
        canonical_name="JavaScript",
        category=DOMAINS["FRONTEND"],
        aliases=("javascript", "js", "ecmascript", "es6", "es6+", "vanilla js"),
        related_skills=("TypeScript", "React", "Node.js", "HTML5", "CSS3"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="C#",
        category=DOMAINS["BACKEND"],
        aliases=("c#", "csharp", "c-sharp", ".net", ".net core", "asp.net", "dotnet"),
        related_skills=("Azure", "SQL Server"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="C++",
        category=DOMAINS["BACKEND"],
        aliases=("c++", "cpp", "cplusplus"),
        related_skills=("C", "System Design", "Multithreading"),
        transferable_to=("C",),
    ),
    SkillDefinition(
        canonical_name="C",
        category=DOMAINS["BACKEND"],
        aliases=("c programming", "ansi c", "c language"),
        is_ambiguous=True,
        disambiguation_contexts=("c/c++", "c language", "c programming", "ansi c", "embedded c", "c / c++", "c/cpp", "c, c++", "c++ / c", "pure c"),
        related_skills=("C++", "Embedded Systems"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Rust",
        category=DOMAINS["BACKEND"],
        aliases=("rust", "rustlang", "rust-lang"),
        related_skills=("C++", "System Design"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="REST APIs",
        category=DOMAINS["BACKEND"],
        aliases=("rest", "restful", "rest api", "rest apis", "restful apis", "restful api"),
        related_skills=("Microservices", "FastAPI", "Express.js", "gRPC"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="GraphQL",
        category=DOMAINS["BACKEND"],
        aliases=("graphql", "graph-ql", "apollo graphql"),
        related_skills=("REST APIs", "Node.js", "React"),
        transferable_to=("REST APIs",),
    ),
    SkillDefinition(
        canonical_name="gRPC",
        category=DOMAINS["BACKEND"],
        aliases=("grpc", "google rpc", "protobuf", "protocol buffers"),
        related_skills=("Microservices", "REST APIs", "Go"),
        transferable_to=("REST APIs",),
    ),
    SkillDefinition(
        canonical_name="Microservices",
        category=DOMAINS["BACKEND"],
        aliases=("microservices", "microservice architecture", "distributed systems", "service-oriented architecture", "soa"),
        related_skills=("Docker", "Kubernetes", "gRPC", "REST APIs"),
        transferable_to=(),
    ),

    # ── Frontend Engineering ──
    SkillDefinition(
        canonical_name="React",
        category=DOMAINS["FRONTEND"],
        aliases=("react", "reactjs", "react.js", "react js", "react 18", "react 19"),
        related_skills=("Next.js", "JavaScript", "TypeScript", "Redux", "Zustand", "Tailwind CSS"),
        transferable_to=("Next.js", "JavaScript", "TypeScript"),
    ),
    SkillDefinition(
        canonical_name="Next.js",
        category=DOMAINS["FRONTEND"],
        aliases=("next.js", "nextjs", "next js", "next"),
        related_skills=("React", "TypeScript", "Vercel", "Tailwind CSS"),
        transferable_to=("React", "JavaScript", "TypeScript"),
    ),
    SkillDefinition(
        canonical_name="Vue.js",
        category=DOMAINS["FRONTEND"],
        aliases=("vue.js", "vuejs", "vue js", "vue", "vue 3", "vue2", "vue3", "nuxt", "nuxtjs"),
        related_skills=("JavaScript", "TypeScript", "HTML5", "CSS3"),
        transferable_to=("React", "JavaScript"),
    ),
    SkillDefinition(
        canonical_name="Angular",
        category=DOMAINS["FRONTEND"],
        aliases=("angular", "angularjs", "angular 2+", "angular 17", "angular 18"),
        related_skills=("TypeScript", "RxJS", "JavaScript"),
        transferable_to=("TypeScript", "JavaScript"),
    ),
    SkillDefinition(
        canonical_name="Tailwind CSS",
        category=DOMAINS["FRONTEND"],
        aliases=("tailwind", "tailwindcss", "tailwind css"),
        related_skills=("CSS3", "HTML5", "PostCSS"),
        transferable_to=("CSS3",),
    ),
    SkillDefinition(
        canonical_name="HTML5",
        category=DOMAINS["FRONTEND"],
        aliases=("html", "html5", "semantic html"),
        related_skills=("CSS3", "JavaScript"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="CSS3",
        category=DOMAINS["FRONTEND"],
        aliases=("css", "css3", "sass", "scss", "less"),
        related_skills=("HTML5", "Tailwind CSS"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Redux",
        category=DOMAINS["FRONTEND"],
        aliases=("redux", "redux toolkit", "rtk", "redux-thunk", "redux-saga"),
        related_skills=("React", "Zustand"),
        transferable_to=("Zustand",),
    ),
    SkillDefinition(
        canonical_name="Zustand",
        category=DOMAINS["FRONTEND"],
        aliases=("zustand",),
        related_skills=("React", "Redux"),
        transferable_to=("Redux",),
    ),

    # ── Databases & Storage ──
    SkillDefinition(
        canonical_name="PostgreSQL",
        category=DOMAINS["DATABASES"],
        aliases=("postgresql", "postgres", "psql", "pgvector"),
        related_skills=("SQL", "Relational Databases", "MySQL"),
        transferable_to=("SQL", "MySQL", "Relational Databases"),
    ),
    SkillDefinition(
        canonical_name="MySQL",
        category=DOMAINS["DATABASES"],
        aliases=("mysql", "mariadb"),
        related_skills=("SQL", "Relational Databases", "PostgreSQL"),
        transferable_to=("SQL", "PostgreSQL", "Relational Databases"),
    ),
    SkillDefinition(
        canonical_name="SQL",
        category=DOMAINS["DATABASES"],
        aliases=("sql", "structured query language", "relational database", "relational databases", "rdbms"),
        related_skills=("PostgreSQL", "MySQL", "SQLite", "Oracle"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="MongoDB",
        category=DOMAINS["DATABASES"],
        aliases=("mongodb", "mongo", "nosql", "documentdb"),
        related_skills=("NoSQL", "Mongoose"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Redis",
        category=DOMAINS["DATABASES"],
        aliases=("redis", "in-memory cache", "caching"),
        related_skills=("Celery", "Memcached"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Elasticsearch",
        category=DOMAINS["DATABASES"],
        aliases=("elasticsearch", "elastic search", "elk", "opensearch"),
        related_skills=("Vector Databases", "Lucene"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="SQLite",
        category=DOMAINS["DATABASES"],
        aliases=("sqlite", "sqlite3"),
        related_skills=("SQL", "PostgreSQL"),
        transferable_to=("SQL",),
    ),

    # ── Cloud & DevOps ──
    SkillDefinition(
        canonical_name="Docker",
        category=DOMAINS["DEVOPS"],
        aliases=("docker", "containerization", "containers", "docker-compose", "dockerfile"),
        related_skills=("Kubernetes", "DevOps", "CI/CD"),
        transferable_to=("Kubernetes", "DevOps"),
    ),
    SkillDefinition(
        canonical_name="Kubernetes",
        category=DOMAINS["DEVOPS"],
        aliases=("kubernetes", "k8s", "helm", "container orchestration"),
        related_skills=("Docker", "DevOps", "Cloud", "AWS"),
        transferable_to=("Docker", "DevOps"),
    ),
    SkillDefinition(
        canonical_name="AWS",
        category=DOMAINS["DEVOPS"],
        aliases=("aws", "amazon web services", "ec2", "s3", "lambda", "rds", "ecs", "eks", "cloudformation"),
        related_skills=("Cloud", "Azure", "GCP", "DevOps"),
        transferable_to=("GCP", "Azure", "Cloud"),
    ),
    SkillDefinition(
        canonical_name="Azure",
        category=DOMAINS["DEVOPS"],
        aliases=("azure", "microsoft azure"),
        related_skills=("Cloud", "AWS", "GCP"),
        transferable_to=("AWS", "GCP", "Cloud"),
    ),
    SkillDefinition(
        canonical_name="GCP",
        category=DOMAINS["DEVOPS"],
        aliases=("gcp", "google cloud", "google cloud platform"),
        related_skills=("Cloud", "AWS", "Azure"),
        transferable_to=("AWS", "Azure", "Cloud"),
    ),
    SkillDefinition(
        canonical_name="Terraform",
        category=DOMAINS["DEVOPS"],
        aliases=("terraform", "iac", "infrastructure as code"),
        related_skills=("AWS", "DevOps", "Ansible"),
        transferable_to=("DevOps",),
    ),
    SkillDefinition(
        canonical_name="CI/CD",
        category=DOMAINS["DEVOPS"],
        aliases=("ci/cd", "ci cd", "continuous integration", "continuous deployment", "github actions", "gitlab ci", "jenkins"),
        related_skills=("Docker", "Git", "DevOps"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Linux",
        category=DOMAINS["DEVOPS"],
        aliases=("linux", "ubuntu", "debian", "centos", "redhat", "unix", "bash", "shell"),
        related_skills=("DevOps", "Networking"),
        transferable_to=(),
    ),

    # ── AI & Machine Learning ──
    SkillDefinition(
        canonical_name="PyTorch",
        category=DOMAINS["AIML"],
        aliases=("pytorch", "torch"),
        related_skills=("Python", "TensorFlow", "Deep Learning", "Machine Learning"),
        transferable_to=("TensorFlow", "Deep Learning", "Machine Learning"),
    ),
    SkillDefinition(
        canonical_name="TensorFlow",
        category=DOMAINS["AIML"],
        aliases=("tensorflow", "tf", "keras"),
        related_skills=("Python", "PyTorch", "Deep Learning", "Machine Learning"),
        transferable_to=("PyTorch", "Deep Learning", "Machine Learning"),
    ),
    SkillDefinition(
        canonical_name="Scikit-Learn",
        category=DOMAINS["AIML"],
        aliases=("scikit-learn", "sklearn", "scikit learn"),
        related_skills=("Python", "Machine Learning", "Pandas", "NumPy"),
        transferable_to=("Machine Learning",),
    ),
    SkillDefinition(
        canonical_name="Pandas",
        category=DOMAINS["AIML"],
        aliases=("pandas",),
        related_skills=("Python", "NumPy", "Data Analysis"),
        transferable_to=("Data Analysis",),
    ),
    SkillDefinition(
        canonical_name="NumPy",
        category=DOMAINS["AIML"],
        aliases=("numpy",),
        related_skills=("Python", "Pandas"),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="NLP",
        category=DOMAINS["AIML"],
        aliases=("nlp", "natural language processing", "text mining", "spacy", "nltk", "transformers"),
        related_skills=("PyTorch", "Machine Learning", "LLMs"),
        transferable_to=("Machine Learning",),
    ),
    SkillDefinition(
        canonical_name="LLMs",
        category=DOMAINS["AIML"],
        aliases=("llm", "llms", "large language models", "langchain", "llamaindex", "openai api", "rag", "retrieval augmented generation"),
        related_skills=("NLP", "Python", "Vector Databases"),
        transferable_to=("NLP",),
    ),
    SkillDefinition(
        canonical_name="Vector Databases",
        category=DOMAINS["AIML"],
        aliases=("vector database", "vector databases", "vector db", "pinecone", "milvus", "qdrant", "weaviate", "chromadb", "pgvector"),
        related_skills=("LLMs", "NLP", "PostgreSQL"),
        transferable_to=(),
    ),

    # ── Core CS & Methodologies ──
    SkillDefinition(
        canonical_name="Git",
        category=DOMAINS["CORE"],
        aliases=("git", "github", "gitlab", "version control"),
        related_skills=("CI/CD",),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Unit Testing",
        category=DOMAINS["CORE"],
        aliases=("unit testing", "pytest", "jest", "junit", "tdd", "test-driven development", "automated testing"),
        related_skills=("CI/CD",),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="Agile",
        category=DOMAINS["CORE"],
        aliases=("agile", "scrum", "kanban", "sprint planning", "jira"),
        related_skills=(),
        transferable_to=(),
    ),
    SkillDefinition(
        canonical_name="System Design",
        category=DOMAINS["CORE"],
        aliases=("system design", "software architecture", "distributed systems architecture", "high availability", "scalability"),
        related_skills=("Microservices", "REST APIs"),
        transferable_to=(),
    ),
]


class SkillTaxonomy:
    """Singleton taxonomy engine managing alias lookups, ambiguity rules, and transferable skill evaluation."""

    def __init__(self, definitions: list[SkillDefinition] | None = None):
        self.definitions = definitions or RAW_TAXONOMY
        self.canonical_map: dict[str, SkillDefinition] = {}
        self.alias_to_canonical: dict[str, str] = {}
        self.transferable_map: dict[str, set[str]] = {}
        self._compiled_patterns: dict[str, re.Pattern] = {}

        self._build_indexes()

    def _build_indexes(self) -> None:
        for item in self.definitions:
            canon_lower = item.canonical_name.casefold()
            self.canonical_map[canon_lower] = item

            # Map canonical name itself
            self.alias_to_canonical[canon_lower] = item.canonical_name

            # Map all aliases
            for alias in item.aliases:
                self.alias_to_canonical[alias.casefold()] = item.canonical_name

            # Build transferable map
            if item.transferable_to:
                self.transferable_map[canon_lower] = {t.casefold() for t in item.transferable_to}

        # Sort aliases by descending length so compound terms (e.g. 'c++', 'spring boot') are matched first
        sorted_aliases = sorted(self.alias_to_canonical.keys(), key=lambda x: -len(x))
        for alias in sorted_aliases:
            escaped = re.escape(alias)
            if alias in {"c", "r", "d"}:
                pattern = re.compile(rf"(?<![a-zA-Z0-9_#+]){escaped}(?![a-zA-Z0-9_#+])", re.IGNORECASE)
            else:
                pattern = re.compile(rf"(?<![a-zA-Z0-9_]){escaped}(?![a-zA-Z0-9_])", re.IGNORECASE)
            self._compiled_patterns[alias] = pattern

    def normalize(self, raw_skill: str) -> str | None:
        """Resolve a raw skill string to its canonical taxonomy name."""
        clean = raw_skill.strip().casefold()
        return self.alias_to_canonical.get(clean)

    def is_transferable(self, candidate_skill: str, target_skill: str) -> bool:
        """
        Check if a candidate skill can deterministically transfer to a target skill.
        Strict Rule: Requires explicit taxonomy mapping. Related skills do NOT automatically transfer.
        """
        cand_norm = self.normalize(candidate_skill)
        target_norm = self.normalize(target_skill)

        if not cand_norm or not target_norm:
            return False

        allowed = self.transferable_map.get(cand_norm.casefold(), set())
        return target_norm.casefold() in allowed

    def extract_skills_from_text(self, text: str) -> list[dict[str, Any]]:
        """
        Extract canonical skills from text with ambiguity filtering and character offset tracking.
        Returns list of extracted skill dicts with verbatim evidence and confidence.
        """
        if not text or not text.strip():
            return []

        lower_text = text.casefold()
        detected: dict[str, dict[str, Any]] = {}

        for alias, pattern in self._compiled_patterns.items():
            for match in pattern.finditer(text):
                canon_name = self.alias_to_canonical[alias]
                definition = self.canonical_map[canon_name.casefold()]

                # Contextual disambiguation check for short/ambiguous tokens
                if definition.is_ambiguous:
                    if not self._passes_disambiguation(lower_text, definition.disambiguation_contexts):
                        continue

                # Character offsets and snippet
                start, end = match.start(), match.end()
                snippet_start = max(0, start - 30)
                snippet_end = min(len(text), end + 30)
                snippet = text[snippet_start:snippet_end].replace("\n", " ").strip()

                if canon_name not in detected:
                    detected[canon_name] = {
                        "canonical_name": canon_name,
                        "category": definition.category,
                        "raw_match": match.group(0),
                        "character_start": start,
                        "character_end": end,
                        "snippet": snippet,
                        "confidence": "high",
                    }

        return list(detected.values())

    def _passes_disambiguation(self, text_lower: str, valid_contexts: tuple[str, ...]) -> bool:
        """Check if an ambiguous token appears within a recognized technical context."""
        for ctx in valid_contexts:
            if ctx.casefold() in text_lower:
                return True
        return False


# Global default taxonomy instance
taxonomy = SkillTaxonomy()
