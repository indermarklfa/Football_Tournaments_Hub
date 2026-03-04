"""Edition schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional


class EditionCreate(BaseModel):
    tournament_id: UUID
    name: str
    year: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    venue: Optional[str] = None
    format: str = "groups_knockout"
    status: str = "upcoming"


class EditionUpdate(BaseModel):
    name: Optional[str] = None
    year: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    venue: Optional[str] = None
    format: Optional[str] = None
    status: Optional[str] = None
    deleted: Optional[bool] = None


class EditionResponse(BaseModel):
    id: UUID
    tournament_id: UUID
    name: str
    year: int
    start_date: Optional[date]
    end_date: Optional[date]
    venue: Optional[str]
    format: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
