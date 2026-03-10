"""Division schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class DivisionCreate(BaseModel):
    season_id: UUID
    name: str
    format: str = "league"
    age_group: Optional[str] = None


class DivisionUpdate(BaseModel):
    season_id: Optional[UUID] = None
    name: Optional[str] = None
    format: Optional[str] = None
    age_group: Optional[str] = None
    deleted: Optional[bool] = None


class DivisionResponse(BaseModel):
    id: UUID
    season_id: UUID
    name: str
    format: str
    age_group: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
