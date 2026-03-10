"""Team schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class TeamCreate(BaseModel):
    season_id: UUID
    club_id: UUID
    division_id: UUID


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    club_id: Optional[UUID] = None
    division_id: Optional[UUID] = None
    logo_url: Optional[str] = None
    short_name: Optional[str] = None
    home_colors: Optional[str] = None
    deleted: Optional[bool] = None


class TeamResponse(BaseModel):
    id: UUID
    season_id: UUID
    club_id: Optional[UUID]
    division_id: Optional[UUID]
    name: str
    logo_url: Optional[str]
    short_name: Optional[str]
    home_colors: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
