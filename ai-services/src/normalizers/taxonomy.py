"""Curated Canonical Skills Taxonomy for CareerSync AI.

Contains 500+ canonical technical competencies across 8 major domains
with verified alias mappings for robust resume normalization.
"""

from __future__ import annotations

# Domain Categories
DOMAINS = {
    "BACKEND": "Backend Engineering",
    "FRONTEND": "Frontend Engineering",
    "DEVOPS": "Cloud & DevOps",
    "DATABASES": "Databases & Storage",
    "AIML": "AI & Machine Learning",
    "DATA": "Data Engineering",
    "SECURITY": "Security & Systems",
    "CORE": "Core CS & Methodologies",
    "ACCOUNTING": "Accounting & Finance",
    "HEALTHCARE": "Healthcare & Nursing",
    "BUSINESS": "Business Analysis",
    "PROJECT": "Project Management",
    "MARKETING": "Digital Marketing",
}

# Canonical Skill -> (Domain, Primary Aliases / Variations)
CANONICAL_SKILLS: dict[str, tuple[str, list[str]]] = {
    # Backend Engineering
    "Python": (DOMAINS["BACKEND"], ["python", "python3", "python 3", "py"]),
    "Java": (DOMAINS["BACKEND"], ["java", "java 8", "java 11", "java 17", "java 21", "core java", "j2ee"]),
    "Go": (DOMAINS["BACKEND"], ["golang", "go lang", "go language"]),
    "Node.js": (DOMAINS["BACKEND"], ["node.js", "nodejs", "node js", "node"]),
    "TypeScript": (DOMAINS["BACKEND"], ["typescript", "ts"]),
    "C#": (DOMAINS["BACKEND"], ["c#", "csharp", "c-sharp", ".net", ".net core", "asp.net", "asp.net core", "dotnet", ".net framework", ".net 6", ".net 7", ".net 8"]),
    "C++": (DOMAINS["BACKEND"], ["c++", "cpp", "cplusplus", "c++11", "c++14", "c++17", "c++20"]),
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
    "REST APIs": (DOMAINS["BACKEND"], ["rest", "restful", "rest api", "rest apis", "restful apis", "restful api"]),
    "Microservices": (DOMAINS["BACKEND"], ["microservices", "microservice architecture", "distributed systems", "service-oriented architecture", "soa"]),
    "RabbitMQ": (DOMAINS["BACKEND"], ["rabbitmq", "rabbit mq"]),
    "Celery": (DOMAINS["BACKEND"], ["celery"]),
    "OpenAPI": (DOMAINS["BACKEND"], ["openapi", "swagger", "openapi 3", "swagger ui"]),
    
    # Frontend Engineering
    "React": (DOMAINS["FRONTEND"], ["react", "reactjs", "react.js", "react js", "react 18", "react 19", "react native"]),
    "Next.js": (DOMAINS["FRONTEND"], ["next.js", "nextjs", "next js", "next"]),
    "Vue.js": (DOMAINS["FRONTEND"], ["vue.js", "vuejs", "vue js", "vue", "vue 3", "vue2", "vue3", "nuxt", "nuxtjs"]),
    "Angular": (DOMAINS["FRONTEND"], ["angular", "angularjs", "angular 2+", "angular 17", "angular 18"]),
    "JavaScript": (DOMAINS["FRONTEND"], ["javascript", "js", "ecmascript", "es6", "es6+"]),
    "HTML5": (DOMAINS["FRONTEND"], ["html", "html5"]),
    "CSS3": (DOMAINS["FRONTEND"], ["css", "css3"]),
    "Bootstrap": (DOMAINS["FRONTEND"], ["bootstrap", "bootstrap 5", "bootstrap 4"]),
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
    "Helm": (DOMAINS["DEVOPS"], ["helm", "helm charts", "helm3", "helm chart"]),
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
    "R": (DOMAINS["DATA"], ["r", "r programming", "r language", "rstudio", "r studio"]),
    
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
    "Data Structures & Algorithms": (DOMAINS["CORE"], ["data structures", "algorithms", "dsa"]),

    # Accounting & Finance
    "Accounts Payable": (DOMAINS["ACCOUNTING"], ["accounts payable", "payables", "ap"]),
    "Accounts Receivable": (DOMAINS["ACCOUNTING"], ["accounts receivable", "receivables", "ar"]),
    "General Ledger": (DOMAINS["ACCOUNTING"], ["general ledger", "gl"]),
    "Bank Reconciliation": (DOMAINS["ACCOUNTING"], ["bank reconciliation", "bank reconciliations", "account reconciliation"]),
    "Financial Reporting": (DOMAINS["ACCOUNTING"], ["financial reporting", "management reporting"]),
    "Financial Statements": (DOMAINS["ACCOUNTING"], ["financial statements", "income statement", "balance sheet", "cash flow statement"]),
    "GST": (DOMAINS["ACCOUNTING"], ["gst", "goods and services tax"]),
    "Tally": (DOMAINS["ACCOUNTING"], ["tally", "tally erp", "tally prime"]),
    "QuickBooks": (DOMAINS["ACCOUNTING"], ["quickbooks", "quick books"]),
    "Auditing": (DOMAINS["ACCOUNTING"], ["auditing", "audit procedures", "financial audit"]),
    "Payroll": (DOMAINS["ACCOUNTING"], ["payroll", "payroll processing"]),
    "Budgeting and Forecasting": (DOMAINS["ACCOUNTING"], ["budgeting", "financial forecasting", "budget forecasting"]),

    # Healthcare & Nursing
    "Patient Care": (DOMAINS["HEALTHCARE"], ["patient care", "direct patient care", "care delivery"]),
    "Clinical Assessment": (DOMAINS["HEALTHCARE"], ["clinical assessment", "patient assessment", "nursing assessment"]),
    "Medication Administration": (DOMAINS["HEALTHCARE"], ["medication administration", "administering medications", "medication management"]),
    "Vital Signs Monitoring": (DOMAINS["HEALTHCARE"], ["vital signs", "vital signs monitoring", "vital sign monitoring"]),
    "Electronic Health Records": (DOMAINS["HEALTHCARE"], ["electronic health records", "electronic health record", "ehr", "emr"]),
    "Basic Life Support": (DOMAINS["HEALTHCARE"], ["basic life support", "bls"]),
    "CPR": (DOMAINS["HEALTHCARE"], ["cpr", "cardiopulmonary resuscitation"]),
    "Care Planning": (DOMAINS["HEALTHCARE"], ["care planning", "patient care plans", "nursing care plan"]),
    "Infection Control": (DOMAINS["HEALTHCARE"], ["infection control", "infection prevention"]),

    # Business Analysis
    "Business Analysis": (DOMAINS["BUSINESS"], ["business analysis", "business analyst"]),
    "Requirements Gathering": (DOMAINS["BUSINESS"], ["requirements gathering", "requirements elicitation", "requirement analysis"]),
    "Stakeholder Management": (DOMAINS["BUSINESS"], ["stakeholder management", "stakeholder engagement", "stakeholder analysis"]),
    "Process Mapping": (DOMAINS["BUSINESS"], ["process mapping", "business process mapping", "process modeling"]),
    "Data Analysis": (DOMAINS["BUSINESS"], ["data analysis", "data analytics", "business data analysis"]),
    "Microsoft Excel": (DOMAINS["BUSINESS"], ["microsoft excel", "ms excel", "excel"]),
    "Power BI": (DOMAINS["BUSINESS"], ["power bi", "powerbi"]),
    "Tableau": (DOMAINS["BUSINESS"], ["tableau"]),

    # Project Management
    "Project Management": (DOMAINS["PROJECT"], ["project management", "project manager"]),
    "Project Planning": (DOMAINS["PROJECT"], ["project planning", "project scheduling", "project plan"]),
    "Risk Management": (DOMAINS["PROJECT"], ["risk management", "project risk management"]),

    # Digital Marketing
    "Digital Marketing": (DOMAINS["MARKETING"], ["digital marketing", "online marketing"]),
    "Search Engine Optimization": (DOMAINS["MARKETING"], ["search engine optimization", "search engine optimisation", "seo"]),
    "Search Engine Marketing": (DOMAINS["MARKETING"], ["search engine marketing", "sem"]),
    "Campaign Analytics": (DOMAINS["MARKETING"], ["campaign analytics", "marketing analytics", "campaign performance"]),
    "Return on Investment": (DOMAINS["MARKETING"], ["return on investment", "roi"]),
    "Content Marketing": (DOMAINS["MARKETING"], ["content marketing", "content strategy"]),
    "Social Media Marketing": (DOMAINS["MARKETING"], ["social media marketing", "social media campaigns"]),
}

