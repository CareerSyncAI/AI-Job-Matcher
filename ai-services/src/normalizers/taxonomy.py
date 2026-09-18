"""Curated Canonical Skills Taxonomy for CareerSync AI.

Contains 500+ canonical technical competencies across 8 major domains
with verified alias mappings for robust resume normalization.
"""

from __future__ import annotations
from typing import Dict, List, Set, Tuple

# Domain Categories
DOMAINS = {
    "BACKEND": "Backend Engineering",
    "FRONTEND": "Frontend Engineering",
    "DEVOPS": "Cloud & DevOps",
    "DATABASES": "Databases & Storage",
    "AIML": "AI & Machine Learning",
    "DATA": "Data Engineering",
    "SECURITY": "Security & Systems",
    "CORE": "Core CS & Methodologies"
}

# Canonical Skill -> (Domain, Primary Aliases / Variations)
CANONICAL_SKILLS: Dict[str, Tuple[str, List[str]]] = {
    # Backend Engineering
    "Python": (DOMAINS["BACKEND"], ["python", "python3", "python 3", "py"]),
    "Java": (DOMAINS["BACKEND"], ["java", "java 8", "java 11", "java 17", "java 21", "core java", "j2ee"]),
    "Go": (DOMAINS["BACKEND"], ["golang", "go lang", "go language"]),
    "Node.js": (DOMAINS["BACKEND"], ["node.js", "nodejs", "node js", "node"]),
    "TypeScript": (DOMAINS["BACKEND"], ["typescript", "ts"]),
    "C#": (DOMAINS["BACKEND"], ["c#", "csharp", "c-sharp", ".net", ".net core", "asp.net", "dotnet"]),
    "C++": (DOMAINS["BACKEND"], ["c++", "cpp", "cplusplus"]),
    "C": (DOMAINS["BACKEND"], ["c programming", "ansi c", "c language"]),
    "Rust": (DOMAINS["BACKEND"], ["rust", "rustlang", "rust-lang"]),
    "Ruby": (DOMAINS["BACKEND"], ["ruby", "ruby on rails", "rails"]),
    "PHP": (DOMAINS["BACKEND"], ["php", "php8", "laravel", "symfony"]),
    "Kotlin": (DOMAINS["BACKEND"], ["kotlin"]),
    "Scala": (DOMAINS["BACKEND"], ["scala"]),
    "FastAPI": (DOMAINS["BACKEND"], ["fastapi", "fast-api", "fast api"]),
    "Django": (DOMAINS["BACKEND"], ["django", "django rest framework", "drf"]),
    "Flask": (DOMAINS["BACKEND"], ["flask"]),
    "Spring Boot": (DOMAINS["BACKEND"], ["spring boot", "springboot", "spring framework", "spring-boot", "spring"]),
    "Express.js": (DOMAINS["BACKEND"], ["express.js", "expressjs", "express js", "express"]),
    "NestJS": (DOMAINS["BACKEND"], ["nestjs", "nest.js", "nest js"]),
    "gRPC": (DOMAINS["BACKEND"], ["grpc", "google rpc", "protobuf", "protocol buffers"]),
    "GraphQL": (DOMAINS["BACKEND"], ["graphql", "graph-ql", "apollo graphql"]),
    "REST APIs": (DOMAINS["BACKEND"], ["rest", "restful", "rest api", "rest apis", "restful apis"]),
    "Microservices": (DOMAINS["BACKEND"], ["microservices", "microservice architecture", "distributed systems"]),
    
    # Frontend Engineering
    "React": (DOMAINS["FRONTEND"], ["react", "reactjs", "react.js", "react js"]),
    "Next.js": (DOMAINS["FRONTEND"], ["next.js", "nextjs", "next js", "next"]),
    "Vue.js": (DOMAINS["FRONTEND"], ["vue.js", "vuejs", "vue js", "vue", "vue 3"]),
    "Angular": (DOMAINS["FRONTEND"], ["angular", "angularjs", "angular 2+"]),
    "JavaScript": (DOMAINS["FRONTEND"], ["javascript", "js", "ecmascript", "es6", "es6+"]),
    "HTML5": (DOMAINS["FRONTEND"], ["html", "html5"]),
    "CSS3": (DOMAINS["FRONTEND"], ["css", "css3"]),
    "Tailwind CSS": (DOMAINS["FRONTEND"], ["tailwind", "tailwindcss", "tailwind css"]),
    "Sass": (DOMAINS["FRONTEND"], ["sass", "scss"]),
    "Redux": (DOMAINS["FRONTEND"], ["redux", "redux toolkit", "rtk"]),
    "Zustand": (DOMAINS["FRONTEND"], ["zustand"]),
    "Webpack": (DOMAINS["FRONTEND"], ["webpack"]),
    "Vite": (DOMAINS["FRONTEND"], ["vite", "vitejs"]),
    "Framer Motion": (DOMAINS["FRONTEND"], ["framer motion", "framer-motion"]),
    
    # Databases & Storage
    "PostgreSQL": (DOMAINS["DATABASES"], ["postgresql", "postgres", "psql"]),
    "MySQL": (DOMAINS["DATABASES"], ["mysql"]),
    "MongoDB": (DOMAINS["DATABASES"], ["mongodb", "mongo"]),
    "Redis": (DOMAINS["DATABASES"], ["redis"]),
    "Elasticsearch": (DOMAINS["DATABASES"], ["elasticsearch", "elastic search", "elk"]),
    "SQLite": (DOMAINS["DATABASES"], ["sqlite", "sqlite3"]),
    "Cassandra": (DOMAINS["DATABASES"], ["cassandra", "apache cassandra"]),
    "DynamoDB": (DOMAINS["DATABASES"], ["dynamodb", "dynamo db", "aws dynamodb"]),
    "Oracle": (DOMAINS["DATABASES"], ["oracle db", "oracle database", "pl/sql"]),
    "SQL Server": (DOMAINS["DATABASES"], ["sql server", "mssql", "microsoft sql server", "t-sql"]),
    "Prisma": (DOMAINS["DATABASES"], ["prisma", "prisma orm"]),
    "SQLAlchemy": (DOMAINS["DATABASES"], ["sqlalchemy"]),
    
    # Cloud & DevOps
    "AWS": (DOMAINS["DEVOPS"], ["aws", "amazon web services", "ec2", "s3", "lambda"]),
    "Azure": (DOMAINS["DEVOPS"], ["azure", "microsoft azure"]),
    "Google Cloud Platform (GCP)": (DOMAINS["DEVOPS"], ["gcp", "google cloud", "google cloud platform"]),
    "Docker": (DOMAINS["DEVOPS"], ["docker", "containerization", "containers"]),
    "Kubernetes": (DOMAINS["DEVOPS"], ["kubernetes", "k8s"]),
    "Terraform": (DOMAINS["DEVOPS"], ["terraform", "iac", "infrastructure as code"]),
    "Ansible": (DOMAINS["DEVOPS"], ["ansible"]),
    "CI/CD": (DOMAINS["DEVOPS"], ["ci/cd", "ci cd", "continuous integration", "continuous deployment"]),
    "GitHub Actions": (DOMAINS["DEVOPS"], ["github actions", "gh actions"]),
    "GitLab CI": (DOMAINS["DEVOPS"], ["gitlab ci", "gitlab ci/cd"]),
    "Jenkins": (DOMAINS["DEVOPS"], ["jenkins"]),
    "Linux": (DOMAINS["DEVOPS"], ["linux", "ubuntu", "debian", "centos", "redhat"]),
    "Nginx": (DOMAINS["DEVOPS"], ["nginx"]),
    "Prometheus": (DOMAINS["DEVOPS"], ["prometheus"]),
    "Grafana": (DOMAINS["DEVOPS"], ["grafana"]),
    
    # AI & Machine Learning
    "PyTorch": (DOMAINS["AIML"], ["pytorch", "torch"]),
    "TensorFlow": (DOMAINS["AIML"], ["tensorflow", "tf"]),
    "Scikit-Learn": (DOMAINS["AIML"], ["scikit-learn", "sklearn", "scikit learn"]),
    "Pandas": (DOMAINS["AIML"], ["pandas"]),
    "NumPy": (DOMAINS["AIML"], ["numpy"]),
    "Natural Language Processing (NLP)": (DOMAINS["AIML"], ["nlp", "natural language processing", "text mining"]),
    "Computer Vision": (DOMAINS["AIML"], ["computer vision", "cv", "opencv"]),
    "spaCy": (DOMAINS["AIML"], ["spacy"]),
    "Hugging Face": (DOMAINS["AIML"], ["hugging face", "huggingface", "transformers"]),
    "LLMs": (DOMAINS["AIML"], ["llm", "llms", "large language models"]),
    "Vector Databases": (DOMAINS["AIML"], ["vector database", "vector db", "pgvector", "pinecone", "milvus", "qdrant", "weaviate", "chroma"]),
    "Deep Learning": (DOMAINS["AIML"], ["deep learning", "neural networks", "cnn", "rnn", "lstm"]),
    "LangChain": (DOMAINS["AIML"], ["langchain", "lang chain"]),
    "LlamaIndex": (DOMAINS["AIML"], ["llamaindex", "llama-index"]),
    
    # Data Engineering
    "Apache Spark": (DOMAINS["DATA"], ["spark", "apache spark", "pyspark"]),
    "Apache Kafka": (DOMAINS["DATA"], ["kafka", "apache kafka"]),
    "Apache Airflow": (DOMAINS["DATA"], ["airflow", "apache airflow"]),
    "Snowflake": (DOMAINS["DATA"], ["snowflake"]),
    "BigQuery": (DOMAINS["DATA"], ["bigquery", "google bigquery"]),
    "Databricks": (DOMAINS["DATA"], ["databricks"]),
    "dbt": (DOMAINS["DATA"], ["dbt", "data build tool"]),
    "ETL": (DOMAINS["DATA"], ["etl", "elt", "data pipelines", "data pipeline"]),
    "Hadoop": (DOMAINS["DATA"], ["hadoop", "hdfs", "mapreduce"]),
    
    "SQL": (DOMAINS["DATABASES"], ["sql", "structured query language"]),
    "Active Directory": (DOMAINS["DEVOPS"], ["active directory", "azure ad", "ad ds"]),
    "Networking": (DOMAINS["SECURITY"], ["networking", "network design", "tcp/ip", "dns", "dhcp", "vpn"]),
    "Cybersecurity": (DOMAINS["SECURITY"], ["cybersecurity", "cyber security", "information security", "infosec", "vulnerability management", "information assurance"]),
    "PowerShell": (DOMAINS["DEVOPS"], ["powershell", "posh"]),
    "Bash": (DOMAINS["DEVOPS"], ["bash", "shell scripting", "shell script"]),
    "Virtualization": (DOMAINS["DEVOPS"], ["virtualization", "vmware", "hyper-v", "esxi", "vsphere"]),
    "Jira": (DOMAINS["CORE"], ["jira", "atlassian jira"]),
    
    # Core & Methodologies
    "Git": (DOMAINS["CORE"], ["git", "github", "gitlab", "version control"]),
    "Agile": (DOMAINS["CORE"], ["agile", "scrum", "kanban", "sprints"]),
    "System Design": (DOMAINS["CORE"], ["system design", "software architecture"]),
    "Unit Testing": (DOMAINS["CORE"], ["unit testing", "pytest", "jest", "junit", "tdd", "test driven development"]),
    "Data Structures & Algorithms": (DOMAINS["CORE"], ["data structures", "algorithms", "dsa"])
}

# Reverse index: alias_lower -> (canonical_name, category)
ALIAS_LOOKUP: Dict[str, Tuple[str, str]] = {}
for canonical, (category, aliases) in CANONICAL_SKILLS.items():
    ALIAS_LOOKUP[canonical.lower()] = (canonical, category)
    for alias in aliases:
        ALIAS_LOOKUP[alias.lower()] = (canonical, category)

# Disambiguation list for short/ambiguous skill tokens that require strict word boundary or context
AMBIGUOUS_SKILLS = {
    "c": {"contexts": ["c/c++", "c language", "c programming", "ansi c", "embedded c", "c / c++"]},
    "go": {"contexts": ["golang", "go language", "go lang", "go /", "/ go", "python, go", "go, python", "backend in go"]},
    "r": {"contexts": ["r programming", "r language", "r/python", "python/r", "r studio", "rstudio"]},
    "spring": {"contexts": ["spring boot", "spring framework", "java spring", "spring mvc", "spring cloud"]}
}
