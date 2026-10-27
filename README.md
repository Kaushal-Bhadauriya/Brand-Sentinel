# BrandSentinel

BrandSentinel checks marketing and brand content against a company's own guidelines. You upload your brand docs, paste a draft, and it flags the parts that break the rules. Each flag comes with the guideline passage that triggered it and a suggested fix.

I built it solo for a hackathon, so it's an MVP: the core flow works, and there's plenty left to polish.

## What it does

- Ingests brand guideline documents (`.pdf` and `.docx`), splits them into chunks, and indexes them.
- Scans draft content with a mix of deterministic checks (banned terms, casing, required wording) and hybrid RAG (dense + keyword search) over the indexed guidelines.
- Returns findings with a severity, a confidence score, a verbatim source excerpt, and a suggested rewrite.
- Drops any finding that can't be tied to a retrieved guideline chunk above the confidence threshold, so the UI doesn't show claims with no source behind them.

## Architecture

It's a monorepo with two separately deployed apps:

```
Brand-Sentinel/
├── backend/     FastAPI service: ingestion, scanning, rules
│   ├── main.py
│   └── app/
│       ├── api/        routers: /api/ingest, /api/scan, /api/rules
│       ├── core/       settings and config
│       ├── services/   hybrid RAG + deterministic checks
│       └── schemas/    Pydantic request/response models
└── frontend/    Next.js dashboard: editor on the left, findings on the right
```

The frontend talks to the backend over plain JSON/HTTP. Guideline chunks live in Qdrant Cloud, and the backend is the only thing that reads or writes to it.

```
Browser (Next.js) ──HTTP──> FastAPI ──> Qdrant Cloud
                               │
                     deterministic checks + embeddings
```

## Tech stack

**Frontend**
- Next.js 15, TypeScript
- Tailwind CSS

**Backend**
- FastAPI, Uvicorn
- Pydantic
- sentence-transformers for embeddings
- pdfplumber and python-docx for parsing guideline files

**Data and search**
- Qdrant Cloud for hybrid vector search

## Local development

### Prerequisites

- Python 3.10+
- Node.js 18.18+ (needed by Next.js 15)
- A Qdrant Cloud cluster (the free tier is enough) with its URL and API key

### 1. Clone

```bash
git clone https://github.com/<your-username>/Brand-Sentinel.git
cd Brand-Sentinel
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
QDRANT_URL=https://<your-cluster>.qdrant.io
QDRANT_API_KEY=<your-qdrant-api-key>
CORS_ORIGINS=["http://localhost:3000"]
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Interactive docs are at `/docs`, and `/health` is a quick check that it's up.

The first run downloads the embedding model, so expect a short wait.

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Trying it out

1. Click **Upload brand guideline** and pick a `.pdf` or `.docx`.
2. Paste some draft copy into the editor.
3. Click **Scan Content** (or press Ctrl/⌘ + Enter).
4. Click a finding in the right panel to see the guideline excerpt behind it.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `QDRANT_URL` | backend | Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | backend | Qdrant Cloud API key |
| `CORS_ORIGINS` | backend | Allowed frontend origins (JSON list) |
| `NEXT_PUBLIC_API_URL` | frontend | Base URL of the FastAPI backend (defaults to `http://localhost:8000`) |

## Deployment

**Backend (Render)**

- Create a Web Service pointing at this repo with the root directory set to `backend`.
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add `QDRANT_URL`, `QDRANT_API_KEY`, and `CORS_ORIGINS` (include your Vercel URL) as environment variables.

**Frontend (Vercel)**

- Import the repo and set the root directory to `frontend`.
- Add `NEXT_PUBLIC_API_URL` pointing at your Render service URL.

Render's free tier spins services down when idle, so the first request after a quiet period can be slow.
