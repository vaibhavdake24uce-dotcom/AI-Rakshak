# AI Rakshak — Flood Intelligence & Rescue Coordination (Starter MVP)

A runnable, full-stack prototype for exploring historical flood context, logging incidents, tracking shelters, and viewing **transparent demo risk indicators**.

> **Important safety limitation:** this starter does not predict real floods, verify rescue routes, or provide emergency instructions. The risk indicator is a transparent demo rule, not a trained/validated ML model. Never use this prototype for real emergency decisions.

## Features
- Modern responsive dashboard UI
- FastAPI backend and SQLite database (created automatically)
- Seeded demo observations, incidents, shelters, and data-source records
- Create and update incidents
- Dashboard statistics and recent activity
- Current worldwide disaster-event feed from GDACS (cached; source coverage and alert levels are not a complete risk assessment)
- Data-source freshness/status view
- Demo risk indicator with explanation and clear disclaimer
- OpenStreetMap-based map using Leaflet CDN; incident/shelter lists still work if the map CDN is unavailable
- API documentation at `/docs`

## Requirements
- Python 3.10+
- Internet connection for first-time Python package installation and the GDACS global-event feed
- Optional internet connection for map tiles / Leaflet CDN; regional incident functions remain available if GDACS is offline

## Run on Windows (VS Code / PowerShell)
1. Extract the ZIP.
2. Open the extracted `AI_Rakshak_Starter` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run these commands:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

If PowerShell blocks activation, run this in the same terminal:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

5. Open `http://127.0.0.1:8000` in your browser. Use this FastAPI URL for the working frontend and API; opening `frontend/index.html` with a static-only Live Server loads the design but cannot connect to the backend.
6. API docs: `http://127.0.0.1:8000/docs`
7. Health check: `http://127.0.0.1:8000/api/v1/health`

Stop the server with `Ctrl+C`.

## Database
- SQLite database is created at `data/ai_rakshak.db` on first run.
- This is suitable for a local college prototype and is easy to inspect/backup.
- Demo data is seeded only when tables are empty.
- Do not commit real personal information or secrets.
- For a multi-user deployed product, move to PostgreSQL + PostGIS, add authentication/roles, migrations, backups, rate limiting, and security review.

## Project structure
```text
AI_Rakshak_Starter/
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── services.py
├── data/
│   └── .gitkeep
├── docs/
│   ├── DATA_SOURCES.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_GUIDE.md
│   └── MODEL_LIMITATIONS.md
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── theme.css
│   └── app.js
├── scripts/
│   └── audit_dataset.py
├── tests/
│   └── test_api.py
├── .gitignore
├── requirements.txt
└── README.md
```

## First milestone (before calling this an AI project)
1. Confirm the exact SIH problem statement / topic with your team.
2. Confirm the licence and actual downloadable fields for each dataset.
3. Download one representative rainfall CSV and one historical flood-extent layer.
4. Run `python scripts/audit_dataset.py path\to\your.csv`.
5. Record source, date, licence, coverage, and missing fields in `docs/DATA_SOURCES.md`.
6. Build a retrospective model only after time-aligned labels and inputs are verified.
7. Evaluate on unseen events; publish real metrics only, never made-up accuracy.

## API quick reference
- `GET /api/v1/health`
- `GET /api/v1/dashboard`
- `GET /api/v1/incidents`
- `POST /api/v1/incidents`
- `PATCH /api/v1/incidents/{incident_id}`
- `GET /api/v1/shelters`
- `GET /api/v1/data-sources`
- `GET /api/v1/global-events`
- `GET /api/v1/risk-demo?rainfall_mm=...&river_level_m=...`

All sample records are clearly marked as demonstration data.
