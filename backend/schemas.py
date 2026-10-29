from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

Severity = Literal["low", "medium", "high", "critical"]
IncidentStatus = Literal["reported", "reviewing", "verified", "resolved"]

class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str = Field(default="", max_length=2000)
    district: str = Field(default="Bhandara", min_length=2, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    severity: Severity = "medium"

class IncidentUpdate(BaseModel):
    status: IncidentStatus | None = None
    severity: Severity | None = None
    verified: bool | None = None
    description: str | None = Field(default=None, max_length=2000)

class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    district: str
    latitude: float
    longitude: float
    severity: str
    status: str
    verified: bool
    is_demo: bool
    created_at: datetime

class ShelterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    district: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int
    status: str
    is_demo: bool

class DataSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    source_url: str
    data_type: str
    access_status: str
    licence_status: str
    notes: str
