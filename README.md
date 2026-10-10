# NagarVaani (DeNews)

AI-driven civic issue reporting platform for Pune. Citizens report problems like potholes, garbage, water leaks and broken streetlights in plain language (English, Hindi or Marathi). The backend extracts structure with Gemini, groups duplicate reports into clusters, and flags low-confidence reports for human review. Municipal staff get an admin dashboard, and everyone gets a live map.

Built as a Cloud Computing PBL project.

## Features

- **AI extraction:** Gemini turns free text into issue type, location, urgency score and confidence.
- **Two-stage deduplication:** a 150 m spatial filter, then semantic similarity (cosine, threshold 0.85) on 768-dim embeddings stored in pgvector.
- **Clustering:** related reports join one cluster with a report count and severity score.
- **Human-in-the-loop (HITL):** reports below 85% confidence go to a review queue with approve and reject actions.
- **Pin-drop location picker:** click the map, drag the pin, or use device GPS when reporting.
- **Live map:** reports plotted on an OpenStreetMap-based map, with multiple reports at one spot grouped under a count badge.
- **Admin dashboard:** stats, all concerns, HITL queue and cluster view.

## Tech stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLAlchemy, Python |
| Database | PostgreSQL + pgvector |
| AI | Gemini (`gemini-3.5-flash` for extraction, `gemini-embedding-001` at 768 dims for embeddings) |
| Geocoding | LocationIQ (fallback when no pin is given) |
| Frontend | React 18, Vite, React Router |
| Map | MapLibre GL JS (`4.7.1`) with OpenFreeMap tiles |

## Repository structure

```
DeNews/
├── concern_backend/        FastAPI service
│   ├── app/
│   │   ├── main.py         API routes
│   │   ├── crud.py         create + dedup + clustering logic
│   │   ├── schemas.py      Pydantic request/response models
│   │   ├── database.py     DB connection
│   │   ├── init_db.py      create tables
│   │   ├── reset_db.py     reset tables
│   │   ├── models/         SQLAlchemy models
│   │   ├── services/       llm_extractor, llm_prompt, embedding, geocoding
│   │   └── tests/
│   └── requirements.txt
└── denews-frontend/        React + Vite app
    └── src/pages/          ReportPage, DashboardPage, MapPage, LocationPicker
```

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL with the `pgvector` extension enabled
- A Gemini API key and a LocationIQ API key

### 1. Backend

```powershell
cd concern_backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `concern_backend/.env`:

```
GEMINI_API_KEY=your_gemini_key
LOCATIONIQ_API_KEY=your_locationiq_key
```

Configure the database connection in `app/database.py`, enable pgvector, then create the tables and start the server:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

```powershell
python -m app.init_db
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000` (interactive docs at `/docs`).

### 2. Frontend

```powershell
cd denews-frontend
npm install
```

Create `denews-frontend/.env`:

```
VITE_API_BASE=http://localhost:8000
```

```powershell
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

> **Note:** keep `maplibre-gl` on `4.7.1`. Version 6.x breaks with Vite's dependency optimizer (map tiles fail to render when zoomed in).

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/concerns` | Submit a report; runs extraction, dedup and clustering |
| GET | `/concerns` | List concerns (`status`, `days` filters) |
| GET | `/concerns/{id}` | Concern detail |
| POST | `/concerns/{id}/approve` | HITL: approve a flagged concern |
| POST | `/concerns/{id}/reject` | HITL: reject and close a concern |
| POST | `/concerns/{id}/resolve` | Mark a concern resolved |
| GET | `/clusters` | List clusters (`issue_type`, `status` filters) |
| GET | `/clusters/{id}` | Cluster detail |

Example request:

```json
POST /concerns
{
  "description": "Massive pothole near Sony Signal on FC Road. Caused 3 accidents.",
  "language": "en",
  "latitude": 18.5196,
  "longitude": 73.8412,
  "location_source": "pin"
}
```

## How a report is processed

1. The user drops a pin (or uses GPS) and describes the issue.
2. Gemini extracts issue type, locality, urgency and confidence.
3. The description is embedded (768 dims) and stored in pgvector.
4. Open clusters within 150 m are compared by cosine similarity; a match above 0.85 joins that cluster, otherwise a new cluster is created.
5. Confidence below 0.85 flags the report for human review.

## Roadmap

- Photo upload with Cloud Storage signed URLs
- Citizen-facing feed page
- Deployment on Google Cloud (Cloud Run, Cloud SQL, Secret Manager, Firebase Hosting)
- Ward/zone boundaries and weekly authority reports
- User authentication and per-user "my concerns"
- WhatsApp intake channel

## Security

Never commit `.env` files. API keys are read from environment variables only. Restrict CORS (`allow_origins` in `app/main.py`) to the real frontend origin before deploying.
