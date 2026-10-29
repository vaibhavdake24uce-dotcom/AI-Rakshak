from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Incident, Shelter, DataSource

def seed_if_empty(db: Session):
    if db.scalar(select(Incident.id).limit(1)) is None:
        db.add_all([
            Incident(title="Low-lying road waterlogging", description="Demo record: verify with local responders before action.", district="Bhandara", latitude=21.1667, longitude=79.65, severity="high", status="reported", verified=False, is_demo=True),
            Incident(title="Community assistance request", description="Demo record for testing incident workflow.", district="Gondia", latitude=21.46, longitude=80.20, severity="medium", status="reviewing", verified=False, is_demo=True),
            Incident(title="Bridge approach needs inspection", description="Demo record; not a verified closure.", district="Bhandara", latitude=21.19, longitude=79.70, severity="critical", status="reported", verified=False, is_demo=True),
        ])
    if db.scalar(select(Shelter.id).limit(1)) is None:
        db.add_all([
            Shelter(name="Demo Relief Centre A", district="Bhandara", latitude=21.17, longitude=79.66, capacity=150, occupancy=64, status="unverified", is_demo=True),
            Shelter(name="Demo Community Hall B", district="Gondia", latitude=21.45, longitude=80.21, capacity=100, occupancy=31, status="unverified", is_demo=True),
            Shelter(name="Demo School Shelter C", district="Bhandara", latitude=21.20, longitude=79.62, capacity=80, occupancy=0, status="unverified", is_demo=True),
        ])
    if db.scalar(select(DataSource.id).limit(1)) is None:
        db.add_all([
            DataSource(name="NWIC — Maharashtra hourly rainfall telemetry", source_url="https://nwdp.nwic.gov.in/dataset/rainfall-telemetry-hourly-maharashtra-surface-water-department", data_type="rainfall", access_status="check_resource", licence_status="verify_licence", notes="Candidate source. Confirm actual downloadable files, schema, station coverage and licence before use."),
            DataSource(name="NRSC/Bhuvan flood hazard layers", source_url="https://bhuvan-app1.nrsc.gov.in/disaster/usrtasks/flood_hz/flood_hz.php", data_type="historical_flood_extent", access_status="check_layer", licence_status="verify_licence", notes="Historical map layers; not automatically time-aligned ML labels."),
            DataSource(name="IMD API reference", source_url="https://api.imd.gov.in/public/api_reference.html", data_type="weather_forecast", access_status="check_access", licence_status="verify_terms", notes="Confirm authentication, archival coverage and permitted use."),
            DataSource(name="OpenStreetMap", source_url="https://www.openstreetmap.org/", data_type="roads_and_places", access_status="available_with_attribution", licence_status="ODbL_check", notes="Follow OpenStreetMap attribution and licence requirements."),
        ])
    db.commit()
