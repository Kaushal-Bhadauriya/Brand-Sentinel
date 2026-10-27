# BrandSentinel 🛡️
### Production-Grade AI Brand Governance & Content Compliance Platform

BrandSentinel is a dual-engine compliance and content governance platform designed to enforce brand guidelines, trademark integrity, inclusive terminology, and FTC-compliant regulatory disclosures across marketing copy, PR releases, and technical documentation.

---

## 🏗️ Architecture Overview

BrandSentinel couples a zero-latency deterministic rule engine with a semantic Hybrid RAG (Dense MiniLM + BM25 Qdrant) vector retrieval service:

```
[User Draft / Copy Canvas]
           │
           ▼
 ┌─────────────────────────────────────────────────────────┐
 │                   FastAPI Dual-Engine                   │
 ├────────────────────────────┬────────────────────────────┤
 │ 1. Deterministic Engine    │ 2. Hybrid RAG Service      │
 │    - Sub-millisecond Regex │    - SentenceTransformers  │
 │    - Exact Banned Words    │      (all-MiniLM-L6-v2)    │
 │    - Trademark Nomenclature│    - BM25 Sparse Index     │
 │    - FTC Disclaimer Rules  │    - Reciprocal Rank Fusion│
 │                            │    - Qdrant Vector Store   │
 └────────────────────────────┴────────────────────────────┘
           │                                │
           └──────────────┬─────────────────┘
                          ▼
            [Unified Diagnostics & Diff]
            - Compliance Index (0-100)
            - Severity-Coded Findings (High/Med/Low)
            - Verbatim Regulatory Citations
            - 1-Click Interactive In-Place Fixes
```

---

## 📁 Repository Structure

```
Brand-Sentinel/
├── backend/
│   ├── requirements.txt
│   ├── main.py                    # FastAPI entrypoint & CORS middleware
│   ├── sample_guidelines.docx     # Pre-generated sample brand guidelines
│   └── app/
│       ├── api/
│       │   ├── ingest.py          # POST /api/ingest (PDF/DOCX guideline vectorization)
│       │   ├── scan.py            # POST /api/scan (Dual-engine compliance audit)
│       │   └── rules.py           # GET  /api/rules (Active guidelines catalog)
│       ├── core/
│       │   └── config.py          # Pydantic Settings & environment defaults
│       ├── services/
│       │   ├── deterministic.py   # Regex, banned terminology & FTC compliance
│       │   └── rag.py             # SentenceTransformers + BM25 + Qdrant RAG
│       └── schemas/
│           └── scan.py            # Pydantic request/response data contracts
└── frontend/
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx         # Enterprise dark navigation & status monitor
        │   ├── globals.css        # Tailwind styling & dark scrollbars
        │   └── page.tsx           # Split-screen compliance workspace
        ├── components/
        │   ├── Editor.tsx         # Real-time drafting canvas & tag highlights
        │   ├── CitationPanel.tsx  # Interactive diagnostics & rule citation sidebar
        │   └── DiffViewer.tsx     # One-click suggestion preview & replace tool
        └── lib/
            └── api.ts             # Typed API client for FastAPI backend
```

---

## 🚀 Quickstart Guide

### 1. Backend Setup (FastAPI & Python 3.10+)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`
- Health Status: `http://127.0.0.1:8000/health`

### 2. Frontend Setup (Next.js 15+ & Tailwind CSS)

```powershell
cd frontend
npm install
npm run dev
```

- Application Workspace: `http://localhost:3000`

---

## 🧪 Testing Verification

### Automated Ingestion Test
```powershell
curl -X POST "http://127.0.0.1:8000/api/ingest" -F "file=@sample_guidelines.docx"
```

### Automated Scan Verification
```powershell
curl -X POST "http://127.0.0.1:8000/api/scan" \
  -H "Content-Type: application/json" \
  -d '{"text": "Brand Sentinel is 100% secure with whitelist architecture."}'
```
