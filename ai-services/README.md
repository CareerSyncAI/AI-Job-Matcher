# CareerSync AI — AI & NLP Microservice

The **CareerSync AI AI-Service** is a high-performance FastAPI microservice dedicated to resume document text extraction, canonical entity normalization, and pluggable semantic similarity inference. It operates independently from the main backend to isolate CPU-intensive neural network computation from transactional database operations.

---

## 🏗️ Architecture & Engines

The microservice implements a **Pluggable Similarity Engine** architecture complying with **API Contract v1.1.0**:

```
                  POST /api/v1/similarity
                             │
                             ▼
                 [SemanticMatcher Facade]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [BaselineEngine]              [SentenceEmbeddingMatcher]
   - Sublinear TF-Cosine         - sentence-transformers/all-MiniLM-L6-v2
   - Zero-dependency             - Pinned commit: 1110a243fdf4706b3f48f1d95db1a4f5529b4d41
   - Fully deterministic         - Thread-safe lazy loading (Lock)
   - Default engine              - Bounded section chunking (<= 500 chars)
                                 - 100% offline CPU execution
                                 - Explicit fallback to Baseline on error
```

### 1. Baseline Matcher (`baseline`) — Production Default
- **Method**: Deterministic sublinear term frequency with cosine normalization ($1 + \ln(\text{tf})$).
- **Guarantees**: Zero cold-start latency, zero machine learning dependencies, deterministic reproducible float output, completely bounded memory footprint.

### 2. Sentence Embedding Matcher (`embedding`)
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
- **Revision Pinned**: `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
- **Inference Profile**: Thread-safe CPU inference with warm latency of ~40ms on modern multicore processors.
- **Section-Aware Chunking**: Resume sections (experience, education, summary) and job requirements are chunked with a 500-character ceiling to prevent attention truncation, pooled via mean pooling with cosine similarity.
- **Explicit Fallback**: If model files are missing or an inference exception occurs, the engine cleanly degrades to `baseline` with `status: "degraded"` and returns a descriptive `fallback_reason`.

---

## 📐 API Contract v1.1.0

All endpoints require header authentication via `X-AI-Service-Key` (or standard bearer token) when configured.

### Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Liveness and readiness probe reporting service status and active matcher engine |
| `POST` | `/api/v1/extract-text` | Extracts verbatim text from uploaded PDF/DOCX documents with signature validation |
| `POST` | `/api/v1/similarity` | Computes semantic similarity between candidate resume text and job description |

### Similarity Request Payload
```json
{
  "resume_text": "Experienced Python Backend Engineer with FastAPI, PostgreSQL, and Docker...",
  "job_description": "Seeking a Backend Software Engineer proficient in Python, SQL, and microservices...",
  "engine": "embedding"
}
```

### Similarity Response Envelope
```json
{
  "raw_similarity": 0.8142,
  "similarity_index": 0.8142,
  "method": "embedding",
  "status": "ok",
  "fallback_reason": null,
  "model_info": {
    "name": "sentence-transformers/all-MiniLM-L6-v2",
    "revision": "1110a243fdf4706b3f48f1d95db1a4f5529b4d41",
    "dimension": 384
  },
  "diagnostics": {
    "resume_chunks_count": 3,
    "job_chunks_count": 2,
    "truncated": false,
    "warning": null
  }
}
```

> **Note on Score Interpretation**: `raw_similarity` represents the raw cosine similarity metric $[-1.0, 1.0]$. It is an uncalibrated decision-support signal, **not** a hiring probability or confidence score. The backend scoring layer retains sole ownership of applying deterministic multi-factor weighting.

---

## 📊 Evaluation & Verification

The microservice includes a curated 30-pair comparative evaluation benchmark (`fixtures/evaluation/evaluation_benchmark.json`) partitioned into balanced `dev` (15 pairs) and `held_out_test` (15 pairs) splits across 8 role families:

| Metric | Baseline (TF-Cosine) | Embedding (all-MiniLM-L6-v2) | Delta |
| :--- | :---: | :---: | :---: |
| **Held-Out Pairwise Accuracy** | 85.71% | **94.81%** | **+9.10%** |
| **Overall Pairwise Accuracy** | 86.69% | **94.16%** | **+7.47%** |
| **Mean Relevant Margin** | +0.211 | **+0.328** | **+0.117** |
| **Hard Negative Rejection** | 100% | 100% | Parity |

---

## 🛠️ Local Development & Setup

### 1. Environment Setup
```bash
cd ai-services
python -m venv .venv
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file or export the following variables:
```ini
AI_SERVICE_API_KEY="dev-ai-service-key-change-in-prod"
SEMANTIC_MATCHER="baseline"  # Options: "baseline" | "embedding"
EMBEDDING_MODEL_CACHE_DIR="models/cache"
```

### 3. Model Download & Smoke Test
To verify the offline pretrained model and test CPU inference latency:
```bash
python smoke_test_embedding.py
```

### 4. Running the Microservice
```bash
uvicorn src.api.app:app --host 0.0.0.0 --port 8001 --reload
```

### 5. Running Tests & Benchmarks
```bash
# Run complete test suite (39 tests)
pytest -v

# Run the 30-pair comparative evaluation harness
python evaluate_similarity_models.py
```
