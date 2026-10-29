from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .database import Base, engine, get_db, SessionLocal
from .models import Incident, Shelter, DataSource
from .schemas import IncidentCreate, IncidentUpdate, IncidentOut, ShelterOut, DataSourceOut
from .global_feed import get_gdacs_events
from .services import seed_if_empty

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield

app = FastAPI(
    title="AI Rakshak API",
    description="Flood information and incident coordination prototype. Demo data and risk indicators are not for real emergency use.",
    version="0.1.0",
    lifespan=lifespan,
)
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def home():
    return (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")

@app.get("/styles.css", include_in_schema=False)
def frontend_styles():
    return FileResponse(FRONTEND_DIR / "styles.css", media_type="text/css")

@app.get("/theme.css", include_in_schema=False)
def frontend_theme():
    return FileResponse(FRONTEND_DIR / "theme.css", media_type="text/css")

@app.get("/app.js", include_in_schema=False)
def frontend_script():
    return FileResponse(FRONTEND_DIR / "app.js", media_type="text/javascript")

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": "AI Rakshak API", "version": "0.1.0", "time_utc": datetime.now(timezone.utc).isoformat()}

@app.get("/api/v1/dashboard")
def dashboard(db: Session = Depends(get_db)) -> dict[str, Any]:
    incidents = db.scalars(select(Incident).order_by(Incident.created_at.desc())).all()
    shelters = db.scalars(select(Shelter)).all()
    return {
        "total_incidents": len(incidents),
        "open_incidents": sum(i.status != "resolved" for i in incidents),
        "critical_incidents": sum(i.severity == "critical" and i.status != "resolved" for i in incidents),
        "unverified_incidents": sum(not i.verified for i in incidents),
        "shelters_listed": len(shelters),
        "demo_records": sum(i.is_demo for i in incidents) + sum(s.is_demo for s in shelters),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "notice": "Prototype data only. Confirm all reports and shelter information independently."
    }

@app.get("/api/v1/incidents", response_model=list[IncidentOut])
def list_incidents(status: str | None = None, district: str | None = None, db: Session = Depends(get_db)):
    query = select(Incident).order_by(Incident.created_at.desc())
    if status:
        if status not in {"reported", "reviewing", "verified", "resolved"}:
            raise HTTPException(400, "Invalid status filter.")
        query = query.where(Incident.status == status)
    if district:
        query = query.where(func.lower(Incident.district) == district.lower())
    return db.scalars(query).all()

@app.post("/api/v1/incidents", response_model=IncidentOut, status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    item = Incident(**payload.model_dump(), status="reported", verified=False, is_demo=False)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.patch("/api/v1/incidents/{incident_id}", response_model=IncidentOut)
def update_incident(incident_id: int, payload: IncidentUpdate, db: Session = Depends(get_db)):
    item = db.get(Incident, incident_id)
    if not item:
        raise HTTPException(404, "Incident not found.")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(item, key, value)
    if item.status == "verified":
        item.verified = True
    db.commit()
    db.refresh(item)
    return item

@app.get("/api/v1/shelters", response_model=list[ShelterOut])
def list_shelters(db: Session = Depends(get_db)):
    return db.scalars(select(Shelter).order_by(Shelter.name)).all()

@app.get("/api/v1/data-sources", response_model=list[DataSourceOut])
def list_data_sources(db: Session = Depends(get_db)):
    return db.scalars(select(DataSource).order_by(DataSource.id)).all()

@app.get("/api/v1/global-events")
def global_events():
    try:
        return get_gdacs_events()
    except RuntimeError as error:
        raise HTTPException(502, str(error)) from error

@app.get("/api/v1/risk-demo")
def risk_demo(
    rainfall_mm: float = Query(0, ge=0, le=1000, description="Illustrative rainfall input only"),
    river_level_m: float = Query(0, ge=0, le=100, description="Illustrative river level input only")
):
    # Explicitly a toy threshold demonstration, not a calibrated hydrological model.
    score = min(100, round(rainfall_mm * 0.55 + river_level_m * 8))
    if score >= 70:
        band = "Elevated demo indicator"
    elif score >= 35:
        band = "Moderate demo indicator"
    else:
        band = "Lower demo indicator"
    return {
        "indicator_score": score,
        "band": band,
        "inputs": {"rainfall_mm": rainfall_mm, "river_level_m": river_level_m},
        "method": "Illustrative weighted thresholds only; not trained, calibrated, validated, or an official warning.",
        "safe_for_emergency_decisions": False
    }
