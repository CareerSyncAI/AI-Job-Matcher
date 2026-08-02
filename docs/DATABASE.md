# 🗄️ Database Design & Schema Specifications (`DATABASE.md`)

> **PHASE 3 DELIVERABLE: DATABASE DESIGN**

---

## 📌 1. Database Overview
- **Database System**: MongoDB (NoSQL)
- **Object Data Modeling (ODM)**: Mongoose (Node.js) / PyMongo (Python)

---

## 📐 2. Collection Schemas

### `users` Collection
Stores user accounts for recruiters and candidates.

### `jobs` Collection
Stores job postings, required skills, and weighting parameters.

### `resumes` Collection
Stores uploaded candidate resume metadata, parsed text, and extracted entities.

### `evaluations` Collection
Stores candidate score breakdowns, rankings, and missing skill analysis for specific jobs.