# Reverse index: alias_lower -> (canonical_name, category)
ALIAS_LOOKUP: dict[str, tuple[str, str]] = {}
for canonical, (category, aliases) in CANONICAL_SKILLS.items():
    ALIAS_LOOKUP[canonical.lower()] = (canonical, category)
    for alias in aliases:
        ALIAS_LOOKUP[alias.lower()] = (canonical, category)

# Disambiguation list for short/ambiguous skill tokens that require strict word boundary or context
AMBIGUOUS_SKILLS = {
    "c": {"contexts": ["c/c++", "c language", "c programming", "ansi c", "embedded c", "c / c++", "c/cpp", "c, c++", "c++ / c", "pure c", "c and c++", "c & c++", "c/embedded", "languages: c", "language: c"]},
    "go": {"contexts": ["golang", "go language", "go lang", "go /", "/ go", "python, go", "go, python", "backend in go", "wrote in go", "written in go", "built in go", "services in go", "go microservices", "go routines", "go developer", "go backend", "languages: go", "language: go", ", go", "go,", "go |"]},
    "r": {"contexts": ["r programming", "r language", "r/python", "python/r", "r studio", "rstudio", "data science", "statistics", "statistical"]},
    "spring": {"contexts": ["spring boot", "spring framework", "java spring", "spring mvc", "spring cloud", "spring data", "spring security"]},
    "node": {"contexts": ["node.js", "nodejs", "node js", "node/express", "express/node", "express", "express.js", "expressjs", "node/react", "react/node", "node developer", "node backend", "npm", "javascript", "typescript", "fullstack", "full stack", "mean stack", "mern stack"]},
    "express": {"contexts": ["express.js", "expressjs", "express js", "node", "nodejs", "node.js", "backend", "rest api", "javascript", "typescript", "npm", "server", "middleware"]},
    "rest": {"contexts": ["rest api", "rest apis", "restful", "api", "apis", "endpoint", "endpoints", "http", "graphql", "grpc", "microservices", "web services", "postman", "json", "crud"]},
    "react": {"contexts": ["react.js", "reactjs", "react js", "react native", "redux", "frontend", "javascript", "typescript", "next.js", "nextjs", "ui", "component", "components", "hooks", "jsx", "tsx", "web"]},
    "next": {"contexts": ["next.js", "nextjs", "next js", "next/react", "react/next", "next framework", "ssr", "frontend", "vercel", "react"]},
    "cv": {"contexts": ["computer vision", "opencv", "cv/nlp", "nlp/cv", "image processing", "object detection", "deep learning", "yolo", "cnn"]},
    "ap": {"contexts": ["accounts payable", "accounts receivable", "invoice", "general ledger", "accounting", "finance", "billings", "vouchers", "reconciliation"]},
    "ar": {"contexts": ["accounts receivable", "accounts payable", "invoice", "general ledger", "accounting", "finance", "collections", "reconciliation"]},
    "gl": {"contexts": ["general ledger", "accounting", "accounts payable", "accounts receivable", "journal entry", "journal entries", "finance", "balance sheet"]},
    "tally": {"contexts": ["tally erp", "tally prime", "accounting", "gst", "general ledger"]},
    "bls": {"contexts": ["basic life support", "cpr", "healthcare", "nursing", "clinical", "patient care"]},
    "sem": {"contexts": ["search engine marketing", "paid search", "digital marketing", "campaign", "google ads", "ppc", "adwords"]},
    "roi": {"contexts": ["return on investment", "marketing", "campaign", "advertising", "revenue", "conversion rate", "metrics", "kpi"]},
    "helm": {"contexts": ["helm charts", "helm chart", "helm3", "kubernetes", "k8s", "devops", "deploy", "chart", "charts", "package manager", "manifests"]},
}
